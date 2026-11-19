import React, { useState } from 'react';
import {
  BookOpen,
  Calendar,
  Users,
  MessageSquare,
  Sparkles,
  Send,
  Volume2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Trophy,
} from 'lucide-react';
import { Assignment, DifficultyTier, AssignedTaskType, PracticeStats } from '../types';
import { playSoftTone } from '../utils/audio';

interface StudentLessonHeaderProps {
  assignment: Assignment;
  rawText: string;
  selectedTier: DifficultyTier;
  onSelectTier: (tier: DifficultyTier) => void;
  totalSentences: number;
  tierSentencesCount: number;
  totalWords: number;
  practiceStats: PracticeStats;
  onOpenSubmitModal: () => void;
  assignedTaskType?: AssignedTaskType;
  language?: 'en' | 'vi';
}

export const StudentLessonHeader: React.FC<StudentLessonHeaderProps> = ({
  assignment,
  rawText,
  selectedTier,
  onSelectTier,
  totalSentences,
  tierSentencesCount,
  totalWords,
  practiceStats,
  onOpenSubmitModal,
  assignedTaskType,
  language = 'en',
}) => {
  const [isTextExpanded, setIsTextExpanded] = useState<boolean>(true);
  const isEn = language === 'en';
  const isConversation = assignment.lessonFormat === 'conversation';

  const getTaskBadge = (task?: AssignedTaskType) => {
    switch (task) {
      case 'listening':
        return isEn ? '🎧 Listening & Karaoke' : '🎧 Luyện nghe Karaoke';
      case 'shadowing':
        return isEn ? '🎙️ Shadowing Studio' : '🎙️ Luyện phát âm & Shadowing';
      case 'words':
        return isEn ? '🔍 Task 1: Word Detective' : '🔍 Nhiệm vụ 1: Tìm từ vựng';
      case 'quiz':
        return isEn ? '📝 Task 2: Comprehension Quiz' : '📝 Nhiệm vụ 2: Trắc nghiệm Đọc hiểu';
      case 'dictation':
        return isEn ? '✍️ Task 3: Smart Dictation' : '✍️ Nhiệm vụ 3: Chép chính tả';
      case 'chat':
        return isEn ? '🐱 Task 4: Ms Mèo Chat' : '🐱 Nhiệm vụ 4: Ms Mèo Chat';
      default:
        return null;
    }
  };

  const taskBadge = getTaskBadge(assignedTaskType);

  return (
    <section className="bg-white rounded-3xl p-4 sm:p-7 border border-teal-200 shadow-sm relative overflow-hidden space-y-5 max-w-full">
      {/* Background soft glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-teal-50 rounded-full blur-2xl pointer-events-none -z-0" />

      {/* Assignment Header Lockup */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-teal-100 relative z-10">
        <div className="min-w-0 w-full">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-300">
              <Sparkles className="w-3 h-3 text-teal-600" />
              <span>{isEn ? 'Assigned Homework' : 'Bài tập được giao'}</span>
            </span>

            {taskBadge && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-2xs border border-rose-400/50">
                <span>🔒</span>
                <span>{taskBadge}</span>
              </span>
            )}

            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
              isConversation
                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                : 'bg-blue-100 text-blue-800 border border-blue-300'
            }`}>
              <span>
                {isConversation
                  ? isEn ? '💬 Dialogue Mode' : '💬 Hội thoại'
                  : isEn ? '📄 Reading Passage' : '📄 Đoạn văn'}
              </span>
            </span>

            {assignment.className && (
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                <Users className="w-3 h-3 text-teal-600" />
                <span>{isEn ? 'Class:' : 'Lớp:'} {assignment.className}</span>
              </span>
            )}
            {assignment.dueDate && (
              <span className="text-xs text-slate-600 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-600" />
                <span>{isEn ? 'Due:' : 'Hạn:'} {assignment.dueDate}</span>
              </span>
            )}
          </div>

          <h2 className="font-heading text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1.5 break-words">
            {assignment.title}
          </h2>

          {assignment.teacherNotes && (
            <div className="mt-2 p-2.5 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-teal-950 italic flex items-start gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
              <span className="break-words">
                <strong>{isEn ? "Teacher's Note:" : 'Lời dặn của cô:'}</strong> &ldquo;{assignment.teacherNotes}&rdquo;
              </span>
            </div>
          )}
        </div>

        {/* Action Button: Submit Homework */}
        <div className="shrink-0 w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            type="button"
            onClick={onOpenSubmitModal}
            className="px-5 py-2.5 rounded-xl font-heading font-extrabold text-xs sm:text-sm text-slate-900 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-102 ring-2 ring-amber-200"
          >
            <Send className="w-4 h-4 text-slate-900" />
            <span>{isEn ? '📤 Submit Homework' : '📤 Nộp bài'}</span>
          </button>
        </div>
      </div>

      {/* Difficulty Tier Selector (Controls Hint Support Only) */}
      <div className="relative z-10 pt-1">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 mb-2.5">
          <div>
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
              {isEn ? '🎯 Choose Hint Difficulty Tier:' : '🎯 Chọn Cấp độ Gợi ý:'}
            </span>
            <p className="text-xs text-slate-500">
              {isEn
                ? 'Adjusts fill-in-the-blank hint support while keeping all sentences in the lesson:'
                : 'Điều chỉnh mức độ gợi ý chữ cái (giữ nguyên toàn bộ số câu của bài):'}
            </p>
          </div>

          <div className="text-xs text-slate-600 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
            <span>{isEn ? 'Selected:' : 'Đang chọn:'} </span>
            <strong className="text-teal-700 uppercase font-extrabold">{selectedTier}</strong>
            <span className="text-slate-400 ml-1">({tierSentencesCount}/{totalSentences})</span>
          </div>
        </div>

        {/* 3 Interactive Tier Selector Buttons */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
          {/* Easy Tier */}
          <button
            type="button"
            onClick={() => {
              playSoftTone();
              onSelectTier('easy');
            }}
            className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl border text-center transition-all min-w-0 ${
              selectedTier === 'easy'
                ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-2 ring-emerald-200 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/30'
            }`}
          >
            <div className="flex items-center gap-1 font-extrabold text-[11px] sm:text-xs">
              <span>🟢</span>
              <span>EASY</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 leading-tight">
              {isEn ? '100% Hints' : 'Gợi ý 100%'}
            </span>
          </button>

          {/* Medium Tier */}
          <button
            type="button"
            onClick={() => {
              playSoftTone();
              onSelectTier('medium');
            }}
            className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl border text-center transition-all min-w-0 ${
              selectedTier === 'medium'
                ? 'bg-amber-50 border-amber-400 text-amber-950 ring-2 ring-amber-200 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50/30'
            }`}
          >
            <div className="flex items-center gap-1 font-extrabold text-[11px] sm:text-xs">
              <span>🟡</span>
              <span>MEDIUM</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 leading-tight">
              {isEn ? '50% Hints' : 'Gợi ý 50%'}
            </span>
          </button>

          {/* Hard Tier */}
          <button
            type="button"
            onClick={() => {
              playSoftTone();
              onSelectTier('hard');
            }}
            className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl border text-center transition-all min-w-0 ${
              selectedTier === 'hard'
                ? 'bg-rose-50 border-rose-400 text-rose-950 ring-2 ring-rose-200 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300 hover:bg-rose-50/30'
            }`}
          >
            <div className="flex items-center gap-1 font-extrabold text-[11px] sm:text-xs">
              <span>🔴</span>
              <span>HARD</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 leading-tight">
              {isEn ? '0% Hints' : '0% Gợi ý'}
            </span>
          </button>
        </div>
      </div>

      {/* Reading Text / Conversation Container */}
      <div className="relative z-10 pt-2 border-t border-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-2">
            <BookOpen className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              {isConversation
                ? isEn ? 'English Dialogue Script:' : 'Kịch bản Hội thoại:'
                : isEn ? 'Reading Passage:' : 'Nội dung Bài đọc:'}
            </span>
            <span className="text-[11px] text-slate-400">
              ({totalSentences} {isEn ? (isConversation ? 'turns' : 'sentences') : 'câu'} • {totalWords} {isEn ? 'words' : 'từ'})
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsTextExpanded(!isTextExpanded)}
            className="text-xs text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1"
          >
            {isTextExpanded ? (
              <>
                <span>{isEn ? 'Collapse' : 'Thu gọn'}</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>{isEn ? 'Expand full text' : 'Xem toàn văn bản'}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {isTextExpanded && (
          <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 sm:p-5 text-sm text-slate-800 leading-relaxed font-sans shadow-2xs">
            <p className="whitespace-pre-line select-text break-words">
              {rawText}
            </p>
          </div>
        )}
      </div>

      {/* Student Live Progress Strip */}
      <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50 rounded-2xl p-3 border border-teal-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 font-bold text-teal-950">
          <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{isEn ? 'Live Homework Progress:' : 'Tiến độ làm bài:'}</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-[11px]">
          <div>
            <span className="text-slate-500">🎙️ Voice: </span>
            <strong className="text-pink-600 font-extrabold">
              {practiceStats.voiceCount > 0 ? `${practiceStats.voiceScore}% (${practiceStats.voiceCount})` : '--'}
            </strong>
          </div>
          <span>•</span>
          <div>
            <span className="text-slate-500">⌨️ Typing: </span>
            <strong className="text-indigo-600 font-extrabold">
              {practiceStats.typingMatchCount > 0
                ? `${practiceStats.typingMatchScore}% (${practiceStats.typingMatchCount})`
                : '--'}
            </strong>
          </div>
          <span>•</span>
          <div>
            <span className="text-slate-500">✍️ Dictation: </span>
            <strong className="text-amber-600 font-extrabold">
              {practiceStats.dictationCount > 0 ? `${practiceStats.dictationScore}%` : '--'}
            </strong>
          </div>
          <span>•</span>
          <div>
            <span className="text-slate-500">Quiz: </span>
            <strong className="text-emerald-700 font-extrabold">
              {practiceStats.quizScore}% ({practiceStats.quizCorrectCount}/{practiceStats.quizTotal})
            </strong>
          </div>
          <span>•</span>
          <div>
            <span className="text-slate-500">Word Hunt: </span>
            <strong className={practiceStats.wordHuntCompleted ? 'text-emerald-600 font-extrabold' : 'text-slate-400'}>
              {practiceStats.wordHuntCompleted
                ? isEn ? '✓ Passed' : '✓ Đạt'
                : isEn ? 'Pending' : 'Chưa xong'}
            </strong>
          </div>
        </div>
      </div>
    </section>
  );
};
