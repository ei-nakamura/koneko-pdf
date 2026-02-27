/**
 * JSONパーサーモジュール
 * Claude APIのレスポンスから安全にJSONを抽出・修復する
 */

/**
 * 切り詰められたJSONを修復する
 * APIレスポンスがmax_tokensで切り詰められた場合に、
 * 閉じ括弧を追加して有効なJSONに変換を試みる
 */
function repairTruncatedJson(s: string): string {
  try { JSON.parse(s); return s; } catch { /* 修復を試行 */ }
  // 不完全なプロパティやオブジェクトを除去
  let repaired = s.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/g, '');
  repaired = repaired.replace(/,\s*"[^"]*"\s*:\s*[\d.]+$/g, '');
  repaired = repaired.replace(/,\s*"[^"]*"\s*:?\s*$/g, '');
  repaired = repaired.replace(/,\s*\{[^}]*$/g, '');
  repaired = repaired.replace(/,\s*$/, '');
  // 閉じ括弧のスタックを管理して不足分を追加
  const closesNeeded: string[] = [];
  for (const ch of repaired) {
    if (ch === '{') closesNeeded.push('}');
    else if (ch === '[') closesNeeded.push(']');
    else if (ch === '}' || ch === ']') closesNeeded.pop();
  }
  while (closesNeeded.length > 0) repaired += closesNeeded.pop();
  try {
    JSON.parse(repaired);
    console.log("[repairTruncatedJson] 修復成功、閉じ括弧", closesNeeded.length, "個追加");
    return repaired;
  } catch (e) {
    console.warn("[repairTruncatedJson] 修復失敗:", (e as Error).message);
    return s;
  }
}

/**
 * テキストからJSONを抽出してパースする
 * マークダウンのコードブロック囲み、前後の説明文、
 * 制御文字、末尾カンマなどに対応する
 */
export function parseJson(text: string): Record<string, unknown> {
  let s = text.trim();
  // マークダウンのコードブロック囲みを除去
  s = s.replace(/^`{3,}(?:json|JSON)?\s*\n?/, '').replace(/\n?\s*`{3,}\s*$/, '').trim();
  // JSONの開始位置を探す（説明文が前にある場合に対応）
  if (s[0] !== '{' && s[0] !== '[') {
    const braceStart = s.indexOf('{'), bracketStart = s.indexOf('[');
    const start = (braceStart >= 0 && (bracketStart < 0 || braceStart < bracketStart)) ? braceStart : bracketStart;
    if (start >= 0) {
      const open = s[start], close = open === '{' ? '}' : ']';
      let d = 0, e = -1;
      for (let i = start; i < s.length; i++) {
        if (s[i] === open) d++;
        else if (s[i] === close) { d--; if (d === 0) { e = i; break; } }
      }
      if (e > start) s = s.substring(start, e + 1);
    }
  }
  // 制御文字の除去と末尾カンマの修正
  s = s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').replace(/,(\s*[}\]])/g, '$1');
  console.log("[parseJson] 最終結果（先頭300文字）:", s.substring(0, 300));
  // 切り詰められたJSONの修復を試行
  s = repairTruncatedJson(s);
  try {
    return JSON.parse(s);
  } catch (e) {
    const err = e as Error;
    // エラー位置周辺のコンテキストを表示
    const posMatch = err.message.match(/position (\d+)/);
    let ctx = "";
    if (posMatch) {
      const p = parseInt(posMatch[1]);
      ctx = `\n位置 ${p} 付近: ...${s.substring(Math.max(0, p - 50), Math.min(s.length, p + 50))}...`;
    }
    throw new Error(`JSON解析エラー: ${err.message}${ctx}`);
  }
}
