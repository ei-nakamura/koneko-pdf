// pdf.jsのドキュメントプロキシ型を再エクスポート
export type { PDFDocumentProxy } from 'pdfjs-dist';

// 各型定義モジュールをまとめて再エクスポート
export * from './blocks';
export * from './page';
export * from './interaction';
export * from './undo';
export * from './canvas';
