import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Send,
  Globe,
  Sparkles,
  BookOpen,
  Calendar,
  Users,
  MessageSquare,
  Lock,
  Headphones,
  Mic,
  Search,
  CheckCircle2,
  PenTool,
  MessageCircle,
  X,
} from 'lucide-react';
import {
  Assignment,
  AssignmentSubmission,
  AnalyzedSentence,
  DifficultyTier,
  VoiceSettings,
  ShadowingResult,
  WordRecognitionItem,
  QuizQuestion,
  AssignedTaskType,
  PracticeStats,
  GamificationState,
} from '../types';
import mascotImg from '../assets/images/ms_meo_mascot_1790341757214.jpg';
import { StudentListeningKaraokeView } from './StudentListeningKaraokeView';
import { ShadowingStudio } from './ShadowingStudio';
import { TaskWordRecognition } from './TaskWordRecognition';
import { TaskComprehensionQuiz } from './TaskComprehensionQuiz';
import { TaskSmartDictation } from './TaskSmartDictation';
import { TaskMsMeoChatbot } from './TaskMsMeoChatbot';
import { VoiceToolbar } from './VoiceToolbar';
import { StudentBottomNav } from './StudentBottomNav';
import { LeaderboardPanel } from './LeaderboardPanel';
import { StorageHonestyBanner } from './StorageHonestyBanner';
import { computeEffectiveLocalXp, computeLeaderboard, createInitialGamificationState } from '../utils/gamification';
import { fetchSubmissions } from '../storage/assignments';

interface StudentDirectAssignmentViewProps {
  assignment: Assignment;
  assignedTaskType: AssignedTaskType;
  sentences: AnalyzedSentence[];
  activeTierSentences: AnalyzedSentence[];
  rawText: string;
  selectedTier: DifficultyTier;
  onSelectTier: (tier: DifficultyTier) => void;
  voiceSettings: VoiceSettings;
  onUpdateVoiceSettings: (settings: VoiceSettings) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  language: 'en' | 'vi';
  onToggleLanguage: () => void;
  voiceResults: Record<string, ShadowingResult>;
  typingMatchResults: Record<string, ShadowingResult>;
  onSaveVoiceResult: (sentenceId: string, result: ShadowingResult) => void;
  onSaveTypingMatchResult: (sentenceId: string, result: ShadowingResult) => void;
  livePracticeStats: PracticeStats;
  wordRecognitionItems: WordRecognitionItem[];
  quizQuestions: QuizQuestion[];
  onRefreshWordHunt: () => void;
  onWordHuntComplete: (allFound: boolean) => void;
  onQuizProgress: (correctCount: number, total: number) => void;
  onDictationEvaluated: (sentenceId: string, score: number) => void;
  onChatActivity?: () => void;
  onOpenSubmitModal: () => void;
  gamification?: GamificationState;
  unlockedBadgeCount?: number;
  onOpenBadges?: () => void;
  onDataImported?: () => void;
}

export const StudentDirectAssignmentView: React.FC<StudentDirectAssignmentViewProps> = ({
  assignment,
  assignedTaskType,
  sentences,
  activeTierSentences,
  rawText,
  selectedTier,
  onSelectTier,
  voiceSettings,
  onUpdateVoiceSettings,
  soundEnabled,
  onToggleSound,
  language,
  onToggleLanguage,
  voiceResults,
  typingMatchResults,
  onSaveVoiceResult,
  onSaveTypingMatchResult,
  livePracticeStats,
  wordRecognitionItems,
  quizQuestions,
  onRefreshWordHunt,
  onWordHuntComplete,
  onQuizProgress,
  onDictationEvaluated,
  onChatActivity,
  onOpenSubmitModal,
  gamification = createInitialGamificationState(),
  unlockedBadgeCount = 0,
  onOpenBadges,
  onDataImported,
}) => {
  const isEn = language === 'en';
  // If task is 'all', allow switching between student stations
  const [studentActiveTab, setStudentActiveTab] = useState<
    'listening' | 'shadowing' | 'words' | 'quiz' | 'dictation' | 'chatbot'
  >('listening');
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<AssignmentSubmission[]>([]);

  const effectiveXp = computeEffectiveLocalXp(gamification, livePracticeStats);

  const openStudentLeaderboard = async () => {
    setShowLeaderboardModal(true);
    try {
      const subs = await fetchSubmissions(assignment.id);
      setAssignmentSubmissions(subs);
    } catch {
      // keep existing
    }
  };

  const leaderboardEntries = React.useMemo(() => {
    const completedTasks =
      (livePracticeStats.voiceCount > 0 ? 1 : 0) +
      (livePracticeStats.typingMatchCount > 0 ? 1 : 0) +
      (livePracticeStats.dictationCount > 0 ? 1 : 0) +
      (livePracticeStats.quizTotal > 0 ? 1 : 0) +
      (livePracticeStats.wordHuntCompleted ? 1 : 0);

    const accList: number[] = [];
    if (livePracticeStats.voiceCount > 0) accList.push(livePracticeStats.voiceScore);
    if (livePracticeStats.typingMatchCount > 0) accList.push(livePracticeStats.typingMatchScore);
    if (livePracticeStats.dictationCount > 0) accList.push(livePracticeStats.dictationScore);
    if (livePracticeStats.quizTotal > 0) accList.push(livePracticeStats.quizScore);

    const avgAccuracy =
      accList.length > 0 ? Math.round(accList.reduce((a, b) => a + b, 0) / accList.length) : 0;

    return computeLeaderboard(assignmentSubmissions, {
      studentName: isEn ? 'You (This Browser)' : 'Bạn (Trình duyệt này)',
      studentClass: assignment.className || '',
      xp: effectiveXp,
      avgAccuracy,
      completedTasks,
      streakDays: gamification.currentStreakDays,
    });
  }, [assignmentSubmissions, livePracticeStats, effectiveXp, gamification.currentStreakDays, assignment.className, isEn]);

  const getTaskTitle = (task: AssignedTaskType) => {
    switch (task) {
      case 'listening':
        return isEn ? '🎧 Listening & Karaoke Subtitles' : '🎧 Luyện nghe & Phụ đề Karaoke';
      case 'shadowing':
        return isEn ? '🎙️ Shadowing Studio' : '🎙️ Luyện phát âm & Shadowing';
      case 'words':
        return isEn ? '🔍 Task 1: Word Detective' : '🔍 Nhiệm vụ 1: Tìm từ vựng';
      case 'quiz':
        return isEn ? '📝 Task 2: Comprehension Quiz' : '📝 Nhiệm vụ 2: Trắc nghiệm Đọc hiểu';
      case 'dictation':
        return isEn ? '✍️ Task 3: Smart Dictation' : '✍️ Nhiệm vụ 3: Chép chính tả';
      case 'chat':
        return isEn ? '🐱 Task 4: Ms Mèo Chat' : '🐱 Nhiệm vụ 4: Ms Mèo Chat phản xạ';
      default:
        return isEn ? '🌟 Full Lesson Practice' : '🌟 Toàn bộ bài tập';
    }
  };

  const getTaskBadge = (task: AssignedTaskType) => {
    switch (task) {
      case 'listening':
        return 'Luyện nghe';
      case 'shadowing':
        return 'Phát âm AI';
      case 'words':
        return 'Từ vựng';
      case 'quiz':
        return 'Đọc hiểu';
      case 'dictation':
        return 'Chính tả';
      case 'chat':
        return 'Giao tiếp';
      default:
        return 'Bài tập';
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF4F8] text-slate-800 flex flex-col antialiased selection:bg-pink-200 selection:text-pink-900">
      {/* ========================================================================= */}
      {/* 1. DEDICATED STUDENT TOP NAVBAR                                           */}
      {/* Completely isolated from admin controls: NO Soạn bài, NO Kho bài,         */}
      {/* NO Admin dashboard, NO home leading to creator tools.                      */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-pink-100 shadow-xs">
        <div className="max-w-6xl mx-auto px-2.5 sm:px-6 h-16 flex items-center justify-between gap-2 min-w-0">
          {/* Logo & Student Mode Identity */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src={mascotImg}
                alt="Ms Mèo Mascot"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-pink-300 object-cover shadow-sm"
              />
              <span className="absolute -bottom-1 -right-1 text-xs">🎓</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-heading text-sm sm:text-lg font-black tracking-tight text-slate-900 truncate">
                  Ms Mèo English
                </span>
                <span className="hidden xs:inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-pink-100 text-pink-700 border border-pink-300 shrink-0">
                  {isEn ? 'Student' : 'Học sinh'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                {isEn
                  ? 'Complete your assigned homework and submit your results'
                  : 'Hoàn thành bài tập được giao và bấm Nộp bài cho thầy cô'}
              </p>
            </div>
          </div>

          {/* Right: Assigned Task Badge, Sound, Language, and Submit Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Active task badge */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-50 to-pink-50 border border-amber-300 text-slate-900 text-xs font-black shadow-2xs">
              <Lock className="w-3 h-3 text-amber-600" />
              <span>{getTaskTitle(assignedTaskType)}</span>
            </div>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={onToggleSound}
              title={soundEnabled ? (isEn ? 'Mute sound' : 'Tắt âm thanh') : (isEn ? 'Enable sound' : 'Bật âm thanh')}
              className="p-2 text-slate-600 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors border border-slate-200"
              aria-label="Toggle sound"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-pink-600" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Language Toggle */}
            <button
              type="button"
              onClick={onToggleLanguage}
              title={language === 'en' ? 'Chuyển sang Tiếng Việt' : 'Switch to English'}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold rounded-xl border border-slate-200 hover:border-pink-300 hover:bg-pink-50 transition-all text-slate-700"
            >
              <Globe className="w-3.5 h-3.5 text-pink-600" />
              <span>{language === 'en' ? '🇺🇸 EN' : '🇻🇳 VI'}</span>
            </button>

            {/* Submit Homework Button */}
            <button
              type="button"
              onClick={onOpenSubmitModal}
              className="px-3 sm:px-4 py-2 rounded-xl text-xs font-black text-slate-900 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-md transition-all hover:scale-103 ring-2 ring-amber-200 flex items-center gap-1.5 shrink-0"
              title={isEn ? 'Submit Homework' : 'Nộp bài tập'}
            >
              <Send className="w-3.5 h-3.5 text-slate-900" />
              <span>{isEn ? 'Submit' : 'Nộp bài'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN STUDENT WORKSPACE: ONLY THE ASSIGNED TASK IS DISPLAYED             */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-2.5 sm:px-6 py-4 sm:py-7 pb-28 space-y-5 min-w-0">
        <StorageHonestyBanner
          language={language}
          compact
          onDataImported={onDataImported}
        />
        {/* TASK A: LISTENING & KARAOKE */}
        {assignedTaskType === 'listening' && (
          <StudentListeningKaraokeView
            assignment={assignment}
            sentences={activeTierSentences}
            rawText={rawText}
            language={language}
            voiceSettings={voiceSettings}
            onUpdateVoiceSettings={onUpdateVoiceSettings}
            onSwitchToOtherTask={() => {}}
            onExitStudentMode={() => {}}
          />
        )}

        {/* TASK B: SHADOWING STUDIO */}
        {assignedTaskType === 'shadowing' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Minimal Student Assignment Info Card */}
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-pink-200 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-pink-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-2xs">
                      🔒 {getTaskTitle('shadowing')}
                    </span>
                    {assignment.className && (
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                        <Users className="w-3 h-3 text-pink-600" />
                        <span>{isEn ? 'Class:' : 'Lớp:'} {assignment.className}</span>
                      </span>
                    )}
                    {assignment.dueDate && (
                      <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-amber-600" />
                        <span>{isEn ? 'Due:' : 'Hạn:'} {assignment.dueDate}</span>
                      </span>
                    )}
                  </div>
                  <h1 className="font-heading text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {assignment.title}
                  </h1>
                  {assignment.teacherNotes && (
                    <div className="mt-2 p-2.5 rounded-xl bg-pink-50/70 border border-pink-200 text-xs text-pink-950 italic flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-pink-600 shrink-0 mt-0.5" />
                      <span><strong>{isEn ? "Teacher's Note:" : 'Lời dặn của cô:'}</strong> "{assignment.teacherNotes}"</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onOpenSubmitModal}
                  className="px-4 py-2 rounded-xl text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-300 shadow-xs transition-all hover:scale-102 ring-2 ring-amber-200 flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5 text-slate-900" />
                  <span>{isEn ? 'Submit' : 'Nộp bài'}</span>
                </button>
              </div>

              {/* Tier selector (Hint Level only) */}
              <div className="mt-3 flex items-center justify-between gap-3 text-xs flex-wrap">
                <span className="text-slate-600 font-bold">
                  {isEn ? 'Hint Level (all sentences kept):' : 'Mức gợi ý (giữ nguyên toàn bộ câu):'}
                </span>
                <div className="flex items-center gap-1.5">
                  {(['easy', 'medium', 'hard'] as DifficultyTier[]).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => onSelectTier(tier)}
                      className={`px-3 py-1 rounded-xl text-xs font-extrabold capitalize transition-all ${
                        selectedTier === tier
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {tier === 'easy'
                        ? isEn ? 'Easy (100% Hint)' : 'Easy (Gợi ý nhiều)'
                        : tier === 'medium'
                        ? isEn ? 'Medium (50% Hint)' : 'Medium (Gợi ý vừa)'
                        : isEn ? 'Hard (0% Hint)' : 'Hard (Tự nhớ)'}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <VoiceToolbar settings={voiceSettings} onUpdateSettings={onUpdateVoiceSettings} language={language} />

            <ShadowingStudio
              key={assignment.id}
              sentences={activeTierSentences}
              voiceSettings={voiceSettings}
              soundEnabled={soundEnabled}
              language={language}
              voiceResults={voiceResults}
              typingMatchResults={typingMatchResults}
              onSaveVoiceResult={onSaveVoiceResult}
              onSaveTypingMatchResult={onSaveTypingMatchResult}
            />
          </div>
        )}

        {/* TASK C: WORDS (WORD DETECTIVE) */}
        {assignedTaskType === 'words' && (
          <div className="space-y-6 animate-fadeIn">
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-pink-200 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-pink-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-2xs">
                      🔒 {getTaskTitle('words')}
                    </span>
                    {assignment.className && (
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                        <Users className="w-3 h-3 text-amber-600" />
                        <span>{isEn ? 'Class:' : 'Lớp:'} {assignment.className}</span>
                      </span>
                    )}
                  </div>
                  <h1 className="font-heading text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {assignment.title}
                  </h1>
                  {assignment.teacherNotes && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 italic flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span><strong>{isEn ? "Teacher's Note:" : 'Lời dặn của cô:'}</strong> "{assignment.teacherNotes}"</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onOpenSubmitModal}
                  className="px-4 py-2 rounded-xl text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-300 shadow-xs transition-all hover:scale-102 ring-2 ring-amber-200 flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5 text-slate-900" />
                  <span>{isEn ? 'Submit' : 'Nộp bài'}</span>
                </button>
              </div>
            </section>

            <TaskWordRecognition
              items={wordRecognitionItems}
              soundEnabled={soundEnabled}
              language={language}
              onRefresh={onRefreshWordHunt}
              onCompletedChange={onWordHuntComplete}
            />
          </div>
        )}

        {/* TASK D: COMPREHENSION QUIZ */}
        {assignedTaskType === 'quiz' && (
          <div className="space-y-6 animate-fadeIn">
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-pink-200 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-pink-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-2xs">
                      🔒 {getTaskTitle('quiz')}
                    </span>
                    {assignment.className && (
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                        <Users className="w-3 h-3 text-emerald-600" />
                        <span>{isEn ? 'Class:' : 'Lớp:'} {assignment.className}</span>
                      </span>
                    )}
                  </div>
                  <h1 className="font-heading text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {assignment.title}
                  </h1>
                  {assignment.teacherNotes && (
                    <div className="mt-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 italic flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>{isEn ? "Teacher's Note:" : 'Lời dặn của cô:'}</strong> "{assignment.teacherNotes}"</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onOpenSubmitModal}
                  className="px-4 py-2 rounded-xl text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-300 shadow-xs transition-all hover:scale-102 ring-2 ring-amber-200 flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5 text-slate-900" />
                  <span>{isEn ? 'Submit' : 'Nộp bài'}</span>
                </button>
              </div>
            </section>

            <TaskComprehensionQuiz
              questions={quizQuestions}
              soundEnabled={soundEnabled}
              language={language}
              onQuizProgress={onQuizProgress}
            />
          </div>
        )}

        {/* TASK E: SMART DICTATION */}
        {assignedTaskType === 'dictation' && (
          <div className="space-y-6 animate-fadeIn">
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-pink-200 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-pink-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-2xs">
                      🔒 {getTaskTitle('dictation')}
                    </span>
                    {assignment.className && (
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                        <Users className="w-3 h-3 text-blue-600" />
                        <span>{isEn ? 'Class:' : 'Lớp:'} {assignment.className}</span>
                      </span>
                    )}
                  </div>
                  <h1 className="font-heading text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {assignment.title}
                  </h1>
                  {assignment.teacherNotes && (
                    <div className="mt-2 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 italic flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span><strong>{isEn ? "Teacher's Note:" : 'Lời dặn của cô:'}</strong> "{assignment.teacherNotes}"</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onOpenSubmitModal}
                  className="px-4 py-2 rounded-xl text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-300 shadow-xs transition-all hover:scale-102 ring-2 ring-amber-200 flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5 text-slate-900" />
                  <span>{isEn ? 'Submit' : 'Nộp bài'}</span>
                </button>
              </div>
            </section>

            <VoiceToolbar settings={voiceSettings} onUpdateSettings={onUpdateVoiceSettings} language={language} />

            <TaskSmartDictation
              sentences={activeTierSentences}
              tier={selectedTier}
              voiceSettings={voiceSettings}
              onUpdateVoiceSettings={onUpdateVoiceSettings}
              soundEnabled={soundEnabled}
              language={language}
              onSentenceEvaluated={onDictationEvaluated}
            />
          </div>
        )}

        {/* TASK F: MS MÈO CHATBOT */}
        {assignedTaskType === 'chat' && (
          <div className="space-y-6 animate-fadeIn">
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-pink-200 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-pink-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-2xs">
                      🔒 {getTaskTitle('chat')}
                    </span>
                    {assignment.className && (
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                        <Users className="w-3 h-3 text-rose-600" />
                        <span>{isEn ? 'Class:' : 'Lớp:'} {assignment.className}</span>
                      </span>
                    )}
                  </div>
                  <h1 className="font-heading text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {assignment.title}
                  </h1>
                  {assignment.teacherNotes && (
                    <div className="mt-2 p-2.5 rounded-xl bg-pink-50/70 border border-pink-200 text-xs text-pink-950 italic flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-pink-600 shrink-0 mt-0.5" />
                      <span><strong>{isEn ? "Teacher's Note:" : 'Lời dặn của cô:'}</strong> "{assignment.teacherNotes}"</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onOpenSubmitModal}
                  className="px-4 py-2 rounded-xl text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-300 shadow-xs transition-all hover:scale-102 ring-2 ring-amber-200 flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5 text-slate-900" />
                  <span>{isEn ? 'Submit' : 'Nộp bài'}</span>
                </button>
              </div>
            </section>

            <TaskMsMeoChatbot
              fullText={rawText}
              sentences={sentences}
              voiceSettings={voiceSettings}
              soundEnabled={soundEnabled}
              language={language}
              onChatActivity={onChatActivity}
              isStudentMode={true}
            />
          </div>
        )}

        {/* TASK G: ALL TASKS (Full Lesson for Student) */}
        {assignedTaskType === 'all' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Student Navigation Bar between stations ONLY */}
            <div className="bg-white rounded-2xl p-3 border border-pink-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 max-w-full">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span className="text-xs font-black text-slate-700 px-1.5">
                  {isEn ? 'Stations:' : 'Hoạt động:'}
                </span>
                <button
                  type="button"
                  onClick={() => setStudentActiveTab('listening')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    studentActiveTab === 'listening'
                      ? 'bg-pink-500 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {isEn ? '🎧 Listening' : '🎧 Luyện nghe'}
                </button>
                <button
                  type="button"
                  onClick={() => setStudentActiveTab('shadowing')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    studentActiveTab === 'shadowing'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  🎙️ Shadowing
                </button>
                <button
                  type="button"
                  onClick={() => setStudentActiveTab('words')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    studentActiveTab === 'words'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {isEn ? '🔍 Word Hunt' : '🔍 Tìm từ'}
                </button>
                <button
                  type="button"
                  onClick={() => setStudentActiveTab('quiz')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    studentActiveTab === 'quiz'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  📝 Quiz
                </button>
                <button
                  type="button"
                  onClick={() => setStudentActiveTab('dictation')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    studentActiveTab === 'dictation'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {isEn ? '✍️ Dictation' : '✍️ Chính tả'}
                </button>
                <button
                  type="button"
                  onClick={() => setStudentActiveTab('chatbot')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    studentActiveTab === 'chatbot'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {isEn ? '🐱 Ms Mèo Chat' : '🐱 Chat phản xạ'}
                </button>
              </div>

              <button
                type="button"
                onClick={onOpenSubmitModal}
                className="px-3.5 py-1.5 rounded-xl text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-300 shadow-xs shrink-0"
              >
                {isEn ? '📤 Submit' : '📤 Nộp bài'}
              </button>
            </div>

            {/* Render active subtab */}
            {studentActiveTab === 'listening' && (
              <StudentListeningKaraokeView
                assignment={assignment}
                sentences={activeTierSentences}
                rawText={rawText}
                language={language}
                voiceSettings={voiceSettings}
                onUpdateVoiceSettings={onUpdateVoiceSettings}
                onSwitchToOtherTask={() => {}}
                onExitStudentMode={() => {}}
              />
            )}
            {studentActiveTab === 'shadowing' && (
              <div className="space-y-6">
                <VoiceToolbar settings={voiceSettings} onUpdateSettings={onUpdateVoiceSettings} language={language} />
                <ShadowingStudio
                  key={assignment.id}
                  sentences={activeTierSentences}
                  voiceSettings={voiceSettings}
                  soundEnabled={soundEnabled}
                  language={language}
                  voiceResults={voiceResults}
                  typingMatchResults={typingMatchResults}
                  onSaveVoiceResult={onSaveVoiceResult}
                  onSaveTypingMatchResult={onSaveTypingMatchResult}
                />
              </div>
            )}
            {studentActiveTab === 'words' && (
              <TaskWordRecognition
                items={wordRecognitionItems}
                soundEnabled={soundEnabled}
                language={language}
                onRefresh={onRefreshWordHunt}
                onCompletedChange={onWordHuntComplete}
              />
            )}
            {studentActiveTab === 'quiz' && (
              <TaskComprehensionQuiz
                questions={quizQuestions}
                soundEnabled={soundEnabled}
                language={language}
                onQuizProgress={onQuizProgress}
              />
            )}
            {studentActiveTab === 'dictation' && (
              <div className="space-y-6">
                <VoiceToolbar settings={voiceSettings} onUpdateSettings={onUpdateVoiceSettings} language={language} />
                <TaskSmartDictation
                  sentences={activeTierSentences}
                  tier={selectedTier}
                  voiceSettings={voiceSettings}
                  onUpdateVoiceSettings={onUpdateVoiceSettings}
                  soundEnabled={soundEnabled}
                  language={language}
                  onSentenceEvaluated={onDictationEvaluated}
                />
              </div>
            )}
            {studentActiveTab === 'chatbot' && (
              <TaskMsMeoChatbot
                fullText={rawText}
                sentences={sentences}
                voiceSettings={voiceSettings}
                soundEnabled={soundEnabled}
                language={language}
                onChatActivity={onChatActivity}
                isStudentMode={true}
              />
            )}
          </div>
        )}
      </main>

      {/* Leaderboard Modal */}
      {showLeaderboardModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setShowLeaderboardModal(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-pink-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <h3 className="font-heading font-black text-base">
                {isEn ? '🏆 Your XP, Streak & Leaderboard' : '🏆 Tổng XP, Chuỗi ngày & Bảng xếp hạng'}
              </h3>
              <button
                type="button"
                onClick={() => setShowLeaderboardModal(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <LeaderboardPanel
                language={language}
                gamification={gamification}
                entries={leaderboardEntries}
                effectiveLocalXp={effectiveXp}
              />
            </div>
          </div>
        </div>
      )}

      {/* Persistent Sticky Student Bottom Menu */}
      <StudentBottomNav
        language={language}
        activeTab={studentActiveTab}
        assignedTaskType={assignedTaskType}
        totalXp={effectiveXp}
        streakDays={gamification.currentStreakDays}
        unlockedBadgeCount={unlockedBadgeCount}
        onSelectTab={assignedTaskType === 'all' ? setStudentActiveTab : undefined}
        onOpenLeaderboard={openStudentLeaderboard}
        onOpenBadges={onOpenBadges}
        onOpenSubmitModal={onOpenSubmitModal}
      />

      {/* 3. CLEAN STUDENT FOOTER */}
      <footer className="mt-8 pb-24 border-t border-pink-200 bg-white/70 py-6 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <span>🐱 Ms Mèo's Practice Web</span>
            <span>•</span>
            <span>{isEn ? 'Student Practice Space' : 'Giao diện làm bài dành riêng cho học sinh'}</span>
          </div>

          <div className="text-slate-400">
            {isEn ? 'Keep practicing every day to improve!' : 'Cố gắng luyện tập chăm chỉ mỗi ngày nhé!'}
          </div>
        </div>
      </footer>
    </div>
  );
};
