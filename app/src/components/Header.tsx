/** アプリケーションヘッダーコンポーネント（タイトルとサブタイトルを表示） */
export function Header() {
  return (
    <header className="text-center mb-5">
      <h1 className="text-[22px] font-bold tracking-[2px] text-[#f0f0f0] font-mono">
        <span className="text-app-accent">&#x2B21;</span> PDF Preview + Analysis
      </h1>
      <p className="text-[13px] text-app-muted mt-1.5">
        PDFプレビュー＋テキストブロック検出＋翻訳
      </p>
    </header>
  );
}
