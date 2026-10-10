import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Award,
  Calendar,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Download,
  Share2,
  MessageSquare,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Assignment, AssignmentSubmission, AssignedTaskType } from '../types';
import {
  fetchAssignments,
  fetchSubmissions,
  deleteAssignment,
} from '../storage/assignments';
import mascotImg from '../assets/images/ms_meo_mascot_1790341757214.jpg';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAssignmentToPractice?: (assignment: Assignment) => void;
  onOpenAssignModal?: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  onSelectAssignmentToPractice,
  onOpenAssignModal,
}) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadAllAssignments();
    }
  }, [isOpen]);

  const loadAllAssignments = async () => {
    setIsLoading(true);
    try {
      const list = await fetchAssignments();
      setAssignments(list);
      if (list.length > 0 && !selectedAssignment) {
        selectAssignment(list[0]);
      } else if (selectedAssignment) {
        const stillExists = list.find((a) => a.id === selectedAssignment.id);
        if (stillExists) {
          selectAssignment(stillExists);
        } else if (list.length > 0) {
          selectAssignment(list[0]);
        } else {
          setSelectedAssignment(null);
          setSubmissions([]);
        }
      }
    } catch (err) {
      console.error('Error fetching assignments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectAssignment = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setIsLoadingSubmissions(true);
    try {
      const subs = await fetchSubmissions(assignment.id);
      setSubmissions(subs);
    } catch (err) {
      console.error('Error fetching submissions:', err);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa bài tập này và toàn bộ kết quả nộp bài của học sinh?')) {
      return;
    }
    await deleteAssignment(id);
    await loadAllAssignments();
  };

  const handleCopyLink = (assignmentId: string, taskType?: AssignedTaskType) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('assignment', assignmentId);
    if (taskType && taskType !== 'all') {
      url.searchParams.set('task', taskType);
    }
    navigator.clipboard.writeText(url.toString());
    setCopiedId(assignmentId);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handleExportCSV = () => {
    if (!selectedAssignment || submissions.length === 0) return;

    const headers = [
      'STT',
      'Họ và tên',
      'Lớp',
      'Điểm Quiz (%)',
      'Số câu đúng',
      'Số câu Shadowing',
      'Điểm phát âm TB (%)',
      'Tìm từ',
      'Chính tả (%)',
      'Lời nhắn',
      'Thời gian nộp',
    ];

    const rows = submissions.map((s, idx) => [
      idx + 1,
      `"${s.studentName.replace(/"/g, '""')}"`,
      `"${s.studentClass || ''}"`,
      `${s.quizScore}%`,
      `${s.quizCorrectCount}/${s.quizTotal}`,
      s.shadowingCount,
      `${s.shadowingAvgScore}%`,
      s.wordHuntCompleted ? 'Hoàn thành' : 'Chưa',
      `${s.dictationScore}%`,
      `"${(s.studentNote || '').replace(/"/g, '""')}"`,
      new Date(s.submittedAt).toLocaleString('vi-VN'),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Ket_qua_${selectedAssignment.title.replace(/[\s/]/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  // Aggregate stats
  const totalSubmissionsCount = submissions.length;
  const avgQuizScore =
    totalSubmissionsCount > 0
      ? Math.round(submissions.reduce((acc, cur) => acc + (cur.quizScore || 0), 0) / totalSubmissionsCount)
      : 0;
  const avgPronunciationScore =
    totalSubmissionsCount > 0
      ? Math.round(
          submissions.reduce((acc, cur) => acc + (cur.shadowingAvgScore || 0), 0) / totalSubmissionsCount
        )
      : 0;

  const filteredSubmissions = submissions.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return s.studentName.toLowerCase().includes(term) || (s.studentClass || '').toLowerCase().includes(term);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl border border-pink-200 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white shrink-0 relative overflow-hidden">
          <div className="flex items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <img
                src={mascotImg}
                alt="Ms Mèo Mascot"
                referrerPolicy="no-referrer"
                className="w-13 h-13 rounded-full border-2 border-amber-400 object-cover shadow-md"
              />
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold uppercase tracking-wider">
                  <span>📊 Trang chủ Admin & Giáo viên</span>
                </div>
                <h2 className="font-heading text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5">
                  Quản lý giao bài & Kết quả học sinh
                </h2>
                <p className="text-xs text-slate-300 hidden sm:block">
                  Theo dõi danh sách bài tập đã giao, xem phản hồi nộp bài và bảng điểm trực tuyến của học sinh
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadAllAssignments}
                disabled={isLoading}
                title="Làm mới dữ liệu từ hệ thống"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-white/15 relative z-10 text-xs">
            <div className="bg-white/10 rounded-xl p-2.5">
              <span className="text-slate-400 block text-[11px]">Tổng bài đã giao:</span>
              <span className="text-lg font-extrabold text-amber-300 font-heading">
                {assignments.length} bài
              </span>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5">
              <span className="text-slate-400 block text-[11px]">Học sinh đã nộp:</span>
              <span className="text-lg font-extrabold text-emerald-400 font-heading">
                {totalSubmissionsCount} lượt
              </span>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5">
              <span className="text-slate-400 block text-[11px]">Điểm Quiz trung bình:</span>
              <span className="text-lg font-extrabold text-sky-300 font-heading">
                {totalSubmissionsCount > 0 ? `${avgQuizScore}%` : '--'}
              </span>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5">
              <span className="text-slate-400 block text-[11px]">Phát âm TB (Shadowing):</span>
              <span className="text-lg font-extrabold text-pink-300 font-heading">
                {totalSubmissionsCount > 0 ? `${avgPronunciationScore}%` : '--'}
              </span>
            </div>
          </div>
        </div>

        {/* Main Body: Two Columns */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Assignment List */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/70 p-3 sm:p-4 flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Danh sách bài tập ({assignments.length})</span>
              </span>

              {onOpenAssignModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAssignModal();
                  }}
                  className="text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                >
                  <span>+ Giao bài mới</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-48 md:max-h-none">
              {assignments.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
                  <p>Chưa có bài tập nào được giao.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Bấm nút "Giao bài cho học sinh" trên thanh công cụ để tạo link bài tập đầu tiên!
                  </p>
                </div>
              ) : (
                assignments.map((assignment) => {
                  const isSelected = selectedAssignment?.id === assignment.id;
                  return (
                    <div
                      key={assignment.id}
                      onClick={() => selectAssignment(assignment)}
                      className={`p-3 rounded-2xl cursor-pointer transition-all border text-left ${
                        isSelected
                          ? 'bg-white border-indigo-400 shadow-md ring-2 ring-indigo-200'
                          : 'bg-white/80 hover:bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`px-1.5 py-0.2 rounded-md font-bold text-[9px] shrink-0 ${
                            assignment.lessonFormat === 'conversation'
                              ? 'bg-teal-100 text-teal-800 border border-teal-200'
                              : 'bg-pink-100 text-pink-700 border border-pink-200'
                          }`}>
                            {assignment.lessonFormat === 'conversation' ? '💬 Hội thoại' : '📄 Đoạn văn'}
                          </span>
                          {assignment.assignedTask && assignment.assignedTask !== 'all' && (
                            <span className="px-1.5 py-0.2 rounded-md font-bold text-[9px] shrink-0 bg-amber-100 text-amber-800 border border-amber-200">
                              {assignment.assignedTask === 'listening' ? '🎧 Nghe' : assignment.assignedTask}
                            </span>
                          )}
                          <h4 className="font-extrabold text-xs text-slate-900 line-clamp-1">
                            {assignment.title}
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                          {assignment.submissionCount || 0} nộp
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                        {assignment.className && (
                          <span className="font-semibold text-slate-700">Lớp: {assignment.className}</span>
                        )}
                        <span>•</span>
                        <span>{new Date(assignment.createdAt).toLocaleDateString('vi-VN')}</span>
                      </div>

                      {/* Action buttons inside card */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLink(assignment.id, assignment.assignedTask);
                          }}
                          className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                        >
                          {copiedId === assignment.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600">Đã chép link</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Lấy link</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAssignment(assignment.id);
                          }}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="Xóa bài tập này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Selected Assignment Details & Student Submissions Table */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col bg-white">
            {selectedAssignment ? (
              <div className="space-y-4">
                {/* Assignment Banner Header */}
                <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 p-4 rounded-2xl border border-indigo-200">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white uppercase">
                          Chi tiết bài tập
                        </span>
                        {selectedAssignment.className && (
                          <span className="text-xs font-bold text-indigo-900 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                            Lớp: {selectedAssignment.className}
                          </span>
                        )}
                        {selectedAssignment.dueDate && (
                          <span className="text-xs text-slate-600 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>Hạn: {selectedAssignment.dueDate}</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 mt-1">
                        {selectedAssignment.title}
                      </h3>
                      {selectedAssignment.teacherNotes && (
                        <p className="text-xs text-slate-600 mt-1 italic">
                          "{selectedAssignment.teacherNotes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(selectedAssignment.id, selectedAssignment.assignedTask)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                          copiedId === selectedAssignment.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {copiedId === selectedAssignment.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Đã sao chép link!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Sao chép link làm bài</span>
                          </>
                        )}
                      </button>

                      {onSelectAssignmentToPractice && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectAssignmentToPractice(selectedAssignment);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs flex items-center gap-1"
                          title="Tải nội dung bài này lên màn hình luyện tập"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Mở bài học này</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Search & Export Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Tìm theo tên học sinh / lớp..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="text-xs border border-slate-300 rounded-xl px-3 py-1.5 w-56 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs font-semibold text-slate-500">
                      Hiển thị {filteredSubmissions.length} / {submissions.length} học sinh
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => selectAssignment(selectedAssignment)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSubmissions ? 'animate-spin' : ''}`} />
                      <span>Làm mới</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportCSV}
                      disabled={submissions.length === 0}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Xuất bảng điểm (Excel / CSV)</span>
                    </button>
                  </div>
                </div>

                {/* Submissions Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  {isLoadingSubmissions ? (
                    <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                      <span>Đang tải kết quả bài nộp của học sinh...</span>
                    </div>
                  ) : filteredSubmissions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 bg-slate-50">
                      <p className="font-bold text-slate-700 text-sm">Chưa có kết quả nộp bài nào.</p>
                      <p className="mt-1 text-slate-400">
                        Hãy sao chép link và gửi cho học sinh trong lớp để các em làm bài và gửi kết quả về đây!
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                            <th className="py-2.5 px-3">Học sinh</th>
                            <th className="py-2.5 px-3">Lớp</th>
                            <th className="py-2.5 px-3 text-center">Nghe (Karaoke)</th>
                            <th className="py-2.5 px-3 text-center">Shadowing (Nói)</th>
                            <th className="py-2.5 px-3 text-center">Quiz (Đọc)</th>
                            <th className="py-2.5 px-3 text-center">Tìm từ</th>
                            <th className="py-2.5 px-3 text-center">Chính tả</th>
                            <th className="py-2.5 px-3 text-center">Đánh giá</th>
                            <th className="py-2.5 px-3">Thời gian</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredSubmissions.map((sub) => {
                            const isExcellent =
                              (sub.quizScore >= 80 && sub.shadowingAvgScore >= 75) ||
                              sub.quizScore === 100 ||
                              sub.listeningCompleted;
                            const isGood = sub.quizScore >= 60 || sub.shadowingAvgScore >= 60 || sub.listeningCompleted;

                            return (
                              <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-3 px-3 font-bold text-slate-900">
                                  <div>{sub.studentName}</div>
                                  {sub.studentNote && (
                                    <div className="text-[10px] text-slate-500 font-normal italic mt-0.5 line-clamp-1">
                                      💬 "{sub.studentNote}"
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3 font-semibold text-slate-600">
                                  {sub.studentClass || '--'}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {sub.listeningCompleted || sub.taskType === 'listening' ? (
                                    <div className="inline-flex items-center gap-1 text-pink-600 font-bold text-[11px] bg-pink-50 px-2 py-0.5 rounded-md border border-pink-200">
                                      <span>🎧</span>
                                      <span>Hoàn thành</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">--</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <div className="font-extrabold text-pink-600">
                                    {sub.shadowingAvgScore}%
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {sub.shadowingCount} câu
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <div className="font-extrabold text-indigo-600">
                                    {sub.quizScore}%
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {sub.quizCorrectCount}/{sub.quizTotal} đúng
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {sub.wordHuntCompleted ? (
                                    <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold text-[11px]">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Xong</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">--</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className="font-bold text-slate-700">
                                    {sub.dictationScore > 0 ? `${sub.dictationScore}%` : '--'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {isExcellent ? (
                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      🌟 Xuất sắc
                                    </span>
                                  ) : isGood ? (
                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                                      ⚡ Khá tốt
                                    </span>
                                  ) : (
                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                                      📖 Cần rèn thêm
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-slate-400 text-[10px] whitespace-nowrap">
                                  {new Date(sub.submittedAt).toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}{' '}
                                  {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <BookOpen className="w-12 h-12 text-slate-300 mb-2" />
                <h4 className="font-bold text-slate-600 text-sm">Chưa chọn bài tập nào</h4>
                <p className="text-xs max-w-sm mt-1">
                  Chọn một bài tập ở danh sách bên trái hoặc bấm "Giao bài mới" để tạo link gửi cho học sinh.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <span>🐾 Dữ liệu kết quả được đồng bộ trực tiếp từ học sinh về trang chủ Admin.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors shadow-xs"
          >
            Đóng trang quản lý
          </button>
        </div>
      </div>
    </div>
  );
};
