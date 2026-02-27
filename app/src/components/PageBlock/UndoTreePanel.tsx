/**
 * @file UndoTreePanel.tsx
 * @description Undoツリーパネルコンポーネント。
 * ブロック編集履歴をツリー構造で可視化し、各ノード間の差分（ブロック追加・削除・
 * 内容変更・位置変更・翻訳変更）を詳細に表示する。ノードクリックで任意の履歴状態に
 * 移動（goto）でき、分岐（ブランチ）も視覚的に表現する。
 */

import { memo } from 'react';
import { UndoTree, computeDiff, type DiffEntry } from '../../lib/UndoTree';
import type { UndoNode } from '../../types';

/** ノードに差分計算結果をキャッシュするためのWeakMap */
const diffCache = new WeakMap<UndoNode, DiffEntry[] | null>();

/** キャッシュ付きcomputeDiff（スナップショットは不変なので安全にキャッシュ可能） */
function getCachedDiff(node: UndoNode): DiffEntry[] | null {
  if (diffCache.has(node)) return diffCache.get(node)!;
  const result = computeDiff(node);
  diffCache.set(node, result);
  return result;
}

/**
 * UndoTreePanelコンポーネントのプロパティ
 * @property visible - パネルの表示/非表示
 * @property undoTree - Undoツリーのインスタンス
 * @property onGoto - ノードクリック時のコールバック（対象ノードIDを受け取る）
 */
interface Props {
  visible: boolean;
  undoTree: UndoTree;
  onGoto: (nodeId: number) => void;
}

/**
 * 文字列を指定文字数で切り詰め、超過分を省略記号(...)で置換する。
 * @param s - 対象文字列
 * @param n - 最大文字数
 * @returns 切り詰められた文字列
 */
function trunc(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "\u2026" : s;
}

/**
 * タイムスタンプを「HH:MM:SS」形式の時刻文字列に変換する。
 * @param ts - Unixタイムスタンプ（ミリ秒）
 * @returns フォーマット済み時刻文字列
 */
function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

/**
 * 差分表示コンポーネント。
 * 親ノードとの差分（追加・削除・内容変更・位置変更・翻訳変更）を
 * 色分けされたアイコン付きで一覧表示する。
 * @param diffs - 差分エントリの配列
 */
function DiffDisplay({ diffs }: { diffs: DiffEntry[] }) {
  return (
    <div className="ml-5 my-0.5 mb-1 px-2 py-1 rounded bg-[rgba(255,255,255,0.03)] text-[11px] leading-relaxed border-l-2 border-[#4b5563] max-h-[120px] overflow-y-auto">
      {diffs.map((d, i) => {
        switch (d.type) {
          case 'add':
            return <div key={i} className="flex gap-1 items-baseline text-[#4ade80]">+ #{d.id} <span className="break-all">{trunc(d.text || '', 40)}</span></div>;
          case 'del':
            return <div key={i} className="flex gap-1 items-baseline text-[#f87171]">- #{d.id} <span className="break-all line-through opacity-60">{trunc(d.text || '', 40)}</span></div>;
          case 'mod-content':
            return (
              <div key={i} className="flex gap-1 items-baseline text-[#fbbf24]">
                &#x270E; #{d.id} <span className="break-all line-through opacity-60">{trunc(d.oldText || '', 25)}</span>
                <span className="text-app-muted shrink-0">&rarr;</span>
                <span className="break-all">{trunc(d.newText || '', 25)}</span>
              </div>
            );
          case 'mod-geo':
            return (
              <div key={i} className="flex gap-1 items-baseline text-[#60a5fa]">
                {d.moved && d.resized ? '\u229E' : d.moved ? '\u2194' : '\u21F2'} #{d.id}
                <span className="font-mono text-[10px] text-[#9ca3af]">({d.from?.x},{d.from?.y} {d.from?.w}&times;{d.from?.h})</span>
                <span className="text-app-muted shrink-0">&rarr;</span>
                <span className="font-mono text-[10px] text-[#9ca3af]">({d.to?.x},{d.to?.y} {d.to?.w}&times;{d.to?.h})</span>
              </div>
            );
          case 'tr-add':
            return <div key={i} className="flex gap-1 items-baseline text-[#4ade80]">&#x1F310;+ #{d.id} <span className="break-all">{trunc(d.text || '', 40)}</span></div>;
          case 'tr-del':
            return <div key={i} className="flex gap-1 items-baseline text-[#f87171]">&#x1F310;- #{d.id} <span className="break-all line-through opacity-60">{trunc(d.text || '', 40)}</span></div>;
          case 'tr-mod':
            return (
              <div key={i} className="flex gap-1 items-baseline text-[#fbbf24]">
                &#x1F310;&#x270E; #{d.id} <span className="break-all line-through opacity-60">{trunc(d.oldText || '', 20)}</span>
                <span className="text-app-muted shrink-0">&rarr;</span>
                <span className="break-all">{trunc(d.newText || '', 20)}</span>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

/**
 * ツリーノードコンポーネント（再帰的）。
 * Undoツリーの各ノードを描画し、現在ノード・祖先ノードをハイライト表示する。
 * 子ノードが1つの場合は直列表示、複数の場合はブランチ分岐として表示する。
 * 各ノードにはラベル、タイムスタンプ、差分情報が含まれる。
 * @param node - 描画対象のUndoノード
 * @param ancestors - 現在ノードからルートまでの祖先ノードIDのSet
 * @param currentId - 現在アクティブなノードのID
 * @param onGoto - ノードクリック時のコールバック
 */
const TreeNode = memo(function TreeNode({
  node, ancestors, currentId, onGoto,
}: {
  node: UndoNode;
  ancestors: Set<number>;
  currentId: number | undefined;
  onGoto: (nodeId: number) => void;
}) {
  const isCur = node.id === currentId;
  const isAnc = !isCur && ancestors.has(node.id);
  const label = node.label || `state #${node.id}`;
  const diffs = getCachedDiff(node);

  return (
    <>
      <div
        onClick={() => onGoto(node.id)}
        className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded cursor-pointer transition-colors whitespace-nowrap hover:bg-[rgba(255,255,255,0.06)]
          ${isCur ? 'bg-[rgba(245,158,66,0.18)] text-app-accent font-bold' : ''}`}
        title={label}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 border-2
          ${isCur ? 'border-app-accent bg-app-accent' : isAnc ? 'border-[#4ade80] bg-[#4ade80]' : 'border-app-muted bg-transparent'}`}
        />
        <span className={`overflow-hidden text-ellipsis ${isCur ? 'text-app-accent' : 'text-[#d1d5db]'}`}>
          {label}
        </span>
        <span className="text-app-muted text-[10px] ml-auto shrink-0">{fmtTime(node.ts)}</span>
      </div>
      {diffs && <DiffDisplay diffs={diffs} />}
      {node.children.length === 1 && (
        <div className="ml-[3px] pl-[13px] border-l-2 border-app-border">
          <TreeNode node={node.children[0]} ancestors={ancestors} currentId={currentId} onGoto={onGoto} />
        </div>
      )}
      {node.children.length > 1 && node.children.map((ch, bi) => (
        <div key={ch.id} className="ml-[3px] pl-[13px] border-l-2 border-app-border">
          <div className="text-[10px] text-app-muted py-0.5 pl-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-app-muted shrink-0" />
            branch {bi + 1}
          </div>
          <TreeNode node={ch} ancestors={ancestors} currentId={currentId} onGoto={onGoto} />
        </div>
      ))}
    </>
  );
});

/**
 * Undoツリーパネルコンポーネント。
 * 編集履歴をツリー構造で可視化し、各ノードの差分とタイムスタンプを表示する。
 * ノードクリックで任意の履歴状態にジャンプできる。
 * visible=falseまたはツリーが空の場合は何も描画しない。
 */
export function UndoTreePanel({ visible, undoTree, onGoto }: Props) {
  if (!visible || !undoTree.root) return null;

  const ancestors = undoTree.pathToRoot();
  const currentId = undoTree.current?.id;

  return (
    <div className="my-2 px-3 py-2.5 rounded-lg bg-[rgba(30,30,50,0.85)] border border-app-border font-mono text-[12px] max-h-[320px] overflow-y-auto leading-relaxed">
      <div className="text-[11px] font-bold text-[#9ca3af] tracking-wide mb-1.5 uppercase">
        &#x1F333; Undo Tree ({undoTree.size} nodes)
      </div>
      <TreeNode node={undoTree.root} ancestors={ancestors} currentId={currentId} onGoto={onGoto} />
    </div>
  );
}
