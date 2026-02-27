/**
 * キーボードショートカットフック
 * Delete/Backspaceキーで選択中のブロックを削除する
 */
import { useEffect } from 'react';
import { usePageStore } from '../stores/usePageStore';

/**
 * キーボードショートカットを登録する
 * @param onDelete - ブロック削除時のコールバック
 */
export function useKeyboardShortcuts(
  onDelete: (pageNum: number) => void,
) {
  useEffect(() => {
    /** 選択中のブロックがあるページ番号を探す */
    function findActivePageNum(): number | null {
      const pages = usePageStore.getState().pages;
      for (const numStr of Object.keys(pages)) {
        const num = parseInt(numStr);
        const p = pages[num];
        if (p.blocks && p.selectedBlock >= 0) return num;
      }
      return null;
    }

    function handleKeyDown(e: KeyboardEvent) {
      // 入力フィールドにフォーカスがある場合は無視
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        const num = findActivePageNum();
        if (num !== null) {
          const page = usePageStore.getState().pages[num];
          if (page?.blocks && page.selectedBlock >= 0) {
            e.preventDefault();
            onDelete(num);
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onDelete]);
}
