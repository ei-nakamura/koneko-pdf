/**
 * インタラクション幾何学モジュール
 * ポインタ操作（ドラッグ・リサイズ）のヒットテストと座標計算を担当する
 */
import type { BoundingBox, HandleDirection } from '../types';
import { getHandlePositions } from './canvasDrawing';

/** ハンドルのヒットテスト判定距離（px） */
export const HANDLE_SIZE = 12;
/** ブロックの最小サイズ（px） */
export const MIN_BLOCK = 20;

/**
 * マウス/タッチイベントからページ座標を取得する
 * キャンバスの表示サイズとページの実際のサイズの比率を考慮して変換する
 */
export function getPointerPos(
  canvas: HTMLCanvasElement,
  e: MouseEvent | TouchEvent,
  pageWidth: number,
  pageHeight: number,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const touch = 'touches' in e
    ? (e.touches[0] || e.changedTouches[0])
    : e;
  return {
    x: (touch.clientX - rect.left) * (pageWidth / rect.width),
    y: (touch.clientY - rect.top) * (pageHeight / rect.height),
  };
}

/**
 * 指定座標がどのブロック上にあるかを判定する（後方から検索）
 * @returns ヒットしたブロックのインデックス（ヒットなしの場合は-1）
 */
export function hitTestBlock(
  blocks: Array<{ bounding_box: BoundingBox }>,
  px: number,
  py: number,
): number {
  // 後方から検索（上に重なっているブロックを優先）
  for (let i = blocks.length - 1; i >= 0; i--) {
    const bb = blocks[i].bounding_box;
    if (!bb) continue;
    if (px >= bb.x && px <= bb.x + bb.width && py >= bb.y && py <= bb.y + bb.height) return i;
  }
  return -1;
}

/**
 * 選択中のブロックのリサイズハンドルとのヒットテスト
 * @returns ヒットしたハンドルの方向（ヒットなしの場合はnull）
 */
export function hitTestHandle(
  blocks: Array<{ bounding_box: BoundingBox }>,
  selectedBlock: number,
  px: number,
  py: number,
): HandleDirection | null {
  if (selectedBlock < 0 || !blocks[selectedBlock]) return null;
  const bb = blocks[selectedBlock].bounding_box;
  if (!bb) return null;
  const handles = getHandlePositions(bb);
  for (const [dir, h] of Object.entries(handles)) {
    if (Math.abs(px - h.x) <= HANDLE_SIZE && Math.abs(py - h.y) <= HANDLE_SIZE) return dir as HandleDirection;
  }
  return null;
}

/**
 * ドラッグ操作後の新しいバウンディングボックスを計算する
 * ページ境界内にクランプされる
 */
export function computeDragBB(
  pos: { x: number; y: number },
  offsetX: number,
  offsetY: number,
  bbWidth: number,
  bbHeight: number,
  pageWidth: number,
  pageHeight: number,
): BoundingBox {
  return {
    x: Math.round(Math.max(0, Math.min(pos.x - offsetX, pageWidth - bbWidth))),
    y: Math.round(Math.max(0, Math.min(pos.y - offsetY, pageHeight - bbHeight))),
    width: bbWidth,
    height: bbHeight,
  };
}

/**
 * リサイズ操作後の新しいバウンディングボックスを計算する
 * 最小サイズとページ境界の制約を適用する
 */
export function computeResizeBB(
  origBB: BoundingBox,
  dx: number,
  dy: number,
  dir: HandleDirection,
  pageWidth: number,
  pageHeight: number,
): BoundingBox {
  let nx = origBB.x, ny = origBB.y, nw = origBB.width, nh = origBB.height;
  // 方向に応じて座標とサイズを調整
  if (dir.includes("w")) { nx = origBB.x + dx; nw = origBB.width - dx; }
  if (dir.includes("e")) { nw = origBB.width + dx; }
  if (dir.includes("n")) { ny = origBB.y + dy; nh = origBB.height - dy; }
  if (dir.includes("s")) { nh = origBB.height + dy; }
  // 最小サイズの制約
  if (nw < MIN_BLOCK) { if (dir.includes("w")) nx = origBB.x + origBB.width - MIN_BLOCK; nw = MIN_BLOCK; }
  if (nh < MIN_BLOCK) { if (dir.includes("n")) ny = origBB.y + origBB.height - MIN_BLOCK; nh = MIN_BLOCK; }
  // ページ境界の制約
  nx = Math.max(0, nx); ny = Math.max(0, ny);
  if (nx + nw > pageWidth) nw = pageWidth - nx;
  if (ny + nh > pageHeight) nh = pageHeight - ny;
  return {
    x: Math.round(nx), y: Math.round(ny),
    width: Math.round(nw), height: Math.round(nh),
  };
}
