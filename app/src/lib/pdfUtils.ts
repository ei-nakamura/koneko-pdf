/**
 * PDFユーティリティモジュール
 * ページサイズの計算や汎用ヘルパー関数を提供する
 */

/** ポイント単位をミリメートルに変換する */
export function mmFromPt(pt: number): number {
  return (pt * 25.4) / 72;
}

/**
 * ページサイズ（mm）から標準用紙サイズ名を判定する
 * @returns 用紙サイズ名（例: "A4 (縦)"）、該当なしの場合はnull
 */
export function getPageSizeName(wMm: number, hMm: number): string | null {
  const sizes = [
    { n: "A3", w: 297, h: 420 },
    { n: "A4", w: 210, h: 297 },
    { n: "A5", w: 148, h: 210 },
    { n: "B4", w: 250, h: 353 },
    { n: "B5", w: 176, h: 250 },
    { n: "Letter", w: 215.9, h: 279.4 },
    { n: "Legal", w: 215.9, h: 355.6 },
  ];
  // 誤差5mm以内で一致するサイズを検索（縦横両方向を確認）
  for (const s of sizes) {
    if (
      (Math.abs(wMm - s.w) < 5 && Math.abs(hMm - s.h) < 5) ||
      (Math.abs(wMm - s.h) < 5 && Math.abs(hMm - s.w) < 5)
    ) {
      return s.n + (wMm > hMm ? " (横)" : " (縦)");
    }
  }
  return null;
}

/**
 * 配列を指定サイズのチャンクに分割する
 * @param arr - 分割する配列
 * @param size - チャンクのサイズ
 */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

/** HTML特殊文字をエスケープする */
export function escHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
