/** エラーメッセージコンポーネント（5秒後に自動的に消える） */
import { useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';

export function ErrorMessage() {
  const error = useAppStore((s) => s.error);
  const clearError = useAppStore((s) => s.clearError);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  if (!error) return null;

  return (
    <div className="max-w-[540px] mx-auto mb-4 px-4 py-2.5 rounded-lg bg-[rgba(239,68,68,0.12)] text-[#f87171] text-[14px] text-center break-all">
      {error}
    </div>
  );
}
