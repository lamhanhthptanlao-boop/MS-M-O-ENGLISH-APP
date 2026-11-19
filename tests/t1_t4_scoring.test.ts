import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeAllSentences,
  evaluateDictationSentence,
  evaluatePronunciation,
  MANDATORY_SHADOWING_TEST_CASES,
  splitIntoSentences,
} from '../src/utils/textParser.ts';
import {
  computeLessonPracticeStats,
  getLessonScopeKey,
  getOrCreateBucket,
  LessonScoreBuckets,
  recordDictationResult,
  recordQuizResult,
  recordTypingMatchResult,
  recordVoiceResult,
  recordWordHuntResult,
} from '../src/utils/scoreStore.ts';

function makeSentence(text: string) {
  const split = splitIntoSentences(text);
  const analyzed = analyzeAllSentences(split.length > 0 ? split : [text]);
  return analyzed[0];
}

// ============================================================================
// T1: STRICT ENDING -s/-es CHECK ("expands → expand") MUST NEVER SCORE 100
// ============================================================================
test('T1: Lỗi âm cuối -s/-es ("expands -> expand", "boxes -> box", "studies -> study") không bao giờ được 100 điểm', () => {
  const t1Case = MANDATORY_SHADOWING_TEST_CASES[0];
  assert.equal(t1Case.expectedTargetWord, 'expands');
  assert.equal(t1Case.expectedSpokenWord, 'expand');

  const sentence = makeSentence(t1Case.targetText);

  // Full sentence with expands -> expand
  const result = evaluatePronunciation(sentence, t1Case.badTranscript, 'voice');
  assert.ok(result.accuracyScore < 100, `Expected < 100, got ${result.accuracyScore}`);
  assert.equal(result.endingErrorCount, 1);

  const expandsCheck = result.wordComparisons.find(
    (w) => w.targetWord.toLowerCase() === 'expands'
  );
  assert.ok(expandsCheck, 'Target word "expands" must exist in comparisons');
  assert.equal(expandsCheck.status, 'mispronounced');
  assert.equal(expandsCheck.errorType, 'ending-s');
  assert.equal(expandsCheck.spokenWord?.toLowerCase(), 'expand');

  // Single-word sentence test ("expands." -> "expand")
  const singleRes = evaluatePronunciation(makeSentence('expands.'), 'expand', 'voice');
  assert.ok(singleRes.accuracyScore < 100);
  assert.equal(singleRes.wordComparisons[0].errorType, 'ending-s');

  // Additional -es / -ies variants
  const esRes = evaluatePronunciation(makeSentence('He packs three boxes.'), 'He packs three box.', 'voice');
  assert.ok(esRes.accuracyScore < 100);
  assert.equal(esRes.endingErrorCount, 1);

  const iesRes = evaluatePronunciation(makeSentence('She studies hard.'), 'She study hard.', 'voice');
  assert.ok(iesRes.accuracyScore < 100);
  assert.equal(iesRes.endingErrorCount, 1);

  // Exact speech gets 100
  const exactRes = evaluatePronunciation(sentence, t1Case.targetText, 'voice');
  assert.equal(exactRes.accuracyScore, 100);
  assert.equal(exactRes.endingErrorCount, 0);
});

// ============================================================================
// T2: STRICT ENDING -ed/-d CHECK ("decided → decide") MUST NEVER SCORE 100
// ============================================================================
test('T2: Lỗi âm cuối -ed/-d ("decided -> decide", "worked -> work", "stopped -> stop", "studied -> study") không bao giờ được 100 điểm', () => {
  const t2Case = MANDATORY_SHADOWING_TEST_CASES[1];
  assert.equal(t2Case.expectedTargetWord, 'decided');
  assert.equal(t2Case.expectedSpokenWord, 'decide');

  const sentence = makeSentence(t2Case.targetText);

  // Full sentence with decided -> decide
  const result = evaluatePronunciation(sentence, t2Case.badTranscript, 'voice');
  assert.ok(result.accuracyScore < 100, `Expected < 100, got ${result.accuracyScore}`);
  assert.equal(result.endingErrorCount, 1);

  const decidedCheck = result.wordComparisons.find(
    (w) => w.targetWord.toLowerCase() === 'decided'
  );
  assert.ok(decidedCheck, 'Target word "decided" must exist in comparisons');
  assert.equal(decidedCheck.status, 'mispronounced');
  assert.equal(decidedCheck.errorType, 'ending-ed');
  assert.equal(decidedCheck.spokenWord?.toLowerCase(), 'decide');

  // Single-word sentence ("decided." -> "decide")
  const singleRes = evaluatePronunciation(makeSentence('decided.'), 'decide', 'voice');
  assert.ok(singleRes.accuracyScore < 100);
  assert.equal(singleRes.wordComparisons[0].errorType, 'ending-ed');

  // Additional -ed variants (regular, doubled consonant, -ied)
  const workedRes = evaluatePronunciation(makeSentence('They worked late.'), 'They work late.', 'voice');
  assert.ok(workedRes.accuracyScore < 100);
  assert.equal(workedRes.endingErrorCount, 1);

  const stoppedRes = evaluatePronunciation(makeSentence('The bus stopped quickly.'), 'The bus stop quickly.', 'voice');
  assert.ok(stoppedRes.accuracyScore < 100);
  assert.equal(stoppedRes.endingErrorCount, 1);

  const studiedRes = evaluatePronunciation(makeSentence('We studied English.'), 'We study English.', 'voice');
  assert.ok(studiedRes.accuracyScore < 100);
  assert.equal(studiedRes.endingErrorCount, 1);

  // Dictation evaluator also strictly catches -s and -ed slips
  const dictRes = evaluateDictationSentence(sentence, t2Case.badTranscript);
  assert.ok(dictRes.score < 100);
  assert.equal(dictRes.endingErrorCount, 1);

  // Exact speech gets 100
  const exactRes = evaluatePronunciation(sentence, t2Case.targetText, 'voice');
  assert.equal(exactRes.accuracyScore, 100);
  assert.equal(exactRes.endingErrorCount, 0);
});

// ============================================================================
// T3: STRICT SEPARATION OF VOICE SCORE / TYPING MATCH / DICTATION SCORE
// ============================================================================
test('T3: Tách biệt hoàn toàn 3 điểm Voice Score / Typing Match / Dictation Score', () => {
  const text = 'She decided to read and her vocabulary expands.';
  const sentence = makeSentence(text);
  const lessonKey = getLessonScopeKey(text);
  let buckets: LessonScoreBuckets = {};

  // 1) Typing Match only (typing test in ShadowingStudio)
  const typingResult = evaluatePronunciation(
    sentence,
    'She decide to read and her vocabulary expand.',
    'typing'
  );
  assert.equal(typingResult.source, 'typing');
  assert.ok(typingResult.accuracyScore < 100);
  buckets = recordTypingMatchResult(buckets, lessonKey, sentence.id, typingResult);

  let stats = computeLessonPracticeStats(getOrCreateBucket(buckets, lessonKey));
  assert.equal(stats.typingMatchCount, 1);
  assert.equal(stats.typingMatchScore, typingResult.accuracyScore);
  assert.equal(stats.voiceCount, 0);
  assert.equal(stats.voiceScore, 0);
  assert.equal(stats.shadowingCount, 0);
  assert.equal(stats.shadowingAvgScore, 0);
  assert.equal(stats.dictationCount, 0);
  assert.equal(stats.dictationScore, 0);

  // 2) Voice Score only (Mic recording) -> must NOT touch Typing Match or Dictation
  const voiceResult = evaluatePronunciation(sentence, text, 'voice');
  assert.equal(voiceResult.source, 'voice');
  assert.equal(voiceResult.accuracyScore, 100);
  buckets = recordVoiceResult(buckets, lessonKey, sentence.id, voiceResult);

  stats = computeLessonPracticeStats(getOrCreateBucket(buckets, lessonKey));
  assert.equal(stats.voiceCount, 1);
  assert.equal(stats.voiceScore, 100);
  assert.equal(stats.shadowingAvgScore, 100);
  assert.equal(stats.typingMatchCount, 1);
  assert.equal(stats.typingMatchScore, typingResult.accuracyScore);
  assert.equal(stats.dictationCount, 0);
  assert.equal(stats.dictationScore, 0);

  // 3) Dictation Score only (Task 3) -> must NOT touch Voice Score or Typing Match
  const dictEval = evaluateDictationSentence(sentence, 'She decide to read and her vocabulary expands.');
  assert.ok(dictEval.score < 100);
  buckets = recordDictationResult(buckets, lessonKey, sentence.id, dictEval.score);

  stats = computeLessonPracticeStats(getOrCreateBucket(buckets, lessonKey));
  assert.equal(stats.dictationCount, 1);
  assert.equal(stats.dictationScore, dictEval.score);
  assert.equal(stats.voiceScore, 100);
  assert.equal(stats.typingMatchScore, typingResult.accuracyScore);
  assert.notEqual(stats.voiceScore, stats.typingMatchScore);
  assert.notEqual(stats.voiceScore, stats.dictationScore);
});

// ============================================================================
// T4: ZERO CROSS-CONTAMINATION BETWEEN LESSONS / ASSIGNMENTS
// ============================================================================
test('T4: Không nhiễm chéo điểm giữa các bài học và các assignment khác nhau', () => {
  const lessonAText = 'Their vocabulary naturally expands every single morning.';
  const lessonBText = 'Solar panels generate clean electricity without carbon emissions.';

  const sentenceA = makeSentence(lessonAText);
  const sentenceB = makeSentence(lessonBText);

  // Content-scoped sentence IDs prevent collisions even when both are index #1
  assert.notEqual(sentenceA.id, sentenceB.id);

  // Assignment keys & free-lesson keys are isolated
  const keyAssignA = getLessonScopeKey(lessonAText, 'assign_alpha');
  const keyAssignB = getLessonScopeKey(lessonBText, 'assign_beta');
  const keyFreeA = getLessonScopeKey(lessonAText);
  const keyFreeB = getLessonScopeKey(lessonBText);

  assert.notEqual(keyAssignA, keyAssignB);
  assert.notEqual(keyAssignA, keyFreeA);
  assert.notEqual(keyFreeA, keyFreeB);

  let buckets: LessonScoreBuckets = {};

  // Complete everything inside Lesson / Assignment A
  buckets = recordVoiceResult(buckets, keyAssignA, sentenceA.id, evaluatePronunciation(sentenceA, lessonAText, 'voice'));
  buckets = recordTypingMatchResult(buckets, keyAssignA, sentenceA.id, evaluatePronunciation(sentenceA, 'Their vocabulary naturally expand every single morning.', 'typing'));
  buckets = recordDictationResult(buckets, keyAssignA, sentenceA.id, 90);
  buckets = recordQuizResult(buckets, keyAssignA, 4, 4);
  buckets = recordWordHuntResult(buckets, keyAssignA, true);

  // Verify Lesson A has recorded scores
  const statsA = computeLessonPracticeStats(getOrCreateBucket(buckets, keyAssignA));
  assert.equal(statsA.voiceCount, 1);
  assert.equal(statsA.voiceScore, 100);
  assert.equal(statsA.typingMatchCount, 1);
  assert.ok(statsA.typingMatchScore < 100);
  assert.equal(statsA.dictationCount, 1);
  assert.equal(statsA.dictationScore, 90);
  assert.equal(statsA.quizScore, 100);
  assert.equal(statsA.wordHuntCompleted, true);

  // Switch to Lesson / Assignment B -> MUST be 100% clean (0 / false)
  const statsB = computeLessonPracticeStats(getOrCreateBucket(buckets, keyAssignB));
  assert.equal(statsB.voiceCount, 0);
  assert.equal(statsB.voiceScore, 0);
  assert.equal(statsB.typingMatchCount, 0);
  assert.equal(statsB.typingMatchScore, 0);
  assert.equal(statsB.dictationCount, 0);
  assert.equal(statsB.dictationScore, 0);
  assert.equal(statsB.shadowingCount, 0);
  assert.equal(statsB.shadowingAvgScore, 0);
  assert.equal(statsB.quizScore, 0);
  assert.equal(statsB.quizCorrectCount, 0);
  assert.equal(statsB.wordHuntCompleted, false);

  // Even free practice with same text as Assign A does NOT inherit Assign A scores
  const statsFreeA = computeLessonPracticeStats(getOrCreateBucket(buckets, keyFreeA));
  assert.equal(statsFreeA.voiceCount, 0);
  assert.equal(statsFreeA.voiceScore, 0);
  assert.equal(statsFreeA.quizScore, 0);
});
