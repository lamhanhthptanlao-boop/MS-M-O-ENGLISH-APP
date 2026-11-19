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
  X,
} from 'lucide-react';
import {
  AnalyzedSentence,
  Assignment,
  AssignmentSubmission,
  AssignedTaskType,
  BadgeDefinition,
  DifficultyTier,
  GamificationState,
  LessonFormat,
  QuizQuestion,
  ShadowingResult,
  UnlockedBadge,
  VoiceSettings,
  WordRecognitionItem,
} from './types';
import {
  analyzeAllSentences,
  filterSentencesWithPreview,
  generateComprehensionQuiz,
  generateWordRecognitionTask,
  SAMPLE_TEXTS,
  SentenceSelectionMode,
  splitIntoSentences,
} from './utils/textParser';
import {
  resolveDefaultAssignedTask,
  resolveStudentAssignmentTask,
} from './utils/assignmentDefaults';
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
import { StudentDirectAssignmentView } from './components/StudentDirectAssignmentView';
import { StudentBottomNav } from './components/StudentBottomNav';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import {
  ALL_BADGES,
  loadUnlockedBadges,
  loadActivityTracker,
  saveActivityTracker,
  evaluateAllBadges,
  resetAllBadges,
  type ActivityTracker,
} from './utils/badges';
import { fetchAssignmentById, fetchAssignments, fetchSubmissions } from './storage/assignments';
import {
  saveStudentProgress,
  loadStudentProgress,
  saveCustomLesson,
  getSavedLessons,
  deleteSavedLesson,
  type SavedLessonItem,
} from './storage';
import {
  awardXp,
  computeEffectiveLocalXp,
  computeLeaderboard,
  GamificationActivity,
  loadGamificationState,
} from './utils/gamification';
import {
  LessonScoreBuckets,
  computeLessonPracticeStats,
  getLessonScopeKey,
  getOrCreateBucket,
  recordDictationResult,
  recordQuizResult,
  recordTypingMatchResult,
  recordVoiceResult,
  recordWordHuntResult,
} from './utils/scoreStore';
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

  // Currently assigned individual task type: defaults to 'all' (Full Lesson)
  const [assignedTaskType, setAssignedTaskType] = useState<AssignedTaskType>('all');

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

  // Isolated per-lesson / per-assignment score buckets (zero cross-lesson leakage)
  const [scoreBuckets, setScoreBuckets] = useState<LessonScoreBuckets>({});

  // Badges & Achievements state
  const [unlockedBadges, setUnlockedBadges] = useState<UnlockedBadge[]>([]);
  const [isBadgesModalOpen, setIsBadgesModalOpen] = useState<boolean>(false);
  const [activeCelebrationBadge, setActiveCelebrationBadge] = useState<BadgeDefinition | null>(null);
  const [activityTracker, setActivityTracker] = useState<ActivityTracker>(loadActivityTracker);

  // Real XP, Streak & Leaderboard state
  const [gamification, setGamification] = useState<GamificationState>(() => loadGamificationState());
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [globalLeaderboardSubs, setGlobalLeaderboardSubs] = useState<AssignmentSubmission[]>([]);

  // Assignments & Admin Dashboard state
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState<boolean>(false);
  const [isSubmitHomeworkModalOpen, setIsSubmitHomeworkModalOpen] = useState<boolean>(false);

  // Check URL parameters for shared assignment link and individual task
  const directAssignmentId = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('assignment') || urlParams.get('assignmentId');
  }, []);

  const directTaskParam = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    return (urlParams.get('task') as AssignedTaskType) || null;
  }, []);

  const isDirectStudentLink = !!directAssignmentId;
  const [isLoadingSharedAssignment, setIsLoadingSharedAssignment] = useState<boolean>(!!directAssignmentId);
  const [assignmentLoadError, setAssignmentLoadError] = useState<string | null>(null);

  // Student mode is active when opening via shared link or when toggling preview
  const isStudentMode = isDirectStudentLink || activeAssignment !== null || isStudentPreview;
  // Locked student task: true ONLY whenever a student accesses via a shared assignment link
  const isLockedStudentTask = isDirectStudentLink;

  // Parse raw text into structured sentences
  const parsedSentences = useMemo(() => {
    const rawSentences = splitIntoSentences(rawText);
    return analyzeAllSentences(rawSentences);
  }, [rawText]);

  // Total word count for entire text
  const totalWords = useMemo(() => {
    return parsedSentences.reduce((acc, s) => acc + s.wordCount, 0);
  }, [parsedSentences]);

  // Selected sentence count / range & optional tier-cut toggle ("Tier chỉ chỉnh gợi ý, không tự cắt câu")
  const [practiceSentenceMode, setPracticeSentenceMode] = useState<SentenceSelectionMode>('all');
  const [practiceRangeFrom, setPracticeRangeFrom] = useState<number>(1);
  const [practiceRangeTo, setPracticeRangeTo] = useState<number>(() => Math.min(5, parsedSentences.length || 1));
  const [enableTierCut, setEnableTierCut] = useState<boolean>(false);

  // Tier NEVER auto-cuts sentences; activeTierSentences keeps all parsedSentences intact unless explicit cut opted in
  const activeTierSentences = useMemo(() => {
    if (!enableTierCut) return parsedSentences;
    return filterSentencesWithPreview(parsedSentences, {
      mode: 'all',
      cutByTier: selectedTier,
    }).keptSentences;
  }, [parsedSentences, selectedTier, enableTierCut]);

  // Scoped practice sentences using canonical preview helper
  const scopedTierSentences = useMemo(() => {
    return filterSentencesWithPreview(parsedSentences, {
      mode: practiceSentenceMode,
      from: practiceRangeFrom,
      to: practiceRangeTo,
      cutByTier: enableTierCut ? selectedTier : null,
    }).keptSentences;
  }, [parsedSentences, selectedTier, enableTierCut, practiceSentenceMode, practiceRangeFrom, practiceRangeTo]);

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
      if (saved.lessonBuckets) {
        setScoreBuckets(saved.lessonBuckets);
      }
      if (!directAssignmentId) {
        if (saved.lastText) setRawText(saved.lastText);
        if (saved.selectedTier) setSelectedTier(saved.selectedTier as DifficultyTier);
        if (saved.lessonFormat) setLessonFormat(saved.lessonFormat);
        if (saved.lastText) setIsLessonGenerated(true);
      }
    }

    const lessons = getSavedLessons();
    setSavedLessons(lessons);

    const initialBadges = loadUnlockedBadges();
    setUnlockedBadges(initialBadges);

    // Check URL parameters for shared assignment link and individual task
    if (directAssignmentId) {
      setIsLoadingSharedAssignment(true);
      fetchAssignmentById(directAssignmentId)
        .then((assignment) => {
          if (assignment) {
            setActiveAssignment(assignment);
            setRawText(assignment.rawText);
            if (assignment.selectedTier) {
              setSelectedTier(assignment.selectedTier as DifficultyTier);
            }
            if (assignment.lessonFormat) {
              setLessonFormat(assignment.lessonFormat);
            }
            const taskToUse = resolveStudentAssignmentTask(directTaskParam, assignment.assignedTask);
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
          } else {
            setAssignmentLoadError(
              language === 'en'
                ? 'Assignment not found or link has expired.'
                : 'Không tìm thấy bài tập hoặc liên kết này đã hết hạn.'
            );
          }
        })
        .catch((err) => {
          console.error('Error fetching assignment:', err);
          setAssignmentLoadError(
            language === 'en'
              ? 'Error loading assignment. Please check your link.'
              : 'Có lỗi xảy ra khi tải bài tập. Vui lòng kiểm tra lại liên kết.'
          );
        })
        .finally(() => {
          setIsLoadingSharedAssignment(false);
        });
    }
  }, [directAssignmentId, directTaskParam]);

  // Guard: If student has an active shared link, enforce 'practice' view so they cannot navigate away
  useEffect(() => {
    if (isDirectStudentLink && currentView !== 'practice') {
      setCurrentView('practice');
    }
  }, [isDirectStudentLink, currentView]);

  // Isolated lesson/assignment key & bucket
  const activeLessonKey = useMemo(
    () =>
      getLessonScopeKey(
        rawText,
        isDirectStudentLink ? directAssignmentId : activeAssignment?.id
      ),
    [rawText, isDirectStudentLink, directAssignmentId, activeAssignment?.id]
  );

  const activeBucket = useMemo(
    () => getOrCreateBucket(scoreBuckets, activeLessonKey),
    [scoreBuckets, activeLessonKey]
  );

  const voiceResults = activeBucket.voiceResults;
  const typingMatchResults = activeBucket.typingMatchResults;

  const livePracticeStats = useMemo(
    () => computeLessonPracticeStats(activeBucket, quizQuestions.length),
    [activeBucket, quizQuestions.length]
  );

  const effectiveXp = useMemo(
    () => computeEffectiveLocalXp(gamification, livePracticeStats),
    [gamification, livePracticeStats]
  );

  const handleAwardXp = (activity: GamificationActivity, customDelta?: number) => {
    const next = awardXp(activity, customDelta);
    setGamification(next);
  };

  const handleOpenGlobalLeaderboard = async () => {
    setIsLeaderboardOpen(true);
    try {
      const targetAssignments = activeAssignment
        ? [activeAssignment]
        : (await fetchAssignments()).slice(0, 10);
      const subLists = await Promise.all(
        targetAssignments.map((a) => fetchSubmissions(a.id))
      );
      setGlobalLeaderboardSubs(subLists.flat());
    } catch {
      setGlobalLeaderboardSubs([]);
    }
  };

  const handleReloadAfterJsonImport = () => {
    setSavedLessons(getSavedLessons());
    setUnlockedBadges(loadUnlockedBadges());
    setActivityTracker(loadActivityTracker());
    setGamification(loadGamificationState());
    const saved = loadStudentProgress();
    if (saved?.lessonBuckets) {
      setScoreBuckets(saved.lessonBuckets);
    }
  };

  const leaderboardEntries = useMemo(() => {
    const statAccuracies: number[] = [];
    if (livePracticeStats.voiceCount > 0) statAccuracies.push(livePracticeStats.voiceScore);
    if (livePracticeStats.typingMatchCount > 0) statAccuracies.push(livePracticeStats.typingMatchScore);
    if (livePracticeStats.dictationCount > 0) statAccuracies.push(livePracticeStats.dictationScore);
    if (livePracticeStats.quizTotal > 0) statAccuracies.push(livePracticeStats.quizScore);
    const localAvgAcc =
      statAccuracies.length > 0
        ? Math.round(statAccuracies.reduce((a, b) => a + b, 0) / statAccuracies.length)
        : 0;
    const localCompletedTasks =
      (livePracticeStats.voiceCount > 0 ? 1 : 0) +
      (livePracticeStats.typingMatchCount > 0 ? 1 : 0) +
      (livePracticeStats.dictationCount > 0 ? 1 : 0) +
      (livePracticeStats.quizTotal > 0 ? 1 : 0) +
      (livePracticeStats.wordHuntCompleted ? 1 : 0);

    const savedName =
      typeof window !== 'undefined' ? localStorage.getItem('ms_meo_student_name') || '' : '';
    const savedClass =
      typeof window !== 'undefined'
        ? localStorage.getItem('ms_meo_student_class') || activeAssignment?.className || ''
        : activeAssignment?.className || '';

    return computeLeaderboard(
      globalLeaderboardSubs,
      effectiveXp > 0
        ? {
            studentName:
              savedName || (language === 'en' ? 'You (This Browser)' : 'Bạn (Trình duyệt này)'),
            studentClass: savedClass,
            xp: effectiveXp,
            avgAccuracy: localAvgAcc,
            completedTasks: localCompletedTasks,
            streakDays: gamification.currentStreakDays,
          }
        : undefined
    );
  }, [globalLeaderboardSubs, effectiveXp, livePracticeStats, activeAssignment, language, gamification.currentStreakDays]);

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

  // Generate / regenerate interactive modules whenever text, difficulty tier or sentence range changes
  const buildInteractiveModules = () => {
    const targetSentences = scopedTierSentences.length > 0 ? scopedTierSentences : parsedSentences;
    if (targetSentences.length === 0) return;
    const wordsTask = generateWordRecognitionTask(targetSentences);
    const quizTask = generateComprehensionQuiz(rawText, targetSentences);
    setWordRecognitionItems(wordsTask);
    setQuizQuestions(quizTask);
  };

  useEffect(() => {
    buildInteractiveModules();
  }, [rawText, selectedTier, enableTierCut, practiceSentenceMode, practiceRangeFrom, practiceRangeTo]);

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
      shadowingCount: Object.keys(voiceResults).length,
      lessonBuckets: scoreBuckets,
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
    // If student has an active assignment link with a dedicated task, do not allow changing tasks
    if (isLockedStudentTask) {
      return;
    }
    setIsLessonGenerated(true);
    setActiveTab(tabId);
    setTimeout(() => {
      const targetElement = document.getElementById('lesson-modules-section');
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Strictly saves Mic Voice Score ONLY into voiceResults of activeLessonKey
  const handleSaveVoiceResult = (sentenceId: string, result: ShadowingResult) => {
    setScoreBuckets((prev) => {
      const nextBuckets = recordVoiceResult(prev, activeLessonKey, sentenceId, result);
      const bucket = nextBuckets[activeLessonKey];
      const count = Object.keys(bucket.voiceResults).length;
      const highestScore = Math.max(
        ...Object.values(bucket.voiceResults).map((r) => r.accuracyScore || 0),
        0
      );

      triggerActivityUpdate({
        shadowedSentenceCount: count,
        highestShadowingScore: highestScore,
      });

      saveStudentProgress('local', {
        lastText: rawText,
        selectedTier,
        shadowingCount: count,
        lessonBuckets: nextBuckets,
        unlockedBadges: unlockedBadges.map((b) => b.badgeId),
      });

      return nextBuckets;
    });
    handleAwardXp('shadowing');
  };

  // Strictly saves manual Typing Test ONLY into typingMatchResults (never touches Voice Score)
  const handleSaveTypingMatchResult = (sentenceId: string, result: ShadowingResult) => {
    setScoreBuckets((prev) => {
      const nextBuckets = recordTypingMatchResult(prev, activeLessonKey, sentenceId, result);
      saveStudentProgress('local', {
        lastText: rawText,
        selectedTier,
        lessonBuckets: nextBuckets,
        unlockedBadges: unlockedBadges.map((b) => b.badgeId),
      });
      return nextBuckets;
    });
    handleAwardXp('shadowing', 10);
  };

  const handleQuizProgress = (correctCount: number, total: number) => {
    const percent = Math.round((correctCount / Math.max(1, total)) * 100);
    setScoreBuckets((prev) => {
      const nextBuckets = recordQuizResult(prev, activeLessonKey, correctCount, total);
      saveStudentProgress('local', {
        lastText: rawText,
        selectedTier,
        quizScore: percent,
        lessonBuckets: nextBuckets,
        unlockedBadges: unlockedBadges.map((b) => b.badgeId),
      });
      return nextBuckets;
    });
    triggerActivityUpdate({
      highestQuizScore: percent,
    });
    if (correctCount > 0) {
      handleAwardXp('quiz', correctCount * 10);
    }
  };

  const handleWordHuntComplete = (completed: boolean) => {
    setScoreBuckets((prev) => {
      const nextBuckets = recordWordHuntResult(prev, activeLessonKey, completed);
      saveStudentProgress('local', {
        lastText: rawText,
        selectedTier,
        lessonBuckets: nextBuckets,
        unlockedBadges: unlockedBadges.map((b) => b.badgeId),
      });
      return nextBuckets;
    });
    if (completed) {
      triggerActivityUpdate({
        completedWordHunt: true,
      });
      handleAwardXp('words');
    }
  };

  // Strictly saves Task 3 Smart Dictation score into dictationResults ONLY
  const handleDictationEvaluated = (sentenceId: string, score: number) => {
    setScoreBuckets((prev) => {
      const nextBuckets = recordDictationResult(prev, activeLessonKey, sentenceId, score);
      saveStudentProgress('local', {
        lastText: rawText,
        selectedTier,
        lessonBuckets: nextBuckets,
        unlockedBadges: unlockedBadges.map((b) => b.badgeId),
      });
      return nextBuckets;
    });
    triggerActivityUpdate({
      completedDictationSentenceCount: (activityTracker.completedDictationSentenceCount || 0) + 1,
      highestDictationScore: Math.max(activityTracker.highestDictationScore || 0, score),
    });
    handleAwardXp('dictation');
  };

  const handleChatActivity = () => {
    triggerActivityUpdate({
      hasChattedWithMeo: true,
    });
    handleAwardXp('chat');
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

  const renderLockedTaskBanner = (taskNameEn: string, taskNameVi: string, icon: string) => (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-3xl border border-indigo-700/60 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-lg shadow-sm shrink-0">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/20 px-2.5 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1">
              <span>🔒</span>
              <span>{language === 'en' ? 'Assigned Task Link' : 'Nhiệm vụ riêng được giao'}</span>
            </span>
            <span className="text-xs font-bold text-white">
              {language === 'en' ? taskNameEn : taskNameVi}
            </span>
          </div>
          <p className="text-xs text-indigo-200 mt-1">
            {language === 'en'
              ? 'You have permission to practice only this assigned task. Complete this activity and submit your homework.'
              : 'Học sinh chỉ có quyền thực hành nội dung nhiệm vụ này theo link của giáo viên. Hãy hoàn thành và bấm Nộp bài.'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setIsSubmitHomeworkModalOpen(true)}
        className="px-4 py-2 rounded-xl text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-300 shadow-md transition-all hover:scale-102 ring-2 ring-amber-200 flex items-center gap-1.5 shrink-0"
      >
        <Send className="w-3.5 h-3.5 text-slate-900" />
        <span>{language === 'en' ? 'Submit Homework' : 'Nộp bài tập'}</span>
      </button>
    </div>
  );

  // =========================================================================
  // CONDITIONAL RENDER: DEDICATED STUDENT RECEIVER VIEW
  // When a student opens a shared assignment link (?assignment=...), they ONLY
  // see the assigned exercise content. ZERO Admin UI, ZERO creator tools, ZERO
  // unrelated tabs or teacher menus.
  // =========================================================================
  if (isDirectStudentLink) {
    if (isLoadingSharedAssignment) {
      return (
        <div className="min-h-screen bg-[#FDF4F8] flex flex-col items-center justify-center p-6 text-center">
          <img
            src={mascotImg}
            alt="Ms Mèo Mascot"
            className="w-20 h-20 rounded-full border-4 border-pink-400 shadow-xl object-cover mb-4 animate-bounce"
          />
          <h2 className="font-heading text-xl sm:text-2xl font-black text-slate-800">
            Ms Mèo English Practice
          </h2>
          <p className="text-sm text-pink-600 font-bold mt-2 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
            <span>{language === 'en' ? '🐾 Opening your assigned homework...' : '🐾 Đang mở bài tập được giao cho bạn...'}</span>
          </p>
        </div>
      );
    }

    if (assignmentLoadError || !activeAssignment) {
      return (
        <div className="min-h-screen bg-[#FDF4F8] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-rose-200">
            <img
              src={mascotImg}
              alt="Ms Mèo Mascot"
              className="w-16 h-16 rounded-full border-2 border-rose-300 shadow-md object-cover mx-auto mb-3"
            />
            <h3 className="font-heading text-lg font-black text-slate-900 mb-1">
              {language === 'en' ? 'Assignment Not Found' : 'Không tìm thấy bài tập'}
            </h3>
            <p className="text-xs text-rose-600 font-medium mb-5">
              {assignmentLoadError || (language === 'en' ? 'This assignment link is invalid or expired.' : 'Liên kết bài tập không tồn tại hoặc đã hết hạn.')}
            </p>
            <button
              type="button"
              onClick={() => {
                window.location.href = window.location.origin + window.location.pathname;
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-xs transition-all"
            >
              {language === 'en' ? 'Go to Main Page' : 'Về trang chính'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <StudentDirectAssignmentView
          assignment={activeAssignment}
          assignedTaskType={assignedTaskType}
          sentences={parsedSentences}
          activeTierSentences={activeTierSentences}
          rawText={rawText}
          selectedTier={selectedTier}
          onSelectTier={(newTier) => setSelectedTier(newTier)}
          voiceSettings={voiceSettings}
          onUpdateVoiceSettings={(newSettings) => setVoiceSettings(newSettings)}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          language={language}
          onToggleLanguage={handleToggleLanguage}
          voiceResults={voiceResults}
          typingMatchResults={typingMatchResults}
          onSaveVoiceResult={handleSaveVoiceResult}
          onSaveTypingMatchResult={handleSaveTypingMatchResult}
          livePracticeStats={livePracticeStats}
          wordRecognitionItems={wordRecognitionItems}
          quizQuestions={quizQuestions}
          onRefreshWordHunt={buildInteractiveModules}
          onWordHuntComplete={handleWordHuntComplete}
          onQuizProgress={handleQuizProgress}
          onDictationEvaluated={handleDictationEvaluated}
          onChatActivity={handleChatActivity}
          onOpenSubmitModal={() => setIsSubmitHomeworkModalOpen(true)}
          gamification={gamification}
          unlockedBadgeCount={unlockedBadges.length}
          onOpenBadges={() => setIsBadgesModalOpen(true)}
          onDataImported={handleReloadAfterJsonImport}
        />

        <SubmitHomeworkModal
          isOpen={isSubmitHomeworkModalOpen}
          onClose={() => setIsSubmitHomeworkModalOpen(false)}
          assignment={activeAssignment}
          practiceStats={livePracticeStats}
          language={language}
        />

        <BadgesModal
          isOpen={isBadgesModalOpen}
          onClose={() => setIsBadgesModalOpen(false)}
          unlockedBadges={unlockedBadges}
          language={language}
          onResetBadges={handleResetBadges}
        />

        <BadgeUnlockedToast
          badge={activeCelebrationBadge}
          language={language}
          onClose={() => setActiveCelebrationBadge(null)}
          onOpenBadgesModal={() => setIsBadgesModalOpen(true)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF4F8] text-slate-700 flex flex-col antialiased selection:bg-pink-200 selection:text-pink-900 overflow-x-hidden">
      {/* 1. Header (Home first, dedicated Soạn bài, distinct standalone buttons) */}
      <Header
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        currentView={currentView}
        onGoHome={() => {
          setActiveAssignment(null);
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
        activeAssignment={activeAssignment}
        assignedTaskType={assignedTaskType}
        totalXp={effectiveXp}
        streakDays={gamification.currentStreakDays}
        onOpenLeaderboard={handleOpenGlobalLeaderboard}
      />

      {/* Student Assignment Banner (when doing homework via shared link) */}
      {activeAssignment && (
        <StudentAssignmentBanner
          assignment={activeAssignment}
          practiceStats={livePracticeStats}
          onOpenSubmitModal={() => setIsSubmitHomeworkModalOpen(true)}
          assignedTaskType={assignedTaskType}
          language={language}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-6">
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
            totalXp={effectiveXp}
            streakDays={gamification.currentStreakDays}
            onOpenLeaderboard={handleOpenGlobalLeaderboard}
            onDataImported={handleReloadAfterJsonImport}
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
                  <span>
                    {language === 'en'
                      ? `🚀 Generate Practice (${scopedTierSentences.length} sent.)`
                      : `🚀 Tạo bài & Vào Luyện tập (${scopedTierSentences.length} câu)`}
                  </span>
                </button>
              </div>
            </div>

            {/* Advanced Native Voice Control Toolbar */}
            <VoiceToolbar
              settings={voiceSettings}
              onUpdateSettings={(newSettings) => setVoiceSettings(newSettings)}
              language={language}
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
              sentenceCountMode={practiceSentenceMode}
              onChangeSentenceCountMode={setPracticeSentenceMode}
              customRangeFrom={practiceRangeFrom}
              onChangeCustomRangeFrom={setPracticeRangeFrom}
              customRangeTo={practiceRangeTo}
              onChangeCustomRangeTo={setPracticeRangeTo}
              enableTierCut={enableTierCut}
              onToggleTierCut={setEnableTierCut}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: PRACTICE (PHÒNG LUYỆN TẬP) - Listening Karaoke, Shadowing, Tasks */}
        {/* ========================================================================= */}
        {currentView === 'practice' && (
          <div className="space-y-6 animate-fadeIn">
            {isLockedStudentTask ? (
              /* ========================================================================= */
              /* LOCKED STUDENT TASK: Only allowed to practice the assigned task!         */
              /* ========================================================================= */
              <>
                {assignedTaskType === 'listening' && (
                  <StudentListeningKaraokeView
                    assignment={activeAssignment!}
                    sentences={activeTierSentences}
                    rawText={rawText}
                    language={language}
                    voiceSettings={voiceSettings}
                    onUpdateVoiceSettings={(newSettings) => setVoiceSettings(newSettings)}
                    onSwitchToOtherTask={() => {}}
                    onExitStudentMode={() => {}}
                  />
                )}

                {assignedTaskType === 'shadowing' && (
                  <div className="space-y-6 animate-fadeIn">
                    <StudentLessonHeader
                      assignment={activeAssignment!}
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
                      assignedTaskType="shadowing"
                      language={language}
                    />

                    {renderLockedTaskBanner(
                      'Shadowing Studio (Pronunciation & Rhythm)',
                      'Luyện phát âm & Shadowing',
                      '🎙️'
                    )}

                    <VoiceToolbar
                      settings={voiceSettings}
                      onUpdateSettings={(newSettings) => setVoiceSettings(newSettings)}
                      language={language}
                    />

                    <ShadowingStudio
                      key={activeLessonKey}
                      sentences={activeTierSentences}
                      voiceSettings={voiceSettings}
                      soundEnabled={soundEnabled}
                      language={language}
                      voiceResults={voiceResults}
                      typingMatchResults={typingMatchResults}
                      onSaveVoiceResult={handleSaveVoiceResult}
                      onSaveTypingMatchResult={handleSaveTypingMatchResult}
                    />
                  </div>
                )}

                {assignedTaskType === 'words' && (
                  <div className="space-y-6 animate-fadeIn">
                    <StudentLessonHeader
                      assignment={activeAssignment!}
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
                      assignedTaskType="words"
                      language={language}
                    />

                    {renderLockedTaskBanner(
                      'Task 1: Word Detective (Target Vocabulary)',
                      'Nhiệm vụ 1: Tìm từ vựng (Word Detective)',
                      '🔍'
                    )}

                    <TaskWordRecognition
                      items={wordRecognitionItems}
                      soundEnabled={soundEnabled}
                      language={language}
                      onRefresh={buildInteractiveModules}
                      onCompletedChange={handleWordHuntComplete}
                    />
                  </div>
                )}

                {assignedTaskType === 'quiz' && (
                  <div className="space-y-6 animate-fadeIn">
                    <StudentLessonHeader
                      assignment={activeAssignment!}
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
                      assignedTaskType="quiz"
                      language={language}
                    />

                    {renderLockedTaskBanner(
                      'Task 2: Comprehension Quiz',
                      'Nhiệm vụ 2: Trắc nghiệm Đọc hiểu',
                      '📝'
                    )}

                    <TaskComprehensionQuiz
                      questions={quizQuestions}
                      soundEnabled={soundEnabled}
                      language={language}
                      onQuizProgress={handleQuizProgress}
                    />
                  </div>
                )}

                {assignedTaskType === 'dictation' && (
                  <div className="space-y-6 animate-fadeIn">
                    <StudentLessonHeader
                      assignment={activeAssignment!}
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
                      assignedTaskType="dictation"
                      language={language}
                    />

                    {renderLockedTaskBanner(
                      'Task 3: Smart Dictation',
                      'Nhiệm vụ 3: Chép chính tả thông minh',
                      '✍️'
                    )}

                    <VoiceToolbar
                      settings={voiceSettings}
                      onUpdateSettings={(newSettings) => setVoiceSettings(newSettings)}
                      language={language}
                    />

                    <TaskSmartDictation
                      sentences={activeTierSentences}
                      tier={selectedTier}
                      voiceSettings={voiceSettings}
                      onUpdateVoiceSettings={(newSettings) => setVoiceSettings(newSettings)}
                      soundEnabled={soundEnabled}
                      language={language}
                      onSentenceEvaluated={handleDictationEvaluated}
                    />
                  </div>
                )}

                {assignedTaskType === 'chat' && (
                  <div className="space-y-6 animate-fadeIn">
                    <StudentLessonHeader
                      assignment={activeAssignment!}
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
                      assignedTaskType="chat"
                      language={language}
                    />

                    {renderLockedTaskBanner(
                      'Task 4: Ms Mèo Chat (Interactive Reflex)',
                      'Nhiệm vụ 4: Ms Mèo Chat phản xạ',
                      '🐱'
                    )}

                    <TaskMsMeoChatbot
                      fullText={rawText}
                      sentences={parsedSentences}
                      voiceSettings={voiceSettings}
                      soundEnabled={soundEnabled}
                      language={language}
                      onChatActivity={handleChatActivity}
                      isStudentMode={isStudentMode}
                    />
                  </div>
                )}
              </>
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
                    language={language}
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
                            ? `${scopedTierSentences.length} sentences • ${totalWords} words`
                            : `${scopedTierSentences.length} câu • ${totalWords} từ`}
                        </span>
                        {practiceSentenceMode !== 'all' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-500 text-white shadow-2xs">
                            {language === 'en'
                              ? `Filtered (${practiceSentenceMode === 'custom' ? `${practiceRangeFrom}-${practiceRangeTo}` : `${practiceSentenceMode} sent.`})`
                              : `Đã chọn (${practiceSentenceMode === 'custom' ? `Câu ${practiceRangeFrom}-${practiceRangeTo}` : `${practiceSentenceMode} câu`})`}
                          </span>
                        )}
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
                  language={language}
                />

                {/* Functional Segmented Navigation Bar for Practice Stations (wraps cleanly at 360px) */}
                <div className="bg-white p-1.5 rounded-2xl border border-pink-200/90 shadow-xs flex flex-wrap items-center gap-1 max-w-full">
                  <button
                    type="button"
                    onClick={() => {
                      playSoftTone();
                      setActiveTab('listening');
                    }}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeTab === 'listening'
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-pink-600 hover:bg-pink-50'
                    }`}
                  >
                    <Headphones className="w-4 h-4" />
                    <span>{language === 'en' ? '🎧 Listening' : '🎧 Nghe Karaoke'}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                      {scopedTierSentences.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSoftTone();
                      setActiveTab('shadowing');
                    }}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeTab === 'shadowing'
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-pink-600 hover:bg-pink-50'
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                    <span>{language === 'en' ? 'Shadowing' : 'Nói Shadowing'}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                      {scopedTierSentences.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSoftTone();
                      setActiveTab('words');
                    }}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeTab === 'words'
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-pink-600 hover:bg-pink-50'
                    }`}
                  >
                    <Search className="w-4 h-4" />
                    <span>{language === 'en' ? 'Task 1: Words' : 'Task 1: Tìm từ'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSoftTone();
                      setActiveTab('quiz');
                    }}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeTab === 'quiz'
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-pink-600 hover:bg-pink-50'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{language === 'en' ? 'Task 2: Quiz' : 'Task 2: Trắc nghiệm'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSoftTone();
                      setActiveTab('dictation');
                    }}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeTab === 'dictation'
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-pink-600 hover:bg-pink-50'
                    }`}
                  >
                    <Headphones className="w-4 h-4" />
                    <span>{language === 'en' ? 'Task 3: Dictation' : 'Task 3: Chính tả'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSoftTone();
                      setActiveTab('chatbot');
                    }}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeTab === 'chatbot'
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-pink-600 hover:bg-pink-50'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{language === 'en' ? 'Task 4: Chat 🐱' : 'Task 4: Chat Ms Mèo 🐱'}</span>
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
                      sentences={scopedTierSentences}
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
                      key={activeLessonKey}
                      sentences={scopedTierSentences}
                      voiceSettings={voiceSettings}
                      soundEnabled={soundEnabled}
                      language={language}
                      voiceResults={voiceResults}
                      typingMatchResults={typingMatchResults}
                      onSaveVoiceResult={handleSaveVoiceResult}
                      onSaveTypingMatchResult={handleSaveTypingMatchResult}
                    />
                  )}

                  {activeTab === 'words' && (
                    <TaskWordRecognition
                      key={activeLessonKey}
                      items={wordRecognitionItems}
                      soundEnabled={soundEnabled}
                      language={language}
                      onRefresh={buildInteractiveModules}
                      onCompletedChange={handleWordHuntComplete}
                    />
                  )}

                  {activeTab === 'quiz' && (
                    <TaskComprehensionQuiz
                      key={activeLessonKey}
                      questions={quizQuestions}
                      soundEnabled={soundEnabled}
                      language={language}
                      onQuizProgress={handleQuizProgress}
                    />
                  )}

                  {activeTab === 'dictation' && (
                    <TaskSmartDictation
                      key={activeLessonKey}
                      sentences={scopedTierSentences}
                      tier={selectedTier}
                      voiceSettings={voiceSettings}
                      onUpdateVoiceSettings={(newSettings) => setVoiceSettings(newSettings)}
                      soundEnabled={soundEnabled}
                      language={language}
                      onSentenceEvaluated={handleDictationEvaluated}
                    />
                  )}

                  {activeTab === 'chatbot' && (
                    <TaskMsMeoChatbot
                      fullText={rawText}
                      sentences={parsedSentences}
                      voiceSettings={voiceSettings}
                      soundEnabled={soundEnabled}
                      language={language}
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
      <footer className={`mt-12 border-t border-pink-200 bg-white/70 py-6 text-center text-xs text-slate-500 ${isStudentMode && currentView === 'practice' ? 'pb-28' : ''}`}>
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <span>🐱 Ms Mèo's Practice Web</span>
            <span>•</span>
            <span>
              {language === 'en'
                ? 'Designed for High School English Learners'
                : 'Phòng luyện nói & đọc hiểu tiếng Anh THPT'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-400 flex-wrap justify-center">
            <span>
              {language === 'en'
                ? 'Browser Speech & Audio Engine'
                : 'Giọng đọc trên trình duyệt thiết bị'}
            </span>
            <span>•</span>
            <span>
              {language === 'en'
                ? 'Local Browser Storage (Export JSON to back up)'
                : 'Lưu cục bộ trên trình duyệt này (hỗ trợ Xuất/Nhập JSON)'}
            </span>
          </div>
        </div>
      </footer>

      {/* Global Leaderboard Modal */}
      {isLeaderboardOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setIsLeaderboardOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-pink-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <h3 className="font-heading font-black text-base">
                {language === 'en' ? '🏆 Total XP, Streak & Leaderboard' : '🏆 Tổng XP, Chuỗi ngày & Bảng xếp hạng'}
              </h3>
              <button
                type="button"
                onClick={() => setIsLeaderboardOpen(false)}
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

      {/* Persistent Bottom Navigation in Student Mode Practice View */}
      {isStudentMode && currentView === 'practice' && (
        <StudentBottomNav
          language={language}
          activeTab={activeTab}
          assignedTaskType={assignedTaskType}
          totalXp={effectiveXp}
          streakDays={gamification.currentStreakDays}
          unlockedBadgeCount={unlockedBadges.length}
          onSelectTab={!isLockedStudentTask ? (tab) => setActiveTab(tab) : undefined}
          onOpenLeaderboard={handleOpenGlobalLeaderboard}
          onOpenBadges={() => setIsBadgesModalOpen(true)}
          onOpenSubmitModal={activeAssignment ? () => setIsSubmitHomeworkModalOpen(true) : undefined}
        />
      )}

      {/* Save Lesson Dialog Modal */}
      <SaveLessonDialog
        isOpen={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        rawText={rawText}
        selectedTier={selectedTier}
        sentenceCount={parsedSentences.length}
        wordCount={totalWords}
        language={language}
        onSave={handleSaveCurrentLesson}
      />

      {/* Saved Lessons Library Modal */}
      <SavedLessonsModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        savedLessons={savedLessons}
        language={language}
        onLoadLesson={handleLoadSavedLesson}
        onDeleteLesson={handleDeleteSavedLesson}
      />

      {/* Badges & Achievements Modal */}
      <BadgesModal
        isOpen={isBadgesModalOpen}
        onClose={() => setIsBadgesModalOpen(false)}
        unlockedBadges={unlockedBadges}
        language={language}
        onResetBadges={handleResetBadges}
        onNavigateToTab={handleSelectTabFromHeader}
      />

      {/* Floating Badge Unlocked Celebration Toast */}
      <BadgeUnlockedToast
        badge={activeCelebrationBadge}
        language={language}
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
        defaultAssignedTask={resolveDefaultAssignedTask({ currentView, activeTab })}
        initialSentenceChoice={practiceSentenceMode}
        initialRangeFrom={practiceRangeFrom}
        initialRangeTo={practiceRangeTo}
        onAssignmentCreated={(_assignment) => {
          // Assignment is created and saved; do NOT call setActiveAssignment which locks teacher into student mode!
        }}
        onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
        onGoHome={() => {
          setActiveAssignment(null);
          setCurrentView('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Admin Dashboard: Quản lý giao bài & Kết quả học sinh */}
      <AdminDashboardModal
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        language={language}
        onSelectAssignmentToPractice={handleSelectAssignmentToPractice}
        onOpenAssignModal={() => setIsAssignModalOpen(true)}
        onGoHome={() => {
          setActiveAssignment(null);
          setCurrentView('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        gamification={gamification}
        effectiveLocalXp={effectiveXp}
        onDataImported={handleReloadAfterJsonImport}
      />

      {/* Student Submit Homework Modal */}
      {activeAssignment && (
        <SubmitHomeworkModal
          isOpen={isSubmitHomeworkModalOpen}
          onClose={() => setIsSubmitHomeworkModalOpen(false)}
          assignment={activeAssignment}
          practiceStats={livePracticeStats}
          language={language}
        />
      )}
    </div>
  );
}
