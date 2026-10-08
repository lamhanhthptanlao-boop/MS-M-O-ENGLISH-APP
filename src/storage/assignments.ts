import { Assignment, AssignmentSubmission } from '../types';

const STORAGE_KEY_ASSIGNMENTS = 'ms_meo_assigned_lessons';
const STORAGE_KEY_SUBMISSIONS = 'ms_meo_assignment_submissions';

export async function createAssignment(payload: {
  title: string;
  rawText: string;
  selectedTier: string;
  lessonFormat?: 'text' | 'conversation';
  className?: string;
  teacherNotes?: string;
  dueDate?: string;
  assignedTask?: 'listening' | 'shadowing' | 'words' | 'quiz' | 'dictation' | 'chat' | 'all';
}): Promise<Assignment> {
  const fallbackId = `assign_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const localObj: Assignment = {
    id: fallbackId,
    title: payload.title.trim() || 'Bài tập tiếng Anh Ms Mèo',
    rawText: payload.rawText.trim(),
    selectedTier: payload.selectedTier || 'easy',
    lessonFormat: payload.lessonFormat || 'text',
    className: (payload.className || '').trim(),
    teacherNotes: (payload.teacherNotes || '').trim(),
    dueDate: (payload.dueDate || '').trim(),
    assignedTask: payload.assignedTask || 'listening',
    createdAt: new Date().toISOString(),
    submissionCount: 0,
  };

  try {
    const res = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      saveAssignmentToLocal(data);
      return data;
    }
  } catch (err) {
    console.warn('API error creating assignment, falling back to local storage:', err);
  }

  saveAssignmentToLocal(localObj);
  return localObj;
}

export async function fetchAssignments(): Promise<Assignment[]> {
  try {
    const res = await fetch('/api/assignments');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(data));
        return data;
      }
    }
  } catch (err) {
    console.warn('API error fetching assignments, using local storage:', err);
  }

  return getLocalAssignments();
}

export async function fetchAssignmentById(id: string): Promise<Assignment | null> {
  try {
    const res = await fetch(`/api/assignments/${id}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('API error fetching assignment by ID, using local fallback:', err);
  }

  const localList = getLocalAssignments();
  return localList.find((a) => a.id === id) || null;
}

export async function deleteAssignment(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/assignments/${id}`, { method: 'DELETE' });
    if (res.ok) {
      removeAssignmentFromLocal(id);
      return true;
    }
  } catch (err) {
    console.warn('API error deleting assignment:', err);
  }

  removeAssignmentFromLocal(id);
  return true;
}

export async function submitAssignmentResult(
  assignmentId: string,
  payload: {
    studentName: string;
    studentClass?: string;
    taskType?: 'listening' | 'shadowing' | 'words' | 'quiz' | 'dictation' | 'chat' | 'all';
    listeningCompleted?: boolean;
    listeningDurationSeconds?: number;
    shadowingCount?: number;
    shadowingAvgScore?: number;
    quizScore?: number;
    quizCorrectCount?: number;
    quizTotal?: number;
    wordHuntCompleted?: boolean;
    dictationScore?: number;
    studentNote?: string;
  }
): Promise<AssignmentSubmission> {
  const localSubmission: AssignmentSubmission = {
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    assignmentId,
    studentName: payload.studentName.trim(),
    studentClass: (payload.studentClass || '').trim(),
    taskType: payload.taskType || 'listening',
    listeningCompleted: payload.listeningCompleted ?? false,
    listeningDurationSeconds: payload.listeningDurationSeconds ?? 0,
    shadowingCount: payload.shadowingCount ?? 0,
    shadowingAvgScore: payload.shadowingAvgScore ?? 0,
    quizScore: payload.quizScore ?? 0,
    quizCorrectCount: payload.quizCorrectCount ?? 0,
    quizTotal: payload.quizTotal ?? 0,
    wordHuntCompleted: payload.wordHuntCompleted ?? false,
    dictationScore: payload.dictationScore ?? 0,
    studentNote: (payload.studentNote || '').trim(),
    submittedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch(`/api/assignments/${assignmentId}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      saveSubmissionToLocal(data);
      return data;
    }
  } catch (err) {
    console.warn('API error submitting assignment, falling back to local storage:', err);
  }

  saveSubmissionToLocal(localSubmission);
  return localSubmission;
}

export async function fetchSubmissions(assignmentId: string): Promise<AssignmentSubmission[]> {
  try {
    const res = await fetch(`/api/assignments/${assignmentId}/submissions`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (err) {
    console.warn('API error fetching submissions:', err);
  }

  return getLocalSubmissions(assignmentId);
}

// Local storage helpers
function getLocalAssignments(): Assignment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAssignmentToLocal(item: Assignment) {
  if (typeof window === 'undefined') return;
  try {
    const list = getLocalAssignments();
    const updated = [item, ...list.filter((a) => a.id !== item.id)];
    localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save assignment to localStorage:', err);
  }
}

function removeAssignmentFromLocal(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const list = getLocalAssignments();
    const updated = list.filter((a) => a.id !== id);
    localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to remove assignment from localStorage:', err);
  }
}

function getLocalSubmissions(assignmentId?: string): AssignmentSubmission[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
    const list: AssignmentSubmission[] = raw ? JSON.parse(raw) : [];
    if (assignmentId) {
      return list.filter((s) => s.assignmentId === assignmentId);
    }
    return list;
  } catch {
    return [];
  }
}

function saveSubmissionToLocal(sub: AssignmentSubmission) {
  if (typeof window === 'undefined') return;
  try {
    const list = getLocalSubmissions();
    const updated = [sub, ...list.filter((s) => s.id !== sub.id)];
    localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save submission to localStorage:', err);
  }
}
