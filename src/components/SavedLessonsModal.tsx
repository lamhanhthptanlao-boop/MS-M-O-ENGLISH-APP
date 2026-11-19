import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Calendar,
  Trash2,
  ExternalLink,
  Sparkles,
  FileText,
  Check,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { SavedLessonItem } from '../storage';
import { DifficultyTier } from '../types';
import { playSoftTone, playSuccessChime } from '../utils/audio';

interface SavedLessonsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedLessons: SavedLessonItem[];
  language?: 'en' | 'vi';
  onLoadLesson: (lesson: SavedLessonItem) => void;
  onDeleteLesson: (lessonId: string) => Promise<void>;
}

export const SavedLessonsModal: React.FC<SavedLessonsModalProps> = ({
  isOpen,
  onClose,
  savedLessons,
  language = 'vi',
  onLoadLesson,
  onDeleteLesson,
}) => {
  const isEn = language === 'en';
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredLessons = savedLessons.filter((l) =>
    l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.rawText.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmMsg = isEn
      ? 'Are you sure you want to delete this saved lesson?'
      : 'Bạn có chắc chắn muốn xóa bài học này khỏi kho lưu trữ?';
    if (window.confirm(confirmMsg)) {
      setDeletingId(id);
      playSoftTone();
      await onDeleteLesson(id);
      setDeletingId(null);
    }
  };

  const handleSelectLesson = (lesson: SavedLessonItem) => {
    playSuccessChime();
    onLoadLesson(lesson);
    onClose();
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(isEn ? 'en-US' : 'vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl border-2 border-pink-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-xs shrink-0">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-extrabold text-base sm:text-xl truncate">
                {isEn ? 'Saved Lessons Library' : 'Kho bài học đã lưu'}
              </h3>
              <p className="text-xs text-pink-100">
                {isEn
                  ? `${savedLessons.length} lessons stored in this browser`
                  : `${savedLessons.length} bài học được lưu trên trình duyệt này`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-3.5 sm:p-4 border-b border-pink-100 bg-pink-50/40">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              isEn
                ? 'Search saved lessons by title or text...'
                : 'Tìm kiếm bài học theo tiêu đề hoặc nội dung...'
            }
            className="w-full text-xs sm:text-sm bg-white border border-pink-200 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400 placeholder:text-slate-400"
          />
        </div>

        {/* Modal Body / Lessons List */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3">
          {savedLessons.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-16 h-16 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center mx-auto text-2xl">
                📝
              </div>
              <h4 className="font-heading font-bold text-slate-700">
                {isEn ? 'No saved lessons yet' : 'Chưa có bài học nào được lưu'}
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                {isEn
                  ? 'After entering a passage in Lesson Creator, click "Save Lesson" to store it in this browser library.'
                  : 'Sau khi dán nội dung đoạn văn vào phòng Soạn bài, bấm nút "Lưu bài" để xem lại bất cứ lúc nào!'}
              </p>
            </div>
          ) : filteredLessons.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs sm:text-sm">
              {isEn
                ? `No lessons matching "${searchTerm}".`
                : `Không tìm thấy bài học nào phù hợp với từ khóa "${searchTerm}".`}
            </div>
          ) : (
            filteredLessons.map((lesson) => (
              <div
                key={lesson.id}
                onClick={() => handleSelectLesson(lesson)}
                className="group p-3.5 sm:p-4 rounded-2xl border-2 border-slate-100 hover:border-pink-300 bg-white hover:bg-pink-50/30 transition-all shadow-xs hover:shadow-md cursor-pointer flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-heading font-bold text-slate-800 text-sm sm:text-base group-hover:text-pink-600 transition-colors truncate">
                        {lesson.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          lesson.selectedTier === 'easy'
                            ? 'bg-emerald-100 text-emerald-800'
                            : lesson.selectedTier === 'medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {lesson.selectedTier || 'medium'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {lesson.rawText}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, lesson.id)}
                      disabled={deletingId === lesson.id}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50"
                      title={isEn ? 'Delete lesson' : 'Xóa bài học này'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-pink-400" />
                      {lesson.sentenceCount} {isEn ? 'sent.' : 'câu'} • {lesson.wordCount} {isEn ? 'words' : 'từ'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formatDate(lesson.createdAt)}
                    </span>
                  </div>

                  <span className="font-semibold text-pink-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    <span>{isEn ? 'Open' : 'Mở bài này'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            {isEn
              ? '💡 Stored locally on this browser (use Export JSON for backup).'
              : '💡 Lưu cục bộ trên trình duyệt này (hỗ trợ Xuất JSON để sao lưu).'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 font-semibold text-slate-700 rounded-xl transition-colors"
          >
            {isEn ? 'Close' : 'Đóng'}
          </button>
        </div>
      </div>
    </div>
  );
};
