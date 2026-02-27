/**
 * @file StatusIndicator.tsx
 * @description ステータス表示コンポーネント。
 * テキスト検出中・翻訳中・成功・エラー・進行中などの処理状態をユーザーに通知する。
 * 状態に応じた背景色・テキスト色・ボーダー色の切替と、
 * 処理中状態（detecting/translating/progress）でのスピナーアニメーション表示を行う。
 */

/**
 * ステータスの種別を定義する型。
 * - 'detecting': テキスト検出中
 * - 'translating': 翻訳処理中
 * - 'success': 処理成功
 * - 'error': エラー発生
 * - 'progress': 汎用進行中
 * - null: ステータス非表示
 */
export type StatusType = 'detecting' | 'translating' | 'success' | 'error' | 'progress' | null;

/**
 * StatusIndicatorコンポーネントのプロパティ
 * @property type - 表示するステータスの種別
 * @property message - ステータスメッセージのテキスト
 */
interface Props {
  type: StatusType;
  message: string;
}

/**
 * ステータス表示コンポーネント。
 * 処理状態（検出中・翻訳中・成功・エラー等）に応じたスタイルでメッセージを表示する。
 * エラー時は赤背景で表示し、検出中・翻訳中・進行中はスピナー付きで表示する。
 * typeまたはmessageが空の場合は何も描画しない。
 */
export function StatusIndicator({ type, message }: Props) {
  if (!type || !message) return null;

  if (type === 'error') {
    return (
      <div className="px-4 py-2.5 rounded-lg bg-[rgba(239,68,68,0.12)] text-[#f87171] text-[14px] text-center break-all mb-2">
        {message}
      </div>
    );
  }

  const bgStyles: Record<string, string> = {
    detecting: 'bg-[rgba(37,99,235,0.12)] border-[rgba(37,99,235,0.3)] text-[#93c5fd]',
    translating: 'bg-[rgba(124,58,237,0.12)] border-[rgba(124,58,237,0.3)] text-[#c4b5fd]',
    success: 'bg-[rgba(16,185,129,0.12)] border-[rgba(16,185,129,0.3)] text-[#6ee7b7]',
    progress: 'bg-[rgba(124,58,237,0.12)] border-[rgba(124,58,237,0.3)] text-[#c4b5fd]',
  };

  const showSpinner = type === 'detecting' || type === 'translating' || type === 'progress';

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[13px] mb-2 ${bgStyles[type]}`}>
      {showSpinner && (
        <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.2)] border-t-current rounded-full animate-spin-custom shrink-0" />
      )}
      {message}
    </div>
  );
}
