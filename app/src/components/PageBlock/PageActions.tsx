/**
 * @file PageActions.tsx
 * @description ページアクションボタン群コンポーネント。
 * テキスト検出、翻訳、JSON表示、PDF保存、表示モード切替、クリア、ブロック追加・削除、
 * Undo/Redo、履歴ツリー表示など、ページに対する各種操作ボタンと翻訳言語選択を提供する。
 */

import type { TargetLanguage } from '../../types';

/** ボタン共通のベースCSSクラス */
const btnBase = "px-3.5 py-1.5 text-[12px] font-semibold border-none rounded-md cursor-pointer transition-all font-sans disabled:opacity-40 disabled:cursor-not-allowed";

/** アクション種別ごとのボタンスタイル定義 */
const btnStyles: Record<string, string> = {
  detect: "bg-[#2563eb] text-white hover:bg-[#1d4ed8]",
  translate: "bg-[#7c3aed] text-white hover:bg-[#6d28d9]",
  json: "bg-[#065f46] text-[#6ee7b7] hover:bg-[#047857]",
  download: "bg-[#b45309] text-[#fef3c7] hover:bg-[#92400e]",
  toggle: "bg-[#4338ca] text-[#c7d2fe] hover:bg-[#3730a3]",
  clear: "bg-[#374151] text-[#d1d5db] hover:bg-[#4b5563]",
  add: "bg-[#0d9488] text-[#ccfbf1] hover:bg-[#0f766e]",
  delete: "bg-[#dc2626] text-[#fecaca] hover:bg-[#b91c1c]",
  undo: "bg-[#1e40af] text-[#93c5fd] hover:bg-[#1e3a8a]",
  redo: "bg-[#1e40af] text-[#93c5fd] hover:bg-[#1e3a8a]",
  tree: "bg-[#7e22ce] text-[#e9d5ff] hover:bg-[#6b21a8]",
};

/**
 * PageActionsコンポーネントのプロパティ
 * @property hasBlocks - テキストブロックが検出済みかどうか
 * @property hasTranslations - 翻訳結果が存在するかどうか
 * @property showTranslation - 翻訳表示モードが有効かどうか
 * @property selectedBlock - 現在選択中のブロックインデックス（-1で未選択）
 * @property canUndo - Undo操作が可能かどうか
 * @property canRedo - Redo操作が可能かどうか
 * @property hasUndoRoot - Undoツリーのルートが存在するかどうか
 * @property lang - 現在選択中の翻訳先言語
 * @property onLangChange - 翻訳言語変更時のコールバック
 * @property onDetect - テキスト検出ボタン押下時のコールバック
 * @property onTranslate - 翻訳ボタン押下時のコールバック
 * @property onShowJson - JSON表示ボタン押下時のコールバック
 * @property onDownload - PDF保存ボタン押下時のコールバック
 * @property onToggleMode - 表示モード切替ボタン押下時のコールバック
 * @property onClear - クリアボタン押下時のコールバック
 * @property onAddBlock - ブロック追加ボタン押下時のコールバック
 * @property onDeleteSelected - 選択ブロック削除ボタン押下時のコールバック
 * @property onUndo - Undoボタン押下時のコールバック
 * @property onRedo - Redoボタン押下時のコールバック
 * @property onToggleTree - 履歴ツリー表示切替ボタン押下時のコールバック
 */
interface Props {
  hasBlocks: boolean;
  hasTranslations: boolean;
  showTranslation: boolean;
  selectedBlock: number;
  canUndo: boolean;
  canRedo: boolean;
  hasUndoRoot: boolean;
  lang: TargetLanguage;
  onLangChange: (lang: TargetLanguage) => void;
  onDetect: () => void;
  onTranslate: () => void;
  onShowJson: () => void;
  onDownload: () => void;
  onToggleMode: () => void;
  onClear: () => void;
  onAddBlock: () => void;
  onDeleteSelected: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleTree: () => void;
}

/**
 * ページアクションボタン群コンポーネント。
 * テキスト検出・翻訳・PDF保存・Undo/Redoなどの操作ボタンと翻訳先言語の選択UIを提供する。
 * 各ボタンは状態に応じて有効/無効が切り替わる。
 */
export function PageActions({
  hasBlocks, hasTranslations, showTranslation, selectedBlock,
  canUndo, canRedo, hasUndoRoot, lang, onLangChange,
  onDetect, onTranslate, onShowJson, onDownload, onToggleMode,
  onClear, onAddBlock, onDeleteSelected, onUndo, onRedo, onToggleTree,
}: Props) {
  return (
    <div className="flex gap-1.5 flex-wrap mb-2 px-1">
      <button className={`${btnBase} ${btnStyles.detect}`} onClick={onDetect}>
        &#x1F50D; テキスト検出
      </button>
      <select
        value={lang}
        onChange={(e) => onLangChange(e.target.value as TargetLanguage)}
        className="px-2.5 py-1 text-[12px] rounded-md bg-app-surface border border-app-border text-app-text font-sans focus:outline-none focus:border-[#7c3aed]"
      >
        <option value="ja">日本語</option>
        <option value="en">English</option>
        <option value="zh">中文</option>
        <option value="ko">한국어</option>
        <option value="fr">Fran&ccedil;ais</option>
        <option value="de">Deutsch</option>
        <option value="es">Espa&ntilde;ol</option>
      </select>
      <button className={`${btnBase} ${btnStyles.translate}`} onClick={onTranslate} disabled={!hasBlocks}>
        &#x1F310; 翻訳
      </button>
      <button className={`${btnBase} ${btnStyles.json}`} onClick={onShowJson} disabled={!hasBlocks}>
        {"{ }"} JSON
      </button>
      <button className={`${btnBase} ${btnStyles.download}`} onClick={onDownload} disabled={!hasBlocks}>
        &#x1F4BE; PDF保存
      </button>
      {hasTranslations && (
        <button className={`${btnBase} ${btnStyles.toggle}`} onClick={onToggleMode}>
          {showTranslation ? "\u{1F50D} 検出表示" : "\u{1F310} 翻訳表示"}
        </button>
      )}
      <button className={`${btnBase} ${btnStyles.clear}`} onClick={onClear} disabled={!hasBlocks}>
        &#x2715; クリア
      </button>
      <button className={`${btnBase} ${btnStyles.add}`} onClick={onAddBlock} disabled={!hasBlocks}>
        &#x2795; ブロック追加
      </button>
      <button className={`${btnBase} ${btnStyles.delete}`} onClick={onDeleteSelected} disabled={!(hasBlocks && selectedBlock >= 0)}>
        &#x1F5D1; 選択削除
      </button>
      <button className={`${btnBase} ${btnStyles.undo}`} onClick={onUndo} disabled={!canUndo}>
        &#x21A9; 戻す
      </button>
      <button className={`${btnBase} ${btnStyles.redo}`} onClick={onRedo} disabled={!canRedo}>
        &#x21AA; 進む
      </button>
      <button className={`${btnBase} ${btnStyles.tree}`} onClick={onToggleTree} disabled={!hasUndoRoot}>
        &#x1F333; 履歴木
      </button>
    </div>
  );
}
