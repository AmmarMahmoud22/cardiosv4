import React from 'react';
import { ChevronLeft, ChevronRight, CloudDownload, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface PaginationControlsProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  hasMoreServer?: boolean;
  loadingMoreServer?: boolean;
  onLoadMoreServer?: () => void;
  itemLabelAr?: string;
  itemLabelEn?: string;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  hasMoreServer = false,
  loadingMoreServer = false,
  onLoadMoreServer,
  itemLabelAr = 'سجل',
  itemLabelEn = 'records',
}) => {
  const { isRTL, direction } = useLanguage();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, totalItems);

  const getVisiblePages = (): (number | 'ellipsis')[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | 'ellipsis')[] = [1];
    if (safePage > 3) pages.push('ellipsis');
    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (safePage < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
    return pages;
  };

  if (totalItems === 0 && !hasMoreServer) {
    return null;
  }

  return (
    <div
      dir={direction}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-100 text-xs"
    >
      <div className="flex flex-wrap items-center gap-3 text-slate-500">
        <span>
          {isRTL
            ? `عرض ${startIndex} - ${endIndex} من أصل ${totalItems} ${itemLabelAr}`
            : `Showing ${startIndex}-${endIndex} of ${totalItems} ${itemLabelEn}`}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400">
              {isRTL ? 'لكل صفحة:' : 'Per page:'}
            </span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 cursor-pointer"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {hasMoreServer && onLoadMoreServer && (
          <button
            type="button"
            onClick={onLoadMoreServer}
            disabled={loadingMoreServer}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-bold text-[11px] transition-all cursor-pointer disabled:opacity-50"
          >
            {loadingMoreServer ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <CloudDownload size={12} />
            )}
            <span>{isRTL ? 'تحميل دفعة إضافية من السحابة' : 'Load more from cloud'}</span>
          </button>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1 self-end sm:self-auto">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title={isRTL ? 'الصفحة السابقة' : 'Previous page'}
          >
            {isRTL ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {getVisiblePages().map((item, idx) =>
            item === 'ellipsis' ? (
              <span key={`e-${idx}`} className="px-1.5 text-slate-400 select-none">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  item === safePage
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item}
              </button>
            )
          )}

          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title={isRTL ? 'الصفحة التالية' : 'Next page'}
          >
            {isRTL ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      )}
    </div>
  );
};
