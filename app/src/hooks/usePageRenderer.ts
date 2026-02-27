/**
 * ページ描画フック
 * IntersectionObserverによる遅延読み込みでPDFページをキャンバスに描画する
 */
import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { usePageStore } from '../stores/usePageStore';

/**
 * PDFページの描画を管理する
 * @param pageNum - 対象ページ番号
 * @param mainCanvasRef - メインキャンバスへの参照
 * @param overlayCanvasRef - オーバーレイキャンバスへの参照
 * @param containerRef - コンテナ要素への参照（IntersectionObserver用）
 */
export function usePageRenderer(
  pageNum: number,
  mainCanvasRef: React.RefObject<HTMLCanvasElement | null>,
  overlayCanvasRef: React.RefObject<HTMLCanvasElement | null>,
  containerRef: React.RefObject<HTMLElement | null>,
) {
  const renderingRef = useRef(false);   // 描画中フラグ
  const renderedRef = useRef(false);    // 描画完了フラグ
  const waitersRef = useRef<Array<() => void>>([]); // 描画完了待ちのPromise解決関数

  /** 描画が完了するまで待機する（イベント駆動：ポーリング不要） */
  const ensureRendered = useCallback(async () => {
    if (renderedRef.current) return;
    if (renderingRef.current) {
      // 描画中の場合はPromiseで完了通知を待つ
      await new Promise<void>((resolve) => {
        waitersRef.current.push(resolve);
      });
      return;
    }
    await renderPage();
  }, [pageNum]);

  /** PDFページをキャンバスに描画する */
  const renderPage = useCallback(async () => {
    const canvas = mainCanvasRef.current;
    const oc = overlayCanvasRef.current;
    const pdf = useAppStore.getState().currentPdf;
    const page = usePageStore.getState().pages[pageNum];
    if (!canvas || !oc || !pdf || !page || renderedRef.current || renderingRef.current) return;

    renderingRef.current = true;
    usePageStore.getState().setRendering(pageNum, true);

    try {
      const pdfPage = await pdf.getPage(pageNum);
      const vp = pdfPage.getViewport({ scale: 1.0 });
      const dpr = page.dpr;

      // 高解像度ディスプレイに対応したキャンバスサイズを設定
      canvas.width = page.width * dpr;
      canvas.height = page.height * dpr;
      oc.width = page.width * dpr;
      oc.height = page.height * dpr;

      const ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);
      await pdfPage.render({ canvas: null, canvasContext: ctx, viewport: vp }).promise;

      canvas.style.opacity = "1";
      renderedRef.current = true;
      usePageStore.getState().setRendered(pageNum, true);
      // 描画完了を待っているPromiseを全て解決する
      const waiters = waitersRef.current.splice(0);
      for (const resolve of waiters) resolve();
    } finally {
      renderingRef.current = false;
      usePageStore.getState().setRendering(pageNum, false);
    }
  }, [pageNum, mainCanvasRef, overlayCanvasRef]);

  // IntersectionObserverによる遅延読み込み
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const renderObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // ビューポートに近づいたら描画を開始
          if (entry.isIntersecting && !renderedRef.current) {
            renderPage();
          }
        }
      },
      { rootMargin: '100% 0px' }, // ビューポートの100%先まで先読み
    );

    renderObserver.observe(el);

    return () => {
      renderObserver.disconnect();
    };
  }, [containerRef, renderPage]);

  return { ensureRendered, renderedRef };
}
