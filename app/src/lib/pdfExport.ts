/**
 * PDFエクスポートモジュール
 * 翻訳済みのページ画像をPDFファイルとして書き出す
 */

/** Base64文字列をバイト配列に変換する */
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** バイト配列をBase64文字列に変換する（メモリ効率のためチャンク処理） */
function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 8192;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const end = Math.min(i + CHUNK, bytes.length);
    let bin = "";
    for (let j = i; j < end; j++) bin += String.fromCharCode(bytes[j]);
    chunks.push(bin);
  }
  return btoa(chunks.join(""));
}

/**
 * キャンバスをJPEGバイト配列に変換する
 * Blob APIを優先し、フォールバックとしてtoDataURLを使用する
 */
export function canvasToJPEGBytes(
  sourceCanvas: HTMLCanvasElement,
  width: number,
  height: number,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    // 白背景を描画（透過部分の対策）
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(sourceCanvas, 0, 0, width, height);
    const release = () => { canvas.width = 0; canvas.height = 0; };
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => { release(); resolve(new Uint8Array(reader.result as ArrayBuffer)); };
          reader.onerror = () => { release(); reject(new Error("Blob読み取り失敗")); };
          reader.readAsArrayBuffer(blob);
        } else {
          // Blobが生成できない場合のフォールバック
          const jpeg = canvas.toDataURL("image/jpeg", 0.95);
          release();
          resolve(base64ToBytes(jpeg.split(",")[1]));
        }
      }, "image/jpeg", 0.95);
    } catch {
      // toBlobが例外を投げた場合のフォールバック
      const jpeg = canvas.toDataURL("image/jpeg", 0.95);
      release();
      resolve(base64ToBytes(jpeg.split(",")[1]));
    }
  });
}

/** PDF構築用の画像データ */
interface ImageData {
  width: number;         // 画像の幅（px）
  height: number;        // 画像の高さ（px）
  jpegBytes: Uint8Array; // JPEGバイナリデータ
}

/**
 * JPEG画像の配列からPDFファイルのバイト配列を構築する
 * PDF 1.4仕様に基づいて手動でPDF構造を組み立てる
 */
export function buildPDF(imageDataList: ImageData[]): Uint8Array {
  const PX_TO_PT = 72 / 96; // ピクセルからポイントへの変換係数
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: Record<number, number> = {};
  let byteLen = 0;

  // ヘルパー関数：文字列をバイト配列として追加
  function w(str: string) { const b = enc.encode(str); parts.push(b); byteLen += b.length; }
  // ヘルパー関数：バイト配列を直接追加
  function wb(bytes: Uint8Array) { parts.push(bytes); byteLen += bytes.length; }
  // ヘルパー関数：オブジェクトのオフセットを記録
  function mark(n: number) { offsets[n] = byteLen; }

  const N = imageDataList.length;
  const totalObj = 2 + N * 3; // カタログ + ページツリー + ページごとに3オブジェクト
  // PDFヘッダー
  w("%PDF-1.4\n");
  // カタログオブジェクト
  mark(1); w("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  // ページツリーオブジェクト
  const kids = imageDataList.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  mark(2); w(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${N} >>\nendobj\n`);

  // 各ページのオブジェクトを生成（ページ、コンテンツストリーム、画像XObject）
  for (let i = 0; i < N; i++) {
    const img = imageDataList[i];
    const pO = 3 + i * 3, cO = 4 + i * 3, iO = 5 + i * 3;
    const wPt = (img.width * PX_TO_PT).toFixed(4);
    const hPt = (img.height * PX_TO_PT).toFixed(4);
    const content = `q ${wPt} 0 0 ${hPt} 0 0 cm /Im0 Do Q`;
    mark(pO); w(`${pO} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${wPt} ${hPt}] /Contents ${cO} 0 R /Resources << /XObject << /Im0 ${iO} 0 R >> >> >>\nendobj\n`);
    mark(cO); w(`${cO} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
    mark(iO); w(`${iO} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.jpegBytes.length} >>\nstream\n`);
    wb(img.jpegBytes); w("\nendstream\nendobj\n");
  }

  // 相互参照テーブルとトレーラー
  const xrefOff = byteLen;
  w(`xref\n0 ${totalObj + 1}\n`);
  w("0000000000 65535 f \r\n");
  for (let i = 1; i <= totalObj; i++) w(String(offsets[i]).padStart(10, "0") + " 00000 n \r\n");
  w(`trailer\n<< /Size ${totalObj + 1} /Root 1 0 R >>\nstartxref\n${xrefOff}\n%%EOF\n`);

  // パーツを結合して最終的なバイト配列を返す
  const total = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { result.set(p, off); off += p.length; }
  return result;
}

/**
 * PDFバイト配列をファイルとしてダウンロードする
 * Blob URL → Data URL → window.open の順でフォールバックする
 */
export function downloadPdfBytes(pdfBytes: Uint8Array, filename: string): boolean {
  try {
    // 方法1: Blob URLを使ったダウンロード
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  } catch {
    try {
      // 方法2: Data URLを使ったダウンロード
      const b64 = bytesToBase64(pdfBytes);
      const a = document.createElement("a");
      a.href = "data:application/pdf;base64," + b64;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } catch {
      try {
        // 方法3: 新しいタブで開く
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return true;
      } catch {
        return false;
      }
    }
  }
}
