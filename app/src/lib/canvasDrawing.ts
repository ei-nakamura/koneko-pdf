/**
 * キャンバス描画モジュール
 * PDFページ上のテキストブロックのオーバーレイ描画を担当する
 */
import type { TextBlock, BoundingBox, PageCaches } from '../types';
import { genHues, buildColorTable, colorRgba } from './colorUtils';

/** リサイズハンドルの描画サイズ（px） */
const HANDLE_DRAW = 5;

/**
 * テキストを指定幅で折り返す
 * @param ctx - 描画コンテキスト（文字幅の計測に使用）
 * @param text - 折り返すテキスト
 * @param maxW - 最大幅（px）
 * @returns 折り返された各行の配列
 */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const ch of text) {
    const test = cur + ch;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = ch;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * メインキャンバスからサンプリング用のImageDataを生成する
 * 背景色の推定に使用される
 */
export function buildSamplingData(
  mainCanvas: HTMLCanvasElement,
  pageWidth: number,
  pageHeight: number,
): ImageData {
  const tmp = document.createElement("canvas");
  tmp.width = pageWidth;
  tmp.height = pageHeight;
  const ctx = tmp.getContext("2d")!;
  ctx.drawImage(mainCanvas, 0, 0, pageWidth, pageHeight);
  const imgData = ctx.getImageData(0, 0, pageWidth, pageHeight);
  // 一時キャンバスを解放
  tmp.width = 0;
  tmp.height = 0;
  return imgData;
}

/**
 * バウンディングボックス周辺のピクセルから背景色と前景色を推定する
 * ブロックの端（上下左右）のピクセルをサンプリングして平均色を計算し、
 * 輝度に基づいて適切な前景色（テキスト色）を決定する
 */
export function sampleBgColor(
  imgData: ImageData,
  bb: BoundingBox,
  canvasW: number,
): { bg: string; fg: string } {
  const sx = Math.max(0, Math.round(bb.x));
  const sy = Math.max(0, Math.round(bb.y));
  const sw = Math.min(Math.round(bb.width), canvasW - sx);
  const sh = Math.min(Math.round(bb.height), imgData.height - sy);
  if (sw <= 0 || sh <= 0) return { bg: "rgba(0,0,0,0.9)", fg: "#fff" };
  const data = imgData.data;
  const fullW = imgData.width;
  let r = 0, g = 0, b = 0, count = 0;
  const edgeSize = Math.max(2, Math.min(6, Math.floor(Math.min(sw, sh) * 0.15)));

  // 上端のピクセルをサンプリング
  for (let y = 0; y < edgeSize; y++) {
    const ro = (sy + y) * fullW;
    for (let x = 0; x < sw; x++) { const idx = (ro + sx + x) * 4; r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; count++; }
  }
  // 下端のピクセルをサンプリング
  for (let y = sh - edgeSize; y < sh; y++) {
    const ro = (sy + y) * fullW;
    for (let x = 0; x < sw; x++) { const idx = (ro + sx + x) * 4; r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; count++; }
  }
  // 左端と右端のピクセルをサンプリング
  for (let y = edgeSize; y < sh - edgeSize; y++) {
    const ro = (sy + y) * fullW;
    for (let x = 0; x < edgeSize; x++) { const idx = (ro + sx + x) * 4; r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; count++; }
    for (let x = sw - edgeSize; x < sw; x++) { const idx = (ro + sx + x) * 4; r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; count++; }
  }

  if (count === 0) return { bg: "rgba(0,0,0,0.9)", fg: "#fff" };
  r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);
  // 輝度を計算して前景色を決定（明るい背景には暗い文字、暗い背景には明るい文字）
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return { bg: `rgb(${r},${g},${b})`, fg: lum > 0.55 ? "#1a1a2e" : "#f0f0f5" };
}

/** 背景色キャッシュのキーを生成 */
function bgCacheKey(bb: BoundingBox): string {
  return `${bb.x},${bb.y},${bb.width},${bb.height}`;
}

/** キャッシュ付きの背景色取得 */
function getCachedBgColor(
  caches: PageCaches,
  block: TextBlock,
  samplingData: ImageData,
  canvasW: number,
): { bg: string; fg: string } {
  if (!caches.bgColor) caches.bgColor = {};
  const key = block.id + ":" + bgCacheKey(block.bounding_box);
  if (caches.bgColor[key]) return caches.bgColor[key];
  const result = sampleBgColor(samplingData, block.bounding_box, canvasW);
  caches.bgColor[key] = result;
  return result;
}

/**
 * キャッシュ付きのテキストレイアウト計算
 * バウンディングボックスに収まる最大フォントサイズを二分探索で求める
 */
function getCachedTextLayout(
  ctx: CanvasRenderingContext2D,
  caches: PageCaches,
  block: TextBlock,
  tr: string,
): { fontSize: number; lines: string[] } {
  if (!caches.textLayout) caches.textLayout = {};
  const bb = block.bounding_box;
  const key = block.id + ":" + bb.width + "," + bb.height + ":" + tr;
  if (caches.textLayout[key]) return caches.textLayout[key];
  const pad = 4, availW = bb.width - pad * 2, availH = bb.height - pad * 2;
  // 二分探索で最適なフォントサイズを見つける
  let lo = 6, hi = Math.min(48, availH * 0.9);
  for (let iter = 0; iter < 12; iter++) {
    const mid = (lo + hi) / 2;
    ctx.font = `${mid}px 'Noto Sans JP','DM Sans',sans-serif`;
    const lines = wrapText(ctx, tr, availW);
    if (lines.length * mid * 1.35 <= availH) lo = mid; else hi = mid;
  }
  const fontSize = Math.max(6, Math.floor(lo));
  ctx.font = `${fontSize}px 'Noto Sans JP','DM Sans',sans-serif`;
  const result = { fontSize, lines: wrapText(ctx, tr, availW) };
  caches.textLayout[key] = result;
  return result;
}

/** バウンディングボックスの8方向のハンドル位置を計算する */
function getHandlePositions(bb: BoundingBox) {
  const x = bb.x, y = bb.y, w = bb.width, h = bb.height;
  return {
    nw: { x: x, y: y },         // 左上
    n: { x: x + w / 2, y: y },  // 上
    ne: { x: x + w, y: y },     // 右上
    e: { x: x + w, y: y + h / 2 },   // 右
    se: { x: x + w, y: y + h },      // 右下
    s: { x: x + w / 2, y: y + h },   // 下
    sw: { x: x, y: y + h },          // 左下
    w: { x: x, y: y + h / 2 },       // 左
  };
}

/** リサイズハンドルを描画する */
function drawHandles(ctx: CanvasRenderingContext2D, bb: BoundingBox) {
  const handles = getHandlePositions(bb);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  for (const h of Object.values(handles)) {
    ctx.fillRect(h.x - HANDLE_DRAW, h.y - HANDLE_DRAW, HANDLE_DRAW * 2, HANDLE_DRAW * 2);
    ctx.strokeRect(h.x - HANDLE_DRAW, h.y - HANDLE_DRAW, HANDLE_DRAW * 2, HANDLE_DRAW * 2);
  }
}

/** オーバーレイ描画のパラメータ */
export interface DrawOverlayParams {
  ctx: CanvasRenderingContext2D;                    // 描画コンテキスト
  dpr: number;                                      // デバイスピクセル比
  canvasWidth: number;                              // キャンバスの幅
  canvasHeight: number;                             // キャンバスの高さ
  blocks: TextBlock[];                              // テキストブロックの配列
  translations: Record<number, string> | null;      // 翻訳テキスト
  showTranslation: boolean;                         // 翻訳表示フラグ
  showLabels: boolean;                              // ラベル表示フラグ
  opacity: number;                                  // ブロックの不透明度
  selectedBlock: number;                            // 選択中のブロックインデックス
  caches: PageCaches;                               // 描画キャッシュ
  mainCanvas: HTMLCanvasElement;                    // メインキャンバス要素
  pageWidth: number;                                // ページの幅
  pageHeight: number;                               // ページの高さ
  noBorders?: boolean;                              // 枠線非表示フラグ（エクスポート用）
}

/**
 * オーバーレイを描画するメイン関数
 * テキストブロックの矩形、選択状態、翻訳テキスト、ラベルを描画する
 */
export function drawOverlay(params: DrawOverlayParams) {
  const {
    ctx, dpr, canvasWidth, canvasHeight,
    blocks, translations, showTranslation, showLabels, opacity, selectedBlock,
    caches, mainCanvas, pageWidth, pageHeight, noBorders = false,
  } = params;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.save();
  ctx.scale(dpr, dpr);

  const showTr = showTranslation && translations;

  // 色相とカラーテーブルのキャッシュを初期化（ブロック数が変わった場合も再生成）
  if (!caches.hues || caches.hues.length !== blocks.length) {
    caches.hues = genHues(blocks.length);
    caches.colorTable = buildColorTable(caches.hues);
  }
  const ct = caches.colorTable!;

  // 翻訳表示時はサンプリングデータを準備（背景色の推定に使用）
  let samplingData: ImageData | null = null;
  if (showTr) {
    if (!caches.samplingData) caches.samplingData = buildSamplingData(mainCanvas, pageWidth, pageHeight);
    samplingData = caches.samplingData;
  }

  // 各テキストブロックを描画（ホットパスのためforループを使用）
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const bb = block.bounding_box;
    if (!bb) continue;
    const isSelected = (i === selectedBlock);
    if (showTr && !translations![block.id] && noBorders) continue;

    if (showTr && translations![block.id]) {
      // 翻訳モード：背景色を推定して翻訳テキストを描画
      const { bg, fg } = getCachedBgColor(caches, block, samplingData!, pageWidth);
      ctx.fillStyle = bg;
      ctx.fillRect(bb.x, bb.y, bb.width, bb.height);
      if (!noBorders) {
        ctx.strokeStyle = isSelected ? "#fff" : colorRgba(ct, i, 0.6);
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeRect(bb.x, bb.y, bb.width, bb.height);
      }
      const tr = translations![block.id];
      ctx.fillStyle = fg;
      const pad = 4, availH = bb.height - pad * 2;
      const { fontSize, lines } = getCachedTextLayout(ctx, caches, block, tr);
      ctx.font = `${fontSize}px 'Noto Sans JP','DM Sans',sans-serif`;
      const lineH = fontSize * 1.35;
      const totalH = lines.length * lineH;
      const startY = bb.y + pad + Math.max(0, (availH - totalH) / 2) + fontSize;
      const bottomLimit = bb.y + bb.height - pad;
      for (let li = 0; li < lines.length; li++) {
        const yy = startY + li * lineH;
        if (yy < bottomLimit) ctx.fillText(lines[li], bb.x + pad, yy);
      }
      if (isSelected && !noBorders) drawHandles(ctx, bb);
    } else {
      // 通常モード：色付きの半透明矩形でブロックを表示
      ctx.fillStyle = colorRgba(ct, i, isSelected ? opacity + 0.15 : opacity);
      ctx.fillRect(bb.x, bb.y, bb.width, bb.height);
      if (!noBorders) {
        ctx.strokeStyle = isSelected ? "#fff" : colorRgba(ct, i, 0.9);
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeRect(bb.x, bb.y, bb.width, bb.height);
      }
      if (isSelected && !noBorders) drawHandles(ctx, bb);
      // ラベル表示：ブロックIDと種類を表示
      if (showLabels) {
        const lbl = `#${block.id} ${block.type}`;
        ctx.font = "bold 11px 'DM Mono',monospace";
        const tw = ctx.measureText(lbl).width;
        const lh = 16, lx = bb.x, ly = bb.y - lh - 2;
        ctx.fillStyle = colorRgba(ct, i, 0.9);
        ctx.fillRect(lx, ly < 0 ? bb.y : ly, tw + 8, lh);
        ctx.fillStyle = "#fff";
        ctx.fillText(lbl, lx + 4, (ly < 0 ? bb.y : ly) + 12);
      }
    }
  }
  ctx.restore();
}

export { getHandlePositions };
