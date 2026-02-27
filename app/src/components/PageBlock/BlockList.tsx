/**
 * @file BlockList.tsx
 * @description ブロックリストコンポーネント。
 * テキスト検出で取得されたテキストブロックの一覧を表示する。
 * 各ブロックに対して色相に基づくカラーテーブルを生成し、
 * BlockItemコンポーネントに個々のブロック情報と翻訳テキストを渡して描画する。
 */

import { useMemo } from 'react';
import type { TextBlock, ColorEntry } from '../../types';
import { genHues, buildColorTable } from '../../lib/colorUtils';
import { BlockItem } from './BlockItem';

/**
 * BlockListコンポーネントのプロパティ
 * @property blocks - 検出されたテキストブロックの配列（未検出時はnull）
 * @property translations - ブロックID別の翻訳テキストマップ（未翻訳時はnull）
 * @property onDeleteBlock - ブロック削除時のコールバック（ブロックインデックスを受け取る）
 */
interface Props {
  blocks: TextBlock[] | null;
  translations: Record<number, string> | null;
  onDeleteBlock: (index: number) => void;
}

/**
 * ブロックリストコンポーネント。
 * 検出済みテキストブロックの一覧を色分けして表示する。
 * ブロック数に応じた色相テーブルを生成し、各BlockItemに割り当てる。
 * ブロックが存在しない場合は何も描画しない。
 */
export function BlockList({ blocks, translations, onDeleteBlock }: Props) {
  const colorTable: ColorEntry[] | null = useMemo(
    () => blocks?.length ? buildColorTable(genHues(blocks.length)) : null,
    [blocks?.length],
  );

  if (!blocks?.length || !colorTable) return null;

  return (
    <div className="mt-2 px-1">
      {blocks.map((block, i) => (
        <BlockItem
          key={block.id}
          block={block}
          index={i}
          colorTable={colorTable}
          translation={translations?.[block.id]}
          onDelete={onDeleteBlock}
        />
      ))}
    </div>
  );
}
