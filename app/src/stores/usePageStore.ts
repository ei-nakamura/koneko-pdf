/**
 * ページ状態管理ストア
 * 各PDFページのテキストブロック、翻訳、表示設定などの状態を管理する
 */
import { create } from 'zustand';
import type { PageState, TextBlock, BoundingBox } from '../types';

/** ページストアの型定義 */
interface PageStoreState {
  pages: Record<number, PageState>;                                              // ページ番号をキーとした状態マップ
  initPage: (num: number, width: number, height: number, dpr: number) => void;   // ページの初期化
  removePage: (num: number) => void;                                             // ページの削除
  setBlocks: (num: number, blocks: TextBlock[]) => void;                         // テキストブロックの設定
  setTranslations: (num: number, translations: Record<number, string>) => void;  // 翻訳の設定
  updateTranslation: (num: number, blockId: number, text: string) => void;       // 個別の翻訳を更新
  setSelectedBlock: (num: number, index: number) => void;                        // 選択ブロックの設定
  addBlock: (num: number) => TextBlock | null;                                   // 新しいブロックを追加
  deleteBlock: (num: number, blockIndex: number) => void;                        // ブロックを削除
  updateBlockBB: (num: number, blockIndex: number, bb: BoundingBox) => void;     // ブロックの位置/サイズを更新
  setShowTranslation: (num: number, show: boolean) => void;                      // 翻訳表示の切替
  setShowLabels: (num: number, show: boolean) => void;                           // ラベル表示の切替
  setOpacity: (num: number, opacity: number) => void;                            // 不透明度の設定
  setRendered: (num: number, rendered: boolean) => void;                         // 描画完了フラグの設定
  setRendering: (num: number, rendering: boolean) => void;                       // 描画中フラグの設定
  clearPage: (num: number) => void;                                              // ページの検出結果をクリア
  clearAllPages: () => void;                                                     // 全ページをクリア
  getPage: (num: number) => PageState | undefined;                               // ページ状態を取得
}

export const usePageStore = create<PageStoreState>((set, get) => {
  /** ページの部分更新ヘルパー */
  const updatePage = (num: number, patch: Partial<PageState>) =>
    set((state) => {
      const page = state.pages[num];
      if (!page) return state;
      return { pages: { ...state.pages, [num]: { ...page, ...patch } } };
    });

  return {
    pages: {},

    /** ページを初期化（デフォルト値で新規作成） */
    initPage: (num, width, height, dpr) => set((state) => ({
      pages: {
        ...state.pages,
        [num]: {
          pageNum: num, width, height, dpr,
          blocks: null, translations: null,
          showLabels: true, opacity: 0.3,
          showTranslation: true, selectedBlock: -1,
          rendered: false, rendering: false,
        },
      },
    })),

    /** ページを状態マップから削除 */
    removePage: (num) => set((state) => {
      const { [num]: _, ...rest } = state.pages;
      return { pages: rest };
    }),

    /** テキストブロックを設定（翻訳はリセットされる） */
    setBlocks: (num, blocks) => updatePage(num, { blocks, translations: null, showTranslation: false }),
    /** 翻訳テキストを設定し、翻訳表示をオンにする */
    setTranslations: (num, translations) => updatePage(num, { translations, showTranslation: true }),
    setSelectedBlock: (num, index) => updatePage(num, { selectedBlock: index }),
    setShowTranslation: (num, show) => updatePage(num, { showTranslation: show }),
    setShowLabels: (num, show) => updatePage(num, { showLabels: show }),
    setOpacity: (num, opacity) => updatePage(num, { opacity }),
    setRendered: (num, rendered) => updatePage(num, { rendered }),
    setRendering: (num, rendering) => updatePage(num, { rendering }),
    clearPage: (num) => updatePage(num, { blocks: null, translations: null, showTranslation: false, selectedBlock: -1 }),

    /** 特定のブロックの翻訳テキストを更新する */
    updateTranslation: (num, blockId, text) => set((state) => {
      const page = state.pages[num];
      if (!page || !page.translations) return state;
      return {
        pages: {
          ...state.pages,
          [num]: { ...page, translations: { ...page.translations, [blockId]: text } },
        },
      };
    }),

    /** 新しい空のテキストブロックをページ中央に追加する */
    addBlock: (num) => {
      const state = get();
      const page = state.pages[num];
      if (!page || !page.blocks) return null;
      const maxId = page.blocks.reduce((max, b) => Math.max(max, b.id), 0);
      // ページ中央に配置される適切なサイズのブロックを作成
      const w = Math.round(page.width * 0.3);
      const h = Math.round(page.height * 0.06);
      const newBlock: TextBlock = {
        id: maxId + 1, type: "paragraph", content: "",
        bounding_box: { x: Math.round((page.width - w) / 2), y: Math.round((page.height - h) / 2), width: w, height: h },
        confidence: 1.0,
      };
      set((state) => {
        const p = state.pages[num];
        if (!p || !p.blocks) return state;
        const newBlocks = [...p.blocks, newBlock];
        // 翻訳がある場合は新ブロック用の空翻訳も追加
        const newTranslations = p.translations ? { ...p.translations, [maxId + 1]: "" } : p.translations;
        return {
          pages: {
            ...state.pages,
            [num]: { ...p, blocks: newBlocks, translations: newTranslations, selectedBlock: newBlocks.length - 1 },
          },
        };
      });
      return newBlock;
    },

    /** 指定インデックスのブロックを削除し、関連する翻訳も除去する */
    deleteBlock: (num, blockIndex) => set((state) => {
      const page = state.pages[num];
      if (!page || !page.blocks || blockIndex < 0 || blockIndex >= page.blocks.length) return state;
      const block = page.blocks[blockIndex];
      const newBlocks = page.blocks.filter((_, i) => i !== blockIndex);
      // 削除されたブロックの翻訳を除去
      let newTranslations = page.translations;
      if (newTranslations && block.id in newTranslations) {
        const { [block.id]: _, ...rest } = newTranslations;
        newTranslations = rest;
      }
      // 選択状態を調整
      let newSelected = page.selectedBlock;
      if (newSelected === blockIndex) newSelected = -1;
      else if (newSelected > blockIndex) newSelected--;
      return {
        pages: {
          ...state.pages,
          [num]: { ...page, blocks: newBlocks, translations: newTranslations, selectedBlock: newSelected },
        },
      };
    }),

    /** ブロックのバウンディングボックス（位置/サイズ）を更新する */
    updateBlockBB: (num, blockIndex, bb) => set((state) => {
      const page = state.pages[num];
      if (!page || !page.blocks) return state;
      const newBlocks = page.blocks.map((b, i) =>
        i === blockIndex ? { ...b, bounding_box: { ...bb } } : b
      );
      return {
        pages: { ...state.pages, [num]: { ...page, blocks: newBlocks } },
      };
    }),

    clearAllPages: () => set({ pages: {} }),

    getPage: (num) => get().pages[num],
  };
});
