/**
 * @file PageHeader.tsx
 * @description ページヘッダーコンポーネント。
 * 各PDFページの上部に表示され、ページ番号（現在/全体）、ページサイズ（pt単位・mm単位）、
 * および判定された用紙サイズ名（A4、B5等）を表示する。
 */

import { mmFromPt, getPageSizeName } from '../../lib/pdfUtils';

/**
 * PageHeaderコンポーネントのプロパティ
 * @property pageNum - 現在のページ番号
 * @property totalPages - PDF全体の総ページ数
 * @property width - ページの幅（pt単位）
 * @property height - ページの高さ（pt単位）
 */
interface Props {
  pageNum: number;
  totalPages: number;
  width: number;
  height: number;
}

/**
 * ページヘッダーコンポーネント。
 * ページ番号、ページサイズ（pt・mm）、用紙サイズ名を表示する。
 * pt単位の幅・高さをmm単位に変換し、対応する用紙サイズ名があれば併せて表示する。
 */
export function PageHeader({ pageNum, totalPages, width, height }: Props) {
  const wMm = mmFromPt(width);
  const hMm = mmFromPt(height);
  const sizeName = getPageSizeName(wMm, hMm);

  return (
    <div className="flex items-center gap-2 flex-wrap mb-2 px-1">
      <span className="bg-app-surface text-app-text rounded px-2.5 py-0.5 font-bold text-[12px] tracking-wide whitespace-nowrap font-mono">
        Page {pageNum} / {totalPages}
      </span>
      <span className="text-app-muted font-mono text-[13px]">
        {Math.round(width)} &times; {Math.round(height)} pt
        <span className="mx-1.5 text-[#d1d5db]">|</span>
        {wMm.toFixed(1)} &times; {hMm.toFixed(1)} mm
        {sizeName && (
          <>
            <span className="mx-1.5 text-[#d1d5db]">|</span>
            <span className="text-app-accent font-semibold">{sizeName}</span>
          </>
        )}
      </span>
    </div>
  );
}
