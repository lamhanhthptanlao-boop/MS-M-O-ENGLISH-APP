import { AppBackupPayload, Assignment, AssignmentSubmission, GamificationState } from '../types';

const KEYS = {
  savedLessons: 'ms_meo_saved_lessons',
  studentProgress: 'ms_meo_student_progress',
  unlockedBadges: 'ms_meo_unlocked_badges',
  activityTracker: 'ms_meo_activity_tracker',
  gamification: 'ms_meo_gamification',
  assignments: 'ms_meo_assigned_lessons',
  submissions: 'ms_meo_assignment_submissions',
} as const;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function resolveStorage(customStorage?: StorageLike): StorageLike | null {
  if (customStorage) return customStorage;
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return null;
}

function safeReadJson<T>(key: string, fallback: T, customStorage?: StorageLike): T {
  const store = resolveStorage(customStorage);
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function buildAppBackupPayload(
  extraAssignments?: Assignment[],
  extraSubmissions?: AssignmentSubmission[],
  customStorage?: StorageLike
): AppBackupPayload {
  const localAssignments = safeReadJson<Assignment[]>(KEYS.assignments, [], customStorage);
  const localSubmissions = safeReadJson<AssignmentSubmission[]>(KEYS.submissions, [], customStorage);

  // Merge server-loaded assignments/submissions with localStorage without duplicating IDs
  const assignmentMap = new Map<string, Assignment>();
  for (const a of [...localAssignments, ...(extraAssignments || [])]) {
    if (a && a.id) assignmentMap.set(a.id, a);
  }

  const submissionMap = new Map<string, AssignmentSubmission>();
  for (const s of [...localSubmissions, ...(extraSubmissions || [])]) {
    if (s && s.id) submissionMap.set(s.id, s);
  }

  return {
    app: 'ms-meo-english',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      savedLessons: safeReadJson<unknown[]>(KEYS.savedLessons, [], customStorage),
      studentProgress: safeReadJson<unknown | null>(KEYS.studentProgress, null, customStorage),
      unlockedBadges: safeReadJson<unknown[]>(KEYS.unlockedBadges, [], customStorage),
      activityTracker: safeReadJson<unknown | null>(KEYS.activityTracker, null, customStorage),
      gamification: safeReadJson<GamificationState | null>(KEYS.gamification, null, customStorage),
      assignments: Array.from(assignmentMap.values()),
      submissions: Array.from(submissionMap.values()),
    },
  };
}

export function parseAndValidateBackupJson(jsonText: string): AppBackupPayload {
  if (!jsonText || !jsonText.trim()) {
    throw new Error('File JSON trống.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('File không phải định dạng JSON hợp lệ.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Cấu trúc dữ liệu JSON không hợp lệ.');
  }

  const candidate = parsed as Partial<AppBackupPayload>;
  if (candidate.app !== 'ms-meo-english' || !candidate.data || typeof candidate.data !== 'object') {
    throw new Error('File JSON này không phải bản sao lưu của Ms Mèo English.');
  }

  return {
    app: 'ms-meo-english',
    version: Number(candidate.version) || 1,
    exportedAt: typeof candidate.exportedAt === 'string' ? candidate.exportedAt : new Date().toISOString(),
    data: {
      savedLessons: Array.isArray(candidate.data.savedLessons) ? candidate.data.savedLessons : [],
      studentProgress: candidate.data.studentProgress ?? null,
      unlockedBadges: Array.isArray(candidate.data.unlockedBadges) ? candidate.data.unlockedBadges : [],
      activityTracker: candidate.data.activityTracker ?? null,
      gamification: candidate.data.gamification ?? null,
      assignments: Array.isArray(candidate.data.assignments) ? candidate.data.assignments : [],
      submissions: Array.isArray(candidate.data.submissions) ? candidate.data.submissions : [],
    },
  };
}

export interface BackupApplySummary {
  savedLessonsCount: number;
  assignmentsCount: number;
  submissionsCount: number;
  badgesCount: number;
}

export function applyAppBackupPayload(
  payload: AppBackupPayload,
  customStorage?: StorageLike
): BackupApplySummary {
  const store = resolveStorage(customStorage);
  if (store) {
    store.setItem(KEYS.savedLessons, JSON.stringify(payload.data.savedLessons));
    if (payload.data.studentProgress !== null) {
      store.setItem(KEYS.studentProgress, JSON.stringify(payload.data.studentProgress));
    } else {
      store.removeItem(KEYS.studentProgress);
    }
    store.setItem(KEYS.unlockedBadges, JSON.stringify(payload.data.unlockedBadges));
    if (payload.data.activityTracker !== null) {
      store.setItem(KEYS.activityTracker, JSON.stringify(payload.data.activityTracker));
    }
    if (payload.data.gamification !== null) {
      store.setItem(KEYS.gamification, JSON.stringify(payload.data.gamification));
    }
    store.setItem(KEYS.assignments, JSON.stringify(payload.data.assignments));
    store.setItem(KEYS.submissions, JSON.stringify(payload.data.submissions));
  }

  return {
    savedLessonsCount: payload.data.savedLessons.length,
    assignmentsCount: payload.data.assignments.length,
    submissionsCount: payload.data.submissions.length,
    badgesCount: payload.data.unlockedBadges.length,
  };
}

export function downloadBackupJsonFile(payload: AppBackupPayload): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const dateTag = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ms-meo-backup-${dateTag}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
