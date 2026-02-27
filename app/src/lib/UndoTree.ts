/**
 * Undoツリーモジュール
 * 線形ではなくツリー構造のUndo/Redo履歴管理を提供する
 * 分岐した編集履歴を保持し、任意のノードに移動できる
 */
import type { UndoNode, PageSnapshot } from '../types';

/** Undoツリーのデータ構造と操作を管理するクラス */
export class UndoTree {
  root: UndoNode | null = null;    // ツリーのルートノード
  current: UndoNode | null = null; // 現在のアクティブノード
  private _nextId = 0;              // 次に割り当てるノードID
  private _size = 0;                // ツリー内のノード数（O(1)アクセス用）

  /** 新しいスナップショットをツリーに追加する */
  push(snapshot: PageSnapshot, label = ""): UndoNode {
    const node: UndoNode = {
      id: this._nextId++,
      snapshot,
      label,
      parent: this.current,
      children: [],
      ts: Date.now(),
    };
    // 現在のノードの子として追加
    if (this.current) this.current.children.push(node);
    this.current = node;
    if (!this.root) this.root = node;
    this._size++;
    return node;
  }

  /** 一つ前の状態に戻る（親ノードに移動） */
  undo(): PageSnapshot | null {
    if (!this.current?.parent) return null;
    this.current = this.current.parent;
    return this.current.snapshot;
  }

  /**
   * やり直す（子ノードに移動）
   * @param branchIndex - 分岐がある場合の子ノードインデックス（省略時は最新の分岐）
   */
  redo(branchIndex?: number): PageSnapshot | null {
    if (!this.current?.children.length) return null;
    const idx = (branchIndex !== undefined && branchIndex >= 0)
      ? Math.min(branchIndex, this.current.children.length - 1)
      : this.current.children.length - 1;
    this.current = this.current.children[idx];
    return this.current.snapshot;
  }

  /** 指定されたノードIDに直接移動する */
  goto(nodeId: number): PageSnapshot | null {
    const node = this._find(this.root, nodeId);
    if (!node) return null;
    this.current = node;
    return node.snapshot;
  }

  /** ツリー内のノードを再帰的に検索する */
  private _find(node: UndoNode | null, id: number): UndoNode | null {
    if (!node) return null;
    if (node.id === id) return node;
    for (const ch of node.children) {
      const r = this._find(ch, id);
      if (r) return r;
    }
    return null;
  }

  /** Undoが可能かどうか */
  canUndo(): boolean { return !!this.current?.parent; }
  /** Redoが可能かどうか */
  canRedo(): boolean { return !!(this.current?.children.length); }

  /** 現在のノードからルートまでのパスに含まれるノードIDのセットを返す */
  pathToRoot(): Set<number> {
    const path = new Set<number>();
    let n = this.current;
    while (n) { path.add(n.id); n = n.parent; }
    return path;
  }

  /** ツリー内の全ノード数を返す（O(1)） */
  get size(): number {
    return this._size;
  }
}

/** スナップショット間の差分エントリ */
export interface DiffEntry {
  type: 'add' | 'del' | 'mod-content' | 'mod-geo' | 'tr-add' | 'tr-del' | 'tr-mod'; // 変更の種類
  id: number;        // 対象ブロックID
  text?: string;     // テキスト（追加/削除時）
  oldText?: string;  // 変更前のテキスト
  newText?: string;  // 変更後のテキスト
  moved?: boolean;   // 移動されたか
  resized?: boolean; // リサイズされたか
  from?: { x: number; y: number; w: number; h: number }; // 変更前の位置・サイズ
  to?: { x: number; y: number; w: number; h: number };   // 変更後の位置・サイズ
}

/**
 * 2つのスナップショット間の差分を計算する
 * ブロックの追加/削除/内容変更/位置変更、翻訳の追加/削除/変更を検出する
 * @returns 差分エントリの配列（変更なしの場合はnull）
 */
export function computeDiff(node: UndoNode): DiffEntry[] | null {
  if (!node.parent) return null;
  const prev = node.parent.snapshot, curr = node.snapshot;
  const diffs: DiffEntry[] = [];

  // ブロックをIDでマッピング
  const prevMap = new Map<number, (typeof prev.blocks)[number]>();
  if (prev.blocks) prev.blocks.forEach(b => prevMap.set(b.id, b));
  const currMap = new Map<number, (typeof curr.blocks)[number]>();
  if (curr.blocks) curr.blocks.forEach(b => currMap.set(b.id, b));

  // 追加されたブロックを検出
  for (const [id, b] of currMap) {
    if (!prevMap.has(id)) diffs.push({ type: "add", id, text: b.content });
  }
  // 削除されたブロックを検出
  for (const [id, b] of prevMap) {
    if (!currMap.has(id)) diffs.push({ type: "del", id, text: b.content });
  }
  // 変更されたブロックを検出（内容変更と位置/サイズ変更）
  for (const [id, cb] of currMap) {
    const pb = prevMap.get(id);
    if (!pb) continue;
    if (pb.content !== cb.content) {
      diffs.push({ type: "mod-content", id, oldText: pb.content, newText: cb.content });
    }
    const pbb = pb.bounding_box, cbb = cb.bounding_box;
    if (pbb && cbb) {
      const moved = pbb.x !== cbb.x || pbb.y !== cbb.y;
      const resized = pbb.width !== cbb.width || pbb.height !== cbb.height;
      if (moved || resized) {
        diffs.push({
          type: "mod-geo", id, moved, resized,
          from: { x: pbb.x, y: pbb.y, w: pbb.width, h: pbb.height },
          to: { x: cbb.x, y: cbb.y, w: cbb.width, h: cbb.height },
        });
      }
    }
  }

  // 翻訳テキストの差分を検出
  const prevTr = prev.translations || {};
  const currTr = curr.translations || {};
  const allTrIds = new Set([...Object.keys(prevTr), ...Object.keys(currTr)]);
  for (const idStr of allTrIds) {
    const id = Number(idStr);
    const pv = prevTr[id], cv = currTr[id];
    if (pv !== cv) {
      if (pv === undefined && cv !== undefined) diffs.push({ type: "tr-add", id, text: cv });
      else if (pv !== undefined && cv === undefined) diffs.push({ type: "tr-del", id, text: pv });
      else diffs.push({ type: "tr-mod", id, oldText: pv, newText: cv });
    }
  }
  return diffs.length > 0 ? diffs : null;
}
