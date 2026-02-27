/**
 * Undoツリーフック
 * ページごとの編集履歴（Undo/Redo）をツリー構造で管理する
 * スナップショットの取得・復元・履歴操作の機能を提供する
 */
import { useRef, useReducer, useCallback } from 'react';
import type { PageSnapshot } from '../types';
import { usePageStore } from '../stores/usePageStore';
import { UndoTree } from '../lib/UndoTree';

/**
 * Undoツリーフック
 * @param pageNum - 対象ページ番号
 */
export function useUndoTree(pageNum: number) {
  const undoTreeRef = useRef(new UndoTree());
  const [, bump] = useReducer((c: number) => c + 1, 0); // 強制再レンダリング用

  /** 現在のページ状態からスナップショットを作成する（structuredCloneで高速コピー） */
  const captureSnapshot = useCallback((): PageSnapshot => {
    const page = usePageStore.getState().pages[pageNum];
    return {
      blocks: structuredClone(page?.blocks ?? []),
      translations: page?.translations ? { ...page.translations } : null,
      showTranslation: page?.showTranslation ?? false,
      selectedBlock: page?.selectedBlock ?? -1,
    };
  }, [pageNum]);

  /** スナップショットからページ状態を復元する（structuredCloneで高速コピー） */
  const restoreSnapshot = useCallback((snap: PageSnapshot) => {
    const store = usePageStore.getState();
    store.setBlocks(pageNum, structuredClone(snap.blocks));
    if (snap.translations) {
      store.setTranslations(pageNum, { ...snap.translations });
    }
    store.setShowTranslation(pageNum, snap.showTranslation);
    store.setSelectedBlock(pageNum, snap.selectedBlock);
  }, [pageNum]);

  /** 現在の状態を履歴に追加する */
  const pushHistory = useCallback((label: string) => {
    const page = usePageStore.getState().pages[pageNum];
    if (!page?.blocks) return;
    undoTreeRef.current.push(captureSnapshot(), label);
    bump();
  }, [pageNum, captureSnapshot]);

  /** ツリーを新しいスナップショットで初期化する */
  const initTree = useCallback((snapshot: PageSnapshot, label: string) => {
    undoTreeRef.current = new UndoTree();
    undoTreeRef.current.push(snapshot, label);
    bump();
  }, []);

  /** ツリーを完全にリセットする */
  const resetTree = useCallback(() => {
    undoTreeRef.current = new UndoTree();
    bump();
  }, []);

  /** Undo操作：一つ前の状態に戻る */
  const handleUndo = useCallback(() => {
    const snap = undoTreeRef.current.undo();
    if (snap) { restoreSnapshot(snap); bump(); }
  }, [restoreSnapshot]);

  /** Redo操作：一つ先の状態に進む */
  const handleRedo = useCallback(() => {
    const snap = undoTreeRef.current.redo();
    if (snap) { restoreSnapshot(snap); bump(); }
  }, [restoreSnapshot]);

  /** 指定されたノードに直接移動する */
  const handleGoto = useCallback((nodeId: number) => {
    const snap = undoTreeRef.current.goto(nodeId);
    if (snap) { restoreSnapshot(snap); bump(); }
  }, [restoreSnapshot]);

  return {
    undoTree: undoTreeRef.current,
    pushHistory,
    initTree,
    resetTree,
    handleUndo,
    handleRedo,
    handleGoto,
    canUndo: undoTreeRef.current.canUndo(),
    canRedo: undoTreeRef.current.canRedo(),
  };
}
