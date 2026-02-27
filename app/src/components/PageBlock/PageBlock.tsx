/**
 * @file PageBlock.tsx
 * @description ページブロックメインコンポーネント。
 * 1つのPDFページに対する全機能（ヘッダー、アクションボタン、キャンバス、ブロックリスト、
 * Undoツリー、オーバーレイ制御、ステータス表示）を統合し、ページ単位のUIを構成する。
 * 各サブコンポーネントを組み合わせ、ページストアやUndoツリーのフックと連携して動作する。
 */

import { useRef, useState } from 'react';
import type { CanvasContainerHandle } from '../../types';
import { usePageStore } from '../../stores/usePageStore';
import { useUndoTree } from '../../hooks/useUndoTree';
import { usePageActions } from '../../hooks/usePageActions';
import { PageHeader } from './PageHeader';
import { PageActions } from './PageActions';
import { OverlayControls } from './OverlayControls';
import { StatusIndicator } from './StatusIndicator';
import { CanvasContainer } from './CanvasContainer';
import { BlockList } from './BlockList';
import { UndoTreePanel } from './UndoTreePanel';

/**
 * PageBlockコンポーネントのプロパティ
 * @property pageNum - 表示対象のページ番号
 * @property totalPages - PDF全体の総ページ数
 * @property onEditTranslation - 翻訳編集時のコールバック（ページ番号とブロックインデックスを受け取る）
 * @property onShowJson - JSON表示時のコールバック（ページ番号を受け取る）
 */
interface Props {
  pageNum: number;
  totalPages: number;
  onEditTranslation: (pageNum: number, blockIndex: number) => void;
  onShowJson: (pageNum: number) => void;
}

/**
 * ページブロックメインコンポーネント。
 * 1つのPDFページに関連するすべてのUI要素（ヘッダー、アクション、キャンバス、
 * ブロック一覧、Undoツリー、オーバーレイ制御、ステータスインジケーター）を統合する。
 * ページストアから状態を取得し、useUndoTreeとusePageActionsフックを通じて
 * 検出・翻訳・履歴管理などの操作を提供する。
 */
export function PageBlock({ pageNum, totalPages, onEditTranslation, onShowJson }: Props) {
  const page = usePageStore((s) => s.pages[pageNum]);
  const canvasRef = useRef<CanvasContainerHandle>(null);
  const [showTree, setShowTree] = useState(false);

  const { undoTree, pushHistory, initTree, resetTree, handleUndo, handleRedo, handleGoto, canUndo, canRedo } =
    useUndoTree(pageNum);

  const {
    lang, setLang, status,
    handleDetect, handleTranslate, handleDownload,
    handleToggleMode, handleClear, handleAddBlock,
    handleDeleteSelected, handleDeleteBlock,
    handleDragEnd, handleResizeEnd,
  } = usePageActions(pageNum, canvasRef, { pushHistory, resetTree, initTree });

  if (!page) return null;

  return (
    <div className="mb-7" id={`page-block-${pageNum}`}>
      <PageHeader pageNum={pageNum} totalPages={totalPages} width={page.width} height={page.height} />
      <PageActions
        hasBlocks={!!page.blocks}
        hasTranslations={!!page.translations}
        showTranslation={page.showTranslation}
        selectedBlock={page.selectedBlock}
        canUndo={canUndo}
        canRedo={canRedo}
        hasUndoRoot={!!undoTree.root}
        lang={lang}
        onLangChange={setLang}
        onDetect={handleDetect}
        onTranslate={handleTranslate}
        onShowJson={() => onShowJson(pageNum)}
        onDownload={handleDownload}
        onToggleMode={handleToggleMode}
        onClear={handleClear}
        onAddBlock={handleAddBlock}
        onDeleteSelected={handleDeleteSelected}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleTree={() => setShowTree((v) => !v)}
      />
      <UndoTreePanel visible={showTree} undoTree={undoTree} onGoto={handleGoto} />
      <OverlayControls
        visible={!!page.blocks}
        showLabels={page.showLabels}
        opacity={page.opacity}
        onToggleLabels={(v) => usePageStore.getState().setShowLabels(pageNum, v)}
        onOpacityChange={(v) => usePageStore.getState().setOpacity(pageNum, v)}
      />
      {page.blocks && (
        <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-app-muted">
          &#x1F4A1; ブロックをドラッグで移動 ・ &#x25A1;ハンドルでサイズ変更
          {page.translations && " ・ ダブルタップで翻訳編集"}
        </div>
      )}
      <StatusIndicator type={status.type} message={status.message} />
      <CanvasContainer
        ref={canvasRef}
        pageNum={pageNum}
        width={page.width}
        height={page.height}
        onEditTranslation={(idx) => onEditTranslation(pageNum, idx)}
        onDragEnd={handleDragEnd}
        onResizeEnd={handleResizeEnd}
      />
      <BlockList blocks={page.blocks} translations={page.translations} onDeleteBlock={handleDeleteBlock} />
    </div>
  );
}
