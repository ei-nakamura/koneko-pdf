/** ファイル情報コンポーネント（読み込まれたPDFのファイル名とページ数を表示） */
import { useAppStore } from '../stores/useAppStore';

export function FileInfo() {
  const fileName = useAppStore((s) => s.fileName);
  const totalPages = useAppStore((s) => s.totalPages);

  if (!fileName) return null;

  return (
    <div className="max-w-[540px] mx-auto mb-4 flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-[rgba(245,158,66,0.08)] border border-[rgba(245,158,66,0.2)]">
      <span className="text-lg shrink-0">&#x1F4CE;</span>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-[#f0f0f0] overflow-hidden text-ellipsis whitespace-nowrap">
          {fileName}
        </div>
        <div className="text-[12px] text-[#9ca3af]">{totalPages} ページ</div>
      </div>
    </div>
  );
}
