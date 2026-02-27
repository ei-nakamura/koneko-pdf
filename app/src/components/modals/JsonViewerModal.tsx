/**
 * @file JsonViewerModal.tsx
 * @description JSON表示モーダルコンポーネント。
 * PDFページのテキストブロック情報（座標、内容、翻訳データなど）を
 * JSON形式で整形表示するためのモーダルダイアログ。
 * デバッグや内容確認の用途で使用される。
 */
import { useEffect, useRef } from 'react';
import { usePageStore } from '../../stores/usePageStore';

/** JsonViewerModal コンポーネントのプロパティ */
interface Props {
  /** 表示対象のページ番号（nullの場合はモーダルを非表示） */
  pageNum: number | null;
  /** モーダルを閉じる際に呼び出されるコールバック */
  onClose: () => void;
}

/**
 * JSON表示モーダルコンポーネント。
 * 指定されたページのテキストブロック情報（画像サイズ、ブロック座標、翻訳テキスト）を
 * JSON形式で整形して表示する。Escapeキーまたは背景クリックで閉じることができる。
 */
export function JsonViewerModal({ pageNum, onClose }: Props) {
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pageNum === null) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pageNum, onClose]);

  if (pageNum === null) return null;

  const page = usePageStore.getState().pages[pageNum];
  if (!page?.blocks) return null;

  const data = {
    image_size: { width: page.width, height: page.height },
    text_blocks: page.blocks,
    translations: page.translations || null,
  };

  return (
    <div
      ref={bgRef}
      className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center p-5"
      onClick={(e) => { if (e.target === bgRef.current) onClose(); }}
    >
      <div className="bg-[#0d1117] border border-app-border rounded-xl max-w-[600px] w-full max-h-[80vh] overflow-auto p-5">
        <pre className="font-mono text-[12px] leading-relaxed text-[#c9d1d9] whitespace-pre-wrap break-all">
          {JSON.stringify(data, null, 2)}
        </pre>
        <button
          onClick={onClose}
          className="block mx-auto mt-3 px-6 py-2 bg-[#374151] text-[#d1d5db] border-none rounded-md cursor-pointer text-[14px] hover:bg-[#4b5563]"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
