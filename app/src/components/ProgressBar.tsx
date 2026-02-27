/** プログレスバーコンポーネント（ページ読み込みの進捗を表示） */
import { useAppStore } from '../stores/useAppStore';

/**
 * プログレスバーコンポーネント。
 * ページの読み込み進捗をパーセェントで表示する。
 * useAppStore からページの読み込み進捗を取得し、パーセェントに変換える。
 *  progress.total が 0 の場合はパーセェントを 0 に設定する。
 * 追行中は、max-width: 540px、margin: auto、background-color: #f9fafb、border-radius: 0.5rem、overflow: hidden、height: 1.5rem のスタイルを適用する。
 */
export function ProgressBar() {
  const progress = useAppStore((s) => s.progress);
  if (!progress) return null;

  const pct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="max-w-[540px] mx-auto mb-4 bg-app-overlay rounded-md overflow-hidden h-1.5">
      <div
        className="h-full bg-app-accent rounded-md transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
