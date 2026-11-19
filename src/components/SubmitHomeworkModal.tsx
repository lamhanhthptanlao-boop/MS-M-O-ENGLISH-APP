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
import { Assignment, AssignmentSubmission, PracticeStats } from '../types';
import { submitAssignmentResult } from '../storage/assignments';
import mascotImg from '../assets/images/ms_meo_mascot_1790341757214.jpg';

interface SubmitHomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: Assignment;
  practiceStats: PracticeStats;
  language?: 'en' | 'vi';
  onSubmissionSuccess?: (sub: AssignmentSubmission) => void;
}

export const SubmitHomeworkModal: React.FC<SubmitHomeworkModalProps> = ({
  isOpen,
  onClose,
  assignment,
  practiceStats,
  language = 'vi',
  onSubmissionSuccess,
}) => {
  const isEn = language === 'en';
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
      setErrorMessage(
        isEn
          ? 'Please enter your full name so your teacher can identify your work.'
          : 'Vui lòng nhập họ tên để cô giáo ghi nhận bài nộp của bạn.'
      );
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
        taskType: assignment.assignedTask || 'all',
        voiceCount: practiceStats.voiceCount,
        voiceAvgScore: practiceStats.voiceScore,
        typingMatchCount: practiceStats.typingMatchCount,
        typingMatchScore: practiceStats.typingMatchScore,
        dictationCount: practiceStats.dictationCount,
        shadowingCount: practiceStats.voiceCount,
        shadowingAvgScore: practiceStats.voiceScore,
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
      setErrorMessage(
        err.message ||
          (isEn ? 'Failed to submit homework. Please try again.' : 'Nộp bài thất bại, vui lòng thử lại.')
      );
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
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-4 sm:p-6 text-white shrink-0 relative overflow-hidden">
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={mascotImg}
                alt="Ms Mèo Mascot"
                referrerPolicy="no-referrer"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-white/80 object-cover shadow-md shrink-0"
              />
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-bold uppercase tracking-wider">
                  <span>{isEn ? '📤 Student Submission' : '📤 Nộp bài học sinh'}</span>
                </div>
                <h3 className="font-heading text-base sm:text-xl font-extrabold tracking-tight mt-0.5 truncate">
                  {isEn ? 'Submit Homework to Teacher' : 'Nộp bài cho Giáo viên'}
                </h3>
                <p className="text-xs text-teal-100 hidden sm:block truncate">
                  {isEn ? 'Assignment:' : 'Bài tập:'} {assignment.title}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {submittedResult ? (
            <div className="text-center py-6 space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 border border-emerald-300 flex items-center justify-center mx-auto text-3xl shadow-sm">
                🎉
              </div>
              <div>
                <h4 className="text-lg font-extrabold text-slate-900 font-heading">
                  {isEn ? 'Homework Submitted Successfully!' : 'Đã nộp bài thành công!'}
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                  {isEn ? (
                    <>
                      Great job, <strong>{submittedResult.studentName}</strong>! Your homework results have been saved.
                    </>
                  ) : (
                    <>
                      Rất tốt, <strong>{submittedResult.studentName}</strong>! Kết quả làm bài đã được ghi nhận trên thiết bị này.
                    </>
                  )}
                </p>
              </div>

              {/* Summary Pill Card */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 max-w-md mx-auto grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-left">
                <div>
                  <span className="text-slate-500 block text-[11px]">🎙️ Voice Score:</span>
                  <span className="font-extrabold text-pink-600 text-sm">
                    {submittedResult.voiceAvgScore ?? submittedResult.shadowingAvgScore}% ({submittedResult.voiceCount ?? submittedResult.shadowingCount} {isEn ? 'sent.' : 'câu'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">⌨️ Typing Match:</span>
                  <span className="font-extrabold text-indigo-600 text-sm">
                    {(submittedResult.typingMatchCount ?? 0) > 0
                      ? `${submittedResult.typingMatchScore ?? 0}% (${submittedResult.typingMatchCount} ${isEn ? 'sent.' : 'câu'})`
                      : '--'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">✍️ Dictation Score:</span>
                  <span className="font-extrabold text-amber-600 text-sm">
                    {submittedResult.dictationScore > 0 ? `${submittedResult.dictationScore}%` : '--'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">{isEn ? 'Reading Quiz:' : 'Trắc nghiệm:'}</span>
                  <span className="font-extrabold text-emerald-700 text-sm">
                    {submittedResult.quizScore}% ({submittedResult.quizCorrectCount}/{submittedResult.quizTotal})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Word Detective:</span>
                  <span className="font-extrabold text-teal-600">
                    {submittedResult.wordHuntCompleted
                      ? isEn ? '✓ Completed' : '✓ Hoàn thành'
                      : isEn ? 'Pending' : 'Chưa xong'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">{isEn ? 'Submitted at:' : 'Thời gian nộp:'}</span>
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
                  {isEn ? 'Continue Practicing with Ms Mèo' : 'Tiếp tục luyện tập cùng Ms Mèo'}
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
                    {isEn ? 'Student Full Name' : 'Họ và tên học sinh'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder={isEn ? 'e.g. Alex Nguyen' : 'Ví dụ: Nguyễn Minh Anh'}
                    className="w-full text-xs border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isEn ? 'Class / Section:' : 'Lớp / Nhóm:'}
                  </label>
                  <input
                    type="text"
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    placeholder={isEn ? 'e.g. 12A1' : 'Ví dụ: 12A1'}
                    className="w-full text-xs border border-slate-300 focus:border-teal-500 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              {/* Live Practice Results Card */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isEn ? 'Your current practice results:' : 'Kết quả luyện tập hiện tại của bạn:'}</span>
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-xl border border-pink-200">
                    <span className="text-slate-500 block text-[10px] font-semibold">🎙️ Voice</span>
                    <span className="font-extrabold text-pink-600 text-sm">
                      {practiceStats.voiceCount > 0 ? `${practiceStats.voiceScore}%` : '--'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {practiceStats.voiceCount} {isEn ? 'mic' : 'câu mic'}
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-indigo-200">
                    <span className="text-slate-500 block text-[10px] font-semibold">⌨️ Typing</span>
                    <span className="font-extrabold text-indigo-600 text-sm">
                      {practiceStats.typingMatchCount > 0 ? `${practiceStats.typingMatchScore}%` : '--'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {practiceStats.typingMatchCount} {isEn ? 'typed' : 'câu gõ'}
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-amber-200">
                    <span className="text-slate-500 block text-[10px] font-semibold">✍️ Dictation</span>
                    <span className="font-extrabold text-amber-600 text-sm">
                      {practiceStats.dictationCount > 0 ? `${practiceStats.dictationScore}%` : '--'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {practiceStats.dictationCount} {isEn ? 'sent.' : 'câu'}
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[10px] font-semibold">Quiz</span>
                    <span className="font-extrabold text-emerald-700 text-sm">
                      {practiceStats.quizScore}%
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {practiceStats.quizCorrectCount}/{practiceStats.quizTotal} {isEn ? 'ok' : 'đúng'}
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                    <span className="text-slate-500 block text-[10px] font-semibold">Word Hunt</span>
                    <span className="font-extrabold text-teal-600 text-sm">
                      {practiceStats.wordHuntCompleted ? (isEn ? 'Passed' : 'Đạt') : isEn ? 'Pending' : 'Chưa'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">{isEn ? 'Vocab' : 'Từ vựng'}</span>
                  </div>
                </div>
              </div>

              {/* Student Note / Reflection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                  <span>{isEn ? 'Note for teacher (Optional):' : 'Ghi chú cho giáo viên (Tùy chọn):'}</span>
                </label>
                <textarea
                  rows={2}
                  value={studentNote}
                  onChange={(e) => setStudentNote(e.target.value)}
                  placeholder={
                    isEn
                      ? 'e.g. Sentence 4 was challenging, I practiced it 3 times...'
                      : 'Ví dụ: Câu 4 hơi khó đọc âm đuôi -ed, em đã luyện lại 3 lần...'
                  }
                  className="w-full text-xs border border-slate-300 focus:border-teal-500 rounded-xl p-2.5 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {isEn ? 'Cancel' : 'Hủy'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 shadow-md transition-all hover:scale-102 flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>{isEn ? 'Submitting...' : 'Đang nộp...'}</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{isEn ? '🚀 Confirm & Submit' : '🚀 Xác nhận Nộp bài'}</span>
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
