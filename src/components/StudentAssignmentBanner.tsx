import React from 'react';
import { BookOpen, Send, Calendar, Users, MessageSquare, CheckCircle2, Sparkles, Lock } from 'lucide-react';
import { Assignment, AssignedTaskType } from '../types';

interface StudentAssignmentBannerProps {
  assignment: Assignment;
  practiceStats: {
    shadowingCount: number;
    shadowingAvgScore: number;
    quizScore: number;
    quizCorrectCount: number;
    quizTotal: number;
  };
  onOpenSubmitModal: () => void;
  onExitAssignmentMode?: () => void;
  assignedTaskType?: AssignedTaskType;
  language?: 'en' | 'vi';
}

export const StudentAssignmentBanner: React.FC<StudentAssignmentBannerProps> = ({
  assignment,
  practiceStats,
  onOpenSubmitModal,
  onExitAssignmentMode,
  assignedTaskType,
  language = 'en',
}) => {
  const isEn = language === 'en';

  const getTaskBadge = (task?: AssignedTaskType) => {
    switch (task) {
      case 'listening':
        return isEn ? '🎧 Listening & Karaoke' : '🎧 Luyện nghe Karaoke';
      case 'shadowing':
        return isEn ? '🎙️ Shadowing Studio' : '🎙️ Luyện phát âm & Shadowing';
      case 'words':
        return isEn ? '🔍 Task 1: Word Detective' : '🔍 Nhiệm vụ 1: Tìm từ vựng';
      case 'quiz':
        return isEn ? '📝 Task 2: Comprehension Quiz' : '📝 Nhiệm vụ 2: Trắc nghiệm';
      case 'dictation':
        return isEn ? '✍️ Task 3: Smart Dictation' : '✍️ Nhiệm vụ 3: Chép chính tả';
      case 'chat':
        return isEn ? '🐱 Task 4: Ms Mèo Chat' : '🐱 Nhiệm vụ 4: Ms Mèo Chat';
      default:
        return null;
    }
  };

  const taskBadgeText = getTaskBadge(assignedTaskType);

  return (
    <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 text-white shadow-md border-b border-teal-500/50 sticky top-14 z-20">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Assignment Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-base shadow-2xs">
            {assignedTaskType && assignedTaskType !== 'all' ? '🔒' : '📝'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold uppercase tracking-wider text-[10px] bg-amber-400 text-slate-900 px-2.5 py-0.5 rounded-full shadow-2xs">
                {isEn ? 'Assigned Homework' : 'Bài tập được giao'}
              </span>

              {taskBadgeText && (
                <span className="inline-flex items-center gap-1 font-extrabold text-[10px] uppercase tracking-wider bg-rose-500 text-white px-2.5 py-0.5 rounded-full shadow-2xs border border-rose-300/40">
                  <Lock className="w-2.5 h-2.5" />
                  <span>{taskBadgeText}</span>
                </span>
              )}

              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                assignment.lessonFormat === 'conversation'
                  ? 'bg-purple-500/80 text-white'
                  : 'bg-teal-900/80 text-teal-100'
              }`}>
                {assignment.lessonFormat === 'conversation' ? '💬 Dialogue' : '📄 Reading'}
              </span>
              <h3 className="font-extrabold text-sm truncate max-w-xs sm:max-w-md">
                {assignment.title}
              </h3>
              {assignment.className && (
                <span className="bg-white/20 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                  {isEn ? 'Class:' : 'Lớp:'} {assignment.className}
                </span>
              )}
              {assignment.dueDate && (
                <span className="bg-amber-400/20 text-amber-200 border border-amber-300/30 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                  {isEn ? 'Due:' : 'Hạn:'} {assignment.dueDate}
                </span>
              )}
            </div>
            {assignment.teacherNotes && (
              <p className="text-[11px] text-teal-100 italic truncate max-w-sm sm:max-w-xl mt-0.5">
                {isEn ? "Teacher's Note:" : "Lời dặn:"} "{assignment.teacherNotes}"
              </p>
            )}
          </div>
        </div>

        {/* Right: Submit Button & Stats */}
        <div className="flex items-center gap-2.5 shrink-0 ml-auto">
          {/* Quick Progress Badges */}
          <div className="hidden md:flex items-center gap-2 bg-white/10 px-3 py-1 rounded-xl text-[11px] border border-white/20">
            <span>
              Speaking: <strong className="text-amber-200">{practiceStats.shadowingCount}</strong>
            </span>
            <span>•</span>
            <span>
              Quiz: <strong className="text-amber-200">{practiceStats.quizScore}%</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenSubmitModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-extrabold text-xs text-slate-900 bg-amber-400 hover:bg-amber-300 shadow-sm transition-all hover:scale-102 ring-2 ring-amber-200"
          >
            <Send className="w-3.5 h-3.5" />
            <span>📤 {isEn ? 'Submit Homework' : 'Nộp bài'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
