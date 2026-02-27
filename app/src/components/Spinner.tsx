/** 読み込み中スピナーコンポーネント */
import { useAppStore } from '../stores/useAppStore';

export function Spinner() {
  const loading = useAppStore((s) => s.loading);
  if (!loading) return null;

  return (
    <div className="text-center py-10">
      <div className="w-9 h-9 mx-auto mb-3 border-3 border-app-border border-t-app-accent rounded-full animate-spin-custom" />
      <div className="text-[14px] text-[#9ca3af]">読み込み中...</div>
    </div>
  );
}
