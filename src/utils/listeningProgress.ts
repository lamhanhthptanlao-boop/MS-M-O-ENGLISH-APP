export const LISTENING_COMPLETION_THRESHOLD = 0.8;

export interface ListeningProgressState {
  heardRatioById: Record<string, number>;
  completedIds: string[];
}

export interface ListeningCompletionSummary {
  completedCount: number;
  totalCount: number;
  percent: number;
  isLessonCompleted: boolean;
}

export function createListeningProgressState(): ListeningProgressState {
  return {
    heardRatioById: {},
    completedIds: [],
  };
}

export function isSentenceListenedEnough(
  ratio: number,
  threshold: number = LISTENING_COMPLETION_THRESHOLD
): boolean {
  if (!Number.isFinite(ratio)) return false;
  return ratio >= threshold;
}

/**
 * Updates per-sentence real listened ratio monotonically.
 * Never marks a sentence complete on Play click (ratio = 0 or < 0.80);
 * requires ratio >= 0.80 (80% actual playback).
 */
export function updateSentenceListeningRatio(
  state: ListeningProgressState,
  sentenceId: string,
  rawRatio: number,
  threshold: number = LISTENING_COMPLETION_THRESHOLD
): ListeningProgressState {
  if (!sentenceId) return state;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(rawRatio) ? rawRatio : 0));
  const prevRatio = state.heardRatioById[sentenceId] ?? 0;
  const nextRatio = Math.max(prevRatio, clamped);

  const alreadyCompleted = state.completedIds.includes(sentenceId);
  const qualifiesNow = isSentenceListenedEnough(nextRatio, threshold);

  if (nextRatio === prevRatio && alreadyCompleted === qualifiesNow) {
    return state;
  }

  const nextCompletedIds = qualifiesNow
    ? alreadyCompleted
      ? state.completedIds
      : [...state.completedIds, sentenceId]
    : state.completedIds;

  return {
    heardRatioById: {
      ...state.heardRatioById,
      [sentenceId]: nextRatio,
    },
    completedIds: nextCompletedIds,
  };
}

/**
 * Compute overall listening progress across a target list of sentence IDs.
 * Only sentences that have reached >= 80% real playback count toward completion.
 */
export function computeListeningCompletion(
  state: ListeningProgressState,
  targetSentenceIds: string[],
  threshold: number = LISTENING_COMPLETION_THRESHOLD
): ListeningCompletionSummary {
  const uniqueTargetIds = Array.from(new Set(targetSentenceIds.filter(Boolean)));
  const totalCount = uniqueTargetIds.length;
  if (totalCount === 0) {
    return {
      completedCount: 0,
      totalCount: 0,
      percent: 0,
      isLessonCompleted: false,
    };
  }

  const completedCount = uniqueTargetIds.filter((id) =>
    isSentenceListenedEnough(state.heardRatioById[id] ?? 0, threshold)
  ).length;

  const percent = Math.round((completedCount / totalCount) * 100);
  return {
    completedCount,
    totalCount,
    percent,
    isLessonCompleted: percent >= 80 && completedCount > 0,
  };
}
