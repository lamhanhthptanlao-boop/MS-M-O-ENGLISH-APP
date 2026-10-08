import React, { useState, useEffect } from 'react';
import { X, BookmarkPlus, Sparkles, Check, Loader2, BookOpen } from 'lucide-react';
import { DifficultyTier } from '../types';
import { playSuccessChime, playSoftTone } from '../utils/audio';

interface SaveLessonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  rawText: string;
  selectedTier: DifficultyTier;
  sentenceCount: number;
  wordCount: number;
  onSave: (title: string) => Promise<void>;
}

export const SaveLessonDialog: React.FC<SaveLessonDialogProps> = ({
  isOpen,
  onClose,
  rawText,
  selectedTier,
  sentenceCount,
  wordCount,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Generate suggested title on open
  useEffect(() => {
    if (isOpen) {
      setSavedSuccess(false);
      const firstSentence = rawText.trim().split(/[.?!]/)[0] || '';
      const cleanSnippet = firstSentence.slice(0, 40).trim();
      const defaultTitle = cleanSnippet
        ? cleanSnippet + (cleanSnippet.length >= 40 ? '...' : '')
        : `Bài luyện tập ${new Date().toLocaleDateString('vi-VN')}`;
      setTitle(defaultTitle);
    }
  }, [isOpen, rawText]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      await onSave(title.trim());
      setSavedSuccess(true);
      playSuccessChime();
      setTimeout(() => {
        onClose();
        setSavedSuccess(false);
      }, 1200);
    } catch (err) {
      console.error('Failed to save lesson:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl border-2 border-pink-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20">
              <BookmarkPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base sm:text-lg">
                Lưu bài học đã tạo
              </h3>
              <p className="text-xs text-pink-100">
                Lưu vào kho bài tập cá nhân trên trình duyệt của bạn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {savedSuccess ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
                <Check className="w-8 h-8" />
              </div>
              <h4 className="font-heading font-extrabold text-slate-800 text-lg">
                Đã lưu bài học thành công!
              </h4>
              <p className="text-xs text-slate-500">
                Bài học đã được thêm vào kho lưu trữ của bạn.
              </p>
            </div>
          ) : (
            <>
              {/* Title input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Tiêu đề bài học:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nhập tên dễ nhớ cho bài học..."
                  className="w-full text-sm font-medium bg-slate-50 border-2 border-pink-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white transition-all text-slate-800"
                  autoFocus
                  required
                />
              </div>

              {/* Lesson Summary Card */}
              <div className="p-3.5 bg-pink-50/60 rounded-2xl border border-pink-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-semibold">Mức độ khó:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-md uppercase text-[10px] ${
                      selectedTier === 'easy'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedTier === 'medium'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {selectedTier}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-semibold">Độ dài:</span>
                  <span className="font-medium text-slate-800">
                    {sentenceCount} câu • {wordCount} từ
                  </span>
                </div>
                <div className="pt-2 border-t border-pink-200/60 text-slate-500 line-clamp-2 italic text-[11px]">
                  "{rawText.slice(0, 100)}..."
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={isSaving || !title.trim()}
                  className="px-5 py-2.5 rounded-xl font-heading font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 shadow-md transition-all flex items-center gap-2 disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-4 h-4" />
                      <span>Lưu bài học ngay</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
