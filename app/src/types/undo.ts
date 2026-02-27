import type { PageSnapshot } from './blocks';

/** Undoツリーのノード（分岐可能な履歴管理） */
export interface UndoNode {
  id: number;              // ノードの一意識別子
  snapshot: PageSnapshot;  // このノードが保持するページスナップショット
  label: string;           // 操作の説明ラベル
  parent: UndoNode | null; // 親ノード（ルートの場合はnull）
  children: UndoNode[];    // 子ノードの配列（分岐対応）
  ts: number;              // タイムスタンプ
}
