import type { BoundingBox } from './blocks';

/** リサイズハンドルの方向（8方向） */
export type HandleDirection = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/** ドラッグ操作のインタラクション状態 */
export interface DragInteraction {
  type: 'drag';
  blockIndex: number; // 対象ブロックのインデックス
  offsetX: number;    // ドラッグ開始時のXオフセット
  offsetY: number;    // ドラッグ開始時のYオフセット
}

/** リサイズ操作のインタラクション状態 */
export interface ResizeInteraction {
  type: 'resize';
  blockIndex: number;    // 対象ブロックのインデックス
  dir: HandleDirection;  // リサイズの方向
  origBB: BoundingBox;   // リサイズ前の元のバウンディングボックス
}

/** インタラクションの共用型（ドラッグまたはリサイズ） */
export type Interaction = DragInteraction | ResizeInteraction;
