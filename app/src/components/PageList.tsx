/**
 * ページリストコンポーネント
 * PDFの各ページをPageBlockコンポーネントとして一覧表示する
 */
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../stores/useAppStore';
import { usePageStore } from '../stores/usePageStore';
import { ErrorBoundary } from './ErrorBoundary';
import { PageBlock } from './PageBlock/PageBlock';

interface Props {
  onEditTranslation: (pageNum: number, blockIndex: number) => void;
  onShowJson: (pageNum: number) => void;
}

export function PageList({ onEditTranslation, onShowJson }: Props) {
  const totalPages = useAppStore((s) => s.totalPages);
  const pageNums = usePageStore(useShallow((s) => Object.keys(s.pages).map(Number).sort((a, b) => a - b)));

  if (pageNums.length === 0) return null;

  return (
    <div>
      {pageNums.map((num) => (
        <ErrorBoundary key={num}>
          <PageBlock
            pageNum={num}
            totalPages={totalPages}
            onEditTranslation={onEditTranslation}
            onShowJson={onShowJson}
          />
        </ErrorBoundary>
      ))}
    </div>
  );
}
