/**
 * PDF読み込みフック
 * ファイルからPDFを読み込み、各ページの初期状態を設定する
 */
import { useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useAppStore } from '../stores/useAppStore';
import { usePageStore } from '../stores/usePageStore';

// pdf.jsのWebWorkerを設定
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

/** ページ初期化のバッチサイズ（並列でgetPageを呼ぶ単位） */
const PAGE_BATCH = 5;

export function usePdfLoader() {
  /** ファイルを読み込んでPDFとして処理する */
  const handleFile = useCallback(async (file: File) => {
    // PDFファイルのバリデーション
    if (file.type !== "application/pdf") {
      useAppStore.getState().showError("PDFファイルを選択してください");
      return;
    }

    // 既存の状態をクリア
    useAppStore.getState().clearAll();
    usePageStore.getState().clearAllPages();
    useAppStore.getState().setLoading(true);

    try {
      // 既存のPDFドキュメントを破棄
      const prevPdf = useAppStore.getState().currentPdf;
      if (prevPdf) {
        prevPdf.destroy();
        useAppStore.getState().setCurrentPdf(null);
      }

      // PDFを読み込み
      const data = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      useAppStore.getState().setCurrentPdf(pdf);

      const total = pdf.numPages;
      useAppStore.getState().setLoading(false);
      useAppStore.getState().setFileInfo(file.name, total);
      useAppStore.getState().setProgress(0, total);

      const dpr = window.devicePixelRatio || 1;

      // 各ページのビューポート情報をバッチで並列取得して初期化
      for (let start = 1; start <= total; start += PAGE_BATCH) {
        const end = Math.min(start + PAGE_BATCH - 1, total);
        const promises: Promise<void>[] = [];
        for (let i = start; i <= end; i++) {
          promises.push(
            pdf.getPage(i).then((page) => {
              const vp = page.getViewport({ scale: 1.0 });
              usePageStore.getState().initPage(i, vp.width, vp.height, dpr);
            }),
          );
        }
        await Promise.all(promises);
        useAppStore.getState().setProgress(end, total);
      }

      useAppStore.getState().clearProgress();
    } catch (e) {
      useAppStore.getState().setLoading(false);
      useAppStore.getState().showError("PDF読み込み失敗: " + ((e as Error)?.message || e));
    }
  }, []);

  return { handleFile };
}
