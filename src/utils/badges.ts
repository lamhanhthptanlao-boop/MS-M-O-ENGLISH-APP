import { BadgeDefinition, UnlockedBadge } from '../types';

export const ALL_BADGES: BadgeDefinition[] = [
  {
    id: 'first_lesson',
    title: 'First Lesson',
    englishTitle: 'First Lesson',
    vietnameseTitle: 'Bài học đầu tiên',
    catThemeName: 'Mèo Tựu Trường',
    icon: '🎓',
    badgeColor: 'from-amber-400 via-orange-400 to-amber-500',
    borderGlow: 'border-amber-300 shadow-amber-200/50',
    category: 'starter',
    description: 'Tạo hoặc bắt đầu bài luyện tập tiếng Anh đầu tiên cùng Ms Mèo.',
    requirementHint: 'Bấm nút "🚀 Generate Practice Lesson" để tạo bài học',
    catPraise: 'Meow! Chúc mừng em đã bắt đầu bài học đầu tiên! Bước đi đầu tiên luôn là bước đi quan trọng nhất!',
  },
  {
    id: 'perfect_score',
    title: 'Perfect Score',
    englishTitle: 'Perfect Score',
    vietnameseTitle: 'Điểm tuyệt đối 100%',
    catThemeName: 'Mèo Trạng Nguyên',
    icon: '🌟',
    badgeColor: 'from-yellow-400 via-amber-300 to-yellow-500',
    borderGlow: 'border-yellow-300 shadow-yellow-200/60',
    category: 'mastery',
    description: 'Đạt điểm số 100% ở bài kiểm tra đọc hiểu Quiz hoặc hoàn thành xuất sắc câu Shadowing 95%+.',
    requirementHint: 'Trả lời đúng toàn bộ câu hỏi trong Task 2: Quiz hoặc đạt 95%+ ở Shadowing',
    catPraise: 'Purr-fect! Điểm số 100% tuyệt đối! Cô Ms Mèo tự hào về sự tập trung và trí tuệ của em!',
  },
  {
    id: 'consistent_learner',
    title: 'Consistent Learner',
    englishTitle: 'Consistent Learner',
    vietnameseTitle: 'Học trò chăm chỉ',
    catThemeName: 'Mèo Siêng Năng',
    icon: '🔥',
    badgeColor: 'from-rose-500 via-pink-500 to-red-500',
    borderGlow: 'border-rose-300 shadow-rose-200/50',
    category: 'streak',
    description: 'Thực hiện tích cực ít nhất 3 hoạt động học tập khác nhau trong cùng bài học.',
    requirementHint: 'Thực hành kết hợp: Shadowing, tìm từ, làm quiz hoặc gõ chính tả',
    catPraise: 'Kiên trì rèn luyện mỗi ngày chính là chìa khóa mở cánh cửa đại học! Cố lên em nhé!',
  },
  {
    id: 'vocal_cat_star',
    title: 'Vocal Cat Star',
    englishTitle: 'Vocal Cat Star',
    vietnameseTitle: 'Mèo Vàng Phát Âm',
    catThemeName: 'Ngôi Sao Shadowing',
    icon: '🎙️',
    badgeColor: 'from-pink-500 via-rose-400 to-purple-500',
    borderGlow: 'border-pink-300 shadow-pink-200/50',
    category: 'speaking',
    description: 'Luyện đọc nhại (Shadowing) thành công từ 3 câu tiếng Anh trở lên.',
    requirementHint: 'Ghi âm và nhận điểm số cho ít nhất 3 câu trong Shadowing Studio',
    catPraise: 'Giọng đọc của em nghe vang, dứt khoát và chuẩn ngữ điệu hơn rất nhiều rồi đấy!',
  },
  {
    id: 'eagle_eyes_detective',
    title: 'Word Detective',
    englishTitle: 'Word Detective',
    vietnameseTitle: 'Thám tử Mèo tinh mắt',
    catThemeName: 'Thám Tử Mèo',
    icon: '🔍',
    badgeColor: 'from-sky-400 via-blue-500 to-indigo-500',
    borderGlow: 'border-sky-300 shadow-sky-200/50',
    category: 'reading',
    description: 'Tìm chính xác toàn bộ các từ vựng mục tiêu trong Task 1: Word Detective.',
    requirementHint: 'Chọn đúng đủ tất cả các Target Words trong bài tìm từ',
    catPraise: 'Đôi mắt tinh anh như mắt mèo trong đêm! Không một từ vựng khó nào qua mắt được em!',
  },
  {
    id: 'golden_ears_dictation',
    title: 'Golden Ears',
    englishTitle: 'Golden Ears',
    vietnameseTitle: 'Đôi tai thính của Mèo',
    catThemeName: 'Mèo Thính Tai',
    icon: '🎧',
    badgeColor: 'from-violet-500 via-purple-500 to-fuchsia-500',
    borderGlow: 'border-purple-300 shadow-purple-200/50',
    category: 'listening',
    description: 'Nghe và chép chính tả chuẩn xác từ 80% trở lên trong Smart Dictation.',
    requirementHint: 'Nghe audio và gõ đúng tối thiểu 80% từ ngữ trong một câu chính tả',
    catPraise: 'Khả năng bắt âm và cảm âm tiếng Anh của em siêu đỉnh! Đôi tai thính như mèo con!',
  },
  {
    id: 'chat_with_ms_meo',
    title: "Ms Mèo's Bestie",
    englishTitle: "Ms Mèo's Bestie",
    vietnameseTitle: 'Bạn thân Ms Mèo',
    catThemeName: 'Tâm Sự Cùng Mèo',
    icon: '💬',
    badgeColor: 'from-emerald-400 via-teal-500 to-emerald-600',
    borderGlow: 'border-emerald-300 shadow-emerald-200/50',
    category: 'communication',
    description: 'Nhắn tin hoặc gọi Live Voice Call đàm thoại trực tiếp cùng cô giáo Ms Mèo.',
    requirementHint: 'Gửi 1 câu hỏi hoặc bật cuộc gọi thoại 2 chiều trong Task 4',
    catPraise: 'Meow! Nói chuyện với em vui thật đấy! Cô trò mình sẽ cùng nhau tiến bộ mỗi ngày nhé!',
  },
  {
    id: 'lesson_collector',
    title: 'Lesson Collector',
    englishTitle: 'Lesson Collector',
    vietnameseTitle: 'Thủ thư Mèo chăm chỉ',
    catThemeName: 'Thủ Thư Mèo',
    icon: '📚',
    badgeColor: 'from-teal-400 via-cyan-500 to-blue-500',
    borderGlow: 'border-cyan-300 shadow-cyan-200/50',
    category: 'collection',
    description: 'Lưu bài học tiếng Anh yêu thích vào kho bài cá nhân để ôn tập lại.',
    requirementHint: 'Bấm nút "Lưu bài này" để cất vào kho thư viện bài học',
    catPraise: 'Một thư viện bài học ngăn nắp là vũ khí bí mật giúp em ôn tập mọi lúc mọi nơi!',
  },
  {
    id: 'tier_challenger',
    title: 'Tier Challenger',
    englishTitle: 'Tier Challenger',
    vietnameseTitle: 'Chinh phục thử thách',
    catThemeName: 'Mèo Leo Núi',
    icon: '⚡',
    badgeColor: 'from-indigo-500 via-purple-600 to-pink-500',
    borderGlow: 'border-indigo-300 shadow-indigo-200/50',
    category: 'challenge',
    description: 'Tự tin thử sức với bài học ở cấp độ Trung bình (Medium) hoặc Nâng cao (Hard).',
    requirementHint: 'Chọn phân loại độ khó Medium hoặc Hard và tạo bài luyện tập',
    catPraise: 'Dám đương đầu với những câu văn phức tạp và học thuật! Tinh thần rất dũng cảm!',
  },
  {
    id: 'grand_master',
    title: 'Grand Master',
    englishTitle: 'Grand Master',
    vietnameseTitle: 'Đại hiệp Mèo Toàn Năng',
    catThemeName: 'Mèo Quán Quân',
    icon: '👑',
    badgeColor: 'from-amber-400 via-yellow-400 to-rose-500',
    borderGlow: 'border-amber-400 shadow-amber-300/70',
    category: 'special',
    description: 'Mở khóa thành công từ 5 huy hiệu Ms Mèo trở lên.',
    requirementHint: 'Tích lũy tối thiểu 5 huy hiệu qua các hoạt động bài học',
    catPraise: 'Em đã đạt đẳng cấp Đại hiệp Mèo Toàn Năng! Chúc mừng tân quán quân tiếng Anh!',
  },
];

const STORAGE_KEY_BADGES = 'ms_meo_unlocked_badges';
const STORAGE_KEY_ACTIVITY_TRACKER = 'ms_meo_activity_tracker';

export interface ActivityTracker {
  hasGeneratedLesson: boolean;
  shadowedSentenceCount: number;
  highestShadowingScore: number;
  completedWordHunt: boolean;
  highestQuizScore: number;
  completedDictationSentenceCount: number;
  highestDictationScore: number;
  hasChattedWithMeo: boolean;
  hasSavedLesson: boolean;
  lastPracticedTier: string;
}

export function getBadgeById(id: string): BadgeDefinition | undefined {
  return ALL_BADGES.find((b) => b.id === id);
}

export function loadUnlockedBadges(): UnlockedBadge[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BADGES);
    if (!raw) return [];
    return JSON.parse(raw) as UnlockedBadge[];
  } catch (err) {
    console.error('Failed to load badges from localStorage:', err);
    return [];
  }
}

export function saveUnlockedBadges(badges: UnlockedBadge[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_BADGES, JSON.stringify(badges));
  } catch (err) {
    console.error('Failed to save badges to localStorage:', err);
  }
}

export function isBadgeUnlocked(badgeId: string, unlockedList?: UnlockedBadge[]): boolean {
  const list = unlockedList || loadUnlockedBadges();
  return list.some((b) => b.badgeId === badgeId);
}

export function loadActivityTracker(): ActivityTracker {
  const defaultTracker: ActivityTracker = {
    hasGeneratedLesson: false,
    shadowedSentenceCount: 0,
    highestShadowingScore: 0,
    completedWordHunt: false,
    highestQuizScore: 0,
    completedDictationSentenceCount: 0,
    highestDictationScore: 0,
    hasChattedWithMeo: false,
    hasSavedLesson: false,
    lastPracticedTier: 'easy',
  };

  if (typeof window === 'undefined') return defaultTracker;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVITY_TRACKER);
    if (!raw) return defaultTracker;
    return { ...defaultTracker, ...JSON.parse(raw) };
  } catch (err) {
    return defaultTracker;
  }
}

export function saveActivityTracker(tracker: ActivityTracker): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVITY_TRACKER, JSON.stringify(tracker));
  } catch (err) {
    console.error('Failed to save activity tracker:', err);
  }
}

/**
 * Checks all badge conditions against the current tracker state.
 * Returns an array of newly unlocked BadgeDefinitions.
 */
export function evaluateAllBadges(
  tracker: ActivityTracker,
  currentUnlocked: UnlockedBadge[]
): { newlyUnlocked: BadgeDefinition[]; updatedUnlocked: UnlockedBadge[] } {
  const currentUnlockedIds = new Set(currentUnlocked.map((b) => b.badgeId));
  const newlyUnlocked: BadgeDefinition[] = [];
  const updatedUnlocked: UnlockedBadge[] = [...currentUnlocked];

  const tryUnlock = (badgeId: string) => {
    if (!currentUnlockedIds.has(badgeId)) {
      const def = getBadgeById(badgeId);
      if (def) {
        newlyUnlocked.push(def);
        updatedUnlocked.push({
          badgeId,
          unlockedAt: new Date().toISOString(),
        });
        currentUnlockedIds.add(badgeId);
      }
    }
  };

  // 1. First Lesson
  if (tracker.hasGeneratedLesson) {
    tryUnlock('first_lesson');
  }

  // 2. Perfect Score: 100% on quiz OR >= 95% on shadowing OR 100% on dictation
  if (
    tracker.highestQuizScore === 100 ||
    tracker.highestShadowingScore >= 95 ||
    tracker.highestDictationScore === 100
  ) {
    tryUnlock('perfect_score');
  }

  // 3. Consistent Learner: completed >= 3 distinct activities
  let distinctActivities = 0;
  if (tracker.hasGeneratedLesson) distinctActivities += 1;
  if (tracker.shadowedSentenceCount >= 1) distinctActivities += 1;
  if (tracker.completedWordHunt) distinctActivities += 1;
  if (tracker.highestQuizScore > 0) distinctActivities += 1;
  if (tracker.completedDictationSentenceCount >= 1) distinctActivities += 1;
  if (tracker.hasChattedWithMeo) distinctActivities += 1;
  if (tracker.hasSavedLesson) distinctActivities += 1;

  if (distinctActivities >= 3) {
    tryUnlock('consistent_learner');
  }

  // 4. Vocal Cat Star: >= 3 sentences shadowed
  if (tracker.shadowedSentenceCount >= 3) {
    tryUnlock('vocal_cat_star');
  }

  // 5. Word Detective: completed word hunt
  if (tracker.completedWordHunt) {
    tryUnlock('eagle_eyes_detective');
  }

  // 6. Golden Ears: dictation score >= 80%
  if (tracker.highestDictationScore >= 80) {
    tryUnlock('golden_ears_dictation');
  }

  // 7. Chat with Ms Mèo
  if (tracker.hasChattedWithMeo) {
    tryUnlock('chat_with_ms_meo');
  }

  // 8. Lesson Collector
  if (tracker.hasSavedLesson) {
    tryUnlock('lesson_collector');
  }

  // 9. Tier Challenger
  if (tracker.lastPracticedTier === 'medium' || tracker.lastPracticedTier === 'hard') {
    tryUnlock('tier_challenger');
  }

  // 10. Grand Master: >= 5 unlocked badges
  if (currentUnlockedIds.size >= 5) {
    tryUnlock('grand_master');
  }

  if (newlyUnlocked.length > 0) {
    saveUnlockedBadges(updatedUnlocked);
  }

  return { newlyUnlocked, updatedUnlocked };
}

export function resetAllBadges(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_BADGES);
  localStorage.removeItem(STORAGE_KEY_ACTIVITY_TRACKER);
}
