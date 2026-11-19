import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DeviceVoiceLike,
  filterVoices,
  findStrictDeviceVoiceForSpec,
  getDeviceSupportedAccents,
  getDeviceSupportedGenders,
  getMatchingRecommendedSpecs,
  RECOMMENDED_REALISTIC_VOICES,
} from '../src/utils/speech.ts';
import {
  applyActivityXp,
  computeEffectiveLocalXp,
  computeLeaderboard,
  computeSubmissionXp,
  createInitialGamificationState,
} from '../src/utils/gamification.ts';
import {
  applyAppBackupPayload,
  buildAppBackupPayload,
  parseAndValidateBackupJson,
} from '../src/utils/backupJson.ts';
import { Assignment, AssignmentSubmission, PracticeStats } from '../src/types/index.ts';

// ============================================================================
// T9-VOICE: DEVICE-ONLY VOICE FILTERING (NO FAKE PRESETS / NO ACCENT SPOOFING)
// ============================================================================
test('T9-Voice: Bộ lọc giọng chỉ hiện đúng giọng & accent thật đang có trên thiết bị', () => {
  const mockDeviceVoices: DeviceVoiceLike[] = [
    { name: 'Microsoft Jenny Online (Natural) - English (United States)', lang: 'en-US' },
    { name: 'Google UK English Male', lang: 'en-GB' },
    { name: 'Microsoft An Online - Vietnamese', lang: 'vi-VN' },
  ];

  const matchedSpecs = getMatchingRecommendedSpecs(mockDeviceVoices);
  assert.equal(matchedSpecs.length, 2);
  assert.deepEqual(
    matchedSpecs.map((m) => m.spec.id),
    ['us-jenny-female', 'uk-oliver-male']
  );

  // Device lacks en-AU, en-CA, and en-US Male -> strict matcher returns null
  const auSpec = RECOMMENDED_REALISTIC_VOICES.find((s) => s.accent === 'en-AU')!;
  const caSpec = RECOMMENDED_REALISTIC_VOICES.find((s) => s.accent === 'en-CA')!;
  const usMaleSpec = RECOMMENDED_REALISTIC_VOICES.find((s) => s.id === 'us-guy-male')!;
  assert.equal(findStrictDeviceVoiceForSpec(auSpec, mockDeviceVoices), null);
  assert.equal(findStrictDeviceVoiceForSpec(caSpec, mockDeviceVoices), null);
  assert.equal(findStrictDeviceVoiceForSpec(usMaleSpec, mockDeviceVoices), null);

  // Supported accents reflect ONLY en-US and en-GB present in mockDeviceVoices
  assert.deepEqual(getDeviceSupportedAccents(mockDeviceVoices), ['all', 'en-US', 'en-GB']);

  // Gender list for en-GB contains ONLY 'all' and 'male'
  assert.deepEqual(getDeviceSupportedGenders(mockDeviceVoices, 'en-GB'), ['all', 'male']);

  // Filtering for missing accent en-AU returns [] (never silently falls back to US/GB)
  assert.deepEqual(filterVoices(mockDeviceVoices, 'en-AU', 'all', 'all'), []);

  // Filtering on empty OS voice list returns []
  assert.deepEqual(getMatchingRecommendedSpecs([]), []);
  assert.deepEqual(getDeviceSupportedAccents([]), ['all']);
});

// ============================================================================
// T9-GAMIFICATION: REAL XP, STREAK & LEADERBOARD (ZERO FAKE STUDENTS / 0/4 = 0 XP)
// ============================================================================
test('T9-Gamification: Tính XP, chuỗi ngày (streak) thật & bảng xếp hạng không có dữ liệu giả', () => {
  let state = createInitialGamificationState();

  // Day 1 (May 10)
  state = applyActivityXp(state, 'shadowing', 20, new Date('2026-05-10T09:00:00'));
  assert.equal(state.totalXp, 20);
  assert.equal(state.currentStreakDays, 1);
  assert.equal(state.longestStreakDays, 1);

  // Same Day 1 (May 10 evening): XP adds up, streak stays 1
  state = applyActivityXp(state, 'dictation', 25, new Date('2026-05-10T20:00:00'));
  assert.equal(state.totalXp, 45);
  assert.equal(state.currentStreakDays, 1);

  // Consecutive Day 2 (May 11): streak increments to 2
  state = applyActivityXp(state, 'words', 25, new Date('2026-05-11T08:30:00'));
  assert.equal(state.totalXp, 70);
  assert.equal(state.currentStreakDays, 2);
  assert.equal(state.longestStreakDays, 2);

  // Skip 2+ days -> Day 5 (May 14): current streak resets to 1, longest stays 2
  state = applyActivityXp(state, 'quiz', 30, new Date('2026-05-14T10:00:00'));
  assert.equal(state.totalXp, 100);
  assert.equal(state.currentStreakDays, 1);
  assert.equal(state.longestStreakDays, 2);

  // Quiz 0/4 submission earns 0 XP
  const zeroQuizSub: AssignmentSubmission = {
    id: 'sub-zero',
    assignmentId: 'a-1',
    studentName: 'Minh Anh',
    studentClass: '12A1',
    shadowingCount: 0,
    shadowingAvgScore: 0,
    quizScore: 0,
    quizCorrectCount: 0,
    quizTotal: 4,
    wordHuntCompleted: false,
    dictationScore: 0,
    submittedAt: '2026-05-14T10:05:00.000Z',
  };
  assert.equal(computeSubmissionXp(zeroQuizSub), 0);

  // High-effort submission earns deterministic real XP
  const strongSub: AssignmentSubmission = {
    id: 'sub-strong',
    assignmentId: 'a-1',
    studentName: 'Gia Huy',
    studentClass: '12A1',
    listeningCompleted: true,
    voiceCount: 5,
    voiceAvgScore: 90,
    typingMatchCount: 2,
    typingMatchScore: 80,
    dictationCount: 3,
    dictationScore: 85,
    shadowingCount: 5,
    shadowingAvgScore: 90,
    quizScore: 100,
    quizCorrectCount: 4,
    quizTotal: 4,
    wordHuntCompleted: true,
    submittedAt: '2026-05-14T10:15:00.000Z',
  };
  assert.ok(computeSubmissionXp(strongSub) > 200);

  // Empty leaderboard must contain ZERO mock/hardcoded rows
  assert.deepEqual(computeLeaderboard([]), []);

  // Sorted real entries descending by XP
  const ranked = computeLeaderboard([zeroQuizSub, strongSub], {
    studentName: 'Ngọc Lan',
    studentClass: '12A1',
    xp: 120,
    avgAccuracy: 88,
    completedTasks: 3,
    streakDays: 2,
  });
  assert.equal(ranked.length, 3);
  assert.equal(ranked[0].studentName, 'Gia Huy');
  assert.equal(ranked[1].studentName, 'Ngọc Lan');
  assert.equal(ranked[1].isCurrentUser, true);
  assert.equal(ranked[2].studentName, 'Minh Anh');

  // Effective local XP protects 0/4 Quiz from adding phantom Quiz XP
  const zeroStats: PracticeStats = {
    voiceCount: 0,
    voiceScore: 0,
    typingMatchCount: 0,
    typingMatchScore: 0,
    dictationCount: 0,
    dictationScore: 0,
    shadowingCount: 0,
    shadowingAvgScore: 0,
    quizScore: 0,
    quizCorrectCount: 0,
    quizTotal: 4,
    wordHuntCompleted: false,
  };
  assert.equal(computeEffectiveLocalXp(createInitialGamificationState(), zeroStats), 0);
});

// ============================================================================
// T9-BACKUP: EXPORT / IMPORT JSON ROUND-TRIP & VALIDATION
// ============================================================================
test('T9-Backup: Xuất/Nhập JSON sao lưu & khôi phục dữ liệu trình duyệt chính xác', () => {
  const createMemoryStorage = () => {
    const map = new Map<string, string>();
    return {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
      removeItem: (key: string) => {
        map.delete(key);
      },
    };
  };

  const sourceStore = createMemoryStorage();
  const sampleAssignment: Assignment = {
    id: 'assign-t9',
    title: 'Unit 5: Global Warming',
    rawText: 'Global warming expands desert regions.',
    selectedTier: 'medium',
    lessonFormat: 'text',
    className: '12A2',
    createdAt: '2026-05-14T08:00:00.000Z',
    assignedTask: 'all',
  };
  const sampleSubmission: AssignmentSubmission = {
    id: 'sub-t9',
    assignmentId: 'assign-t9',
    studentName: 'Thanh Hà',
    studentClass: '12A2',
    shadowingCount: 4,
    shadowingAvgScore: 86,
    quizScore: 75,
    quizCorrectCount: 3,
    quizTotal: 4,
    wordHuntCompleted: true,
    dictationScore: 90,
    submittedAt: '2026-05-14T09:00:00.000Z',
  };

  sourceStore.setItem('ms_meo_saved_lessons', JSON.stringify([{ id: 'l1', title: 'Sample Lesson' }]));
  sourceStore.setItem(
    'ms_meo_gamification',
    JSON.stringify({
      ...createInitialGamificationState(),
      totalXp: 155,
      currentStreakDays: 3,
      longestStreakDays: 4,
    })
  );

  const payload = buildAppBackupPayload([sampleAssignment], [sampleSubmission], sourceStore);
  const serialized = JSON.stringify(payload);
  const parsed = parseAndValidateBackupJson(serialized);

  const destStore = createMemoryStorage();
  const summary = applyAppBackupPayload(parsed, destStore);

  assert.equal(summary.savedLessonsCount, 1);
  assert.equal(summary.assignmentsCount, 1);
  assert.equal(summary.submissionsCount, 1);

  const restoredGamification = JSON.parse(destStore.getItem('ms_meo_gamification')!);
  assert.equal(restoredGamification.totalXp, 155);
  assert.equal(restoredGamification.currentStreakDays, 3);

  const restoredAssignments = JSON.parse(destStore.getItem('ms_meo_assigned_lessons')!) as Assignment[];
  assert.equal(restoredAssignments[0].title, 'Unit 5: Global Warming');

  // Reject invalid / foreign JSON payloads cleanly
  assert.throws(() => parseAndValidateBackupJson(''), /trống/);
  assert.throws(() => parseAndValidateBackupJson('{not valid json'), /JSON hợp lệ/);
  assert.throws(() => parseAndValidateBackupJson(JSON.stringify({ app: 'other-app', data: {} })), /Ms Mèo English/);
});
