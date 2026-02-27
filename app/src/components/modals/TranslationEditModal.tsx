/**
 * @file TranslationEditModal.tsx
 * @description 翻訳編集モーダルコンポーネント。
 * PDFページ内の個々のテキストブロックに対応する翻訳テキストを
 * ユーザーが直接編集・保存するためのモーダルダイアログ。
 * 原文の表示、翻訳テキストの編集、Ctrl+Enterでの保存に対応する。
 */
import { useState, useEffect, useRef } from 'react';
import { usePageStore } from '../../stores/usePageStore';

/** TranslationEditModal コンポーネントのプロパティ */
interface Props {
  /** 対象のページ番号（nullの場合はモーダルを非表示） */
  pageNum: number | null;
  /** 編集対象のブロックインデックス（nullの場合はモーダルを非表示） */
  blockIndex: number | null;
  /** モーダルを閉じる際に呼び出されるコールバック */
  onClose: () => void;
  /** 翻訳テキストを保存する際に呼び出されるコールバック */
  onSave: (pageNum: number, blockId: number, text: string) => void;
}

/**
 * 翻訳編集モーダルコンポーネント。
 * 指定されたページ・ブロックの翻訳テキストを編集するためのダイアログを表示する。
 * 原文を参照しながら翻訳テキストを編集でき、Ctrl+Enter（またはCmd+Enter）で
 * 素早く保存することが可能。Escapeキーまたは背景クリックでキャンセルできる。
 */
export function TranslationEditModal({ pageNum, blockIndex, onClose, onSave }: Props) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pageNum === null || blockIndex === null) return;
    const page = usePageStore.getState().pages[pageNum];
    if (!page?.blocks || !page.translations) return;
    const block = page.blocks[blockIndex];
    if (!block) return;
    setText(page.translations[block.id] || '');
    setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
    }, 50);
  }, [pageNum, blockIndex]);

  useEffect(() => {
    if (pageNum === null) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pageNum, onClose]);

  if (pageNum === null || blockIndex === null) return null;

  const page = usePageStore.getState().pages[pageNum];
  if (!page?.blocks || !page.translations) return null;
  const block = page.blocks[blockIndex];
  if (!block) return null;

  /** 編集した翻訳テキストを保存し、モーダルを閉じる */
  const handleSave = () => {
    onSave(pageNum, block.id, text);
    onClose();
  };

  return (
    <div
      ref={bgRef}
      className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === bgRef.current) onClose(); }}
    >
      <div className="bg-[#0d1117] border border-app-border rounded-xl max-w-[480px] w-full p-4">
        <div className="text-[14px] font-bold text-[#c4b5fd] mb-1 font-mono">
          &#x1F310; 翻訳テキスト編集 — #{block.id} {block.type}
        </div>
        <div className="text-[12px] text-app-muted mb-2.5 px-2 py-1.5 bg-[rgba(255,255,255,0.03)] rounded-md break-all leading-relaxed">
          原文: {block.content}
        </div>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleSave(); }
          }}
          className="w-full min-h-[100px] p-2.5 rounded-lg bg-app-surface border border-app-border text-app-text font-sans text-[14px] leading-relaxed resize-y focus:outline-none focus:border-[#7c3aed]"
        />
        <div className="flex gap-2 mt-2.5 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-[13px] font-semibold border-none rounded-md cursor-pointer bg-[#374151] text-[#d1d5db] hover:bg-[#4b5563]"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-[13px] font-semibold border-none rounded-md cursor-pointer bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
