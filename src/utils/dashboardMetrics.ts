import { AssignmentSubmission } from '../types';

export type DashboardRatingTier = 'excellent' | 'good' | 'needs_practice' | 'not_passed';

export interface SubmissionEvaluation {
  tier: DashboardRatingTier;
  label: string;
  badgeClass: string;
}

export interface NormalizedSubmissionMetrics {
  voiceScore: number;
  voiceCount: number;
  typingMatchScore: number;
  typingMatchCount: number;
  dictationScore: number;
  dictationCount: number;
  quizScore: number;
  quizCorrectCount: number;
  quizTotal: number;
  listeningCompleted: boolean;
  wordHuntCompleted: boolean;
}

export interface DashboardRowEntry {
  submission: AssignmentSubmission;
  metrics: NormalizedSubmissionMetrics;
  evaluation: SubmissionEvaluation;
}

export interface DashboardSummary {
  totalSubmissions: number;
  quizParticipantCount: number;
  voiceParticipantCount: number;
  typingParticipantCount: number;
  dictationParticipantCount: number;
  avgQuizScore: number;
  avgVoiceScore: number;
  avgTypingMatchScore: number;
  avgDictationScore: number;
  listeningCompletedCount: number;
  rows: DashboardRowEntry[];
}

export function normalizeSubmissionMetrics(sub: AssignmentSubmission): NormalizedSubmissionMetrics {
  const voiceScore = Math.round(Number(sub.voiceAvgScore ?? sub.shadowingAvgScore ?? 0) || 0);
  const voiceCount = Number(sub.voiceCount ?? sub.shadowingCount ?? 0) || 0;
  const typingMatchScore = Math.round(Number(sub.typingMatchScore ?? 0) || 0);
  const typingMatchCount = Number(sub.typingMatchCount ?? 0) || 0;
  const dictationScore = Math.round(Number(sub.dictationScore ?? 0) || 0);
  const dictationCount = Number(sub.dictationCount ?? 0) || 0;
  const quizCorrectCount = Number(sub.quizCorrectCount ?? 0) || 0;
  const quizTotal = Number(sub.quizTotal ?? 0) || 0;

  // Derive quiz percentage canonically whenever quizTotal > 0 so 0/4 is always 0%
  const quizScore =
    quizTotal > 0
      ? Math.round((quizCorrectCount / quizTotal) * 100)
      : Math.round(Number(sub.quizScore ?? 0) || 0);

  return {
    voiceScore,
    voiceCount,
    typingMatchScore,
    typingMatchCount,
    dictationScore,
    dictationCount,
    quizScore,
    quizCorrectCount,
    quizTotal,
    listeningCompleted: Boolean(sub.listeningCompleted),
    wordHuntCompleted: Boolean(sub.wordHuntCompleted),
  };
}

/**
 * Single authoritative grading evaluator for Admin Dashboard table & CSV export.
 * STRICT RULE:
 * - Quiz 0/4 (quizTotal > 0 && quizCorrectCount === 0) MUST NEVER be rated "Khá tốt" or "Xuất sắc".
 * - Any quiz score < 50% blocks "Khá tốt" / "Xuất sắc".
 */
export function evaluateSubmissionStatus(sub: AssignmentSubmission): SubmissionEvaluation {
  const m = normalizeSubmissionMetrics(sub);

  // Hard failing guard for Quiz (especially 0/4)
  if (m.quizTotal > 0 && m.quizCorrectCount === 0) {
    return {
      tier: 'not_passed',
      label: '⚠️ Chưa đạt',
      badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300',
    };
  }

  if (m.quizTotal > 0 && m.quizScore < 50) {
    return {
      tier: 'needs_practice',
      label: '📖 Cần rèn thêm',
      badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
    };
  }

  // Collect all graded numeric task scores that the student actually attempted
  const attemptedScores: number[] = [];
  if (m.voiceCount > 0) attemptedScores.push(m.voiceScore);
  if (m.typingMatchCount > 0) attemptedScores.push(m.typingMatchScore);
  if (m.dictationCount > 0 || m.dictationScore > 0) attemptedScores.push(m.dictationScore);
  if (m.quizTotal > 0) attemptedScores.push(m.quizScore);

  const avgAttempted =
    attemptedScores.length > 0
      ? attemptedScores.reduce((acc, val) => acc + val, 0) / attemptedScores.length
      : null;

  // Dedicated listening-only task without failing quiz
  if (sub.taskType === 'listening' && m.quizTotal === 0) {
    if (m.listeningCompleted) {
      return {
        tier: 'excellent',
        label: '🌟 Xuất sắc',
        badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
      };
    }
    return {
      tier: 'needs_practice',
      label: '📖 Cần rèn thêm',
      badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
    };
  }

  if (avgAttempted !== null) {
    const hasNoFailingQuiz = m.quizTotal === 0 || m.quizScore >= 60;
    const passesExcellentQuiz = m.quizTotal === 0 || m.quizScore >= 80;
    const lowestScore = Math.min(...attemptedScores);

    if (avgAttempted >= 80 && passesExcellentQuiz && lowestScore >= 60) {
      return {
        tier: 'excellent',
        label: '🌟 Xuất sắc',
        badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
      };
    }

    if (avgAttempted >= 60 && hasNoFailingQuiz) {
      return {
        tier: 'good',
        label: '⚡ Khá tốt',
        badgeClass: 'bg-blue-100 text-blue-800 border border-blue-200',
      };
    }

    if (avgAttempted > 0) {
      return {
        tier: 'needs_practice',
        label: '📖 Cần rèn thêm',
        badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
      };
    }

    return {
      tier: 'not_passed',
      label: '⚠️ Chưa đạt',
      badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300',
    };
  }

  // Fallback for non-numeric completion (e.g. Word Detective / Listening only in Full Lesson)
  if (m.wordHuntCompleted && m.listeningCompleted) {
    return {
      tier: 'excellent',
      label: '🌟 Xuất sắc',
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    };
  }

  if (m.wordHuntCompleted || m.listeningCompleted) {
    return {
      tier: 'good',
      label: '⚡ Khá tốt',
      badgeClass: 'bg-blue-100 text-blue-800 border border-blue-200',
    };
  }

  return {
    tier: 'not_passed',
    label: '⚠️ Chưa đạt',
    badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300',
  };
}

/**
 * Computes ALL Dashboard summary KPIs and row entries from ONE single source of truth.
 */
export function computeDashboardSummary(submissions: AssignmentSubmission[]): DashboardSummary {
  const rows: DashboardRowEntry[] = submissions.map((submission) => ({
    submission,
    metrics: normalizeSubmissionMetrics(submission),
    evaluation: evaluateSubmissionStatus(submission),
  }));

  const quizRows = rows.filter((r) => r.metrics.quizTotal > 0);
  const voiceRows = rows.filter((r) => r.metrics.voiceCount > 0);
  const typingRows = rows.filter((r) => r.metrics.typingMatchCount > 0);
  const dictationRows = rows.filter((r) => r.metrics.dictationCount > 0 || r.metrics.dictationScore > 0);

  const avgQuizScore =
    quizRows.length > 0
      ? Math.round(quizRows.reduce((sum, r) => sum + r.metrics.quizScore, 0) / quizRows.length)
      : 0;

  const avgVoiceScore =
    voiceRows.length > 0
      ? Math.round(voiceRows.reduce((sum, r) => sum + r.metrics.voiceScore, 0) / voiceRows.length)
      : 0;

  const avgTypingMatchScore =
    typingRows.length > 0
      ? Math.round(typingRows.reduce((sum, r) => sum + r.metrics.typingMatchScore, 0) / typingRows.length)
      : 0;

  const avgDictationScore =
    dictationRows.length > 0
      ? Math.round(dictationRows.reduce((sum, r) => sum + r.metrics.dictationScore, 0) / dictationRows.length)
      : 0;

  const listeningCompletedCount = rows.filter((r) => r.metrics.listeningCompleted).length;

  return {
    totalSubmissions: rows.length,
    quizParticipantCount: quizRows.length,
    voiceParticipantCount: voiceRows.length,
    typingParticipantCount: typingRows.length,
    dictationParticipantCount: dictationRows.length,
    avgQuizScore,
    avgVoiceScore,
    avgTypingMatchScore,
    avgDictationScore,
    listeningCompletedCount,
    rows,
  };
}
