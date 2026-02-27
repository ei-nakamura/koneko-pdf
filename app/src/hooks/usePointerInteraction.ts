/**
 * ポインタインタラクションフック
 * マウス/タッチイベントを処理して、テキストブロックのドラッグ・リサイズ・選択・
 * ダブルクリック編集などのインタラクションを実現する
 */
import { useEffect, useRef } from 'react';
import type { Interaction, BoundingBox } from '../types';
import { getPointerPos, hitTestBlock, hitTestHandle, computeDragBB, computeResizeBB } from '../lib/interactionGeometry';

/** ポインタインタラクションのコールバック群 */
interface PointerCallbacks {
  getBlocks: () => Array<{ bounding_box: BoundingBox; id: number }> | null; // ブロック一覧を取得
  getSelectedBlock: () => number;                    // 選択中のブロックインデックスを取得
  getPageSize: () => { width: number; height: number }; // ページサイズを取得
  getShowTranslation: () => boolean;                 // 翻訳表示状態を取得
  getTranslations: () => Record<number, string> | null; // 翻訳データを取得
  setSelectedBlock: (index: number) => void;         // 選択ブロックを設定
  onDragEnd: (blockIndex: number) => void;           // ドラッグ完了時のコールバック
  onResizeEnd: (blockIndex: number) => void;         // リサイズ完了時のコールバック
  onEditTranslation: (blockIndex: number) => void;   // 翻訳編集時のコールバック
  redraw: () => void;                                // オーバーレイの再描画をトリガー
  updateBlockBB: (blockIndex: number, bb: BoundingBox) => void; // ブロック位置を更新
}

/**
 * ポインタインタラクションを設定する
 * @param overlayCanvasRef - オーバーレイキャンバスへの参照
 * @param callbacks - インタラクションのコールバック群
 */
export function usePointerInteraction(
  overlayCanvasRef: React.RefObject<HTMLCanvasElement | null>,
  callbacks: PointerCallbacks,
) {
  const interactionRef = useRef<Interaction | null>(null); // 現在のインタラクション状態
  const startRef = useRef({ x: 0, y: 0 });                // インタラクション開始位置
  const movedRef = useRef(false);                          // ポインタが移動したかどうか
  const rafPendingRef = useRef(false);                     // requestAnimationFrame保留中フラグ
  const lastTapRef = useRef({ time: 0, x: 0, y: 0, block: -1 }); // ダブルタップ検出用

  useEffect(() => {
    const oc = overlayCanvasRef.current;
    if (!oc) return;

    const ac = new AbortController();
    const signal = ac.signal;

    /** requestAnimationFrameでスロットリングされた再描画 */
    function scheduleRedraw() {
      if (rafPendingRef.current) return;
      rafPendingRef.current = true;
      requestAnimationFrame(() => {
        rafPendingRef.current = false;
        callbacks.redraw();
      });
    }

    /** ポインタダウン：インタラクション開始 */
    function onStart(e: MouseEvent | TouchEvent) {
      const blocks = callbacks.getBlocks();
      if (!blocks?.length) return;
      const { width, height } = callbacks.getPageSize();
      const pos = getPointerPos(oc!, e, width, height);
      startRef.current = { x: pos.x, y: pos.y };
      movedRef.current = false;
      interactionRef.current = null;

      // リサイズハンドルのヒットテストを優先
      const selectedBlock = callbacks.getSelectedBlock();
      const handleDir = hitTestHandle(blocks, selectedBlock, pos.x, pos.y);
      if (handleDir && selectedBlock >= 0) {
        e.preventDefault();
        const bb = blocks[selectedBlock].bounding_box;
        interactionRef.current = {
          type: "resize", blockIndex: selectedBlock, dir: handleDir,
          origBB: { x: bb.x, y: bb.y, width: bb.width, height: bb.height },
        };
        return;
      }

      // ブロック本体のヒットテスト
      const idx = hitTestBlock(blocks, pos.x, pos.y);
      if (idx >= 0) {
        e.preventDefault();
        const bb = blocks[idx].bounding_box;
        interactionRef.current = {
          type: "drag", blockIndex: idx, offsetX: pos.x - bb.x, offsetY: pos.y - bb.y,
        };
        callbacks.setSelectedBlock(idx);
        callbacks.redraw();
      } else if (selectedBlock >= 0) {
        // 空白エリアをクリックした場合、選択を解除
        callbacks.setSelectedBlock(-1);
        callbacks.redraw();
      }
    }

    /** ポインタ移動：ドラッグ/リサイズの更新 */
    function onMove(e: MouseEvent | TouchEvent) {
      if (!interactionRef.current) return;
      e.preventDefault();
      const blocks = callbacks.getBlocks();
      if (!blocks) return;
      const { width, height } = callbacks.getPageSize();
      const pos = getPointerPos(oc!, e, width, height);
      const dx = pos.x - startRef.current.x;
      const dy = pos.y - startRef.current.y;
      // 微小な移動はクリックとして扱うため無視
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true;
      if (!movedRef.current) return;

      const interaction = interactionRef.current;
      const currentBB = blocks[interaction.blockIndex].bounding_box;
      let bb: BoundingBox;

      if (interaction.type === "drag") {
        bb = computeDragBB(pos, interaction.offsetX, interaction.offsetY, currentBB.width, currentBB.height, width, height);
      } else {
        bb = computeResizeBB(interaction.origBB, dx, dy, interaction.dir, width, height);
      }

      callbacks.updateBlockBB(interaction.blockIndex, bb);
      scheduleRedraw();
    }

    /** ポインタアップ：インタラクション完了 */
    function onEnd() {
      const interaction = interactionRef.current;
      // 移動があった場合はドラッグ/リサイズの完了を通知
      if (interaction && movedRef.current) {
        if (interaction.type === "drag") callbacks.onDragEnd(interaction.blockIndex);
        else if (interaction.type === "resize") callbacks.onResizeEnd(interaction.blockIndex);
      }

      // 移動がなかった場合はタップ/クリックとして処理（ダブルタップ検出）
      if (interaction && !movedRef.current) {
        const idx = interaction.blockIndex;
        const now = Date.now();
        const last = lastTapRef.current;
        const dist = Math.sqrt((startRef.current.x - last.x) ** 2 + (startRef.current.y - last.y) ** 2);
        // 350ms以内・30px以内・同じブロックへのタップでダブルタップ判定
        if (now - last.time < 350 && dist < 30 && last.block === idx) {
          const showTr = callbacks.getShowTranslation();
          const translations = callbacks.getTranslations();
          const blocks = callbacks.getBlocks();
          if (showTr && translations && blocks && translations[blocks[idx].id] !== undefined) {
            callbacks.onEditTranslation(idx);
          }
          lastTapRef.current = { time: 0, x: 0, y: 0, block: -1 };
        } else {
          lastTapRef.current = { time: now, x: startRef.current.x, y: startRef.current.y, block: idx };
        }
      } else if (!movedRef.current && !interaction) {
        lastTapRef.current = { time: 0, x: 0, y: 0, block: -1 };
      }

      interactionRef.current = null;
    }

    /** ダブルクリック：翻訳編集モーダルを開く */
    function onDblClick(e: MouseEvent) {
      const blocks = callbacks.getBlocks();
      const showTr = callbacks.getShowTranslation();
      const translations = callbacks.getTranslations();
      if (!blocks?.length || !showTr || !translations) return;
      const { width, height } = callbacks.getPageSize();
      const pos = getPointerPos(oc!, e, width, height);
      const idx = hitTestBlock(blocks, pos.x, pos.y);
      if (idx >= 0 && translations[blocks[idx].id] !== undefined) {
        e.preventDefault();
        callbacks.onEditTranslation(idx);
      }
    }

    // イベントリスナーの登録（AbortControllerで一括解除可能）
    oc.addEventListener("mousedown", onStart, { signal });
    oc.addEventListener("mousemove", onMove, { signal });
    oc.addEventListener("mouseup", onEnd, { signal });
    oc.addEventListener("mouseleave", onEnd, { signal });
    oc.addEventListener("dblclick", onDblClick, { signal });
    oc.addEventListener("touchstart", onStart as EventListener, { passive: false, signal });
    oc.addEventListener("touchmove", onMove as EventListener, { passive: false, signal });
    oc.addEventListener("touchend", onEnd, { signal });
    oc.addEventListener("touchcancel", onEnd, { signal });

    return () => ac.abort();
  }, [overlayCanvasRef, callbacks]);
}
