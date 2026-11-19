import { AssignedTaskType, DifficultyTier } from '../types';
import {
  analyzeAllSentences,
  filterSentencesWithPreview,
  SentenceCutPreviewResult,
  SentenceSelectionMode,
  splitIntoSentences,
} from './textParser';

const VALID_ASSIGNED_TASKS: ReadonlySet<AssignedTaskType> = new Set([
  'listening',
  'shadowing',
  'words',
  'quiz',
  'dictation',
  'chat',
  'all',
]);

/**
 * Resolves the default task type when opening the Assign Lesson modal:
 * - If inside Practice Lab, defaults to the active practice station so teachers
 *   assign the exact task they are previewing/teaching.
 * - If on Home or Lesson Creator, defaults to 'all' (Full Lesson).
 */
export function resolveDefaultAssignedTask(context: {
  currentView: 'home' | 'creator' | 'practice';
  activeTab?: 'listening' | 'shadowing' | 'words' | 'quiz' | 'dictation' | 'chatbot';
}): AssignedTaskType {
  if (context.currentView === 'practice' && context.activeTab) {
    if (context.activeTab === 'chatbot') return 'chat';
    return context.activeTab;
  }
  return 'all';
}

/**
 * Resolves which task a student should see from URL (?task=) and saved Assignment record.
 * Falls back to 'all' (Full Lesson) instead of forcing 'listening'.
 */
export function resolveStudentAssignmentTask(
  urlTaskParam?: string | null,
  assignmentAssignedTask?: string | null
): AssignedTaskType {
  if (urlTaskParam && VALID_ASSIGNED_TASKS.has(urlTaskParam as AssignedTaskType)) {
    return urlTaskParam as AssignedTaskType;
  }
  if (
    assignmentAssignedTask &&
    VALID_ASSIGNED_TASKS.has(assignmentAssignedTask as AssignedTaskType)
  ) {
    return assignmentAssignedTask as AssignedTaskType;
  }
  return 'all';
}

/**
 * Builds canonical assignment share link.
 * For Full Lesson ('all'), omits ?task= so students receive the full lesson experience.
 */
export function buildAssignmentShareUrl(
  baseOriginPath: string,
  assignmentId: string,
  taskType?: AssignedTaskType
): string {
  const url = new URL(baseOriginPath);
  url.searchParams.set('assignment', assignmentId);
  if (taskType && taskType !== 'all') {
    url.searchParams.set('task', taskType);
  } else {
    url.searchParams.delete('task');
  }
  return url.toString();
}

/**
 * Prepares the assignment text and sentence keep/drop preview.
 * By default ('all' sentences, no tier cut), preserves rawText 100% intact (Full Lesson).
 */
export function prepareAssignmentTextWithPreview(
  rawText: string,
  mode: SentenceSelectionMode = 'all',
  from?: number,
  to?: number,
  cutByTier: DifficultyTier | null = null
): {
  assignedText: string;
  preview: SentenceCutPreviewResult;
} {
  const rawSentences = splitIntoSentences(rawText);
  const analyzed = analyzeAllSentences(rawSentences);
  const preview = filterSentencesWithPreview(analyzed, {
    mode,
    from,
    to,
    cutByTier,
  });

  if (mode === 'all' && !cutByTier) {
    return {
      assignedText: rawText.trim(),
      preview,
    };
  }

  const assignedText =
    preview.keptSentences.length > 0
      ? preview.keptSentences.map((s) => s.originalText).join('\n\n')
      : rawText.trim();

  return {
    assignedText,
    preview,
  };
}
