import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeAllSentences,
  filterSentencesForTier,
  filterSentencesWithPreview,
  generateWordHint,
  SAMPLE_TEXTS,
  splitIntoSentences,
} from '../src/utils/textParser.ts';
import {
  buildAssignmentShareUrl,
  prepareAssignmentTextWithPreview,
  resolveDefaultAssignedTask,
  resolveStudentAssignmentTask,
} from '../src/utils/assignmentDefaults.ts';
import {
  computeListeningCompletion,
  createListeningProgressState,
  isSentenceListenedEnough,
  LISTENING_COMPLETION_THRESHOLD,
  updateSentenceListeningRatio,
} from '../src/utils/listeningProgress.ts';
import {
  computeDashboardSummary,
  evaluateSubmissionStatus,
} from '../src/utils/dashboardMetrics.ts';
import { AssignmentSubmission } from '../src/types/index.ts';

// ============================================================================
// T5: TIER ONLY CONTROLS HINTS, MUST NOT AUTO-CUT SENTENCES;
//     EXPLICIT CUTTING ALWAYS PRODUCES KEPT vs DROPPED PREVIEW TABLE DATA
// ============================================================================
test('T5: Tier chỉ chỉnh mức gợi ý, không tự cắt câu; cắt câu phải trả về bảng xem trước Câu giữ / Câu loại', () => {
  const mixedPassage = [
    'Start small.', // 2 words (short / easy length)
    'When students read English for just fifteen minutes every morning, their vocabulary naturally expands.', // 15 words
    'Consistency builds long-term mastery.', // 4 words
    'Small daily habits create remarkable results over time.', // 8 words
    'Balancing modern technology with authentic critical thinking prepares learners well.', // 10 words
  ].join(' ');

  const analyzed = analyzeAllSentences(splitIntoSentences(mixedPassage));
  assert.equal(analyzed.length, 5);

  // 1) Default behavior across easy/medium/hard: NEVER drop sentences!
  const easyKept = filterSentencesForTier(analyzed, 'easy');
  const mediumKept = filterSentencesForTier(analyzed, 'medium');
  const hardKept = filterSentencesForTier(analyzed, 'hard');

  assert.equal(easyKept.length, 5);
  assert.equal(mediumKept.length, 5);
  assert.equal(hardKept.length, 5);
  assert.deepEqual(
    easyKept.map((s) => s.id),
    analyzed.map((s) => s.id)
  );
  assert.deepEqual(
    mediumKept.map((s) => s.id),
    analyzed.map((s) => s.id)
  );
  assert.deepEqual(
    hardKept.map((s) => s.id),
    analyzed.map((s) => s.id)
  );

  // Default preview helper also keeps 100% of sentences regardless of tier
  const noCutPreview = filterSentencesWithPreview(analyzed, { mode: 'all', cutByTier: null });
  assert.equal(noCutPreview.hasCuts, false);
  assert.equal(noCutPreview.keptSentences.length, 5);
  assert.equal(noCutPreview.droppedSentences.length, 0);
  assert.ok(noCutPreview.previewRows.every((r) => r.kept === true));

  // Verify Tier actually controls hint strictness
  const hintEasy = generateWordHint('expands', 'easy'); // First + Last letter: "e _ _ _ _ _ s"
  const hintMedium = generateWordHint('expands', 'medium'); // First letter only: "e _ _ _ _ _ _"
  const hintHard = generateWordHint('expands', 'hard'); // Blank count: "( 7 letters )"
  assert.ok(hintEasy.startsWith('e') && hintEasy.endsWith('s'));
  assert.ok(hintMedium.startsWith('e') && !hintMedium.endsWith('s'));
  assert.equal(hintHard, '( 7 letters )');

  // 2) Explicit cutting (custom range or opt-in tier length filter) produces complete Keep/Drop preview rows
  const rangeCutPreview = filterSentencesWithPreview(analyzed, {
    mode: 'custom',
    from: 2,
    to: 4,
  });
  assert.equal(rangeCutPreview.hasCuts, true);
  assert.equal(rangeCutPreview.keptSentences.length, 3);
  assert.equal(rangeCutPreview.droppedSentences.length, 2);
  assert.equal(rangeCutPreview.previewRows.length, 5);
  assert.equal(rangeCutPreview.previewRows[0].kept, false); // Sentence 1 dropped
  assert.equal(rangeCutPreview.previewRows[1].kept, true); // Sentence 2 kept
  assert.equal(rangeCutPreview.previewRows[2].kept, true); // Sentence 3 kept
  assert.equal(rangeCutPreview.previewRows[3].kept, true); // Sentence 4 kept
  assert.equal(rangeCutPreview.previewRows[4].kept, false); // Sentence 5 dropped
  assert.ok(rangeCutPreview.previewRows[0].reasonVi.length > 0);

  // Explicit opt-in tier cut (cutByTier: 'easy') explicitly splits Kept vs Dropped in preview
  const explicitTierCut = filterSentencesWithPreview(analyzed, {
    mode: 'all',
    cutByTier: 'easy',
  });
  assert.equal(explicitTierCut.hasCuts, true);
  assert.equal(
    explicitTierCut.keptSentences.length + explicitTierCut.droppedSentences.length,
    analyzed.length
  );
  assert.ok(explicitTierCut.droppedSentences.length > 0);
});

// ============================================================================
// T6: ASSIGN LESSON DEFAULTS TO MATCHING TASK TYPE + FULL LESSON ('all')
// ============================================================================
test('T6: Giao bài mặc định đúng loại bài đang mở + Full Lesson giữ nguyên toàn bộ bài', () => {
  // 1) Default task selection from Home/Creator is 'all' (Full Lesson), NEVER forced 'listening'
  assert.equal(resolveDefaultAssignedTask({ currentView: 'home' }), 'all');
  assert.equal(resolveDefaultAssignedTask({ currentView: 'creator' }), 'all');

  // 2) Default task selection from Practice Lab matches the active tab accurately
  assert.equal(resolveDefaultAssignedTask({ currentView: 'practice', activeTab: 'quiz' }), 'quiz');
  assert.equal(
    resolveDefaultAssignedTask({ currentView: 'practice', activeTab: 'shadowing' }),
    'shadowing'
  );
  assert.equal(
    resolveDefaultAssignedTask({ currentView: 'practice', activeTab: 'dictation' }),
    'dictation'
  );
  assert.equal(resolveDefaultAssignedTask({ currentView: 'practice', activeTab: 'words' }), 'words');
  assert.equal(
    resolveDefaultAssignedTask({ currentView: 'practice', activeTab: 'listening' }),
    'listening'
  );
  assert.equal(resolveDefaultAssignedTask({ currentView: 'practice', activeTab: 'chatbot' }), 'chat');

  // 3) Student assignment fallback resolves missing/unspecified task to 'all' (Full Lesson)
  assert.equal(resolveStudentAssignmentTask(null, undefined), 'all');
  assert.equal(resolveStudentAssignmentTask(null, 'all'), 'all');
  assert.equal(resolveStudentAssignmentTask('quiz', 'listening'), 'quiz');
  assert.equal(resolveStudentAssignmentTask(null, 'dictation'), 'dictation');

  // 4) Share URL preserves Full Lesson ('all') without forcing ?task=listening
  const fullUrl = buildAssignmentShareUrl('https://msmeo.example/', 'assign_101', 'all');
  assert.equal(fullUrl, 'https://msmeo.example/?assignment=assign_101');

  const quizUrl = buildAssignmentShareUrl('https://msmeo.example/', 'assign_101', 'quiz');
  assert.equal(quizUrl, 'https://msmeo.example/?assignment=assign_101&task=quiz');

  // 5) Full Lesson text preparation keeps ALL sentences intact
  const sampleText = SAMPLE_TEXTS[0].text;
  const fullPrep = prepareAssignmentTextWithPreview(sampleText, 'all');
  assert.equal(fullPrep.assignedText, sampleText.trim());
  assert.equal(fullPrep.preview.hasCuts, false);
  assert.equal(
    fullPrep.preview.keptSentences.length,
    splitIntoSentences(sampleText).length
  );
});

// ============================================================================
// T7: LISTENING PROGRESS ONLY COUNTS WHEN REAL PLAYBACK REACHES >= 80%
// ============================================================================
test('T7: Tiến độ nghe chỉ tính khi nghe thật ≥80%, bấm Play (0%) hoặc dừng sớm (<80%) không được tính hoàn thành', () => {
  assert.equal(LISTENING_COMPLETION_THRESHOLD, 0.8);
  assert.equal(isSentenceListenedEnough(0), false);
  assert.equal(isSentenceListenedEnough(0.5), false);
  assert.equal(isSentenceListenedEnough(0.799), false);
  assert.equal(isSentenceListenedEnough(0.8), true);
  assert.equal(isSentenceListenedEnough(1.0), true);

  const sentenceIds = ['s1', 's2', 's3', 's4'];
  let state = createListeningProgressState();

  // Pressing Play starts at ratio 0 -> MUST NOT count as listened
  state = updateSentenceListeningRatio(state, 's1', 0);
  let summary = computeListeningCompletion(state, sentenceIds);
  assert.equal(summary.completedCount, 0);
  assert.equal(summary.percent, 0);
  assert.equal(summary.isLessonCompleted, false);

  // Stopping early at 55% or 79% -> still 0% completed
  state = updateSentenceListeningRatio(state, 's1', 0.55);
  state = updateSentenceListeningRatio(state, 's2', 0.79);
  summary = computeListeningCompletion(state, sentenceIds);
  assert.equal(summary.completedCount, 0);
  assert.equal(summary.percent, 0);
  assert.equal(summary.isLessonCompleted, false);

  // Reaching 80% on s1 and 100% on s2 -> 2/4 = 50% (not yet >= 80% of lesson)
  state = updateSentenceListeningRatio(state, 's1', 0.8);
  state = updateSentenceListeningRatio(state, 's2', 1.0);
  summary = computeListeningCompletion(state, sentenceIds);
  assert.equal(summary.completedCount, 2);
  assert.equal(summary.percent, 50);
  assert.equal(summary.isLessonCompleted, false);

  // Reaching >= 80% on s3 and s4 -> 4/4 = 100% lesson completed
  state = updateSentenceListeningRatio(state, 's3', 0.82);
  state = updateSentenceListeningRatio(state, 's4', 0.95);
  summary = computeListeningCompletion(state, sentenceIds);
  assert.equal(summary.completedCount, 4);
  assert.equal(summary.percent, 100);
  assert.equal(summary.isLessonCompleted, true);
});

// ============================================================================
// T8: DASHBOARD SINGLE SOURCE OF TRUTH & QUIZ 0/4 NEVER RATED "KHÁ TỐT"
// ============================================================================
test('T8: Dashboard tính từ 1 nguồn số liệu duy nhất; Quiz 0/4 tuyệt đối không được ghi "Khá tốt" hay "Xuất sắc"', () => {
  const subQuizZeroOnly: AssignmentSubmission = {
    id: 'sub-1',
    assignmentId: 'assign-1',
    studentName: 'Nguyễn Minh A',
    studentClass: '12A1',
    taskType: 'quiz',
    listeningCompleted: false,
    shadowingCount: 0,
    shadowingAvgScore: 0,
    quizScore: 0,
    quizCorrectCount: 0,
    quizTotal: 4,
    wordHuntCompleted: false,
    dictationScore: 0,
    submittedAt: '2026-05-01T08:00:00.000Z',
  };

  // Even if listeningCompleted or a sibling score was also true/high, Quiz 0/4 MUST NEVER be rated "Khá tốt" or "Xuất sắc"!
  const subQuizZeroWithListening: AssignmentSubmission = {
    id: 'sub-2',
    assignmentId: 'assign-1',
    studentName: 'Trần Thị B',
    studentClass: '12A1',
    taskType: 'all',
    listeningCompleted: true,
    voiceCount: 2,
    voiceAvgScore: 75,
    shadowingCount: 2,
    shadowingAvgScore: 75,
    quizScore: 0,
    quizCorrectCount: 0,
    quizTotal: 4,
    wordHuntCompleted: true,
    dictationScore: 0,
    submittedAt: '2026-05-01T08:05:00.000Z',
  };

  const subHighAll: AssignmentSubmission = {
    id: 'sub-3',
    assignmentId: 'assign-1',
    studentName: 'Lê Hoàng C',
    studentClass: '12A1',
    taskType: 'all',
    listeningCompleted: true,
    voiceCount: 4,
    voiceAvgScore: 90,
    typingMatchCount: 2,
    typingMatchScore: 84,
    dictationCount: 2,
    dictationScore: 88,
    shadowingCount: 4,
    shadowingAvgScore: 90,
    quizScore: 100,
    quizCorrectCount: 4,
    quizTotal: 4,
    wordHuntCompleted: true,
    submittedAt: '2026-05-01T08:10:00.000Z',
  };

  const eval1 = evaluateSubmissionStatus(subQuizZeroOnly);
  assert.notEqual(eval1.tier, 'good');
  assert.notEqual(eval1.tier, 'excellent');
  assert.ok(!eval1.label.includes('Khá tốt'));
  assert.ok(!eval1.label.includes('Xuất sắc'));
  assert.equal(eval1.tier, 'not_passed');

  const eval2 = evaluateSubmissionStatus(subQuizZeroWithListening);
  assert.notEqual(eval2.tier, 'good');
  assert.notEqual(eval2.tier, 'excellent');
  assert.ok(!eval2.label.includes('Khá tốt'));
  assert.ok(!eval2.label.includes('Xuất sắc'));

  const eval3 = evaluateSubmissionStatus(subHighAll);
  assert.equal(eval3.tier, 'excellent');

  // Verify single-source-of-truth dashboard aggregation consistency
  const summary = computeDashboardSummary([
    subQuizZeroOnly,
    subQuizZeroWithListening,
    subHighAll,
  ]);
  assert.equal(summary.totalSubmissions, 3);
  assert.equal(summary.rows.length, 3);
  assert.equal(summary.quizParticipantCount, 3);
  // (0 + 0 + 100) / 3 = 33
  assert.equal(summary.avgQuizScore, 33);
  // Only sub-2 (75) and sub-3 (90) attempted voice -> (75 + 90) / 2 = 83
  assert.equal(summary.voiceParticipantCount, 2);
  assert.equal(summary.avgVoiceScore, 83);
  // Only sub-3 attempted typing (84) & dictation (88)
  assert.equal(summary.typingParticipantCount, 1);
  assert.equal(summary.avgTypingMatchScore, 84);
  assert.equal(summary.dictationParticipantCount, 1);
  assert.equal(summary.avgDictationScore, 88);
  // Row evaluations in summary match direct evaluateSubmissionStatus calls
  assert.equal(summary.rows[0].evaluation.label, eval1.label);
  assert.equal(summary.rows[1].evaluation.label, eval2.label);
  assert.equal(summary.rows[2].evaluation.label, eval3.label);
});
