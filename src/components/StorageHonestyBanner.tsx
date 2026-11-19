import React, { useRef, useState } from 'react';
import {
  HardDrive,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Database,
} from 'lucide-react';
import { Assignment, AssignmentSubmission } from '../types';
import {
  applyAppBackupPayload,
  buildAppBackupPayload,
  downloadBackupJsonFile,
  parseAndValidateBackupJson,
} from '../utils/backupJson';

interface StorageHonestyBannerProps {
  language?: 'en' | 'vi';
  compact?: boolean;
  extraAssignments?: Assignment[];
  extraSubmissions?: AssignmentSubmission[];
  onDataImported?: () => void;
}

export const StorageHonestyBanner: React.FC<StorageHonestyBannerProps> = ({
  language = 'vi',
  compact = false,
  extraAssignments,
  extraSubmissions,
  onDataImported,
}) => {
  const isEn = language === 'en';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleExport = () => {
    try {
      const payload = buildAppBackupPayload(extraAssignments, extraSubmissions);
      downloadBackupJsonFile(payload);
      setFeedback({
        type: 'ok',
        text: isEn
          ? `Exported ${payload.data.savedLessons.length} lessons & ${payload.data.submissions.length} submissions to JSON.`
          : `Đã xuất ${payload.data.savedLessons.length} bài học & ${payload.data.submissions.length} bài nộp ra file JSON.`,
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Export failed.',
      });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const validated = parseAndValidateBackupJson(text);
      const summary = applyAppBackupPayload(validated);
      setFeedback({
        type: 'ok',
        text: isEn
          ? `Restored ${summary.savedLessonsCount} lessons, ${summary.assignmentsCount} assignments, ${summary.submissionsCount} submissions!`
          : `Đã khôi phục ${summary.savedLessonsCount} bài học, ${summary.assignmentsCount} link giao bài, ${summary.submissionsCount} bài nộp!`,
      });
      onDataImported?.();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Import JSON thất bại.',
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className={`rounded-2xl border border-amber-300 bg-amber-50/90 text-amber-950 shadow-xs max-w-full ${
        compact ? 'p-3' : 'p-4 sm:p-5'
      }`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 shrink-0">
            <HardDrive className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-extrabold text-amber-950 leading-snug">
              {isEn
                ? 'Local Browser Storage Only — Not Cloud Synced Across Devices'
                : 'Chỉ lưu trên trình duyệt này (Local Storage) — Chưa đồng bộ chéo thiết bị'}
            </p>
            <p className="text-[11px] sm:text-xs text-amber-800 mt-1 leading-relaxed">
              {isEn
                ? 'Lessons, scores, XP, and streaks are stored only in this browser (and local dev server JSON). Switching phones or browsers starts empty unless you Export/Import JSON or connect Supabase manually.'
                : 'Bài học, điểm số, XP và chuỗi ngày hiện chỉ lưu trên trình duyệt này. Nếu đổi máy hoặc trình duyệt khác sẽ không thấy dữ liệu cũ — hãy Xuất JSON để sao lưu hoặc làm theo hướng dẫn tự nối Supabase bên dưới.'}
            </p>
          </div>
        </div>

        {/* Action buttons — 360px safe flex-wrap */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-amber-700" />
            <span>{isEn ? 'Export JSON' : 'Xuất JSON'}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold shadow-2xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-amber-700" />
            <span>{isEn ? 'Import JSON' : 'Nhập JSON'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setShowGuide((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold shadow-2xs transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isEn ? 'Supabase Setup Steps' : 'Cách tự nối Supabase'}</span>
            {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {feedback && (
          <div
            className={`flex items-start gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
              feedback.type === 'ok'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {feedback.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="break-words">{feedback.text}</span>
          </div>
        )}

        {showGuide && (
          <div className="bg-white rounded-xl border border-amber-200 p-3 sm:p-4 text-xs text-slate-700 space-y-2.5 leading-relaxed">
            <p className="font-extrabold text-slate-900">
              {isEn
                ? 'Manual Steps to Connect Real Supabase Cloud Sync:'
                : 'Các bước chị cần tự làm tay để nối Supabase đồng bộ thật giữa các máy:'}
            </p>
            <ol className="list-decimal pl-4 space-y-1.5 text-[11px] sm:text-xs">
              <li>
                {isEn
                  ? 'Create a free project on supabase.com and open SQL Editor.'
                  : 'Tạo project miễn phí tại supabase.com → mở mục SQL Editor.'}
              </li>
              <li>
                {isEn
                  ? 'Create tables: assignments (id text primary key, title text, raw_text text, selected_tier text, assigned_task text, created_at timestamptz) and submissions (id text primary key, assignment_id text, student_name text, student_class text, payload jsonb, submitted_at timestamptz).'
                  : 'Tạo 2 bảng assignments và submissions với cột jsonb payload hoặc các cột điểm chuẩn.'}
              </li>
              <li>
                {isEn
                  ? 'Copy Project URL and anon public key from Settings → API.'
                  : 'Vào Settings → API copy Project URL và anon public key.'}
              </li>
              <li>
                {isEn
                  ? 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env / hosting environment variables.'
                  : 'Điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào file .env hoặc biến môi trường deploy.'}
              </li>
              <li>
                {isEn
                  ? 'Install @supabase/supabase-js and replace localStorage calls in src/storage/assignments.ts, then test across 2 separate browsers.'
                  : 'Cài @supabase/supabase-js, nối src/storage/assignments.ts vào Supabase rồi test mở 2 trình duyệt khác nhau (Chrome & Safari) để kiểm chứng.'}
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};
