/**
 * ページアクションフック
 * テキストブロックの検出、翻訳、PDFダウンロード、ブロックの追加/削除などの
 * ページ単位の操作ロジックをまとめて提供する
 */
import { useState, useCallback } from 'react';
import type { TargetLanguage, CanvasContainerHandle, PageSnapshot } from '../types';
import type { StatusType } from '../components/PageBlock/StatusIndicator';
import { useAppStore } from '../stores/useAppStore';
import { usePageStore } from '../stores/usePageStore';
import { detectBlocks, translateBlocks } from '../lib/claudeApi';
import { drawOverlay } from '../lib/canvasDrawing';
import { canvasToJPEGBytes, buildPDF, downloadPdfBytes } from '../lib/pdfExport';

/** Undoツリー操作のインターフェース */
interface UndoTreeActions {
  pushHistory: (label: string) => void;  // 履歴を追加
  resetTree: () => void;                  // ツリーをリセット
  initTree: (snapshot: PageSnapshot, label: string) => void; // ツリーを初期化
}

/**
 * ページアクションフック
 * @param pageNum - 対象ページ番号
 * @param canvasRef - キャンバスコンテナへの参照
 * @param undoTree - Undoツリーの操作
 */
export function usePageActions(
  pageNum: number,
  canvasRef: React.RefObject<CanvasContainerHandle | null>,
  undoTree: UndoTreeActions,
) {
  const [lang, setLang] = useState<TargetLanguage>('ja');
  const [status, setStatus] = useState<{ type: StatusType; message: string }>({ type: null, message: '' });

  /** テキストブロック検出処理 */
  const handleDetect = useCallback(async () => {
    const apiKey = useAppStore.getState().apiKey;
    if (!apiKey) { useAppStore.getState().showError("APIキーを入力してください"); return; }
    setStatus({ type: 'detecting', message: 'テキストブロックを検出中...' });
    useAppStore.getState().setMiniGameActive(true);
    try {
      await canvasRef.current?.ensureRendered();
      const mc = canvasRef.current?.getMainCanvas();
      if (!mc) throw new Error("Canvas not ready");
      const page = usePageStore.getState().pages[pageNum];
      const { blocks, truncated } = await detectBlocks(apiKey, mc, page.width, page.height);
      usePageStore.getState().setBlocks(pageNum, blocks);
      const warn = truncated ? "（応答が長すぎたため一部欠落の可能性あり）" : "";
      setStatus({ type: 'success', message: `${blocks.length} ブロック検出${warn}` });
      // 検出結果でUndoツリーを初期化
      undoTree.initTree({
        blocks: structuredClone(blocks),
        translations: null, showTranslation: false, selectedBlock: -1,
      }, `検出 (${blocks.length}ブロック)`);
    } catch (e) {
      setStatus({ type: 'error', message: `検出エラー: ${(e as Error).message}` });
    } finally {
      useAppStore.getState().setMiniGameActive(false);
    }
  }, [pageNum, canvasRef, undoTree]);

  /** テキストブロック翻訳処理 */
  const handleTranslate = useCallback(async () => {
    const page = usePageStore.getState().pages[pageNum];
    if (!page?.blocks?.length) return;
    const apiKey = useAppStore.getState().apiKey;
    if (!apiKey) { useAppStore.getState().showError("APIキーを入力してください"); return; }
    setStatus({ type: 'translating', message: '翻訳中...' });
    useAppStore.getState().setMiniGameActive(true);
    try {
      const { translations, errors } = await translateBlocks(
        apiKey, page.blocks, lang,
        (completed, total) => setStatus({ type: 'progress', message: `翻訳中... (${completed}/${total})` }),
      );
      usePageStore.getState().setTranslations(pageNum, translations);
      if (errors > 0) {
        setStatus({ type: 'success', message: `翻訳一部完了 — ${Object.keys(translations).length}/${page.blocks.length} 成功` });
      } else {
        setStatus({ type: 'success', message: '翻訳完了' });
      }
      undoTree.pushHistory('翻訳');
    } catch (e) {
      setStatus({ type: 'error', message: `翻訳エラー: ${(e as Error).message}` });
    } finally {
      useAppStore.getState().setMiniGameActive(false);
    }
  }, [pageNum, lang, undoTree]);

  /** PDFダウンロード処理（現在の表示状態を画像としてPDFに書き出す） */
  const handleDownload = useCallback(async () => {
    const page = usePageStore.getState().pages[pageNum];
    if (!page?.blocks) return;
    setStatus({ type: 'detecting', message: 'PDF生成中...' });
    try {
      await canvasRef.current?.ensureRendered();
      const mc = canvasRef.current?.getMainCanvas();
      const oc = canvasRef.current?.getOverlayCanvas();
      if (!mc || !oc) throw new Error("Canvas not ready");

      // オーバーレイを枠線なしで再描画（エクスポート用）
      const ctx = oc.getContext("2d")!;
      drawOverlay({
        ctx, dpr: page.dpr,
        canvasWidth: oc.width, canvasHeight: oc.height,
        blocks: page.blocks, translations: page.translations,
        showTranslation: page.showTranslation, showLabels: page.showLabels,
        opacity: page.opacity, selectedBlock: page.selectedBlock,
        caches: { hues: null, colorTable: null, textLayout: null, samplingData: null, bgColor: null },
        mainCanvas: mc, pageWidth: page.width, pageHeight: page.height,
        noBorders: true,
      });

      // メインキャンバスとオーバーレイを合成
      const tmp = document.createElement("canvas");
      tmp.width = mc.width; tmp.height = mc.height;
      const tmpCtx = tmp.getContext("2d")!;
      tmpCtx.drawImage(mc, 0, 0);
      tmpCtx.drawImage(oc, 0, 0);

      // JPEG→PDFに変換してダウンロード
      const jpegBytes = await canvasToJPEGBytes(tmp, tmp.width, tmp.height);
      const pdfBytes = buildPDF([{ width: tmp.width, height: tmp.height, jpegBytes }]);
      tmp.width = 0; tmp.height = 0;

      const mode = (page.showTranslation && page.translations) ? "translated" : "detected";
      const ok = downloadPdfBytes(pdfBytes, `page-${pageNum}-${mode}.pdf`);
      setStatus({ type: ok ? 'success' : 'error', message: ok ? 'PDFを保存しました' : 'ダウンロードに失敗しました' });
    } catch (e) {
      setStatus({ type: 'error', message: `PDF生成エラー: ${(e as Error).message}` });
    }
  }, [pageNum, canvasRef]);

  /** 翻訳表示と検出表示の切替 */
  const handleToggleMode = useCallback(() => {
    const page = usePageStore.getState().pages[pageNum];
    usePageStore.getState().setShowTranslation(pageNum, !page?.showTranslation);
  }, [pageNum]);

  /** 検出結果をクリアして初期状態に戻す */
  const handleClear = useCallback(() => {
    usePageStore.getState().clearPage(pageNum);
    undoTree.resetTree();
    setStatus({ type: null, message: '' });
  }, [pageNum, undoTree]);

  /** 新しい空ブロックを追加する */
  const handleAddBlock = useCallback(() => {
    const newBlock = usePageStore.getState().addBlock(pageNum);
    if (newBlock) undoTree.pushHistory(`ブロック追加 #${newBlock.id}`);
  }, [pageNum, undoTree]);

  /** 選択中のブロックを削除する */
  const handleDeleteSelected = useCallback(() => {
    const page = usePageStore.getState().pages[pageNum];
    if (page?.blocks && page.selectedBlock >= 0) {
      const blockId = page.blocks[page.selectedBlock].id;
      usePageStore.getState().deleteBlock(pageNum, page.selectedBlock);
      undoTree.pushHistory(`削除 #${blockId}`);
    }
  }, [pageNum, undoTree]);

  /** 指定インデックスのブロックを削除する */
  const handleDeleteBlock = useCallback((index: number) => {
    const page = usePageStore.getState().pages[pageNum];
    if (page?.blocks && index >= 0 && index < page.blocks.length) {
      const blockId = page.blocks[index].id;
      usePageStore.getState().deleteBlock(pageNum, index);
      undoTree.pushHistory(`削除 #${blockId}`);
    }
  }, [pageNum, undoTree]);

  /** ドラッグ操作完了時に履歴を追加する */
  const handleDragEnd = useCallback((blockIndex: number) => {
    const blocks = usePageStore.getState().pages[pageNum]?.blocks;
    if (blocks?.[blockIndex]) undoTree.pushHistory(`移動 #${blocks[blockIndex].id}`);
  }, [pageNum, undoTree]);

  /** リサイズ操作完了時に履歴を追加する */
  const handleResizeEnd = useCallback((blockIndex: number) => {
    const blocks = usePageStore.getState().pages[pageNum]?.blocks;
    if (blocks?.[blockIndex]) undoTree.pushHistory(`リサイズ #${blocks[blockIndex].id}`);
  }, [pageNum, undoTree]);

  return {
    lang, setLang, status,
    handleDetect, handleTranslate, handleDownload,
    handleToggleMode, handleClear, handleAddBlock,
    handleDeleteSelected, handleDeleteBlock,
    handleDragEnd, handleResizeEnd,
  };
}
