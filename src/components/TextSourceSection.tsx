import React, { useState } from 'react';
import {
  Sparkles,
  FileText,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Zap,
  RefreshCw,
  BookmarkPlus,
  BookOpen,
  Share2,
  MessageSquare,
  Users,
} from 'lucide-react';
import { DifficultyTier, LessonFormat } from '../types';
import { SAMPLE_TEXTS, SAMPLE_CONVERSATIONS } from '../utils/textParser';
import { playSoftTone } from '../utils/audio';

interface TextSourceSectionProps {
  rawText: string;
  onChangeText: (text: string) => void;
  selectedTier: DifficultyTier;
  onSelectTier: (tier: DifficultyTier) => void;
  language?: 'en' | 'vi';
  lessonFormat?: LessonFormat;
  onChangeLessonFormat?: (format: LessonFormat) => void;
  onGenerateLesson: () => void;
  onOpenSaveDialog?: () => void;
  onOpenLibrary?: () => void;
  savedCount?: number;
  totalSentences: number;
  totalWords: number;
  onOpenAssignModal?: () => void;
}

export const TextSourceSection: React.FC<TextSourceSectionProps> = ({
  rawText,
  onChangeText,
  selectedTier,
  onSelectTier,
  language = 'en',
  lessonFormat = 'text',
  onChangeLessonFormat,
  onGenerateLesson,
  onOpenSaveDialog,
  onOpenLibrary,
  savedCount = 0,
  totalSentences,
  totalWords,
  onOpenAssignModal,
}) => {
  const isEn = language === 'en';
  const [selectedPresetId, setSelectedPresetId] = useState<string>('habits');
  const [isSectionOpen, setIsSectionOpen] = useState<boolean>(true);

  const currentPresets = lessonFormat === 'conversation' ? SAMPLE_CONVERSATIONS : SAMPLE_TEXTS;

  const handleSelectPreset = (preset: (typeof SAMPLE_TEXTS)[0] | (typeof SAMPLE_CONVERSATIONS)[0]) => {
    playSoftTone();
    setSelectedPresetId(preset.id);
    onChangeText(preset.text);
  };

  const handleFormatChange = (newFormat: LessonFormat) => {
    playSoftTone();
    if (onChangeLessonFormat) {
      onChangeLessonFormat(newFormat);
    }
    // Switch to first preset of the new format
    const targetPresets = newFormat === 'conversation' ? SAMPLE_CONVERSATIONS : SAMPLE_TEXTS;
    if (targetPresets.length > 0) {
      setSelectedPresetId(targetPresets[0].id);
      onChangeText(targetPresets[0].text);
    }
  };

  const handleInsertSpeaker = (speakerName: string) => {
    playSoftTone();
    onChangeText((rawText.trim() ? rawText + '\n' : '') + `${speakerName}: `);
  };

  return (
    <section id="text-source-section" className="bg-white rounded-3xl p-5 sm:p-7 border border-pink-200 shadow-sm relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-pink-50 rounded-full blur-2xl pointer-events-none -z-0" />
      
      <div className="relative z-10">
        {/* Header & Format Mode Selector for Admin */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-pink-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📝</span>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-800">
                {isEn ? 'Lesson Studio & Text Configuration' : 'Studio Soạn bài & Cấu hình Văn bản'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-700 uppercase tracking-wider">
                {isEn ? 'Teacher' : 'Admin'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {isEn ? (
                <>Select <strong>Reading Passage</strong> or <strong>Conversation Dialogue</strong> format to generate tailored practice stations</>
              ) : (
                <>Chọn định dạng <strong>Đoạn văn đọc</strong> hoặc <strong>Hội thoại giao tiếp</strong> để tạo bài luyện tập phù hợp</>
              )}
            </p>
          </div>

          {/* Format Selector: Text vs Conversation and Collapse Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => {
                  handleFormatChange('text');
                  if (!isSectionOpen) setIsSectionOpen(true);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  lessonFormat === 'text'
                    ? 'bg-white text-pink-700 shadow-xs border border-pink-200 scale-102'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-pink-600" />
                <span>{isEn ? '📄 Reading Passage' : '📄 Dạng Đoạn văn'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleFormatChange('conversation');
                  if (!isSectionOpen) setIsSectionOpen(true);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  lessonFormat === 'conversation'
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-xs scale-102 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{isEn ? '💬 Dialogue' : '💬 Dạng Hội thoại'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsSectionOpen(!isSectionOpen)}
              className="flex items-center gap-1 px-3 py-2 rounded-2xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 shadow-2xs transition-all shrink-0"
              title={isSectionOpen ? (isEn ? 'Collapse editor' : 'Thu gọn khung soạn bài') : (isEn ? 'Expand editor' : 'Mở rộng khung soạn bài')}
            >
              {isSectionOpen ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">{isEn ? 'Collapse' : 'Thu gọn'}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-pink-600" />
                  <span className="text-pink-600 font-extrabold">{isEn ? 'Expand Editor' : 'Mở rộng soạn bài'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {isSectionOpen && (
          <>
            {/* Presets and Quick Insert Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-slate-400 whitespace-nowrap mr-1 flex items-center gap-1">
              {lessonFormat === 'conversation' ? (
                <>
                  <MessageSquare className="w-3 h-3 text-teal-600" />
                  <span>{isEn ? 'Dialogue Presets:' : 'Mẫu Hội thoại:'}</span>
                </>
              ) : (
                <>
                  <FileText className="w-3 h-3 text-pink-500" />
                  <span>{isEn ? 'Passage Presets:' : 'Mẫu Đoạn văn:'}</span>
                </>
              )}
            </span>
            {currentPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-all whitespace-nowrap border ${
                  selectedPresetId === preset.id && rawText === preset.text
                    ? lessonFormat === 'conversation'
                      ? 'bg-teal-100 text-teal-800 border-teal-300 font-bold shadow-2xs'
                      : 'bg-pink-100 text-pink-700 border-pink-300 font-bold shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title={preset.title}
              >
                {preset.title.slice(0, 26)}...
              </button>
            ))}
          </div>

          {/* Quick Speaker Insert Helpers for Conversation Mode */}
          {lessonFormat === 'conversation' && (
            <div className="flex items-center gap-1 shrink-0 text-[11px] text-slate-500">
              <span className="font-semibold text-teal-800">{isEn ? 'Quick Speakers:' : 'Thêm nhanh vai:'}</span>
              <button
                type="button"
                onClick={() => handleInsertSpeaker('Alex')}
                className="px-2 py-0.5 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-semibold"
              >
                + Alex:
              </button>
              <button
                type="button"
                onClick={() => handleInsertSpeaker('Sarah')}
                className="px-2 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold"
              >
                + Sarah:
              </button>
              <button
                type="button"
                onClick={() => handleInsertSpeaker('Ms Mèo')}
                className="px-2 py-0.5 rounded-md bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 font-semibold"
              >
                + Ms Mèo:
              </button>
            </div>
          )}
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            value={rawText}
            onChange={(e) => {
              onChangeText(e.target.value);
              setSelectedPresetId('');
            }}
            rows={lessonFormat === 'conversation' ? 7 : 5}
            placeholder={
              lessonFormat === 'conversation'
                ? `Nhập đoạn hội thoại tiếng Anh với tên người nói ở đầu mỗi dòng, ví dụ:
Alex: Hi Sarah! What university major are you choosing?
Sarah: I am preparing for Computer Science because I love technology.
Alex: That sounds exciting! How is your English preparation going?
Sarah: I practice shadowing every day with Ms Mèo!`
                : "Dán đoạn văn tiếng Anh, bài báo hoặc đoạn trích đọc hiểu vào đây..."
            }
            className={`w-full text-sm sm:text-base text-slate-800 rounded-2xl p-4 focus:outline-none transition-all placeholder:text-slate-400 leading-relaxed resize-y font-normal ${
              lessonFormat === 'conversation'
                ? 'bg-teal-50/30 border-2 border-teal-200/90 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 font-mono sm:font-sans'
                : 'bg-pink-50/30 border-2 border-pink-200/90 focus:border-pink-500 focus:ring-4 focus:ring-pink-100'
            }`}
          />

          {/* Live text counters & format badge */}
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 px-1">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                lessonFormat === 'conversation'
                  ? 'bg-teal-100 text-teal-800 border border-teal-200'
                  : 'bg-pink-100 text-pink-800 border border-pink-200'
              }`}>
                {lessonFormat === 'conversation' ? '💬 Hội thoại (Dialogue)' : '📄 Đoạn văn (Reading Text)'}
              </span>
              <span>
                <strong>{totalWords}</strong> words
              </span>
              <span>•</span>
              <span>
                <strong>{totalSentences}</strong> {lessonFormat === 'conversation' ? 'lượt thoại' : 'câu'}
              </span>
            </div>
            <span>
              ~{Math.max(1, Math.ceil(totalWords / 130))} min practice
            </span>
          </div>
        </div>

        {/* Difficulty Tier Selector (Section 3 Requirement) */}
        <div className="mt-5 pt-4 border-t border-pink-100">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Select Difficulty Tier & Dictation Hints:
              </span>
              <p className="text-xs text-slate-500">
                Filters sentences by word length & determines fill-in-the-blank hint support
              </p>
            </div>

            {/* 3 Difficulty Tiers */}
            <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
              {/* Easy Mode */}
              <button
                type="button"
                onClick={() => {
                  playSoftTone();
                  onSelectTier('easy');
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                  selectedTier === 'easy'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-900 ring-2 ring-emerald-200 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center gap-1 font-bold text-xs">
                  <span>🟢</span>
                  <span>EASY MODE</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  1-6 words (100% Hint)
                </span>
              </button>

              {/* Medium Mode */}
              <button
                type="button"
                onClick={() => {
                  playSoftTone();
                  onSelectTier('medium');
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                  selectedTier === 'medium'
                    ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-200 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center gap-1 font-bold text-xs">
                  <span>🟡</span>
                  <span>MEDIUM</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  7-14 words (50% Hint)
                </span>
              </button>

              {/* Hard Mode */}
              <button
                type="button"
                onClick={() => {
                  playSoftTone();
                  onSelectTier('hard');
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                  selectedTier === 'hard'
                    ? 'bg-rose-50 border-rose-400 text-rose-900 ring-2 ring-rose-200 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'
                }`}
              >
                <div className="flex items-center gap-1 font-bold text-xs">
                  <span>🔴</span>
                  <span>HARD MODE</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  15+ words (0% Hint)
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Row: Save Lesson, Saved Library, and Generate Lesson */}
        <div className="mt-5 pt-4 border-t border-pink-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Saved Lessons Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onOpenSaveDialog && (
              <button
                type="button"
                onClick={onOpenSaveDialog}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-heading font-bold text-xs sm:text-sm text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 transition-all flex items-center justify-center gap-2 shadow-2xs hover:shadow-xs"
                title={isEn ? 'Save current lesson to Google account' : 'Lưu bài học hiện tại vào tài khoản Google'}
              >
                <BookmarkPlus className="w-4 h-4 text-pink-600" />
                <span>{isEn ? '💾 Save Lesson' : '💾 Lưu bài đã tạo'}</span>
              </button>
            )}

            {onOpenLibrary && (
              <button
                type="button"
                onClick={onOpenLibrary}
                className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl font-heading font-semibold text-xs sm:text-sm text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all flex items-center justify-center gap-1.5"
                title={isEn ? 'View your saved lessons' : 'Xem danh sách các bài học bạn đã lưu'}
              >
                <BookOpen className="w-4 h-4 text-slate-500" />
                <span>{isEn ? 'Saved Library' : 'Kho bài đã lưu'}</span>
                {savedCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-pink-500 text-white leading-none">
                    {savedCount}
                  </span>
                )}
              </button>
            )}

            {onOpenAssignModal && (
              <button
                type="button"
                onClick={onOpenAssignModal}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-heading font-bold text-xs sm:text-sm text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs"
                title={isEn ? 'Assign this lesson to students with link' : 'Giao bài tập này cho học sinh bằng cách chia sẻ link'}
              >
                <Share2 className="w-4 h-4 text-emerald-600" />
                <span>{isEn ? '📤 Assign to Students' : '📤 Giao bài cho học sinh'}</span>
              </button>
            )}
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={onGenerateLesson}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl font-heading font-bold text-sm text-white bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
          >
            <Sparkles className="w-4 h-4 transition-transform group-hover:rotate-12" />
            <span>{isEn ? '🚀 Generate Practice Lesson' : '🚀 Tạo bài & Vào Luyện tập'}</span>
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
        </>
      )}
      </div>
    </section>
  );
};
