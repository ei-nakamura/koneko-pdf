/**
 * ドロップゾーンコンポーネント
 * PDFファイルのドラッグ＆ドロップまたはクリックによるファイル選択を提供する
 */
import { useRef, useState, useCallback } from 'react';
import { usePdfLoader } from '../hooks/usePdfLoader';

/**
 * ドロップゾーンコンポーネント
 * PDFファイルのドラッグ＆ドロップまたはクリックによるファイル選択を提供する
 * ドラッグ&ドロップやクリックでファイルを選択すると、usePdfLoader()によるPDFファイルのロードが行われる
 */
export function DropZone() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const { handleFile } = usePdfLoader();

  const onClick = useCallback(() => fileInputRef.current?.click(), []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  }, [handleFile]);

  return (
    <div
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`max-w-[540px] mx-auto mb-5 px-4 py-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all
        ${dragOver ? 'border-app-accent bg-[rgba(245,158,66,0.04)]' : 'border-app-border bg-[rgba(255,255,255,0.02)] hover:border-app-accent hover:bg-[rgba(245,158,66,0.04)]'}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={onFileChange}
        className="hidden"
      />
      <div className="text-4xl mb-2">&#x1F4C4;</div>
      <div className="text-[15px] font-medium">タップしてPDFを選択</div>
      <div className="text-[12px] text-app-muted mt-1">またはドラッグ＆ドロップ</div>
    </div>
  );
}
