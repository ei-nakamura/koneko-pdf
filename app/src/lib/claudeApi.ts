/**
 * Claude API連携モジュール
 * テキストブロックの検出と翻訳をClaude APIを通じて行う
 */
import type { TextBlock } from '../types';
import { parseJson } from './jsonParser';
import { chunkArray } from './pdfUtils';

/** 検出APIに送信する画像の最大辺（px） */
const DETECT_MAX_EDGE = 1536;
/** テキストブロック検出に使用するモデル */
const MODEL_DETECT = "claude-sonnet-4-20250514";
/** 翻訳に使用するモデル */
const MODEL_TRANSLATE = "claude-sonnet-4-20250514";
/** 翻訳時のチャンクサイズ（一度に翻訳するブロック数） */
const TRANSLATE_CHUNK_SIZE = 10;
/** 翻訳の同時実行数 */
const TRANSLATE_CONCURRENCY = 3;

/**
 * キャンバスをBase64エンコードされたPNG画像に変換する
 * 画像サイズがDETECT_MAX_EDGEを超える場合は縮小する
 */
export function canvasToBase64(
  canvas: HTMLCanvasElement,
  pageWidth: number,
  pageHeight: number,
): { base64: string; sentW: number; sentH: number } {
  const scale = Math.min(1, DETECT_MAX_EDGE / Math.max(pageWidth, pageHeight));
  const sentW = Math.round(pageWidth * scale);
  const sentH = Math.round(pageHeight * scale);
  const tmp = document.createElement("canvas");
  tmp.width = sentW;
  tmp.height = sentH;
  const ctx = tmp.getContext("2d")!;
  ctx.drawImage(canvas, 0, 0, sentW, sentH);
  const result = tmp.toDataURL("image/png").split(",")[1];
  // 一時キャンバスを解放
  tmp.width = 0;
  tmp.height = 0;
  return { base64: result, sentW, sentH };
}

/**
 * Claude APIを呼び出す共通関数
 * @param apiKey - AnthropicのAPIキー
 * @param messages - メッセージ配列
 * @param model - 使用するモデル名
 * @returns レスポンステキストと停止理由
 */
async function callClaude(
  apiKey: string,
  messages: Record<string, unknown>[],
  model = MODEL_TRANSLATE,
): Promise<{ text: string; stop_reason: string }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model, max_tokens: 40960, messages }),
  });
  const rawText = await res.text();
  if (!res.ok) {
    let errMsg = `API Error ${res.status}`;
    try { errMsg = JSON.parse(rawText)?.error?.message || errMsg; } catch { /* 無視 */ }
    throw new Error(errMsg);
  }
  let data: Record<string, unknown>;
  try { data = JSON.parse(rawText); } catch (e) {
    throw new Error(`レスポンスのJSON解析に失敗: ${(e as Error).message}\n生データ: ${rawText.substring(0, 200)}`);
  }
  // レスポンスからテキストを抽出
  let resultText = "";
  if (Array.isArray(data.content)) {
    for (const block of data.content) {
      if (block.type === "text" && block.text) resultText += block.text;
    }
  } else if (typeof data.content === "string") {
    resultText = data.content;
  } else {
    resultText = JSON.stringify(data);
  }
  if (!resultText) throw new Error("APIからの空レスポンス");
  return { text: resultText, stop_reason: (data.stop_reason as string) || "unknown" };
}

/**
 * PDFページ画像からテキストブロックを検出する
 * Claude APIの画像認識を使ってテキスト領域を特定する
 * @returns 検出されたブロックの配列と、レスポンスが切り詰められたかどうか
 */
export async function detectBlocks(
  apiKey: string,
  canvas: HTMLCanvasElement,
  pageWidth: number,
  pageHeight: number,
): Promise<{ blocks: TextBlock[]; truncated: boolean }> {
  const { base64, sentW, sentH } = canvasToBase64(canvas, pageWidth, pageHeight);
  const imgW = Math.round(pageWidth);
  const imgH = Math.round(pageHeight);

  const prompt = `この書類画像を解析し、文章のかたまり（テキストブロック）を検出してください。

画像サイズ: 幅 ${sentW}px × 高さ ${sentH}px

各テキストブロックについて以下のJSON形式で出力:
- id: 連番
- type: "title"|"heading"|"paragraph"|"list"|"table"|"caption"|"header"|"footer"|"other"
- content: テキスト内容（改行は半角スペースに置換。省略せず全文を含めること）
- bbox: 正規化された境界ボックス座標（画像の幅・高さを1.0とした0.0〜1.0の小数）
  - x: 左端の位置（0.0=左端、1.0=右端）
  - y: 上端の位置（0.0=上端、1.0=下端）
  - w: 幅（0.0〜1.0）
  - h: 高さ（0.0〜1.0）
- confidence: 0.0〜1.0

注意:
1. 座標は必ず0.0〜1.0の範囲内にすること
2. x+w<=1.0, y+h<=1.0であること
3. すべてのテキストを漏れなく検出
4. JSONのみ出力、マークダウンの囲みや説明文は不要

出力: { "text_blocks": [ ... ] }`;

  const resp = await callClaude(apiKey, [{
    role: "user",
    content: [
      { type: "image", source: { type: "base64", media_type: "image/png", data: base64 } },
      { type: "text", text: prompt },
    ],
  }], MODEL_DETECT);

  const result = parseJson(resp.text) as { text_blocks?: Array<Record<string, unknown>> };
  // 正規化座標（0〜1）をピクセル座標に変換
  const blocks: TextBlock[] = (result.text_blocks || []).map((b: Record<string, unknown>) => {
    const bbox = (b.bbox || b.bounding_box) as Record<string, number> | undefined;
    if (bbox) {
      const isNorm = bbox.x <= 1.0 && bbox.y <= 1.0 &&
        (bbox.w !== undefined ? bbox.w <= 1.0 : bbox.width <= 1.0) &&
        (bbox.h !== undefined ? bbox.h <= 1.0 : bbox.height <= 1.0);
      (b as Record<string, unknown>).bounding_box = isNorm
        ? { x: Math.round((bbox.x || 0) * imgW), y: Math.round((bbox.y || 0) * imgH), width: Math.round((bbox.w || bbox.width || 0) * imgW), height: Math.round((bbox.h || bbox.height || 0) * imgH) }
        : { x: Math.round(bbox.x || 0), y: Math.round(bbox.y || 0), width: Math.round(bbox.w || bbox.width || 0), height: Math.round(bbox.h || bbox.height || 0) };
    }
    return b as unknown as TextBlock;
  });

  return { blocks, truncated: resp.stop_reason === "max_tokens" };
}

/**
 * テキストブロックのチャンクを翻訳する（内部関数）
 * @returns 翻訳結果の配列（IDと翻訳テキストのペア）
 */
async function translateChunk(
  apiKey: string,
  blocks: TextBlock[],
  target: string,
): Promise<Array<{ id: number; translation: string }>> {
  const blocksText = blocks.map(b => `[${b.id}] ${b.content}`).join("\n");
  const prompt = `以下のテキストブロックを${target}に翻訳してください。\n\n${blocksText}\n\nJSON配列のみ出力（マークダウンの囲みや説明文は不要）:\n[ { "id": 1, "translation": "翻訳文" }, ... ]`;
  const resp = await callClaude(apiKey, [{ role: "user", content: prompt }]);
  const arr = parseJson(resp.text);
  return Array.isArray(arr) ? arr : ((arr as Record<string, unknown>).translations as Array<{ id: number; translation: string }>) || [];
}

/**
 * テキストブロックを一括翻訳する
 * ブロックをチャンクに分割し、並列ワーカーで同時翻訳を行う
 * @param onProgress - 進捗コールバック（完了チャンク数, 全チャンク数）
 * @returns 翻訳結果とエラー数
 */
export async function translateBlocks(
  apiKey: string,
  blocks: TextBlock[],
  targetLang: string,
  onProgress?: (completed: number, total: number) => void,
): Promise<{ translations: Record<number, string>; errors: number }> {
  // 言語コードから表示名へのマッピング
  const langNames: Record<string, string> = {
    ja: "日本語", en: "English", zh: "中文", ko: "한국어",
    fr: "Français", de: "Deutsch", es: "Español",
  };
  const target = langNames[targetLang] || targetLang;
  const translations: Record<number, string> = {};
  const chunks = chunkArray(blocks, TRANSLATE_CHUNK_SIZE);
  const totalChunks = chunks.length;
  let completed = 0;
  let errorCount = 0;

  // チャンクが1つ以下の場合は並列化不要
  if (totalChunks <= 1) {
    const list = await translateChunk(apiKey, blocks, target);
    for (const t of list) translations[t.id] = t.translation;
    return { translations, errors: 0 };
  }

  // キューベースの並列ワーカーパターン
  const queue = chunks.map((chunk, idx) => ({ chunk, idx }));
  let queueIdx = 0;

  async function worker() {
    while (queueIdx < queue.length) {
      const { chunk } = queue[queueIdx++];
      try {
        const list = await translateChunk(apiKey, chunk, target);
        for (const t of list) translations[t.id] = t.translation;
      } catch (e) {
        console.error("[translateBlocks] チャンク翻訳失敗:", e);
        errorCount++;
      }
      completed++;
      onProgress?.(completed, totalChunks);
    }
  }

  // 同時実行数を制限してワーカーを起動
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(TRANSLATE_CONCURRENCY, totalChunks); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return { translations, errors: errorCount };
}
