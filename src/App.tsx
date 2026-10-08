/**
 * Ms Mèo's Practice Web
 * Complete, production-ready Single-Page Web Application for high school English learners.
 * Features:
 * - Advanced Native Voice Control Toolbar (Accents, Gender, Age, Speed 0.75x/1.0x/1.25x)
 * - Text Parsing & 3-Tier Difficulty Engine (Easy, Medium, Hard)
 * - Sentence-by-Sentence Shadowing Studio with Web Audio, Web Speech Recognition & Diagnostic Evaluator
 * - 4 Interactive Tasks: Word Recognition, Comprehension Quiz, Smart Dictation, and Ms Mèo Chatbot with Voice Input & Speaker Tag Stripping.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Mic,
  Search,
  CheckCircle,
  Headphones,
  MessageSquare,
  Sparkles,
  Volume2,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Loader2,
  BookmarkPlus,
  Send,
  PenTool,
  Share2,
  Eye,
} from 'lucide-react';
import {
  AnalyzedSentence,
  DifficultyTier,
  QuizQuestion,
  ShadowingResult,
  VoiceSettings,
  WordRecognitionItem,
} from './types';
import {
  analyzeAllSentences,
  filterSentencesForTier,
  generateComprehensionQuiz,
  generateWordRecognitionTask,
  SAMPLE_TEXTS,
  splitIntoSentences,
} from './utils/textParser';
import { playSuccessChime, playSoftTone } from './utils/audio';
import { Header } from './components/Header';
import { HomeLandingView } from './components/HomeLandingView';
import { VoiceToolbar } from './components/VoiceToolbar';
import { TextSourceSection } from './components/TextSourceSection';
import { ShadowingStudio } from './components/ShadowingStudio';
import { TaskWordRecognition } from './components/TaskWordRecognition';
import { TaskComprehensionQuiz } from './components/TaskComprehensionQuiz';
import { TaskSmartDictation } from './components/TaskSmartDictation';
import { TaskMsMeoChatbot } from './components/TaskMsMeoChatbot';
import { SaveLessonDialog } from './components/SaveLessonDialog';
import { SavedLessonsModal } from './components/SavedLessonsModal';
import { BadgesModal } from './components/BadgesModal';
import { BadgeUnlockedToast } from './components/BadgeUnlockedToast';
import { AssignLessonModal } from './components/AssignLessonModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { SubmitHomeworkModal } from './components/SubmitHomeworkModal';
import { StudentAssignmentBanner } from './components/StudentAssignmentBanner';
import { StudentLessonHeader } from './components/StudentLessonHeader';
import { StudentListeningKaraokeView } from './components/StudentListeningKaraokeView';
import {
  ALL_BADGES,
  loadUnlockedBadges,
  saveUnlockedBadges,
  loadActivityTracker,
  saveActivityTracker,
  evaluateAllBadges,
  resetAllBadges,
  type ActivityTracker,
} from './utils/badges';
import { BadgeDefinition, UnlockedBadge, Assignment, LessonFormat, AssignedTaskType } from './types';
import { fetchAssignmentById } from './storage/assignments';
import {
  saveStudentProgress,
  loadStudentProgress,
  saveCustomLesson,
  getSavedLessons,
  deleteSavedLesson,
  type SavedLessonItem,
} from './storage';
import mascotImg from './assets/images/ms_meo_mascot_1790341757214.jpg';

export default function App() {
  // Sound effects toggle
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // App Language: defaults to 'en'
  const [language, setLanguage] = useState<'en' | 'vi'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('ms_meo_lang') as 'en' | 'vi') || 'en';
    }
    return 'en';
  });

  const handleToggleLanguage = () => {
    const nextLang = language === 'en' ? 'vi' : 'en';
    setLanguage(nextLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ms_meo_lang', nextLang);
    }
  };

  // Active view: 'home' (Trang chủ) | 'creator' (Soạn bài) | 'practice' (Luyện tập)
  const [currentView, setCurrentView] = useState<'home' | 'creator' | 'practice'>('home');
  const [isStudentPreview, setIsStudentPreview] = useState<boolean>(false);

  // Active top navigation tab inside Practice Lab
  const [activeTab, setActiveTab] = useState<
    'listening' | 'shadowing' | 'words' | 'quiz' | 'dictation' | 'chatbot'
  >('listening');

  // Currently assigned individual task type: defaults to 'listening'
  const [assignedTaskType, setAssignedTaskType] = useState<AssignedTaskType>('listening');

  // Text source, format, and difficulty tier state
  const [rawText, setRawText] = useState<string>(SAMPLE_TEXTS[0].text);
  const [lessonFormat, setLessonFormat] = useState<LessonFormat>('text');
  const [selectedTier, setSelectedTier] = useState<DifficultyTier>('medium');

  // Voice engine settings
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    voiceIndex: 0,
    rate: 1.0,
    pitch: 1.0,
    accent: 'all',
    gender: 'all',
    age: 'all',
  });

  // Shadowing results cache: preserved across tab switches
  const [shadowingResults, setShadowingResults] = useState<Record<string, ShadowingResult>>({});

  // Badges & Achievements state
  const [unlockedBadges, setUnlockedBadges] = useState<UnlockedBadge[]>([]);
  const [isBadgesModalOpen, setIsBadgesModalOpen] = useState<boolean>(false);
  const [activeCelebrationBadge, setActiveCelebrationBadge] = useState<BadgeDefinition | null>(null);
  const [activityTracker, setActivityTracker] = useState<ActivityTracker>(loadActivityTracker);

  // Assignments & Admin Dashboard state
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState<boolean>(false);
  const [isSubmitHomeworkModalOpen, setIsSubmitHomeworkModalOpen] = useState<boolean>(false);
  const [quizStats, setQuizStats] = useState<{ correct: number; total: number; score: number }>({
    correct: 0,
    total: 0,
    score: 0,
  });
  const [isWordHuntCompleted, setIsWordHuntCompleted] = useState<boolean>(false);
  const [highestDictationScore, setHighestDictationScore] = useState<number>(0);

  // Student mode is active when opening via shared link or when toggling preview
  const isStudentMode = activeAssignment !== null || isStudentPreview;

  // Parse raw text into structured sentences
  const parsedSentences = useMemo(() => {
    const rawSentences = splitIntoSentences(rawText);
    return analyzeAllSentences(rawSentences);
  }, [rawText]);

  // Total word count for entire text
  const totalWords = useMemo(() => {
    return parsedSentences.reduce((acc, s) => acc + s.wordCount, 0);
  }, [parsedSentences]);

  // Filtered sentences based on current active difficulty tier
  const activeTierSentences = useMemo(() => {
    return filterSentencesForTier(parsedSentences, selectedTier);
  }, [parsedSentences, selectedTier]);

  // Task 1: Word Recognition items (5 targets + 5 distractors)
  const [wordRecognitionItems, setWordRecognitionItems] = useState<WordRecognitionItem[]>([]);

  // Task 2: Quiz questions
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  // Track if lesson has been generated by user
  const [isLessonGenerated, setIsLessonGenerated] = useState<boolean>(false);

  // Saved lessons library state & modals
  const [savedLessons, setSavedLessons] = useState<SavedLessonItem[]>([]);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState<boolean>(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);

  // Load saved student progress, badges, and custom lessons from localStorage on mount
  useEffect(() => {
    const saved = loadStudentProgress();
    if (saved) {
      if (saved.lastText) setRawText(saved.lastText);
      if (saved.selectedTier) setSelectedTier(saved.selectedTier as DifficultyTier);
      if (saved.lessonFormat) setLessonFormat(saved.lessonFormat);
      if (saved.resultsCache) setShadowingResults(saved.resultsCache);
      if (saved.lastText) setIsLessonGenerated(true);
    }

    const lessons = getSavedLessons();
    setSavedLessons(lessons);

    const initialBadges = loadUnlockedBadges();
    setUnlockedBadges(initialBadges);

    // Check URL parameters for shared assignment link and individual task
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedAssignmentId = urlParams.get('assignment') || urlParams.get('assignmentId');
      const targetTask = (urlParams.get('task') as AssignedTaskType) || null;

      if (sharedAssignmentId) {
        fetchAssignmentById(sharedAssignmentId).then((assignment) => {
          if (assignment) {
            setActiveAssignment(assignment);
            setRawText(assignment.rawText);
            if (assignment.selectedTier) {
              setSelectedTier(assignment.selectedTier as DifficultyTier);
            }
            if (assignment.lessonFormat) {
              setLessonFormat(assignment.lessonFormat);
            }
            const taskToUse = targetTask || assignment.assignedTask || 'listening';
            setAssignedTaskType(taskToUse);
            if (taskToUse === 'listening') {
              setActiveTab('listening');
            } else if (taskToUse === 'shadowing') {
              setActiveTab('shadowing');
            } else if (taskToUse === 'words') {
              setActiveTab('words');
            } else if (taskToUse === 'quiz') {
              setActiveTab('quiz');
            } else if (taskToUse === 'dictation') {
              setActiveTab('dictation');
            } else if (taskToUse === 'chat') {
              setActiveTab('chatbot');
            } else {
              setActiveTab('listening');
            }
            setCurrentView('practice');
            setIsLessonGenerated(true);
            setTimeout(() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 300);
          }
        });
      }
    }
  }, []);

  // Compute live student practice stats
  const shadowingAvg = useMemo(() => {
    const scores = Object.values(shadowingResults).map((r) => r.accuracyScore || 0);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [shadowingResults]);

  const livePracticeStats = useMemo(
    () => ({
      shadowingCount: Object.keys(shadowingResults).length,
      shadowingAvgScore: shadowingAvg,
      quizScore: quizStats.score,
      quizCorrectCount: quizStats.correct,
      quizTotal: quizStats.total || quizQuestions.length,
      wordHuntCompleted: isWordHuntCompleted,
      dictationScore: highestDictationScore,
    }),
    [shadowingResults, shadowingAvg, quizStats, quizQuestions.length, isWordHuntCompleted, highestDictationScore]
  );

  const handleSelectAssignmentToPractice = (assignment: Assignment) => {
    setActiveAssignment(assignment);
    setRawText(assignment.rawText);
    if (assignment.selectedTier) {
      setSelectedTier(assignment.selectedTier as DifficultyTier);
    }
    if (assignment.lessonFormat) {
      setLessonFormat(assignment.lessonFormat);
    }
    setIsLessonGenerated(true);
    setTimeout(() => {
      const targetElement = document.getElementById('lesson-modules-section');
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 200);
  };

  // Update activity tracker and check for unlocked badges
  const triggerActivityUpdate = (patch: Partial<ActivityTracker>) => {
    setActivityTracker((prevTracker) => {
      const updatedTracker = { ...prevTracker, ...patch };
      saveActivityTracker(updatedTracker);

      setUnlockedBadges((prevUnlocked) => {
        const { newlyUnlocked, updatedUnlocked } = evaluateAllBadges(updatedTracker, prevUnlocked);
        if (newlyUnlocked.length > 0) {
          setActiveCelebrationBadge(newlyUnlocked[0]);
          if (soundEnabled) playSuccessChime();

          saveStudentProgress('local', {
            lastText: rawText,
            selectedTier,
            unlockedBadges: updatedUnlocked.map((b) => b.badgeId),
          });
          return updatedUnlocked;
        }
        return prevUnlocked;
      });

      return updatedTracker;
    });
  };

  const handleResetBadges = () => {
    resetAllBadges();
    setUnlockedBadges([]);
    setActivityTracker(loadActivityTracker());
    if (soundEnabled) playSoftTone();
  };

  // Generate / regenerate interactive modules whenever text or difficulty tier changes
  const buildInteractiveModules = () => {
    if (parsedSentences.length === 0) return;
    const wordsTask = generateWordRecognitionTask(parsedSentences);
    const quizTask = generateComprehensionQuiz(rawText, parsedSentences);
    setWordRecognitionItems(wordsTask);
    setQuizQuestions(quizTask);
  };

  useEffect(() => {
    buildInteractiveModules();
  }, [rawText]);

  const handleGenerateLesson = () => {
    buildInteractiveModules();
    setIsLessonGenerated(true);
    if (soundEnabled) playSuccessChime();

    // Trigger First Lesson & Tier Challenger achievements
    triggerActivityUpdate({
      hasGeneratedLesson: true,
      lastPracticedTier: selectedTier,
    });

    // Persist progress locally
    saveStudentProgress('local', {
      lastText: rawText,
      selectedTier,
      shadowingCount: Object.keys(shadowingResults).length,
      resultsCache: shadowingResults,
      unlockedBadges: unlockedBadges.map((b) => b.badgeId),
    });

    // Scroll smoothly to studio
    setTimeout(() => {
      const targetElement = document.getElementById('lesson-modules-section');
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleSelectTabFromHeader = (tabId: typeof activeTab) => {
    setIsLessonGenerated(true);
    setActiveTab(tabId);
    setTimeout(() => {
      const targetElement = document.getElementById('lesson-modules-section');
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleSaveShadowingResult = (sentenceId: string, result: ShadowingResult) => {
    const nextResults = {
      ...shadowingResults,
      [sentenceId]: result,
    };
    setShadowingResults(nextResults);

    const count = Object.keys(nextResults).length;
    const highestScore = Math.max(
      ...Object.values(nextResults).map((r) => r.accuracyScore || 0),
      0
    );

    triggerActivityUpdate({
      shadowedSentenceCount: count,
      highestShadowingScore: highestScore,
    });

    // Auto-save student progress locally
    saveStudentProgress('local', {
      lastText: rawText,
      selectedTier,
      shadowingCount: count,
      resultsCache: nextResults,
      unlockedBadges: unlockedBadges.map((b) => b.badgeId),
    });
  };

  const handleQuizProgress = (correctCount: number, total: number) => {
    const percent = Math.round((correctCount / Math.max(1, total)) * 100);
    setQuizStats({ correct: correctCount, total, score: percent });
    triggerActivityUpdate({
      highestQuizScore: percent,
    });
  };

  const handleWordHuntComplete = (completed: boolean) => {
    setIsWordHuntCompleted(completed);
    if (completed) {
      triggerActivityUpdate({
        completedWordHunt: true,
      });
    }
  };

  const handleDictationEvaluated = (_sentenceId: string, score: number) => {
    setHighestDictationScore((prev) => Math.max(prev, score));
    triggerActivityUpdate({
      completedDictationSentenceCount: (activityTracker.completedDictationSentenceCount || 0) + 1,
      highestDictationScore: Math.max(activityTracker.highestDictationScore || 0, score),
    });
  };

  const handleChatActivity = () => {
    triggerActivityUpdate({
      hasChattedWithMeo: true,
    });
  };

  const handleSaveCurrentLesson = async (title: string) => {
    const newLesson = saveCustomLesson('local', {
      title,
      rawText,
      selectedTier,
      lessonFormat,
      sentenceCount: parsedSentences.length,
      wordCount: totalWords,
    });
    setSavedLessons((prev) => [newLesson, ...prev.filter((l) => l.id !== newLesson.id)]);

    triggerActivityUpdate({
      hasSavedLesson: true,
    });
  };

  const handleLoadSavedLesson = (lesson: SavedLessonItem) => {
    setRawText(lesson.rawText);
    setSelectedTier(lesson.selectedTier as DifficultyTier);
    if (lesson.lessonFormat) {
      setLessonFormat(lesson.lessonFormat);
    }
    setIsLessonGenerated(true);
    // Smooth scroll to modules
    setTimeout(() => {
      const targetElement = document.getElementById('lesson-modules-section');
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleDeleteSavedLesson = async (lessonId: string) => {
    deleteSavedLesson('local', lessonId);
    setSavedLessons((prev) => prev.filter((l) => l.id !== lessonId));
  };

  return (
    <div className="min-h-screen bg-[#FDF4F8] text-slate-700 flex flex-col antialiased selection:bg-pink-200 selection:text-pink-900">
      {/* 1. Header (Home first, dedicated Soạn bài, distinct standalone buttons) */}
      <Header
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        currentView={currentView}
        onGoHome={() => {
          setCurrentView('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenCreator={() => {
          setCurrentView('creator');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenPractice={() => {
          setCurrentView('practice');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        activeTab={activeTab}
        onSelectTab={(tabId) => handleSelectTabFromHeader(tabId as typeof activeTab)}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        savedCount={savedLessons.length}
        onOpenBadges={() => setIsBadgesModalOpen(true)}
        unlockedBadgeCount={unlockedBadges.length}
        totalBadgeCount={ALL_BADGES.length}
        onOpenAssignModal={() => setIsAssignModalOpen(true)}
        onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
        isStudentMode={isStudentMode}
        onOpenSubmitModal={() => setIsSubmitHomeworkModalOpen(true)}
        isStudentPreview={isStudentPreview}
        onToggleStudentPreview={() => setIsStudentPreview(!isStudentPreview)}
      />

      {/* Student Assignment Banner (when doing homework via shared link) */}
      {activeAssignment && (
        <StudentAssignmentBanner
          assignment={activeAssignment}
          practiceStats={livePracticeStats}
          onOpenSubmitModal={() => setIsSubmitHomeworkModalOpen(true)}
          onExitAssignmentMode={() => setActiveAssignment(null)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* ========================================================================= */}
        {/* VIEW 1: TRANG CHỦ (HOME) - Branding, App Name, Mascot Logo, Quick Actions */}
        {/* Does NOT contain the lesson drafting content or practice tests! */}
        {/* ========================================================================= */}
        {currentView === 'home' && (
          <HomeLandingView
            isStudentMode={isStudentMode}
            activeAssignment={activeAssignment}
            language={language}
            onOpenCreator={() => {
              setCurrentView('creator');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenPractice={() => {
              setCurrentView('practice');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
            onOpenAssignModal={() => setIsAssignModalOpen(true)}
            onOpenBadges={() => setIsBadgesModalOpen(true)}
            unlockedBadgeCount={unlockedBadges.length}
            totalBadgeCount={ALL_BADGES.length}
            onSelectTab={(tabId) => {
              setActiveTab(tabId);
              setCurrentView('practice');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenSubmitModal={() => setIsSubmitHomeworkModalOpen(true)}
            isStudentPreview={isStudentPreview}
            onToggleStudentPreview={() => setIsStudentPreview(!isStudentPreview)}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: SOẠN BÀI (LESSON CREATOR) - Text Editor, Format, Presets, Voice   */}
        {/* Only appears when clicking "Soạn bài"!                                    */}
        {/* ========================================================================= */}
        {currentView === 'creator' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Creator Page Header Banner */}
            <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>✍️</span>
                  <span>{language === 'en' ? 'Lesson Studio & Content Creator' : 'Soạn bài học & Tạo bài tập'}</span>
                </div>
                <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {language === 'en' ? 'English Reading Passage & Dialogue Studio' : 'Soạn thảo bài đọc & Hội thoại tiếng Anh'}
                </h1>
                <p className="text-pink-100 text-xs sm:text-sm max-w-xl mt-1 leading-relaxed">
                  {language === 'en'
                    ? 'Input reading comprehension passages or dialogue scripts, select difficulty tiers, configure native voices, and launch interactive practice stations.'
                    : 'Nhập văn bản đọc hiểu hoặc đoạn hội thoại, chọn cấp độ khó, tùy chỉnh giọng đọc bản xứ và tạo phòng luyện tập cho học sinh.'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    handleGenerateLesson();
                    setCurrentView('practice');
                  }}
                  className="px-5 py-3 rounded-2xl font-heading font-extrabold text-xs sm:text-sm text-pink-700 bg-white hover:bg-pink-50 shadow-md transition-all flex items-center gap-2 hover:scale-105"
                >
                  <Sparkles className="w-4 h-4 text-pink-600" />
                  <span>{language === 'en' ? '🚀 Generate & Enter Practice' : '🚀 Tạo bài & Vào Luyện tập'}</span>
                </button>
              </div>
            </div>

            {/* Advanced Native Voice Control Toolbar */}
            <VoiceToolbar
              settings={voiceSettings}
              onUpdateSettings={(newSettings) => setVoiceSettings(newSettings)}
            />

            {/* Full Text & Lesson Creator Section */}
            <TextSourceSection
              rawText={rawText}
              onChangeText={(newText) => setRawText(newText)}
              selectedTier={selectedTier}
              onSelectTier={(newTier) => setSelectedTier(newTier)}
              language={language}
              lessonFormat={lessonFormat}
              onChangeLessonFormat={(format) => setLessonFormat(format)}
              onGenerateLesson={() => {
                handleGenerateLesson();
                setCurrentView('practice');
              }}
              onOpenSaveDialog={() => setIsSaveDialogOpen(true)}
              onOpenLibrary={() => setIsLibraryOpen(true)}
              savedCount={savedLessons.length}
              totalSentences={parsedSentences.length}
              totalWords={totalWords}
              onOpenAssignModal={() => setIsAssignModalOpen(true)}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: PRACTICE (PHÒNG LUYỆN TẬP) - Listening Karaoke, Shadowing, Tasks */}
        {/* ========================================================================= */}
        {currentView === 'practice' && (
          <div className="space-y-6 animate-fadeIn">
            {/* If Student Mode and specifically assigned Listening Task (or on Listening tab) */}
            {isStudentMode && (assignedTaskType === 'listening' || activeTab === 'listening') ? (
              <StudentListeningKaraokeView
                assignment={
                  activeAssignment || {
                    id: 'active-lesson',
                    title: lessonFormat === 'conversation' ? 'English Dialogue Practice' : 'English Reading Passage',
                    rawText: rawText,
                    selectedTier: selectedTier,
                    lessonFormat: lessonFormat,
                    className: 'Class 12',
                    teacherNotes: 'Luyện nghe bài đọc với English Sub và chuyển màu chữ Karaoke',
                    createdAt: new Date().toISOString(),
                    assignedTask: 'listening',
                  }
                }
                sentences={activeTierSentences}
                rawText={rawText}
                language={language}
                voiceSettings={voiceSettings}
                onUpdateVoiceSettings={(newSettings) => setVoiceSettings(newSettings)}
                onSwitchToOtherTask={(task) => {
                  if (task === 'shadowing') setActiveTab('shadowing');
                  else if (task === 'words') setActiveTab('words');
                  else if (task === 'quiz') setActiveTab('quiz');
                  else if (task === 'dictation') setActiveTab('dictation');
                  else if (task === 'chat') setActiveTab('chatbot');
                  else setActiveTab('listening');
                }}
                onExitStudentMode={() => {
                  setActiveAssignment(null);
                  setIsStudentPreview(false);
                }}
              />
            ) : (
              <>
                {/* If Student Mode in other task or full practice */}
                {isStudentMode ? (
                  <StudentLessonHeader
                    assignment={
                      activeAssignment || {
                        id: 'active-lesson',
                        title: lessonFormat === 'conversation' ? 'English Dialogue Practice' : 'English Reading Passage',
                        rawText: rawText,
                        selectedTier: selectedTier,
                        lessonFormat: lessonFormat,
                        className: 'English Class',
                        teacherNotes: 'Practice shadowing with authentic native rhythm, take the comprehension quiz, and test your vocabulary with Word Detective!',
                        createdAt: new Date().toISOString(),
                      }
                    }
                    rawText={rawText}
                    selectedTier={selectedTier}
                    onSelectTier={(newTier) => {
                      setSelectedTier(newTier);
                      triggerActivityUpdate({ lastPracticedTier: newTier });
                    }}
                    totalSentences={parsedSentences.length}
                    tierSentencesCount={activeTierSentences.length}
                    totalWords={totalWords}
                    practiceStats={livePracticeStats}
                    onOpenSubmitModal={() => setIsSubmitHomeworkModalOpen(true)}
                  />
                ) : (
                  /* Teacher Practice Header */
                  <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-3xl p-5 sm:p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20">
                          {lessonFormat === 'conversation'
                            ? language === 'en' ? '💬 Dialogue Mode' : '💬 Dạng Hội thoại'
                            : language === 'en' ? '📄 Reading Passage' : '📄 Dạng Đoạn văn'}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/80">
                          {language === 'en' ? `Tier: ${selectedTier.toUpperCase()}` : `Cấp độ: ${selectedTier.toUpperCase()}`}
                        </span>
                        <span className="text-xs text-indigo-200">
                          {language === 'en'
                            ? `${activeTierSentences.length} sentences • ${totalWords} words`
                            : `${activeTierSentences.length} câu • ${totalWords} từ`}
                        </span>
                      </div>
                      <h2 className="font-heading text-xl sm:text-2xl font-extrabold tracking-tight">
                        {language === 'en' ? 'Practice Lab' : 'Phòng Luyện tập (Practice Lab)'}
                      </h2>
                      <p className="text-indigo-100 text-xs sm:text-sm mt-0.5">
                        {language === 'en'
                          ? '6 Interactive Stations: Listening Karaoke, Shadowing, Task 1 (Words), Task 2 (Quiz), Task 3 (Dictation) & Task 4 (Ms Mèo Chat).'
                          : 'Thực hành 6 trạm: Luyện nghe Karaoke, Shadowing, Task 1 (Từ vựng), Task 2 (Quiz), Task 3 (Chính tả) & Task 4 (Ms Mèo Chat).'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentView('creator');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-indigo-900 hover:bg-indigo-50 shadow-xs transition-all flex items-center gap-1.5 hover:scale-102"
                        title={language === 'en' ? 'Switch to Lesson Creator to edit text' : 'Chuyển sang trang Soạn bài để chỉnh sửa văn bản'}
                      >
                        <PenTool className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{language === 'en' ? '✍️ Edit Lesson' : '✍️ Đổi bài / Soạn bài'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAssignModalOpen(true)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs transition-all flex items-center gap-1.5 hover:scale-102"
                        title={language === 'en' ? 'Assign this lesson to students' : 'Giao bài tập này cho học sinh'}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{language === 'en' ? 'Assign' : 'Giao bài'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Voice Toolbar */}
                <VoiceToolbar
                  settings={voiceSettings}
                  onUpdateSettings={(newSettings) => setVoiceSettings(newSettings)}
                />

                {/* Functional Segmented Navigation Bar for Practice Stations */}
                <div className="bg-white p-1.5 rounded-2xl border border-pink-200/90 shadow-xs flex items-center gap-1 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => {
                      playSoftTone();
                      setActiveTab('listening');
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeTab === 'listening'
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-pink-600 hover:bg-pink-50'
                    }`}
                  >
                    <Headphones className="w-4 h-4" />
                    <span>{language === 'en' ? '🎧 Listening Karaoke' : '🎧 Nghe Karaoke'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSoftTone();
                      setActiveTab('shadowing');
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeTab === 'shadowing'
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-pink-600 hover:bg-pink-50'
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                    <span>Shadowing Studio</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                      {activeTierSentences.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSoftTone();
                      setActiveTab('words');
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeTab === 'words'
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-pink-600 hover:bg-pink-50'
                    }`}
                  >
                    <Search className="w-4 h-4" />
                    <span>Task 1: Word Detective</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSoftTone();
                      setActiveTab('quiz');
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeTab === 'quiz'
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-pink-600 hover:bg-pink-50'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Task 2: Quiz</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSoftTone();
                      setActiveTab('dictation');
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeTab === 'dictation'
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-pink-600 hover:bg-pink-50'
                    }`}
                  >
                    <Headphones className="w-4 h-4" />
                    <span>Task 3: Smart Dictation</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSoftTone();
                      setActiveTab('chatbot');
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeTab === 'chatbot'
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-pink-600 hover:bg-pink-50'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Task 4: Ms Mèo Chat 🐱</span>
                  </button>
                </div>

                {/* Active Tab View */}
                <div className="transition-all">
                  {activeTab === 'listening' && (
                    <StudentListeningKaraokeView
                      assignment={
                        activeAssignment || {
                          id: 'active-lesson',
                          title: lessonFormat === 'conversation' ? 'English Dialogue Practice' : 'English Reading Passage',
                          rawText: rawText,
                          selectedTier: selectedTier,
                          lessonFormat: lessonFormat,
                          className: 'Class 12',
                          teacherNotes: 'Luyện nghe với phụ đề tiếng Anh & chữ chuyển màu Karaoke',
                          createdAt: new Date().toISOString(),
                          assignedTask: 'listening',
                        }
                      }
                      sentences={activeTierSentences}
                      rawText={rawText}
                      language={language}
                      voiceSettings={voiceSettings}
                      onUpdateVoiceSettings={(newSettings) => setVoiceSettings(newSettings)}
                      onSwitchToOtherTask={(task) => {
                        if (task === 'shadowing') setActiveTab('shadowing');
                        else if (task === 'words') setActiveTab('words');
                        else if (task === 'quiz') setActiveTab('quiz');
                        else if (task === 'dictation') setActiveTab('dictation');
                        else if (task === 'chat') setActiveTab('chatbot');
                      }}
                      onExitStudentMode={() => {
                        setActiveAssignment(null);
                        setIsStudentPreview(false);
                      }}
                    />
                  )}

                  {activeTab === 'shadowing' && (
                    <ShadowingStudio
                      sentences={activeTierSentences}
                      voiceSettings={voiceSettings}
                      soundEnabled={soundEnabled}
                      shadowingResults={shadowingResults}
                      onSaveResult={handleSaveShadowingResult}
                    />
                  )}

                  {activeTab === 'words' && (
                    <TaskWordRecognition
                      items={wordRecognitionItems}
                      soundEnabled={soundEnabled}
                      onRefresh={buildInteractiveModules}
                      onCompletedChange={handleWordHuntComplete}
                    />
                  )}

                  {activeTab === 'quiz' && (
                    <TaskComprehensionQuiz
                      questions={quizQuestions}
                      soundEnabled={soundEnabled}
                      onQuizProgress={handleQuizProgress}
                    />
                  )}

                  {activeTab === 'dictation' && (
                    <TaskSmartDictation
                      sentences={activeTierSentences}
                      tier={selectedTier}
                      voiceSettings={voiceSettings}
                      onUpdateVoiceSettings={(newSettings) => setVoiceSettings(newSettings)}
                      soundEnabled={soundEnabled}
                      onSentenceEvaluated={handleDictationEvaluated}
                    />
                  )}

                  {activeTab === 'chatbot' && (
                    <TaskMsMeoChatbot
                      fullText={rawText}
                      sentences={parsedSentences}
                      voiceSettings={voiceSettings}
                      soundEnabled={soundEnabled}
                      onChatActivity={handleChatActivity}
                      isStudentMode={isStudentMode}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-pink-200 bg-white/70 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <span>🐱 Ms Mèo's Practice Web</span>
            <span>•</span>
            <span>Designed for High School English Learners</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>100% Client-Side Web Speech & Web Audio Engine</span>
            <span>•</span>
            <span>Zero Backend Required</span>
          </div>
        </div>
      </footer>

      {/* Save Lesson Dialog Modal */}
      <SaveLessonDialog
        isOpen={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        rawText={rawText}
        selectedTier={selectedTier}
        sentenceCount={parsedSentences.length}
        wordCount={totalWords}
        onSave={handleSaveCurrentLesson}
      />

      {/* Saved Lessons Library Modal */}
      <SavedLessonsModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        savedLessons={savedLessons}
        onLoadLesson={handleLoadSavedLesson}
        onDeleteLesson={handleDeleteSavedLesson}
      />

      {/* Badges & Achievements Modal */}
      <BadgesModal
        isOpen={isBadgesModalOpen}
        onClose={() => setIsBadgesModalOpen(false)}
        unlockedBadges={unlockedBadges}
        onResetBadges={handleResetBadges}
        onNavigateToTab={handleSelectTabFromHeader}
      />

      {/* Floating Badge Unlocked Celebration Toast */}
      <BadgeUnlockedToast
        badge={activeCelebrationBadge}
        onClose={() => setActiveCelebrationBadge(null)}
        onOpenBadgesModal={() => setIsBadgesModalOpen(true)}
      />

      {/* Assign Lesson via Share Link Modal */}
      <AssignLessonModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        rawText={rawText}
        selectedTier={selectedTier}
        language={language}
        lessonFormat={lessonFormat}
        initialTitle={activeAssignment ? activeAssignment.title : ''}
        onAssignmentCreated={(assignment) => {
          setActiveAssignment(assignment);
        }}
        onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
      />

      {/* Admin Dashboard: Quản lý giao bài & Kết quả học sinh */}
      <AdminDashboardModal
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        onSelectAssignmentToPractice={handleSelectAssignmentToPractice}
        onOpenAssignModal={() => setIsAssignModalOpen(true)}
      />

      {/* Student Submit Homework Modal */}
      {activeAssignment && (
        <SubmitHomeworkModal
          isOpen={isSubmitHomeworkModalOpen}
          onClose={() => setIsSubmitHomeworkModalOpen(false)}
          assignment={activeAssignment}
          practiceStats={livePracticeStats}
        />
      )}
    </div>
  );
}
