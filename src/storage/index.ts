// Local Storage Adapter for Ms Mèo's Practice Web (Replaces Firebase)
export interface SavedLessonItem {
  id: string;
  userId?: string;
  title: string;
  rawText: string;
  selectedTier: string;
  lessonFormat?: 'text' | 'conversation';
  sentenceCount: number;
  wordCount: number;
  createdAt: string;
}

export interface SavedProgressData {
  lastText?: string;
  selectedTier?: string;
  lessonFormat?: 'text' | 'conversation';
  shadowingCount?: number;
  quizScore?: number;
  unlockedBadges?: string[];
  resultsCache?: any;
}

const STORAGE_KEY_LESSONS = 'ms_meo_saved_lessons';
const STORAGE_KEY_PROGRESS = 'ms_meo_student_progress';

export function saveCustomLesson(
  _userId: string,
  lesson: {
    id?: string;
    title: string;
    rawText: string;
    selectedTier: string;
    lessonFormat?: 'text' | 'conversation';
    sentenceCount: number;
    wordCount: number;
  }
): SavedLessonItem {
  const lessonId = lesson.id || `lesson_${Date.now()}`;
  const data: SavedLessonItem = {
    id: lessonId,
    userId: 'local_user',
    title: lesson.title.trim() || 'Bài luyện tập tiếng Anh',
    rawText: lesson.rawText,
    selectedTier: lesson.selectedTier,
    lessonFormat: lesson.lessonFormat || 'text',
    sentenceCount: lesson.sentenceCount,
    wordCount: lesson.wordCount,
    createdAt: new Date().toISOString(),
  };

  try {
    const existing = getSavedLessons();
    const updated = [data, ...existing.filter((item) => item.id !== lessonId)];
    localStorage.setItem(STORAGE_KEY_LESSONS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save lesson to localStorage:', err);
  }

  return data;
}

export function getSavedLessons(_userId?: string): SavedLessonItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LESSONS);
    if (!raw) return [];
    return JSON.parse(raw) as SavedLessonItem[];
  } catch (err) {
    console.error('Failed to read lessons from localStorage:', err);
    return [];
  }
}

export function deleteSavedLesson(_userId: string, lessonId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getSavedLessons();
    const updated = existing.filter((item) => item.id !== lessonId);
    localStorage.setItem(STORAGE_KEY_LESSONS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete lesson from localStorage:', err);
  }
}

export function saveStudentProgress(
  _userId: string,
  progress: SavedProgressData
): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadStudentProgress() || {};
    const updated = {
      ...existing,
      ...progress,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save student progress to localStorage:', err);
  }
}

export function loadStudentProgress(_userId?: string): SavedProgressData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (!raw) return null;
    return JSON.parse(raw) as SavedProgressData;
  } catch (err) {
    console.error('Failed to load student progress from localStorage:', err);
    return null;
  }
}
