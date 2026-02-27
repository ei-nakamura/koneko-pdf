/** バウンディングボックス（テキストブロックの位置とサイズ） */
export interface BoundingBox {
  x: number;       // X座標
  y: number;       // Y座標
  width: number;   // 幅
  height: number;  // 高さ
}

/** PDFから抽出されたテキストブロック */
export interface TextBlock {
  id: number;  // ブロックの一意識別子
  type: 'title' | 'heading' | 'paragraph' | 'list' | 'table' | 'caption' | 'header' | 'footer' | 'other';  // ブロックの種類
  content: string;           // テキスト内容
  bounding_box: BoundingBox; // 位置情報
  confidence: number;        // 認識の信頼度（0〜1）
}

/** ページのスナップショット（Undo/Redo用の状態保存） */
export interface PageSnapshot {
  blocks: TextBlock[];                        // テキストブロックの配列
  translations: Record<number, string> | null; // ブロックIDごとの翻訳テキスト
  showTranslation: boolean;                    // 翻訳表示フラグ
  selectedBlock: number;                       // 選択中のブロックインデックス
}

/** RGB色のエントリ */
export interface ColorEntry {
  r: number; // 赤（0〜255）
  g: number; // 緑（0〜255）
  b: number; // 青（0〜255）
}

/** ページ単位の描画キャッシュ（パフォーマンス最適化用） */
export interface PageCaches {
  hues: number[] | null;          // 色相のキャッシュ
  colorTable: ColorEntry[] | null; // カラーテーブルのキャッシュ
  textLayout: Record<string, { fontSize: number; lines: string[] }> | null; // テキストレイアウトのキャッシュ
  samplingData: ImageData | null;  // サンプリングデータのキャッシュ
  bgColor: Record<string, { bg: string; fg: string }> | null; // 背景色・前景色のキャッシュ
}
