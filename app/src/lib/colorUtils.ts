/**
 * 色ユーティリティモジュール
 * テキストブロックごとに異なる色を割り当てるための色生成・変換関数
 */
import type { ColorEntry } from '../types';

/**
 * n個のブロックに均等に分配された色相値の配列を生成する
 * @param n - ブロック数
 * @returns 0〜360度の色相値の配列
 */
export function genHues(n: number): number[] {
  const h: number[] = [];
  for (let i = 0; i < n; i++) h.push((i / n) * 360);
  return h;
}

/**
 * HSLからRGBA文字列に変換する
 * 彩度70%、明度50%固定で色相とアルファ値のみ指定可能
 */
export function hslRgba(hue: number, a: number): string {
  const s = 0.7, l = 0.5;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = l - c / 2;
  let r: number, g: number, b: number;
  if (hue < 60) { r = c; g = x; b = 0; }
  else if (hue < 120) { r = x; g = c; b = 0; }
  else if (hue < 180) { r = 0; g = c; b = x; }
  else if (hue < 240) { r = 0; g = x; b = c; }
  else if (hue < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return `rgba(${Math.round((r + m) * 255)},${Math.round((g + m) * 255)},${Math.round((b + m) * 255)},${a})`;
}

/**
 * 色相配列からRGBカラーテーブルを構築する
 * 描画時に毎回HSL→RGB変換する代わりに事前計算しておく
 */
export function buildColorTable(hues: number[]): ColorEntry[] {
  const s = 0.7, l = 0.5;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const m = l - c / 2;
  return hues.map(hue => {
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    let r: number, g: number, b: number;
    if (hue < 60) { r = c; g = x; b = 0; }
    else if (hue < 120) { r = x; g = c; b = 0; }
    else if (hue < 180) { r = 0; g = c; b = x; }
    else if (hue < 240) { r = 0; g = x; b = c; }
    else if (hue < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
  });
}

/**
 * カラーテーブルからRGBA文字列を生成する
 * @param colorTable - 事前計算されたカラーテーブル
 * @param i - ブロックのインデックス
 * @param a - アルファ値（0〜1）
 */
export function colorRgba(colorTable: ColorEntry[], i: number, a: number): string {
  const c = colorTable[i];
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}
