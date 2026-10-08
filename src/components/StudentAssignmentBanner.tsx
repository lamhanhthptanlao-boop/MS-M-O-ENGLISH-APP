import React from 'react';
import { BookOpen, Send, Calendar, Users, MessageSquare, CheckCircle2, Sparkles } from 'lucide-react';
import { Assignment } from '../types';

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
}

export const StudentAssignmentBanner: React.FC<StudentAssignmentBannerProps> = ({
  assignment,
  practiceStats,
  onOpenSubmitModal,
  onExitAssignmentMode,
}) => {
  return (
    <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white shadow-md border-b border-teal-500/50 sticky top-14 z-20">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Assignment Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-base shadow-2xs">
            📝
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold uppercase tracking-wider text-[10px] bg-amber-400 text-slate-900 px-2.5 py-0.5 rounded-full shadow-2xs">
                Assigned Homework
              </span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                assignment.lessonFormat === 'conversation'
                  ? 'bg-purple-500/80 text-white'
                  : 'bg-teal-800/80 text-teal-100'
              }`}>
                {assignment.lessonFormat === 'conversation' ? '💬 Dialogue Mode' : '📄 Reading Passage'}
              </span>
              <h3 className="font-extrabold text-sm truncate max-w-xs sm:max-w-md">
                {assignment.title}
              </h3>
              {assignment.className && (
                <span className="bg-white/20 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                  Class: {assignment.className}
                </span>
              )}
              {assignment.dueDate && (
                <span className="bg-amber-400/20 text-amber-200 border border-amber-300/30 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                  Due: {assignment.dueDate}
                </span>
              )}
            </div>
            {assignment.teacherNotes && (
              <p className="text-[11px] text-teal-100 italic truncate max-w-sm sm:max-w-xl mt-0.5">
                Teacher's Note: "{assignment.teacherNotes}"
              </p>
            )}
          </div>
        </div>

        {/* Right: Submit Button & Stats */}
        <div className="flex items-center gap-2.5 shrink-0 ml-auto">
          {/* Quick Progress Badges */}
          <div className="hidden md:flex items-center gap-2 bg-white/10 px-3 py-1 rounded-xl text-[11px] border border-white/20">
            <span>
              Speaking: <strong className="text-amber-200">{practiceStats.shadowingCount} sentences</strong>
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
            <span>📤 Submit Homework</span>
          </button>

          {onExitAssignmentMode && (
            <button
              type="button"
              onClick={onExitAssignmentMode}
              className="text-[11px] text-teal-200 hover:text-white underline px-1 py-1"
              title="Return to general practice"
            >
              Exit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
