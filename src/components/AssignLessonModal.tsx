import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Calendar,
  Users,
  BookOpen,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Send,
  FileText,
  Headphones,
  Mic,
  Search,
  CheckCircle2,
  PenTool,
  MessageCircle,
  Layers,
} from 'lucide-react';
import { Assignment, LessonFormat, AssignedTaskType } from '../types';
import { createAssignment } from '../storage/assignments';
import mascotImg from '../assets/images/ms_meo_mascot_1790341757214.jpg';

interface AssignLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawText: string;
  selectedTier: string;
  language?: 'en' | 'vi';
  lessonFormat?: LessonFormat;
  initialTitle?: string;
  onAssignmentCreated?: (assignment: Assignment) => void;
  onOpenAdminDashboard?: () => void;
}

interface TaskOption {
  id: AssignedTaskType;
  icon: string;
  titleEn: string;
  titleVi: string;
  descEn: string;
  descVi: string;
  badge: string;
  color: string;
}

const AVAILABLE_TASKS: TaskOption[] = [
  {
    id: 'listening',
    icon: '🎧',
    titleEn: 'Listening & Karaoke Subtitles',
    titleVi: 'Luyện nghe & Phụ đề Karaoke (English Sub)',
    descEn: 'Only shows teacher reading content in listening mode with synchronized English subtitles & karaoke text color changes',
    descVi: 'Chỉ hiện nguyên phần đọc ở dạng listening, có English sub & chuyển màu chữ Karaoke',
    badge: 'Đặc sắc / Karaoke',
    color: 'from-pink-500 to-rose-500',
  },
  {
    id: 'shadowing',
    icon: '🎙️',
    titleEn: 'Shadowing Studio',
    titleVi: 'Luyện phát âm & Shadowing',
    descEn: 'Sentence-by-sentence speech imitation with AI pronunciation accuracy scoring',
    descVi: 'Luyện nói từng câu và chấm điểm phát âm AI chuẩn bản xứ',
    badge: 'Nói & Phát âm',
    color: 'from-purple-500 to-indigo-500',
  },
  {
    id: 'words',
    icon: '🔍',
    titleEn: 'Task 1: Word Detective',
    titleVi: 'Nhiệm vụ 1: Tìm từ vựng (Word Detective)',
    descEn: 'Target vocabulary detection and recognition from the passage',
    descVi: 'Tìm và nhận diện các từ vựng xuất hiện trong bài đọc',
    badge: 'Từ vựng',
    color: 'from-amber-500 to-yellow-500',
  },
  {
    id: 'quiz',
    icon: '❓',
    titleEn: 'Task 2: Comprehension Quiz',
    titleVi: 'Nhiệm vụ 2: Trắc nghiệm Đọc hiểu',
    descEn: 'Multiple-choice questions with answer feedback and explanations',
    descVi: 'Bộ câu hỏi trắc nghiệm kiểm tra mức độ hiểu bài',
    badge: 'Đọc hiểu',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'dictation',
    icon: '✍️',
    titleEn: 'Task 3: Smart Dictation',
    titleVi: 'Nhiệm vụ 3: Chép chính tả thông minh',
    descEn: 'Listen to native voice and type the sentence with intelligent letter hints',
    descVi: 'Nghe giọng đọc và gõ lại câu văn với gợi ý thông minh',
    badge: 'Chính tả',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'chat',
    icon: '💬',
    titleEn: 'Task 4: Ms Mèo Chat',
    titleVi: 'Nhiệm vụ 4: Ms Mèo Chat phản xạ',
    descEn: 'Interactive English reflex chat with friendly assistant Ms Mèo',
    descVi: 'Trò chuyện phản xạ tiếng Anh về chủ đề bài đọc cùng Ms Mèo',
    badge: 'Giao tiếp',
    color: 'from-rose-500 to-pink-500',
  },
  {
    id: 'all',
    icon: '🌟',
    titleEn: 'Full Lesson (All Tasks)',
    titleVi: 'Trọn bộ: Tất cả các nhiệm vụ',
    descEn: 'Students can practice all learning activities in one complete lesson link',
    descVi: 'Học sinh được luyện tập trọn vẹn toàn bộ 6 hoạt động',
    badge: 'Toàn diện',
    color: 'from-indigo-600 to-purple-600',
  },
];

export const AssignLessonModal: React.FC<AssignLessonModalProps> = ({
  isOpen,
  onClose,
  rawText,
  selectedTier,
  language = 'en',
  lessonFormat = 'text',
  initialTitle = '',
  onAssignmentCreated,
  onOpenAdminDashboard,
}) => {
  const isEn = language === 'en';
  const [title, setTitle] = useState(
    initialTitle || (isEn ? 'English Practice with Ms Mèo' : 'Bài tập tiếng Anh cùng Ms Mèo')
  );
  const [format, setFormat] = useState<LessonFormat>(lessonFormat);
  const [selectedTask, setSelectedTask] = useState<AssignedTaskType>('listening');
  const [className, setClassName] = useState('Grade 12');
  const [teacherNotes, setTeacherNotes] = useState(
    isEn
      ? 'Please listen attentively with the English subtitles, watch the karaoke rhythm, and complete the reading assignment!'
      : 'Các em lắng nghe kỹ bài đọc với phụ đề tiếng Anh Karaoke, chú ý cách phát âm và hoàn thành bài tập nhé!'
  );
  const [dueDate, setDueDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 3);
    return nextWeek.toISOString().slice(0, 10);
  });

  const [isLoading, setIsLoading] = useState(false);
  const [createdAssignment, setCreatedAssignment] = useState<Assignment | null>(null);
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
  const [copiedMain, setCopiedMain] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const getTaskShareUrl = (id: string, taskType?: AssignedTaskType) => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('assignment', id);
    if (taskType && taskType !== 'all') {
      url.searchParams.set('task', taskType);
    }
    return url.toString();
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) {
      setErrorMsg(isEn ? 'Lesson has no text content to assign.' : 'Bài học không có nội dung văn bản để giao.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const assignment = await createAssignment({
        title: title.trim() || 'Bài tập tiếng Anh Ms Mèo',
        rawText: rawText.trim(),
        selectedTier,
        lessonFormat: format,
        className: className.trim(),
        teacherNotes: teacherNotes.trim(),
        dueDate: dueDate.trim(),
        assignedTask: selectedTask,
      });

      setCreatedAssignment(assignment);
      onAssignmentCreated?.(assignment);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tạo bài tập.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyTaskLink = (taskType: AssignedTaskType) => {
    if (!createdAssignment) return;
    const url = getTaskShareUrl(createdAssignment.id, taskType);
    navigator.clipboard.writeText(url);
    setCopiedTaskId(taskType);
    setTimeout(() => setCopiedTaskId(null), 2500);
  };

  const handleCopyMainLink = () => {
    if (!createdAssignment) return;
    const url = getTaskShareUrl(createdAssignment.id, createdAssignment.assignedTask || selectedTask);
    navigator.clipboard.writeText(url);
    setCopiedMain(true);
    setTimeout(() => setCopiedMain(false), 2500);
  };

  const handleShareZalo = (taskType: AssignedTaskType) => {
    if (!createdAssignment) return;
    const url = encodeURIComponent(getTaskShareUrl(createdAssignment.id, taskType));
    const taskInfo = AVAILABLE_TASKS.find((t) => t.id === taskType);
    const taskName = taskInfo ? (isEn ? taskInfo.titleEn : taskInfo.titleVi) : '';
    const titleText = encodeURIComponent(
      `[Bài tập tiếng Anh - ${taskName}] ${createdAssignment.title} - Lớp ${createdAssignment.className}`
    );
    window.open(`https://sp.zalo.me/share?url=${url}&title=${titleText}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-pink-200 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-5 sm:p-6 text-white shrink-0 relative overflow-hidden">
          <div className="flex items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <img
                src={mascotImg}
                alt="Ms Mèo Mascot"
                className="w-12 h-12 rounded-full border-2 border-white/80 object-cover shadow-md"
              />
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider">
                  <span>{isEn ? '🐾 Assign Individual Tasks' : '🐾 Giao từng nhiệm vụ & Link riêng'}</span>
                </div>
                <h2 className="font-heading text-xl sm:text-2xl font-black tracking-tight mt-0.5">
                  {isEn ? 'Assign Specific Tasks & Generate Direct Links' : 'Giao nhiệm vụ & Tạo link riêng từng phần'}
                </h2>
                <p className="text-xs text-teal-100 hidden sm:block">
                  {isEn
                    ? 'Assign listening karaoke, shadowing, quiz, or dictation individually with unique direct links!'
                    : 'Giáo viên có thể giao riêng từng nhiệm vụ (như Luyện nghe Karaoke, Shadowing, Quiz...) và mỗi nhiệm vụ đều có link riêng!'}
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
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {createdAssignment ? (
            /* ========================================================================= */
            /* VIEW A: ASSIGNMENT CREATED - DISPLAY DIRECT INDIVIDUAL TASK LINKS          */
            /* ========================================================================= */
            <div className="space-y-6 animate-fadeIn">
              {/* Success Callout */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xl font-bold shadow-sm">
                  ✓
                </div>
                <div>
                  <h4 className="font-black text-sm text-emerald-950">
                    {isEn ? 'Assignment links generated successfully!' : 'Đã tạo bài tập và link riêng cho từng nhiệm vụ!'}
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {isEn
                      ? 'You can copy individual links for each task below or share the primary link directly to your class.'
                      : 'Thầy cô có thể sao chép link riêng cho từng nhiệm vụ dưới đây để gửi vào nhóm lớp cho học sinh làm bài.'}
                  </p>
                </div>
              </div>

              {/* Assignment Overview Pill */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-700">Tên bài tập:</span>
                  <span className="font-extrabold text-pink-600 text-sm">{createdAssignment.title}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-600">
                  <div>
                    <span className="text-slate-400">Định dạng:</span>{' '}
                    <strong>{createdAssignment.lessonFormat === 'conversation' ? '💬 Hội thoại' : '📄 Đoạn văn'}</strong>
                  </div>
                  {createdAssignment.className && (
                    <div>
                      <span className="text-slate-400">Lớp:</span> <strong>{createdAssignment.className}</strong>
                    </div>
                  )}
                  {createdAssignment.dueDate && (
                    <div>
                      <span className="text-slate-400">Hạn nộp:</span> <strong>{createdAssignment.dueDate}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION: PRIMARY ASSIGNED TASK LINK */}
              <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-amber-50 border-2 border-pink-300 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⭐</span>
                    <strong className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      {isEn ? 'Primary Assigned Task Link:' : 'Link Nhiệm vụ chính được giao:'}
                    </strong>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500 text-white">
                      {AVAILABLE_TASKS.find((t) => t.id === createdAssignment.assignedTask)?.titleVi || 'Luyện nghe Karaoke'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getTaskShareUrl(createdAssignment.id, createdAssignment.assignedTask)}
                    className="w-full text-xs font-mono bg-white border border-pink-300 rounded-xl px-3 py-2 text-slate-800 select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyMainLink}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                      copiedMain
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white hover:from-pink-600 hover:to-rose-700 shadow-xs'
                    }`}
                  >
                    {copiedMain ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Đã chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Sao chép link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* SECTION: INDIVIDUAL TASK LINKS (GIAO TỪNG NHIỆM VỤ 1 VÀ CÓ LINK RIÊNG)    */}
              {/* ========================================================================= */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-heading font-black text-sm text-slate-900 uppercase tracking-wide">
                      {isEn ? 'Individual Task Links (Separate Links for Each Station):' : '📋 Danh sách Link riêng cho từng nhiệm vụ:'}
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {AVAILABLE_TASKS.length} nhiệm vụ riêng biệt
                  </span>
                </div>

                <div className="space-y-2.5">
                  {AVAILABLE_TASKS.map((task) => {
                    const taskUrl = getTaskShareUrl(createdAssignment.id, task.id);
                    const isCopied = copiedTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          task.id === createdAssignment.assignedTask
                            ? 'bg-pink-50/70 border-pink-300 ring-1 ring-pink-200'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                          {/* Task Info */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-xl shrink-0 p-1.5 rounded-xl bg-slate-100">{task.icon}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-extrabold text-xs text-slate-900 truncate">
                                  {isEn ? task.titleEn : task.titleVi}
                                </h4>
                                <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  {task.badge}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {isEn ? task.descEn : task.descVi}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons for this specific task */}
                          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                            <button
                              type="button"
                              onClick={() => handleCopyTaskLink(task.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                                isCopied
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                              }`}
                              title="Sao chép link nhiệm vụ này"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Đã chép!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                                  <span>Chép link</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleShareZalo(task.id)}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                              title="Gửi link này qua Zalo"
                            >
                              <span>Zalo</span>
                            </button>

                            <a
                              href={taskUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                              title="Mở xem thử giao diện học sinh"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>

                        {/* Direct URL Preview */}
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">Link:</span>
                          <span className="text-[11px] font-mono text-slate-600 truncate bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 w-full select-all">
                            {taskUrl}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Nav / Close */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCreatedAssignment(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  ← Tạo bài tập khác
                </button>

                {onOpenAdminDashboard && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAdminDashboard();
                    }}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-xs"
                  >
                    <span>📊 Xem trang quản lý kết quả học sinh</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* VIEW B: ASSIGNMENT FORM - SELECT SPECIFIC TASK & CONFIGURE DETAILS        */
            /* ========================================================================= */
            <form onSubmit={handleCreateAssignment} className="space-y-5">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* 1. SELECT SPECIFIC TASK TO ASSIGN */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>🎯</span>
                    <span>{isEn ? 'Choose Specific Task to Assign:' : 'Chọn nhiệm vụ cụ thể để giao (có link riêng):'}</span>
                  </span>
                  <span className="text-[11px] text-pink-600 font-normal">
                    {isEn ? 'Each task gets its own dedicated link' : 'Học sinh chỉ tập trung vào nhiệm vụ này'}
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_TASKS.map((task) => {
                    const isSelected = selectedTask === task.id;
                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-gradient-to-r from-pink-50 to-rose-50 border-pink-400 ring-2 ring-pink-200 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-pink-300 hover:bg-pink-50/20'
                        }`}
                      >
                        <span className="text-xl shrink-0 mt-0.5">{task.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-extrabold text-xs text-slate-900 truncate">
                              {isEn ? task.titleEn : task.titleVi}
                            </h4>
                            {isSelected && (
                              <span className="text-[10px] font-black text-pink-600 shrink-0">✓ Chọn</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {isEn ? task.descEn : task.descVi}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Format Selector: Reading Passage vs Conversation */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Dạng bài học giao cho học sinh:</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormat('text')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      format === 'text'
                        ? 'bg-pink-50 border-pink-400 text-pink-700 ring-2 ring-pink-200 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>📄 Dạng Đoạn văn đọc</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('conversation')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      format === 'conversation'
                        ? 'bg-teal-50 border-teal-500 text-teal-800 ring-2 ring-teal-200 shadow-2xs font-extrabold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>💬 Dạng Hội thoại (Dialogue)</span>
                  </button>
                </div>
              </div>

              {/* 3. Assignment Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tiêu đề bài tập <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Luyện phát âm & Đọc hiểu Unit 5..."
                  className="w-full text-xs border border-slate-300 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 rounded-xl px-3 py-2"
                />
              </div>

              {/* 4. Class & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-teal-600" />
                    <span>Lớp học / Nhóm:</span>
                  </label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="Ví dụ: 10A1, 11B2, 12A3..."
                    className="w-full text-xs border border-slate-300 focus:border-pink-500 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    <span>Hạn nộp bài (Tùy chọn):</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 focus:border-pink-500 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              {/* 5. Teacher Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                  <span>Lời dặn / Yêu cầu của Giáo viên:</span>
                </label>
                <textarea
                  rows={2}
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  placeholder="Ghi chú yêu cầu học sinh làm những phần nào..."
                  className="w-full text-xs border border-slate-300 focus:border-pink-500 rounded-xl p-2.5 resize-none"
                />
              </div>

              {/* 6. Text Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Nội dung bài học (Trích đoạn):</span>
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-20 overflow-y-auto text-xs text-slate-600 leading-relaxed italic">
                  "{rawText.slice(0, 240)}..."
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 shadow-md transition-all hover:scale-102 flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>Đang tạo link...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>🚀 Tạo link riêng cho các nhiệm vụ</span>
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
