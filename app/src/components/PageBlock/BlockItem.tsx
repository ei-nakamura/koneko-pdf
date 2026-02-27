/**
 * @file BlockItem.tsx
 * @description 個別ブロック表示コンポーネント。
 * 検出された1つのテキストブロックの詳細情報（ID、種類、信頼度、テキスト内容）と
 * 翻訳テキスト（存在する場合）を表示する。ブロック固有の色で左ボーダーを装飾し、
 * 削除ボタンによる個別ブロックの削除機能を提供する。
 */

import type { TextBlock, ColorEntry } from '../../types';
import { colorRgba } from '../../lib/colorUtils';

/**
 * BlockItemコンポーネントのプロパティ
 * @property block - 表示対象のテキストブロック
 * @property index - ブロック配列内のインデックス
 * @property colorTable - ブロック色分け用のカラーテーブル
 * @property translation - このブロックの翻訳テキスト（未翻訳時はundefined）
 * @property onDelete - 削除ボタン押下時のコールバック（インデックスを受け取る）
 */
interface Props {
  block: TextBlock;
  index: number;
  colorTable: ColorEntry[];
  translation?: string;
  onDelete: (index: number) => void;
}

/**
 * 個別ブロック表示コンポーネント。
 * テキストブロックのID、種類、信頼度、内容テキストを表示する。
 * カラーテーブルからインデックスに対応する色を取得し、左ボーダーとヘッダーに適用する。
 * 翻訳テキストが存在する場合は区切り線付きで翻訳も表示する。
 */
export function BlockItem({ block, index, colorTable, translation, onDelete }: Props) {
  const c = colorRgba(colorTable, index, 1);

  return (
    <div
      className="px-2.5 py-2 mb-1 rounded-md bg-[rgba(255,255,255,0.03)] border-l-3 text-[12px] leading-relaxed"
      style={{ borderLeftColor: c }}
    >
      <div className="flex items-center justify-between">
        <div className="font-bold text-[11px] uppercase tracking-wide" style={{ color: c }}>
          #{block.id} {block.type} ({(block.confidence * 100).toFixed(0)}%)
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(index); }}
          className="bg-[rgba(220,38,38,0.15)] text-[#f87171] border border-[rgba(220,38,38,0.3)] rounded px-1.5 text-[11px] cursor-pointer font-mono leading-snug hover:bg-[rgba(220,38,38,0.35)] hover:text-[#fca5a5] transition-all"
        >
          &#x2715;
        </button>
      </div>
      <div className="text-[#d1d5db] mt-0.5 break-all">{block.content}</div>
      {translation && (
        <div className="text-[#c4b5fd] mt-1 pt-1 border-t border-dashed border-[rgba(255,255,255,0.1)] break-all">
          &#x1F310; {translation}
        </div>
      )}
    </div>
  );
}
