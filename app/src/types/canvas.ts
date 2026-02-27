/** Canvas要素を管理するためのハンドルインターフェース */
export interface CanvasContainerHandle {
  ensureRendered: () => Promise<void>;                // 描画完了を保証する
  getMainCanvas: () => HTMLCanvasElement | null;      // メインキャンバスを取得
  getOverlayCanvas: () => HTMLCanvasElement | null;   // オーバーレイキャンバスを取得
}
