import { PracticeStats, ShadowingResult } from '../types';
import { hashTextKey } from './textParser';

export interface LessonScoreBucket {
  lessonKey: string;
  voiceResults: Record<string, ShadowingResult>;
  typingMatchResults: Record<string, ShadowingResult>;
  dictationResults: Record<string, number>;
  quizStats: {
    correct: number;
    total: number;
    score: number;
  };
  wordHuntCompleted: boolean;
  updatedAt: number;
}

export type LessonScoreBuckets = Record<string, LessonScoreBucket>;

/**
 * Generates an isolated lesson/assignment key so scores never leak across lessons or assignments.
 */
export function getLessonScopeKey(rawText: string, assignmentId?: string | null): string {
  const cleanAssignmentId = assignmentId?.trim();
  if (cleanAssignmentId && cleanAssignmentId !== 'active-lesson') {
    return `assignment:${cleanAssignmentId}`;
  }
  return `lesson:${hashTextKey(rawText || '')}`;
}

export function createEmptyLessonBucket(lessonKey: string): LessonScoreBucket {
  return {
    lessonKey,
    voiceResults: {},
    typingMatchResults: {},
    dictationResults: {},
    quizStats: { correct: 0, total: 0, score: 0 },
    wordHuntCompleted: false,
    updatedAt: Date.now(),
  };
}

export function getOrCreateBucket(
  buckets: LessonScoreBuckets,
  lessonKey: string
): LessonScoreBucket {
  return buckets[lessonKey] || createEmptyLessonBucket(lessonKey);
}

/**
 * Records a Shadowing Mic Voice score strictly into `voiceResults` ONLY.
 */
export function recordVoiceResult(
  buckets: LessonScoreBuckets,
  lessonKey: string,
  sentenceId: string,
  result: ShadowingResult
): LessonScoreBuckets {
  const current = getOrCreateBucket(buckets, lessonKey);
  const voiceResult: ShadowingResult = { ...result, source: 'voice' };
  return {
    ...buckets,
    [lessonKey]: {
      ...current,
      voiceResults: {
        ...current.voiceResults,
        [sentenceId]: voiceResult,
      },
      updatedAt: Date.now(),
    },
  };
}

/**
 * Records a Shadowing Manual Typing Match score strictly into `typingMatchResults` ONLY.
 */
export function recordTypingMatchResult(
  buckets: LessonScoreBuckets,
  lessonKey: string,
  sentenceId: string,
  result: ShadowingResult
): LessonScoreBuckets {
  const current = getOrCreateBucket(buckets, lessonKey);
  const typingResult: ShadowingResult = { ...result, source: 'typing' };
  return {
    ...buckets,
    [lessonKey]: {
      ...current,
      typingMatchResults: {
        ...current.typingMatchResults,
        [sentenceId]: typingResult,
      },
      updatedAt: Date.now(),
    },
  };
}

/**
 * Records a Task 3 Smart Dictation score strictly into `dictationResults` ONLY.
 */
export function recordDictationResult(
  buckets: LessonScoreBuckets,
  lessonKey: string,
  sentenceId: string,
  score: number
): LessonScoreBuckets {
  const current = getOrCreateBucket(buckets, lessonKey);
  const normalized = Math.min(100, Math.max(0, Math.round(score)));
  return {
    ...buckets,
    [lessonKey]: {
      ...current,
      dictationResults: {
        ...current.dictationResults,
        [sentenceId]: normalized,
      },
      updatedAt: Date.now(),
    },
  };
}

export function recordQuizResult(
  buckets: LessonScoreBuckets,
  lessonKey: string,
  correctCount: number,
  total: number
): LessonScoreBuckets {
  const current = getOrCreateBucket(buckets, lessonKey);
  const safeTotal = Math.max(0, total);
  const safeCorrect = Math.max(0, Math.min(correctCount, safeTotal));
  const percent = safeTotal > 0 ? Math.round((safeCorrect / safeTotal) * 100) : 0;
  return {
    ...buckets,
    [lessonKey]: {
      ...current,
      quizStats: {
        correct: safeCorrect,
        total: safeTotal,
        score: percent,
      },
      updatedAt: Date.now(),
    },
  };
}

export function recordWordHuntResult(
  buckets: LessonScoreBuckets,
  lessonKey: string,
  completed: boolean
): LessonScoreBuckets {
  const current = getOrCreateBucket(buckets, lessonKey);
  return {
    ...buckets,
    [lessonKey]: {
      ...current,
      wordHuntCompleted: completed,
      updatedAt: Date.now(),
    },
  };
}

function averageScore(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

/**
 * Computes completely separated Voice Score, Typing Match, and Dictation Score for a single lesson bucket.
 */
export function computeLessonPracticeStats(
  bucket: LessonScoreBucket,
  defaultQuizTotal = 0
): PracticeStats {
  const voiceScores = Object.values(bucket.voiceResults).map((r) => r.accuracyScore || 0);
  const typingScores = Object.values(bucket.typingMatchResults).map((r) => r.accuracyScore || 0);
  const dictationScores = Object.values(bucket.dictationResults).map((s) => s || 0);

  const voiceCount = voiceScores.length;
  const voiceScore = averageScore(voiceScores);

  const typingMatchCount = typingScores.length;
  const typingMatchScore = averageScore(typingScores);

  const dictationCount = dictationScores.length;
  const dictationScore = averageScore(dictationScores);

  return {
    voiceCount,
    voiceScore,
    typingMatchCount,
    typingMatchScore,
    dictationCount,
    dictationScore,
    // Backward-compatible aliases strictly tracking Voice Score (Mic only)
    shadowingCount: voiceCount,
    shadowingAvgScore: voiceScore,
    quizScore: bucket.quizStats.score,
    quizCorrectCount: bucket.quizStats.correct,
    quizTotal: bucket.quizStats.total || defaultQuizTotal,
    wordHuntCompleted: bucket.wordHuntCompleted,
  };
}
