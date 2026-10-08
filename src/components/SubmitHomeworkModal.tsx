import React, { useState } from 'react';
import {
  X,
  Send,
  CheckCircle2,
  Award,
  BookOpen,
  MessageSquare,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Assignment, AssignmentSubmission } from '../types';
import { submitAssignmentResult } from '../storage/assignments';
import mascotImg from '../assets/images/ms_meo_mascot_1790341757214.jpg';

interface SubmitHomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: Assignment;
  practiceStats: {
    shadowingCount: number;
    shadowingAvgScore: number;
    quizScore: number;
    quizCorrectCount: number;
    quizTotal: number;
    wordHuntCompleted: boolean;
    dictationScore: number;
  };
  onSubmissionSuccess?: (sub: AssignmentSubmission) => void;
}

export const SubmitHomeworkModal: React.FC<SubmitHomeworkModalProps> = ({
  isOpen,
  onClose,
  assignment,
  practiceStats,
  onSubmissionSuccess,
}) => {
  const [studentName, setStudentName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ms_meo_student_name') || '';
    }
    return '';
  });
  const [studentClass, setStudentClass] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ms_meo_student_class') || assignment.className || '';
    }
    return assignment.className || '';
  });
  const [studentNote, setStudentNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<AssignmentSubmission | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setErrorMessage('Please enter your full name so your teacher can identify your work.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Save name/class for future submissions
    if (typeof window !== 'undefined') {
      localStorage.setItem('ms_meo_student_name', studentName.trim());
      localStorage.setItem('ms_meo_student_class', studentClass.trim());
    }

    try {
      const res = await submitAssignmentResult(assignment.id, {
        studentName: studentName.trim(),
        studentClass: studentClass.trim(),
        shadowingCount: practiceStats.shadowingCount,
        shadowingAvgScore: practiceStats.shadowingAvgScore,
        quizScore: practiceStats.quizScore,
        quizCorrectCount: practiceStats.quizCorrectCount,
        quizTotal: practiceStats.quizTotal,
        wordHuntCompleted: practiceStats.wordHuntCompleted,
        dictationScore: practiceStats.dictationScore,
        studentNote: studentNote.trim(),
      });

      setSubmittedResult(res);
      onSubmissionSuccess?.(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit homework. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl border border-pink-200 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-5 sm:p-6 text-white shrink-0 relative overflow-hidden">
          <div className="flex items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <img
                src={mascotImg}
                alt="Ms Mèo Mascot"
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full border-2 border-white/80 object-cover shadow-md"
              />
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-bold uppercase tracking-wider">
                  <span>📤 Student Submission</span>
                </div>
                <h3 className="font-heading text-lg sm:text-xl font-extrabold tracking-tight mt-0.5">
                  Submit Homework to Teacher
                </h3>
                <p className="text-xs text-teal-100 hidden sm:block">
                  Assignment: {assignment.title}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {submittedResult ? (
            <div className="text-center py-6 space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 border border-emerald-300 flex items-center justify-center mx-auto text-3xl shadow-sm">
                🎉
              </div>
              <div>
                <h4 className="text-lg font-extrabold text-slate-900 font-heading">
                  Homework Submitted Successfully!
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                  Great job, <strong>{submittedResult.studentName}</strong>! Your homework results have been delivered to your teacher's dashboard.
                </p>
              </div>

              {/* Summary Pill Card */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 max-w-md mx-auto grid grid-cols-2 gap-3 text-xs text-left">
                <div>
                  <span className="text-slate-500 block text-[11px]">Shadowing Speaking:</span>
                  <span className="font-extrabold text-pink-600 text-sm">
                    {submittedResult.shadowingCount} sentences • {submittedResult.shadowingAvgScore}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Reading Quiz:</span>
                  <span className="font-extrabold text-indigo-600 text-sm">
                    {submittedResult.quizScore}% ({submittedResult.quizCorrectCount}/{submittedResult.quizTotal})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Word Detective:</span>
                  <span className="font-extrabold text-teal-600">
                    {submittedResult.wordHuntCompleted ? '✓ Completed' : 'Pending'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Submitted at:</span>
                  <span className="font-bold text-slate-700">
                    {new Date(submittedResult.submittedAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md transition-all hover:scale-102"
                >
                  Continue Practicing with Ms Mèo
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
                  ⚠️ {errorMessage}
                </div>
              )}

              {/* Student Info Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Student Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g. Alex Nguyen"
                    className="w-full text-xs border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Class / Section:
                  </label>
                  <input
                    type="text"
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    placeholder="e.g. 12A1"
                    className="w-full text-xs border border-slate-300 focus:border-teal-500 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              {/* Live Practice Results Card */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>Your current practice results:</span>
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Shadowing</span>
                    <span className="font-extrabold text-pink-600 text-sm">
                      {practiceStats.shadowingCount} sent.
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Avg: {practiceStats.shadowingAvgScore}%
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Reading Quiz</span>
                    <span className="font-extrabold text-indigo-600 text-sm">
                      {practiceStats.quizScore}%
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {practiceStats.quizCorrectCount}/{practiceStats.quizTotal} correct
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Word Detective</span>
                    <span className="font-extrabold text-teal-600 text-sm">
                      {practiceStats.wordHuntCompleted ? 'Passed' : 'Pending'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Vocabulary</span>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Dictation</span>
                    <span className="font-extrabold text-amber-600 text-sm">
                      {practiceStats.dictationScore > 0 ? `${practiceStats.dictationScore}%` : '--'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Spelling</span>
                  </div>
                </div>
              </div>

              {/* Student Note / Reflection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                  <span>Note or questions for your teacher (Optional):</span>
                </label>
                <textarea
                  rows={2}
                  value={studentNote}
                  onChange={(e) => setStudentNote(e.target.value)}
                  placeholder="e.g. Sentence 4 was challenging, I practiced it 3 times..."
                  className="w-full text-xs border border-slate-300 focus:border-teal-500 rounded-xl p-2.5 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 shadow-md transition-all hover:scale-102 flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>🚀 Confirm & Submit Homework</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
