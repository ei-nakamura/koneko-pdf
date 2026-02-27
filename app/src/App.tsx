/**
 * @file App.tsx
 * @description アプリケーションのルートコンポーネント。
 *
 * 全体のレイアウト構成を定義し、以下の主要な責務を担う:
 * - ヘッダー、APIキー入力、ドロップゾーン、ページ一覧などの各UIコンポーネントの配置
 * - JSON表示モーダルおよび翻訳編集モーダルの開閉状態の管理
 * - キーボードショートカットによるブロック削除操作のハンドリング
 * - ブレイクアウトゲームコンポーネントの遅延読み込み（React.lazy）
 */
import { useState, useCallback, lazy, Suspense } from 'react';
import { usePageStore } from './stores/usePageStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Header } from './components/Header';
import { ApiKeyInput } from './components/ApiKeyInput';
import { DropZone } from './components/DropZone';
import { ErrorMessage } from './components/ErrorMessage';
import { FileInfo } from './components/FileInfo';
import { ProgressBar } from './components/ProgressBar';
import { Spinner } from './components/Spinner';
import { PageList } from './components/PageList';
import { JsonViewerModal } from './components/modals/JsonViewerModal';
import { TranslationEditModal } from './components/modals/TranslationEditModal';

const BreakoutGame = lazy(() => import('./components/game/BreakoutGame'));

export default function App() {
  const [jsonPageNum, setJsonPageNum] = useState<number | null>(null);
  const [editState, setEditState] = useState<{ pageNum: number; blockIndex: number } | null>(null);

  const handleShowJson = useCallback((pageNum: number) => setJsonPageNum(pageNum), []);
  const handleCloseJson = useCallback(() => setJsonPageNum(null), []);

  const handleEditTranslation = useCallback((pageNum: number, blockIndex: number) => {
    setEditState({ pageNum, blockIndex });
  }, []);

  const handleCloseEdit = useCallback(() => setEditState(null), []);

  const handleSaveEdit = useCallback((pageNum: number, blockId: number, text: string) => {
    usePageStore.getState().updateTranslation(pageNum, blockId, text);
  }, []);

  useKeyboardShortcuts(
    useCallback((pageNum: number) => {
      const page = usePageStore.getState().pages[pageNum];
      if (page?.blocks && page.selectedBlock >= 0) {
        usePageStore.getState().deleteBlock(pageNum, page.selectedBlock);
      }
    }, []),
  );

  return (
    <main className="max-w-4xl mx-auto">
      <Header />
      <ApiKeyInput />
      <DropZone />
      <ErrorMessage />
      <FileInfo />
      <ProgressBar />
      <Spinner />
      <Suspense fallback={null}>
        <BreakoutGame />
      </Suspense>
      <PageList onEditTranslation={handleEditTranslation} onShowJson={handleShowJson} />
      <JsonViewerModal pageNum={jsonPageNum} onClose={handleCloseJson} />
      <TranslationEditModal
        pageNum={editState?.pageNum ?? null}
        blockIndex={editState?.blockIndex ?? null}
        onClose={handleCloseEdit}
        onSave={handleSaveEdit}
      />
    </main>
  );
}
