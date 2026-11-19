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
  SlidersHorizontal,
  Hash,
} from 'lucide-react';
import { DifficultyTier, LessonFormat } from '../types';
import {
  analyzeAllSentences,
  filterSentencesWithPreview,
  SAMPLE_TEXTS,
  SAMPLE_CONVERSATIONS,
  SentenceSelectionMode,
  splitIntoSentences,
} from '../utils/textParser';
import { playSoftTone } from '../utils/audio';
import { SentenceCutPreviewTable } from './SentenceCutPreviewTable';

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
  sentenceCountMode?: SentenceSelectionMode;
  onChangeSentenceCountMode?: (mode: SentenceSelectionMode) => void;
  customRangeFrom?: number;
  onChangeCustomRangeFrom?: (from: number) => void;
  customRangeTo?: number;
  onChangeCustomRangeTo?: (to: number) => void;
  enableTierCut?: boolean;
  onToggleTierCut?: (enabled: boolean) => void;
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
  sentenceCountMode: controlledMode,
  onChangeSentenceCountMode,
  customRangeFrom: controlledFrom,
  onChangeCustomRangeFrom,
  customRangeTo: controlledTo,
  onChangeCustomRangeTo,
  enableTierCut: controlledTierCut,
  onToggleTierCut,
}) => {
  const isEn = language === 'en';
  const [selectedPresetId, setSelectedPresetId] = useState<string>('habits');
  const [isSectionOpen, setIsSectionOpen] = useState<boolean>(true);

  // Local fallback states if not controlled by parent
  const [localMode, setLocalMode] = useState<SentenceSelectionMode>('all');
  const [localFrom, setLocalFrom] = useState<number>(1);
  const [localTo, setLocalTo] = useState<number>(() => Math.min(5, totalSentences || 1));
  const [localTierCut, setLocalTierCut] = useState<boolean>(false);

  const activeMode = controlledMode !== undefined ? controlledMode : localMode;
  const activeFrom = controlledFrom !== undefined ? controlledFrom : localFrom;
  const activeTo = controlledTo !== undefined ? controlledTo : localTo;
  const activeTierCut = controlledTierCut !== undefined ? controlledTierCut : localTierCut;

  const handleModeChange = (mode: SentenceSelectionMode) => {
    if (onChangeSentenceCountMode) {
      onChangeSentenceCountMode(mode);
    } else {
      setLocalMode(mode);
    }
  };

  const handleTierCutToggle = (enabled: boolean) => {
    if (onToggleTierCut) {
      onToggleTierCut(enabled);
    } else {
      setLocalTierCut(enabled);
    }
  };

  const handleFromChange = (fromVal: number) => {
    const clamped = Math.max(1, Math.min(fromVal, totalSentences || 1));
    if (onChangeCustomRangeFrom) {
      onChangeCustomRangeFrom(clamped);
    } else {
      setLocalFrom(clamped);
    }
  };

  const handleToChange = (toVal: number) => {
    const clamped = Math.max(activeFrom, Math.min(toVal, totalSentences || 1));
    if (onChangeCustomRangeTo) {
      onChangeCustomRangeTo(clamped);
    } else {
      setLocalTo(clamped);
    }
  };

  const sentenceCutPreview = React.useMemo(() => {
    const analyzed = analyzeAllSentences(splitIntoSentences(rawText));
    return filterSentencesWithPreview(analyzed, {
      mode: activeMode,
      from: activeFrom,
      to: activeTo,
      cutByTier: activeTierCut ? selectedTier : null,
    });
  }, [rawText, activeMode, activeFrom, activeTo, activeTierCut, selectedTier]);

  const effectiveSentenceCount = sentenceCutPreview.keptSentences.length;

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
          <div className="flex flex-wrap items-center gap-2">
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
                ? isEn
                  ? `Paste an English dialogue with speaker names at the start of each line, e.g.:
Alex: Hi Sarah! What university major are you choosing?
Sarah: I am preparing for Computer Science because I love technology.`
                  : `Nhập đoạn hội thoại tiếng Anh với tên người nói ở đầu mỗi dòng, ví dụ:
Alex: Hi Sarah! What university major are you choosing?
Sarah: I am preparing for Computer Science because I love technology.
Alex: That sounds exciting! How is your English preparation going?
Sarah: I practice shadowing every day with Ms Mèo!`
                : isEn
                ? 'Paste your English reading passage, article, or study excerpt here...'
                : 'Dán đoạn văn tiếng Anh, bài báo hoặc đoạn trích đọc hiểu vào đây...'
            }
            className={`w-full text-sm sm:text-base text-slate-800 rounded-2xl p-4 focus:outline-none transition-all placeholder:text-slate-400 leading-relaxed resize-y font-normal ${
              lessonFormat === 'conversation'
                ? 'bg-teal-50/30 border-2 border-teal-200/90 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 font-mono sm:font-sans'
                : 'bg-pink-50/30 border-2 border-pink-200/90 focus:border-pink-500 focus:ring-4 focus:ring-pink-100'
            }`}
          />

          {/* Live text counters & format badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mt-2 px-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                lessonFormat === 'conversation'
                  ? 'bg-teal-100 text-teal-800 border border-teal-200'
                  : 'bg-pink-100 text-pink-800 border border-pink-200'
              }`}>
                {lessonFormat === 'conversation'
                  ? isEn ? '💬 Dialogue' : '💬 Hội thoại (Dialogue)'
                  : isEn ? '📄 Reading Text' : '📄 Đoạn văn (Reading Text)'}
              </span>
              <span>
                <strong>{totalWords}</strong> {isEn ? 'words' : 'từ'}
              </span>
              <span>•</span>
              <span>
                <strong>{totalSentences}</strong>{' '}
                {lessonFormat === 'conversation'
                  ? isEn ? 'turns' : 'lượt thoại'
                  : isEn ? 'sentences' : 'câu'}
              </span>
            </div>
            <span>
              ~{Math.max(1, Math.ceil(totalWords / 130))} {isEn ? 'min practice' : 'phút luyện'}
            </span>
          </div>
        </div>

        {/* Difficulty Tier Selector (Controls Hint Level ONLY - never cuts sentences automatically) */}
        <div className="mt-5 pt-4 border-t border-pink-100 space-y-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                {isEn
                  ? 'Select Difficulty Tier (Hint Level Only):'
                  : 'Chọn Cấp độ Gợi ý (Không tự cắt câu):'}
              </span>
              <p className="text-xs text-slate-500">
                {isEn
                  ? 'Tier adjusts fill-in-the-blank & pronunciation hint support while keeping 100% of your sentences.'
                  : 'Tier chỉ chỉnh mức gợi ý chữ cái khi chép chính tả; toàn bộ số câu được giữ nguyên trừ khi bạn chọn cắt câu bên dưới.'}
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
                  <span>EASY</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  {isEn ? '100% Hint (First + Last)' : 'Gợi ý chữ đầu & cuối'}
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
                  {isEn ? '50% Hint (First Letter)' : 'Gợi ý chữ cái đầu'}
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
                  <span>HARD</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  {isEn ? '0% Hint (No Letters)' : 'Tự nhớ (0% gợi ý)'}
                </span>
              </button>
            </div>
          </div>

          {/* Optional Explicit Tier-Length Cut Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={activeTierCut}
                onChange={(e) => handleTierCutToggle(e.target.checked)}
                className="rounded border-slate-300 text-pink-600 focus:ring-pink-500"
              />
              <span>
                {isEn
                  ? 'Optionally filter sentences by Tier word-length (shows Keep/Drop preview below)'
                  : 'Lọc độ dài câu theo Tier (tùy chọn — sẽ hiện bảng xem trước Câu giữ / Câu loại)'}
              </span>
            </label>
            <span className="text-[11px] font-bold text-slate-500">
              {activeTierCut
                ? isEn
                  ? 'Length filter ON'
                  : 'Đang bật lọc theo độ dài'
                : isEn
                ? 'Keeping all sentences intact'
                : 'Đang giữ nguyên toàn bộ câu'}
            </span>
          </div>
        </div>

        {/* Dedicated Sentence Count Selection ("Mục Chọn Số Câu") */}
        <div className="mt-5 pt-4 border-t border-pink-100">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-pink-600" />
                  <span>{isEn ? 'Choose Sentence Count to Practice:' : 'Chọn số câu luyện tập (Sentence Count):'}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-pink-100 text-pink-800 border border-pink-300">
                  {isEn ? `${effectiveSentenceCount} sentences` : `Đang chọn ${effectiveSentenceCount} câu`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {isEn
                  ? 'Limit or select specific sentences to generate for this practice session.'
                  : 'Chỉ định số lượng câu cần tạo cho bài luyện tập (Tất cả, 3 câu đầu, 5 câu đầu, 10 câu hoặc Tự chọn khoảng câu cụ thể).'}
              </p>
            </div>

            {/* Live summary badge */}
            <div className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-pink-200 shadow-2xs shrink-0 flex items-center gap-1.5">
              <span className="text-pink-600 font-extrabold">⚡</span>
              {activeMode === 'all' ? (
                <span>{isEn ? `Full: ${totalSentences} sentences` : `Toàn bộ: ${totalSentences} câu`}</span>
              ) : activeMode === 'custom' ? (
                <span className="text-indigo-700 font-extrabold">
                  {isEn
                    ? `Sentences ${activeFrom} → ${activeTo} (${effectiveSentenceCount} sent.)`
                    : `Từ câu ${activeFrom} → ${activeTo} (${effectiveSentenceCount} câu)`}
                </span>
              ) : (
                <span className="text-pink-700 font-extrabold">
                  {isEn ? `First ${effectiveSentenceCount} sentences` : `${effectiveSentenceCount} câu đầu tiên`}
                </span>
              )}
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* All sentences */}
            <button
              type="button"
              onClick={() => {
                playSoftTone();
                handleModeChange('all');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 border shadow-2xs ${
                activeMode === 'all'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-700 ring-2 ring-pink-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-pink-300 hover:bg-pink-50/50'
              }`}
            >
              <span>🌟</span>
              <span>{isEn ? `All (${totalSentences} sentences)` : `Tất cả (${totalSentences} câu)`}</span>
            </button>

            {/* 3 Sentences */}
            <button
              type="button"
              onClick={() => {
                playSoftTone();
                handleModeChange('3');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 border shadow-2xs ${
                activeMode === '3'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-700 ring-2 ring-pink-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-pink-300 hover:bg-pink-50/50'
              }`}
            >
              <span>⚡</span>
              <span>{isEn ? '3 sentences' : '3 câu đầu'}</span>
            </button>

            {/* 5 Sentences */}
            <button
              type="button"
              onClick={() => {
                playSoftTone();
                handleModeChange('5');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 border shadow-2xs ${
                activeMode === '5'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-700 ring-2 ring-pink-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-pink-300 hover:bg-pink-50/50'
              }`}
            >
              <span>🎯</span>
              <span>{isEn ? '5 sentences' : '5 câu đầu'}</span>
            </button>

            {/* 10 Sentences */}
            {totalSentences >= 6 && (
              <button
                type="button"
                onClick={() => {
                  playSoftTone();
                  handleModeChange('10');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 border shadow-2xs ${
                  activeMode === '10'
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-700 ring-2 ring-pink-200'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-pink-300 hover:bg-pink-50/50'
                }`}
              >
                <span>📚</span>
                <span>{isEn ? '10 sentences' : '10 câu đầu'}</span>
              </button>
            )}

            {/* Custom Range */}
            <button
              type="button"
              onClick={() => {
                playSoftTone();
                handleModeChange('custom');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 border shadow-2xs ${
                activeMode === 'custom'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-700 ring-2 ring-indigo-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isEn ? '⚙️ Custom Range...' : '⚙️ Tự chọn khoảng câu...'}</span>
            </button>
          </div>

          {/* Custom Range Detail Box */}
          {activeMode === 'custom' && (
            <div className="mt-3 p-3.5 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 rounded-2xl border-2 border-indigo-200 flex flex-wrap items-center gap-3">
              <span className="text-xs font-black text-indigo-950">
                {isEn ? 'Specify sentence interval:' : 'Nhập khoảng câu muốn luyện tập:'}
              </span>
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  {isEn ? 'From sentence:' : 'Từ câu:'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={totalSentences}
                  value={activeFrom}
                  onChange={(e) => handleFromChange(parseInt(e.target.value) || 1)}
                  className="w-16 px-2.5 py-1 text-xs font-black text-indigo-900 bg-white border-2 border-indigo-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  {isEn ? 'To sentence:' : 'Đến câu:'}
                </label>
                <input
                  type="number"
                  min={activeFrom}
                  max={totalSentences}
                  value={activeTo}
                  onChange={(e) => handleToChange(parseInt(e.target.value) || activeFrom)}
                  className="w-16 px-2.5 py-1 text-xs font-black text-indigo-900 bg-white border-2 border-indigo-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <span className="text-[11px] font-bold text-indigo-800 bg-white/70 px-2 py-0.5 rounded-md border border-indigo-200">
                {isEn
                  ? `(Max ${totalSentences} sentences in text)`
                  : `(Tổng có ${totalSentences} câu trong văn bản)`}
              </span>
            </div>
          )}
          {/* Sentence Keep / Drop Preview Table */}
          <div className="mt-3">
            <SentenceCutPreviewTable
              previewRows={sentenceCutPreview.previewRows}
              language={language}
              defaultExpanded={sentenceCutPreview.hasCuts}
              compact
            />
          </div>
        </div>

        {/* Action Row: Save Lesson, Saved Library, Assign to Students, and Generate Lesson */}
        <div className="mt-5 pt-4 border-t border-pink-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Saved Lessons Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {onOpenSaveDialog && (
              <button
                type="button"
                onClick={onOpenSaveDialog}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-heading font-bold text-xs sm:text-sm text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 transition-all flex items-center justify-center gap-2 shadow-2xs hover:shadow-xs"
                title={isEn ? 'Save current lesson on this browser' : 'Lưu bài học hiện tại trên trình duyệt này'}
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

          {/* Generate Button with dynamic sentence count */}
          <button
            type="button"
            onClick={onGenerateLesson}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl font-heading font-black text-sm text-white bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group hover:scale-102"
          >
            <Sparkles className="w-4 h-4 transition-transform group-hover:rotate-12" />
            <span>
              {isEn
                ? `🚀 Generate Practice (${effectiveSentenceCount} sentences)`
                : `🚀 Tạo bài & Luyện tập (${effectiveSentenceCount} câu)`}
            </span>
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
        </>
      )}
      </div>
    </section>
  );
};
