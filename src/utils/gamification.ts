import {
  AssignmentSubmission,
  GamificationState,
  LeaderboardEntry,
  PracticeStats,
} from '../types';
import { normalizeSubmissionMetrics } from './dashboardMetrics';

export const STORAGE_KEY_GAMIFICATION = 'ms_meo_gamification';

export type GamificationActivity =
  | 'listening'
  | 'shadowing'
  | 'words'
  | 'quiz'
  | 'dictation'
  | 'chat';

export const XP_REWARDS: Record<GamificationActivity, number> = {
  listening: 35,
  shadowing: 20,
  words: 25,
  quiz: 30,
  dictation: 25,
  chat: 15,
};

export function formatLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysBetweenDateKeys(prevDateKey: string, currentDateKey: string): number {
  if (!prevDateKey || !currentDateKey) return 999;
  const [py, pm, pd] = prevDateKey.split('-').map(Number);
  const [cy, cm, cd] = currentDateKey.split('-').map(Number);
  if (!py || !pm || !pd || !cy || !cm || !cd) return 999;
  const prevUtc = Date.UTC(py, pm - 1, pd);
  const currUtc = Date.UTC(cy, cm - 1, cd);
  return Math.round((currUtc - prevUtc) / 86400000);
}

export function createInitialGamificationState(): GamificationState {
  return {
    totalXp: 0,
    currentStreakDays: 0,
    longestStreakDays: 0,
    lastStudyDate: '',
    studyDates: [],
    activityXpBreakdown: {
      listening: 0,
      shadowing: 0,
      words: 0,
      quiz: 0,
      dictation: 0,
      chat: 0,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function loadGamificationState(): GamificationState {
  if (typeof window === 'undefined') return createInitialGamificationState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GAMIFICATION);
    if (!raw) return createInitialGamificationState();
    const parsed = JSON.parse(raw) as Partial<GamificationState>;
    const base = createInitialGamificationState();
    return {
      ...base,
      ...parsed,
      activityXpBreakdown: {
        ...base.activityXpBreakdown,
        ...(parsed.activityXpBreakdown || {}),
      },
      studyDates: Array.isArray(parsed.studyDates) ? parsed.studyDates : [],
    };
  } catch {
    return createInitialGamificationState();
  }
}

export function saveGamificationState(state: GamificationState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_GAMIFICATION, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save gamification state:', err);
  }
}

/**
 * Pure update function for XP & daily streak.
 * - Grants XP >= 0.
 * - Updates streak by +1 ONLY when studying on a consecutive new calendar day; resets to 1 if skipped >= 2 days.
 */
export function applyActivityXp(
  state: GamificationState,
  activity: GamificationActivity,
  xpDelta?: number,
  date: Date = new Date()
): GamificationState {
  const earned = Math.max(0, Math.round(xpDelta ?? XP_REWARDS[activity] ?? 10));
  const todayKey = formatLocalDateKey(date);

  let nextStreak = state.currentStreakDays;
  if (!state.lastStudyDate) {
    nextStreak = 1;
  } else {
    const diff = daysBetweenDateKeys(state.lastStudyDate, todayKey);
    if (diff === 0) {
      nextStreak = Math.max(1, state.currentStreakDays);
    } else if (diff === 1) {
      nextStreak = state.currentStreakDays + 1;
    } else if (diff > 1) {
      nextStreak = 1;
    }
  }

  const longestStreakDays = Math.max(state.longestStreakDays, nextStreak);
  const studyDates = state.studyDates.includes(todayKey)
    ? state.studyDates
    : [...state.studyDates, todayKey].slice(-60);

  const nextState: GamificationState = {
    totalXp: state.totalXp + earned,
    currentStreakDays: nextStreak,
    longestStreakDays,
    lastStudyDate: todayKey,
    studyDates,
    activityXpBreakdown: {
      ...state.activityXpBreakdown,
      [activity]: (state.activityXpBreakdown[activity] || 0) + earned,
    },
    updatedAt: date.toISOString(),
  };

  return nextState;
}

export function awardXp(
  activity: GamificationActivity,
  xpDelta?: number
): GamificationState {
  const current = loadGamificationState();
  const next = applyActivityXp(current, activity, xpDelta);
  saveGamificationState(next);
  return next;
}

/**
 * Calculates deterministic XP directly from a student submission's verified metrics.
 * Guarantees zero fake inflated points and keeps 0/4 Quiz = 0 XP for Quiz.
 */
export function computeSubmissionXp(sub: AssignmentSubmission): number {
  const norm = normalizeSubmissionMetrics(sub);
  let xp = 0;
  if (norm.listeningCompleted) xp += 40;
  if (norm.voiceCount > 0) {
    xp += norm.voiceCount * 12 + Math.round(norm.voiceScore * 0.4);
  }
  if (norm.typingMatchCount > 0) {
    xp += norm.typingMatchCount * 8 + Math.round(norm.typingMatchScore * 0.25);
  }
  if (norm.dictationCount > 0 || norm.dictationScore > 0) {
    xp += Math.max(1, norm.dictationCount) * 10 + Math.round(norm.dictationScore * 0.3);
  }
  if (norm.quizTotal > 0 && norm.quizCorrectCount > 0) {
    xp += norm.quizCorrectCount * 15 + Math.round(norm.quizScore * 0.3);
  }
  if (norm.wordHuntCompleted) {
    xp += 30;
  }
  return xp;
}

/**
 * Computes real-time local practice XP from current PracticeStats + persisted gamification XP.
 */
export function computeEffectiveLocalXp(
  gamification: GamificationState,
  stats?: PracticeStats
): number {
  if (!stats) return gamification.totalXp;
  const statsSnapshotXp =
    stats.voiceCount * 12 +
    stats.typingMatchCount * 8 +
    stats.dictationCount * 10 +
    (stats.quizCorrectCount > 0 ? stats.quizCorrectCount * 15 : 0) +
    (stats.wordHuntCompleted ? 30 : 0);
  return Math.max(gamification.totalXp, statsSnapshotXp);
}

/**
 * Builds a real leaderboard strictly from recorded submissions (optionally merged with local session entry).
 * Zero mock or hardcoded students!
 */
export function computeLeaderboard(
  submissions: AssignmentSubmission[],
  localStudent?: {
    studentName: string;
    studentClass?: string;
    xp: number;
    avgAccuracy: number;
    completedTasks: number;
    streakDays: number;
  }
): LeaderboardEntry[] {
  const byStudent = new Map<string, LeaderboardEntry>();

  for (const sub of submissions) {
    const norm = normalizeSubmissionMetrics(sub);
    const key = `${sub.studentName.trim().toLowerCase()}::${(sub.studentClass || '').trim().toLowerCase()}`;
    const subXp = computeSubmissionXp(sub);

    const accScores: number[] = [];
    if (norm.voiceCount > 0) accScores.push(norm.voiceScore);
    if (norm.typingMatchCount > 0) accScores.push(norm.typingMatchScore);
    if (norm.dictationCount > 0 || norm.dictationScore > 0) accScores.push(norm.dictationScore);
    if (norm.quizTotal > 0) accScores.push(norm.quizScore);

    const avgAccuracy =
      accScores.length > 0
        ? Math.round(accScores.reduce((a, b) => a + b, 0) / accScores.length)
        : 0;

    let completedTasks = 0;
    if (norm.listeningCompleted) completedTasks++;
    if (norm.voiceCount > 0) completedTasks++;
    if (norm.typingMatchCount > 0) completedTasks++;
    if (norm.dictationCount > 0 || norm.dictationScore > 0) completedTasks++;
    if (norm.quizTotal > 0) completedTasks++;
    if (norm.wordHuntCompleted) completedTasks++;

    const existing = byStudent.get(key);
    if (!existing) {
      byStudent.set(key, {
        id: sub.id,
        studentName: sub.studentName.trim(),
        studentClass: (sub.studentClass || '').trim(),
        xp: subXp,
        avgAccuracy,
        completedTasks,
        streakDays: 1,
        submittedAt: sub.submittedAt,
      });
    } else {
      const combinedCount = existing.completedTasks + completedTasks;
      const weightedAccuracy =
        combinedCount > 0
          ? Math.round(
              (existing.avgAccuracy * existing.completedTasks + avgAccuracy * completedTasks) /
                combinedCount
            )
          : Math.max(existing.avgAccuracy, avgAccuracy);

      byStudent.set(key, {
        ...existing,
        xp: existing.xp + subXp,
        avgAccuracy: weightedAccuracy,
        completedTasks: combinedCount,
        streakDays: existing.streakDays + 1,
        submittedAt:
          new Date(sub.submittedAt).getTime() > new Date(existing.submittedAt || 0).getTime()
            ? sub.submittedAt
            : existing.submittedAt,
      });
    }
  }

  if (localStudent && localStudent.xp > 0) {
    const localKey = `__current_local_student__`;
    byStudent.set(localKey, {
      id: localKey,
      studentName: localStudent.studentName,
      studentClass: localStudent.studentClass || '',
      xp: localStudent.xp,
      avgAccuracy: localStudent.avgAccuracy,
      completedTasks: localStudent.completedTasks,
      streakDays: Math.max(1, localStudent.streakDays),
      isCurrentUser: true,
    });
  }

  return Array.from(byStudent.values()).sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp;
    if (b.avgAccuracy !== a.avgAccuracy) return b.avgAccuracy - a.avgAccuracy;
    return b.completedTasks - a.completedTasks;
  });
}
