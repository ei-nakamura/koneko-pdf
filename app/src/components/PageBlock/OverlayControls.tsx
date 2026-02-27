/**
 * @file OverlayControls.tsx
 * @description オーバーレイ制御コンポーネント。
 * キャンバス上のテキストブロックオーバーレイに関する表示設定を提供する。
 * ラベル（ブロックID・種類）の表示/非表示切替チェックボックスと、
 * オーバーレイの透過度を調整するレンジスライダーを含む。
 */

/**
 * OverlayControlsコンポーネントのプロパティ
 * @property visible - このコントロール自体を表示するかどうか（ブロック存在時にtrue）
 * @property showLabels - ブロックラベルの表示状態
 * @property opacity - オーバーレイの不透明度（0.0〜1.0）
 * @property onToggleLabels - ラベル表示切替時のコールバック
 * @property onOpacityChange - 透過度変更時のコールバック（0.0〜1.0の値を受け取る）
 */
interface Props {
  visible: boolean;
  showLabels: boolean;
  opacity: number;
  onToggleLabels: (show: boolean) => void;
  onOpacityChange: (opacity: number) => void;
}

/**
 * オーバーレイ制御コンポーネント。
 * ブロックラベルの表示/非表示チェックボックスとオーバーレイ透過度のスライダーを表示する。
 * ブロックが未検出（visible=false）の場合は何も描画しない。
 */
export function OverlayControls({ visible, showLabels, opacity, onToggleLabels, onOpacityChange }: Props) {
  if (!visible) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap mb-2 px-1 text-[12px] text-[#9ca3af]">
      <label className="flex items-center gap-1 cursor-pointer">
        <input
          type="checkbox"
          checked={showLabels}
          onChange={(e) => onToggleLabels(e.target.checked)}
          className="accent-app-accent"
        />
        ラベル
      </label>
      <label className="flex items-center gap-1">
        透過度
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(opacity * 100)}
          onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
          className="w-20 accent-app-accent"
        />
      </label>
    </div>
  );
}
