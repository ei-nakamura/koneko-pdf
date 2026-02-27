/**
 * @file CanvasContainer.tsx
 * @description キャンバスコンテナコンポーネント。
 * PDFページのレンダリング用メインキャンバスと、テキストブロックのオーバーレイ描画用キャンバスを管理する。
 * ページレンダリング、オーバーレイ描画、ポインタ操作（ドラッグ・リサイズ・選択）を統合し、
 * 状態変更時の再描画やキャッシュ無効化を自動的に処理する。
 * forwardRefでCanvasContainerHandleを外部に公開し、親コンポーネントからの制御を可能にする。
 */

import { useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { CanvasContainerHandle, PageCaches, BoundingBox } from '../../types';
import { usePageStore } from '../../stores/usePageStore';
import { usePageRenderer } from '../../hooks/usePageRenderer';
import { usePointerInteraction } from '../../hooks/usePointerInteraction';
import { drawOverlay } from '../../lib/canvasDrawing';

/**
 * CanvasContainerコンポーネントのプロパティ
 * @property pageNum - 表示対象のページ番号
 * @property width - キャンバスの表示幅（px）
 * @property height - キャンバスの表示高さ（px）
 * @property onEditTranslation - ブロックダブルタップ時の翻訳編集コールバック
 * @property onDragEnd - ブロックドラッグ終了時のコールバック
 * @property onResizeEnd - ブロックリサイズ終了時のコールバック
 */
interface Props {
  pageNum: number;
  width: number;
  height: number;
  onEditTranslation: (blockIndex: number) => void;
  onDragEnd: (blockIndex: number) => void;
  onResizeEnd: (blockIndex: number) => void;
}

/**
 * キャンバスコンテナコンポーネント。
 * メインキャンバス（PDFレンダリング）とオーバーレイキャンバス（ブロック表示・操作）の
 * 2層構造を持つ。usePageRendererでPDFを描画し、usePointerInteractionでマウス/タッチ
 * 操作を処理する。ページストアの状態変更を監視し、必要に応じてオーバーレイを再描画する。
 */
export const CanvasContainer = forwardRef<CanvasContainerHandle, Props>(
  ({ pageNum, width, height, onEditTranslation, onDragEnd, onResizeEnd }, ref) => {
    const mainCanvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const cachesRef = useRef<PageCaches>({
      hues: null, colorTable: null, textLayout: null, samplingData: null, bgColor: null,
    });

    const { ensureRendered, renderedRef } = usePageRenderer(pageNum, mainCanvasRef, overlayCanvasRef, containerRef);

    /**
     * オーバーレイキャンバスを再描画する。
     * ページストアから最新の状態を取得し、drawOverlayでブロック・翻訳・ラベル等を描画する。
     * キャッシュ（色相テーブル、テキストレイアウト等）を活用して描画を最適化する。
     */
    const redrawOverlay = useCallback(() => {
      const oc = overlayCanvasRef.current;
      const mc = mainCanvasRef.current;
      if (!oc || !mc) return;
      const page = usePageStore.getState().pages[pageNum];
      if (!page || !page.blocks || !renderedRef.current) return;
      const ctx = oc.getContext("2d");
      if (!ctx) return;
      drawOverlay({
        ctx, dpr: page.dpr,
        canvasWidth: oc.width, canvasHeight: oc.height,
        blocks: page.blocks, translations: page.translations,
        showTranslation: page.showTranslation, showLabels: page.showLabels,
        opacity: page.opacity, selectedBlock: page.selectedBlock,
        caches: cachesRef.current, mainCanvas: mc,
        pageWidth: page.width, pageHeight: page.height,
      });
    }, [pageNum, renderedRef]);

    /**
     * ポインタ操作のコールバック群。
     * usePointerInteractionフックに渡され、ブロックの選択・ドラッグ・リサイズ・
     * ダブルタップ編集などのインタラクションを処理する。
     */
    const pointerCallbacks = useRef({
      getBlocks: () => usePageStore.getState().pages[pageNum]?.blocks || null,
      getSelectedBlock: () => usePageStore.getState().pages[pageNum]?.selectedBlock ?? -1,
      getPageSize: () => ({ width, height }),
      getShowTranslation: () => usePageStore.getState().pages[pageNum]?.showTranslation ?? false,
      getTranslations: () => usePageStore.getState().pages[pageNum]?.translations || null,
      setSelectedBlock: (index: number) => {
        usePageStore.getState().setSelectedBlock(pageNum, index);
      },
      onDragEnd: (blockIndex: number) => onDragEnd(blockIndex),
      onResizeEnd: (blockIndex: number) => onResizeEnd(blockIndex),
      onEditTranslation: (blockIndex: number) => onEditTranslation(blockIndex),
      redraw: () => redrawOverlay(),
      updateBlockBB: (blockIndex: number, bb: BoundingBox) => {
        usePageStore.getState().updateBlockBB(pageNum, blockIndex, bb);
      },
    }).current;

    usePointerInteraction(overlayCanvasRef, pointerCallbacks);

    /**
     * ページストアの状態変更を監視し、オーバーレイを再描画する。
     * ブロックや翻訳が変更された場合はキャッシュを全無効化する。
     * 表示設定（表示モード・ラベル・透過度・選択ブロック）の変更時は再描画のみ行う。
     */
    useEffect(() => {
      let prevPage = usePageStore.getState().pages[pageNum];

      const unsub = usePageStore.subscribe((state) => {
        const page = state.pages[pageNum];
        if (!page || !page.blocks || !renderedRef.current) {
          prevPage = page;
          return;
        }

        const blocksChanged = prevPage?.blocks !== page.blocks;
        const translationsChanged = prevPage?.translations !== page.translations;
        const needsFullInvalidation = blocksChanged || translationsChanged;

        const needsRedraw = needsFullInvalidation ||
          prevPage?.showTranslation !== page.showTranslation ||
          prevPage?.showLabels !== page.showLabels ||
          prevPage?.opacity !== page.opacity ||
          prevPage?.selectedBlock !== page.selectedBlock;

        if (needsFullInvalidation) {
          // samplingDataはPDF描画結果に依存するため、ブロック/翻訳変更では保持する
          cachesRef.current = {
            hues: null, colorTable: null, textLayout: null,
            samplingData: cachesRef.current.samplingData,
            bgColor: null,
          };
        }

        if (needsRedraw) {
          requestAnimationFrame(() => redrawOverlay());
        }

        prevPage = page;
      });
      return unsub;
    }, [pageNum, redrawOverlay, renderedRef]);

    useImperativeHandle(ref, () => ({
      ensureRendered,
      getMainCanvas: () => mainCanvasRef.current,
      getOverlayCanvas: () => overlayCanvasRef.current,
    }));

    return (
      <div
        ref={containerRef}
        className="overflow-auto max-w-full relative border border-app-overlay rounded-md bg-app-card shadow-lg"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        <canvas
          ref={mainCanvasRef}
          style={{
            width: `${width}px`,
            height: `${height}px`,
            display: 'block',
            opacity: 0.15,
            transition: 'opacity 0.4s ease',
          }}
        />
        <canvas
          ref={overlayCanvasRef}
          className="absolute top-0 left-0"
          style={{
            width: `${width}px`,
            height: `${height}px`,
          }}
        />
      </div>
    );
  },
);

CanvasContainer.displayName = 'CanvasContainer';
