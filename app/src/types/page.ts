import type { TextBlock } from './blocks';

/** ページの状態を表すインターフェース */
export interface PageState {
  pageNum: number;         // ページ番号
  width: number;           // ページの幅
  height: number;          // ページの高さ
  dpr: number;             // デバイスピクセル比
  blocks: TextBlock[] | null;                       // 抽出されたテキストブロック
  translations: Record<number, string> | null;      // 翻訳テキスト（ブロックIDがキー）
  showLabels: boolean;     // ラベル表示フラグ
  opacity: number;         // オーバーレイの不透明度
  showTranslation: boolean; // 翻訳表示フラグ
  selectedBlock: number;   // 選択中のブロックインデックス（-1で未選択）
  rendered: boolean;       // 描画完了フラグ
  rendering: boolean;      // 描画中フラグ
}

/** 対応する翻訳先言語 */
export type TargetLanguage = 'ja' | 'en' | 'zh' | 'ko' | 'fr' | 'de' | 'es';
