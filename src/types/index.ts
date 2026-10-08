export type DifficultyTier = 'easy' | 'medium' | 'hard';
export type LessonFormat = 'text' | 'conversation';

export type NativeAccent = 'all' | 'en-US' | 'en-GB' | 'en-AU' | 'en-CA' | 'other';
export type VoiceGender = 'all' | 'female' | 'male';
export type VoiceAge = 'all' | 'child' | 'adult' | 'senior';

export interface VoiceSettings {
  voiceIndex: number;
  rate: number; // 0.75, 1.0, 1.25
  pitch: number;
  accent: NativeAccent;
  gender: VoiceGender;
  age: VoiceAge;
}

export interface AnalyzedSentence {
  id: string;
  originalText: string;
  cleanText: string;
  words: string[];
  wordCount: number;
  charCount: number;
  tier: DifficultyTier;
  speaker?: string; // Speaker name for conversation mode (e.g., "Alex", "Sarah", "Ms Mèo")
  dialogueText?: string; // Clean speech content without the speaker prefix
}

export interface WordComparison {
  targetWord: string;
  spokenWord?: string;
  status: 'correct' | 'mispronounced' | 'omitted';
  detailNote?: string;
}

export interface ShadowingResult {
  sentenceId: string;
  studentTranscript: string;
  accuracyScore: number;
  ratingLabel: string;
  catComment: string;
  wordComparisons: WordComparison[];
  timestamp: number;
}

export interface WordRecognitionItem {
  id: string;
  word: string;
  isTarget: boolean; // true if from text, false if distractor
  definition?: string;
  selected?: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface DictationSentenceState {
  sentenceId: string;
  userInput: string;
  isEvaluated: boolean;
  score: number;
  wordResults: {
    expected: string;
    actual: string;
    isCorrect: boolean;
    hint: string;
  }[];
}

export interface ChatMessage {
  id: string;
  sender: 'student' | 'ms_meo';
  text: string;
  cleanAudioText: string; // Speaker tag stripped version
  timestamp: number;
}

export type BadgeCategory = 'starter' | 'speaking' | 'reading' | 'listening' | 'mastery' | 'streak' | 'communication' | 'collection' | 'challenge' | 'special';

export interface BadgeDefinition {
  id: string;
  title: string;
  englishTitle: string;
  vietnameseTitle: string;
  catThemeName: string;
  icon: string;
  badgeColor: string; // Tailwind gradient classes
  borderGlow: string;
  category: BadgeCategory;
  description: string;
  requirementHint: string;
  catPraise: string;
}

export type AssignedTaskType = 'listening' | 'shadowing' | 'words' | 'quiz' | 'dictation' | 'chat' | 'all';

export interface UnlockedBadge {
  badgeId: string;
  unlockedAt: string; // ISO date string
}

export interface Assignment {
  id: string;
  title: string;
  rawText: string;
  selectedTier: string;
  lessonFormat?: LessonFormat;
  className?: string;
  teacherNotes?: string;
  dueDate?: string;
  createdAt: string;
  shareUrl?: string;
  submissionCount?: number;
  assignedTask?: AssignedTaskType;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentName: string;
  studentClass: string;
  taskType?: AssignedTaskType;
  listeningCompleted?: boolean;
  listeningDurationSeconds?: number;
  shadowingCount: number;
  shadowingAvgScore: number;
  quizScore: number;
  quizCorrectCount: number;
  quizTotal: number;
  wordHuntCompleted: boolean;
  dictationScore: number;
  studentNote?: string;
  submittedAt: string;
}

