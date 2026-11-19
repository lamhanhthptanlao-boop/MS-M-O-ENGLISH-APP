import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { SentencePreviewRow } from '../utils/textParser';

interface SentenceCutPreviewTableProps {
  previewRows: SentencePreviewRow[];
  language?: 'en' | 'vi';
  defaultExpanded?: boolean;
  compact?: boolean;
}

export const SentenceCutPreviewTable: React.FC<SentenceCutPreviewTableProps> = ({
  previewRows,
  language = 'vi',
  defaultExpanded,
  compact = false,
}) => {
  const isEn = language === 'en';
  const keptCount = previewRows.filter((r) => r.kept).length;
  const droppedCount = previewRows.length - keptCount;
  const hasCuts = droppedCount > 0;

  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded ?? hasCuts);

  // Auto-open whenever cuts become active so the teacher/student always sees Kept vs Dropped sentences
  React.useEffect(() => {
    if (hasCuts) {
      setIsExpanded(true);
    }
  }, [hasCuts]);

  if (previewRows.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 overflow-hidden">
      <div className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 bg-white border-b border-slate-200/80">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-black text-slate-800">
            {isEn ? 'Sentence Keep / Drop Preview:' : 'Bảng xem trước Câu giữ / Câu loại:'}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>
              {isEn ? `Kept: ${keptCount}` : `Giữ: ${keptCount} câu`}
            </span>
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold border ${
              hasCuts
                ? 'bg-rose-100 text-rose-800 border-rose-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <XCircle className="w-3 h-3" />
            <span>
              {isEn ? `Dropped: ${droppedCount}` : `Loại: ${droppedCount} câu`}
            </span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1 transition-colors"
        >
          {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>
            {isExpanded
              ? isEn
                ? 'Hide Table'
                : 'Thu gọn bảng'
              : isEn
              ? 'Show Preview Table'
              : 'Xem bảng câu giữ/loại'}
          </span>
        </button>
      </div>

      {isExpanded && (
        <div className={`${compact ? 'max-h-44' : 'max-h-60'} overflow-y-auto`}>
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 z-10">
              <tr>
                <th className="py-2 px-3 w-12 text-center">#</th>
                <th className="py-2 px-3">{isEn ? 'Sentence' : 'Nội dung câu'}</th>
                <th className="py-2 px-3 w-16 text-center">{isEn ? 'Words' : 'Từ'}</th>
                <th className="py-2 px-3 w-28 text-center">{isEn ? 'Status' : 'Trạng thái'}</th>
                <th className="py-2 px-3 w-44">{isEn ? 'Reason' : 'Ghi chú'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {previewRows.map((row) => (
                <tr
                  key={row.sentence.id}
                  className={
                    row.kept
                      ? 'bg-emerald-50/40 text-slate-800'
                      : 'bg-rose-50/60 text-slate-500'
                  }
                >
                  <td className="py-2 px-3 text-center font-mono font-bold text-slate-500">
                    {row.index}
                  </td>
                  <td className="py-2 px-3">
                    <span className={row.kept ? 'font-medium text-slate-800' : 'line-through text-slate-400'}>
                      {row.sentence.cleanText}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center font-mono text-[11px] font-bold">
                    {row.sentence.wordCount}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {row.kept ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {isEn ? 'Kept' : '✓ Giữ lại'}
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                        {isEn ? 'Dropped' : '✕ Loại bỏ'}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-[11px] text-slate-600">
                    {isEn ? row.reasonEn : row.reasonVi}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
