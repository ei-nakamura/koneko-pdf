/**
 * アプリケーション全体の状態管理ストア
 * APIキー、PDF情報、読み込み状態、エラーなどのグローバルな状態を管理する
 */
import { create } from 'zustand';
import type { PDFDocumentProxy } from '../types';

/** アプリケーション状態の型定義 */
interface AppState {
  apiKey: string;                                       // Claude APIキー
  currentPdf: PDFDocumentProxy | null;                  // 現在読み込まれているPDFドキュメント
  fileName: string | null;                              // ファイル名
  totalPages: number;                                   // 総ページ数
  error: string | null;                                 // エラーメッセージ
  loading: boolean;                                     // 読み込み中フラグ
  progress: { current: number; total: number } | null;  // 進捗状態
  miniGameActive: boolean;                              // ミニゲーム表示フラグ（API待機中の暇つぶし）
  setApiKey: (key: string) => void;                     // APIキーを設定
  setCurrentPdf: (pdf: PDFDocumentProxy | null) => void; // PDFドキュメントを設定
  setFileInfo: (name: string, pages: number) => void;   // ファイル情報を設定
  showError: (msg: string) => void;                     // エラーメッセージを表示
  clearError: () => void;                               // エラーをクリア
  setLoading: (loading: boolean) => void;               // 読み込み状態を設定
  setProgress: (current: number, total: number) => void; // 進捗を更新
  clearProgress: () => void;                            // 進捗をクリア
  setMiniGameActive: (active: boolean) => void;         // ミニゲームの表示切替
  clearAll: () => void;                                 // 全状態をリセット
}

export const useAppStore = create<AppState>((set) => ({
  // ローカルストレージからAPIキーを復元
  apiKey: localStorage.getItem('koneko-pdf-apikey') || '',
  currentPdf: null,
  fileName: null,
  totalPages: 0,
  error: null,
  loading: false,
  progress: null,
  miniGameActive: false,

  setApiKey: (key) => {
    // APIキーをローカルストレージに永続化
    localStorage.setItem('koneko-pdf-apikey', key);
    set({ apiKey: key });
  },
  setCurrentPdf: (pdf) => set({ currentPdf: pdf }),
  setFileInfo: (name, pages) => set({ fileName: name, totalPages: pages }),
  showError: (msg) => set({ error: msg }),
  clearError: () => set({ error: null }),
  setLoading: (loading) => set({ loading }),
  setProgress: (current, total) => set({ progress: { current, total } }),
  clearProgress: () => set({ progress: null }),
  setMiniGameActive: (active) => set({ miniGameActive: active }),
  clearAll: () => set({
    currentPdf: null,
    fileName: null,
    totalPages: 0,
    error: null,
    loading: false,
    progress: null,
  }),
}));
