import {
  AnalyzedSentence,
  DifficultyTier,
  QuizQuestion,
  ShadowingEvaluationSource,
  ShadowingResult,
  WordComparison,
  WordComparisonErrorType,
  WordRecognitionItem,
} from '../types';

/**
 * Deterministic 8-character FNV-1a hash for scoping sentence IDs and lesson score buckets.
 */
export function hashTextKey(input: string): string {
  const normalized = (input || '').trim().replace(/\s+/g, ' ');
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

const COMMON_STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot', 'could',
  'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself',
  'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'isn\'t', 'it',
  'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not',
  'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves',
  'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was',
  'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why',
  'will', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

const DISTRACTOR_VOCAB_BANK = [
  'sustainable', 'perspective', 'phenomenon', 'hypothesis', 'significant',
  'consequence', 'alternative', 'innovation', 'collaborate', 'efficient',
  'demonstrate', 'curiosity', 'resilience', 'comprehend', 'diligence',
  'fluency', 'foundation', 'transform', 'endeavor', 'versatile'
];

/**
 * Split text into clean sentences using regex boundary detection,
 * protecting common English abbreviations.
 */
export function splitIntoSentences(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return [];

  // Protect abbreviations: Dr., Mr., Mrs., Ms., e.g., i.e., U.S., etc., vs., St.
  let sanitized = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\bMr\./gi, 'Mr__DOT__')
    .replace(/\bMrs\./gi, 'Mrs__DOT__')
    .replace(/\bMs\./gi, 'Ms__DOT__')
    .replace(/\bDr\./gi, 'Dr__DOT__')
    .replace(/\bProf\./gi, 'Prof__DOT__')
    .replace(/\be\.g\./gi, 'eg__DOT__')
    .replace(/\bi\.e\./gi, 'ie__DOT__')
    .replace(/\betc\./gi, 'etc__DOT__')
    .replace(/\bU\.S\./gi, 'US__DOT__')
    .replace(/\bvs\./gi, 'vs__DOT__')
    .replace(/\bSt\./gi, 'St__DOT__');

  // Split on sentence boundary (. ? ! followed by space or newline or end)
  const matches = sanitized.match(/[^.!?\n]+(?:[.!?]+["']?|$)/g) || [];

  const sentences: string[] = [];

  for (const match of matches) {
    let clean = match
      .replace(/Mr__DOT__/gi, 'Mr.')
      .replace(/Mrs__DOT__/gi, 'Mrs.')
      .replace(/Ms__DOT__/gi, 'Ms.')
      .replace(/Dr__DOT__/gi, 'Dr.')
      .replace(/Prof__DOT__/gi, 'Prof.')
      .replace(/eg__DOT__/gi, 'e.g.')
      .replace(/ie__DOT__/gi, 'i.e.')
      .replace(/etc__DOT__/gi, 'etc.')
      .replace(/US__DOT__/gi, 'U.S.')
      .replace(/vs__DOT__/gi, 'vs.')
      .replace(/St__DOT__/gi, 'St.')
      .trim();

    // Clean leading numbers or list bullets (e.g., "1. ", "- ")
    clean = clean.replace(/^(?:\d+[\.\)]|[-*•])\s+/, '').trim();

    if (clean.length > 2 && /[a-zA-Z]/.test(clean)) {
      sentences.push(clean);
    }
  }

  return sentences;
}

/**
 * Count clean words in a sentence.
 */
export function getSentenceWords(sentence: string): string[] {
  return sentence
    .replace(/[^\w\s'-]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/**
 * Categorize all sentences into difficulty tiers:
 * - Easy: 1 to 6 words
 * - Medium: 7 to 14 words
 * - Hard: 15+ words
 */
export function analyzeAllSentences(sentences: string[]): AnalyzedSentence[] {
  return sentences.map((sentence, idx) => {
    // Detect speaker tag (e.g. "Alex: ...", "Sarah: ...", "Ms Mèo: ...", "Officer: ...", "A: ...", "B: ...")
    const speakerMatch = sentence.match(/^([A-Za-z0-9\s.À-ỹ-]{1,25}):\s*(.*)$/);
    let speaker: string | undefined = undefined;
    let dialogueText: string | undefined = undefined;

    if (speakerMatch) {
      speaker = speakerMatch[1].trim();
      dialogueText = speakerMatch[2].trim();
    }

    const textToAnalyze = dialogueText || sentence;
    const words = getSentenceWords(textToAnalyze);
    const wordCount = words.length;
    let tier: DifficultyTier = 'medium';

    if (wordCount <= 6) {
      tier = 'easy';
    } else if (wordCount <= 14) {
      tier = 'medium';
    } else {
      tier = 'hard';
    }

    const clean = sentence.replace(/\s+/g, ' ').trim();
    return {
      id: `sent-${idx + 1}-${hashTextKey(clean)}`,
      originalText: sentence,
      cleanText: clean,
      words,
      wordCount,
      charCount: sentence.length,
      tier,
      speaker,
      dialogueText: dialogueText || clean,
    };
  });
}

export type SentenceSelectionMode = 'all' | '3' | '5' | '10' | 'custom';

export interface SentencePreviewRow {
  index: number; // 1-based original sentence index
  sentence: AnalyzedSentence;
  kept: boolean;
  reasonVi: string;
  reasonEn: string;
}

export interface SentenceCutConfig {
  mode?: SentenceSelectionMode;
  from?: number;
  to?: number;
  /**
   * Optional explicit tier-length filter. MUST stay null/undefined by default
   * because Difficulty Tier only controls hint support (NOT cutting sentences).
   */
  cutByTier?: DifficultyTier | null;
}

export interface SentenceCutPreviewResult {
  keptSentences: AnalyzedSentence[];
  droppedSentences: AnalyzedSentence[];
  previewRows: SentencePreviewRow[];
  hasCuts: boolean;
}

function selectSentenceIdsByTierLength(
  analyzedSentences: AnalyzedSentence[],
  tier: DifficultyTier
): Set<string> {
  if (tier === 'easy') {
    const directMatches = analyzedSentences.filter((s) => s.wordCount <= 6);
    const chosen =
      directMatches.length > 0
        ? directMatches.slice(0, 4)
        : [...analyzedSentences].sort((a, b) => a.wordCount - b.wordCount).slice(0, 4);
    return new Set(chosen.map((s) => s.id));
  }

  if (tier === 'medium') {
    const directMatches = analyzedSentences.filter((s) => s.wordCount >= 7 && s.wordCount <= 14);
    const chosen =
      directMatches.length > 0
        ? directMatches.slice(0, 6)
        : [...analyzedSentences]
            .sort((a, b) => Math.abs(a.wordCount - 10) - Math.abs(b.wordCount - 10))
            .slice(0, 6);
    return new Set(chosen.map((s) => s.id));
  }

  const directMatches = analyzedSentences.filter((s) => s.wordCount >= 15);
  const chosen = directMatches.length >= 3 ? directMatches : analyzedSentences;
  return new Set(chosen.map((s) => s.id));
}

/**
 * Difficulty Tier ONLY controls dictation hint level (Easy: 100%, Medium: 50%, Hard: 0%).
 * It MUST NOT auto-cut sentences unless `allowLengthCut` is explicitly true.
 */
export function filterSentencesForTier(
  analyzedSentences: AnalyzedSentence[],
  tier: DifficultyTier,
  allowLengthCut = false
): AnalyzedSentence[] {
  if (!allowLengthCut) {
    return analyzedSentences;
  }
  const keptIds = selectSentenceIdsByTierLength(analyzedSentences, tier);
  return analyzedSentences.filter((s) => keptIds.has(s.id));
}

/**
 * Explicit sentence selection & optional length-cut with full Kept/Dropped preview rows.
 */
export function filterSentencesWithPreview(
  analyzedSentences: AnalyzedSentence[],
  config: SentenceCutConfig = {}
): SentenceCutPreviewResult {
  const mode: SentenceSelectionMode = config.mode ?? 'all';
  const cutByTier = config.cutByTier ?? null;
  const total = analyzedSentences.length;

  const tierAllowedIds = cutByTier
    ? selectSentenceIdsByTierLength(analyzedSentences, cutByTier)
    : null;

  const afterTier = tierAllowedIds
    ? analyzedSentences.filter((s) => tierAllowedIds.has(s.id))
    : analyzedSentences;

  let keptIdSet: Set<string>;
  if (mode === 'all') {
    keptIdSet = new Set(afterTier.map((s) => s.id));
  } else if (mode === '3') {
    keptIdSet = new Set(afterTier.slice(0, Math.min(3, afterTier.length)).map((s) => s.id));
  } else if (mode === '5') {
    keptIdSet = new Set(afterTier.slice(0, Math.min(5, afterTier.length)).map((s) => s.id));
  } else if (mode === '10') {
    keptIdSet = new Set(afterTier.slice(0, Math.min(10, afterTier.length)).map((s) => s.id));
  } else {
    const baseLen = afterTier.length;
    const clampedFrom = Math.max(1, Math.min(config.from ?? 1, Math.max(1, baseLen)));
    const clampedTo = Math.max(clampedFrom, Math.min(config.to ?? baseLen, Math.max(1, baseLen)));
    keptIdSet = new Set(afterTier.slice(clampedFrom - 1, clampedTo).map((s) => s.id));
  }

  const previewRows: SentencePreviewRow[] = analyzedSentences.map((sentence, idx) => {
    const oneBasedIndex = idx + 1;
    if (tierAllowedIds && !tierAllowedIds.has(sentence.id)) {
      return {
        index: oneBasedIndex,
        sentence,
        kept: false,
        reasonVi: `Loại theo bộ lọc độ dài Tier ${cutByTier?.toUpperCase()} (${sentence.wordCount} từ)`,
        reasonEn: `Dropped by optional ${cutByTier} length filter (${sentence.wordCount} words)`,
      };
    }

    if (!keptIdSet.has(sentence.id)) {
      const rangeTextVi =
        mode === 'custom'
          ? `Ngoài khoảng chọn (${config.from ?? 1}–${config.to ?? total})`
          : `Ngoài giới hạn ${mode} câu đầu`;
      const rangeTextEn =
        mode === 'custom'
          ? `Outside selected range (${config.from ?? 1}–${config.to ?? total})`
          : `Beyond first ${mode} sentences`;
      return {
        index: oneBasedIndex,
        sentence,
        kept: false,
        reasonVi: rangeTextVi,
        reasonEn: rangeTextEn,
      };
    }

    return {
      index: oneBasedIndex,
      sentence,
      kept: true,
      reasonVi: 'Giữ lại luyện tập',
      reasonEn: 'Kept for practice',
    };
  });

  const keptSentences = previewRows.filter((r) => r.kept).map((r) => r.sentence);
  const droppedSentences = previewRows.filter((r) => !r.kept).map((r) => r.sentence);

  return {
    keptSentences,
    droppedSentences,
    previewRows,
    hasCuts: droppedSentences.length > 0,
  };
}

/**
 * Generate dictation hint for a single word based on difficulty tier:
 * - Easy (100% hint): word length + First and Last letter (e.g. "c _ _ _ r")
 * - Medium (50% hint): word length + First letter (e.g. "c _ _ _ _ _")
 * - Hard (0% hint): Blank input with character count indicator
 */
export function generateWordHint(word: string, tier: DifficultyTier): string {
  const cleanWord = word.replace(/[^\w]/g, '');
  const len = cleanWord.length;

  if (len <= 1) return cleanWord;

  if (tier === 'easy') {
    if (len === 2) return `${cleanWord[0]} _`;
    const middleUnderscores = Array(len - 2).fill('_').join(' ');
    return `${cleanWord[0]} ${middleUnderscores} ${cleanWord[len - 1]}`;
  }

  if (tier === 'medium') {
    const remainingUnderscores = Array(len - 1).fill('_').join(' ');
    return `${cleanWord[0]} ${remainingUnderscores}`;
  }

  // Hard: No letters, just blank placeholder with length
  return `( ${len} letters )`;
}

/**
 * Levenshtein distance calculation between two lowercase strings.
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Word similarity metric from 0 to 1.
 */
function wordSimilarity(w1: string, w2: string): number {
  const maxLen = Math.max(w1.length, w2.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(w1, w2);
  return Math.max(0, 1 - dist / maxLen);
}

const NUMBER_EQUIVALENTS: Record<string, string> = {
  '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
  '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
  '10': 'ten', '11': 'eleven', '12': 'twelve', '13': 'thirteen', '14': 'fourteen',
  '15': 'fifteen', '16': 'sixteen', '17': 'seventeen', '18': 'eighteen', '19': 'nineteen',
  '20': 'twenty', '30': 'thirty', '40': 'forty', '50': 'fifty',
  '60': 'sixty', '70': 'seventy', '80': 'eighty', '90': 'ninety', '100': 'hundred',
};

const SPELLING_EQUIVALENTS: Record<string, string> = {
  colour: 'color',
  colours: 'colors',
  coloured: 'colored',
  favour: 'favor',
  favourite: 'favorite',
  practise: 'practice',
  practised: 'practiced',
  practises: 'practices',
  realise: 'realize',
  realised: 'realized',
  realises: 'realizes',
  organize: 'organise',
  organized: 'organised',
  organizes: 'organises',
  centre: 'center',
  centres: 'centers',
  theatre: 'theater',
  travelling: 'traveling',
  travelled: 'traveled',
  learnt: 'learned',
};

function normalizeWordToken(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Checks whether target and spoken represent an exact match (never forgiving -s/-ed/-ing mismatches!).
 */
function isWordExactMatch(targetNorm: string, spokenNorm: string): boolean {
  if (!targetNorm || !spokenNorm) return false;
  if (targetNorm === spokenNorm) return true;

  // Cardinal number equivalence from STT (e.g. "15" === "fifteen")
  const numTarget = NUMBER_EQUIVALENTS[targetNorm] || targetNorm;
  const numSpoken = NUMBER_EQUIVALENTS[spokenNorm] || spokenNorm;
  if (numTarget === numSpoken) return true;

  // Exact US/UK spelling equivalent (only same-inflection pairs)
  const spTarget = SPELLING_EQUIVALENTS[targetNorm] || targetNorm;
  const spSpoken = SPELLING_EQUIVALENTS[spokenNorm] || spokenNorm;
  if (spTarget === spSpoken) return true;

  return false;
}

/**
 * Detects strict inflection/ending errors (-s/-es/-ies, -ed/-d/-ied, -ing).
 * E.g. "expands" -> "expand", "decided" -> "decide", "worked" -> "work", "stopped" -> "stop".
 */
export function detectEndingSoundError(
  targetNorm: string,
  spokenNorm: string
): { errorType: 'ending-s' | 'ending-ed' | 'ending-ing'; detailNote: string } | null {
  if (!targetNorm || !spokenNorm || targetNorm === spokenNorm) return null;

  // 1. Missing -s / -es / -ies / -ves (e.g. expands -> expand, boxes -> box, studies -> study)
  const isMissingS =
    targetNorm === `${spokenNorm}s` ||
    targetNorm === `${spokenNorm}es` ||
    (targetNorm.endsWith('ies') &&
      spokenNorm.endsWith('y') &&
      targetNorm.slice(0, -3) === spokenNorm.slice(0, -1)) ||
    (targetNorm.endsWith('ves') &&
      (spokenNorm.endsWith('f') || spokenNorm.endsWith('fe')) &&
      targetNorm.slice(0, -3) === spokenNorm.slice(0, spokenNorm.endsWith('fe') ? -2 : -1));

  if (isMissingS) {
    return {
      errorType: 'ending-s',
      detailNote: `Missing ending -s/-es sound ("${spokenNorm}" instead of "${targetNorm}")`,
    };
  }

  // Extra -s / -es (e.g. expand -> expands)
  const isExtraS =
    spokenNorm === `${targetNorm}s` ||
    spokenNorm === `${targetNorm}es` ||
    (spokenNorm.endsWith('ies') &&
      targetNorm.endsWith('y') &&
      spokenNorm.slice(0, -3) === targetNorm.slice(0, -1));

  if (isExtraS) {
    return {
      errorType: 'ending-s',
      detailNote: `Extra ending -s/-es sound ("${spokenNorm}" instead of "${targetNorm}")`,
    };
  }

  // 2. Missing -ed / -d / -ied (e.g. decided -> decide, worked -> work, stopped -> stop, studied -> study)
  const isMissingEd =
    targetNorm === `${spokenNorm}d` ||
    targetNorm === `${spokenNorm}ed` ||
    (targetNorm.endsWith('ed') &&
      targetNorm.length > 4 &&
      targetNorm[targetNorm.length - 3] === targetNorm[targetNorm.length - 4] &&
      targetNorm.slice(0, -3) === spokenNorm) ||
    (targetNorm.endsWith('ied') &&
      spokenNorm.endsWith('y') &&
      targetNorm.slice(0, -3) === spokenNorm.slice(0, -1));

  if (isMissingEd) {
    return {
      errorType: 'ending-ed',
      detailNote: `Missing ending -ed/-d sound ("${spokenNorm}" instead of "${targetNorm}")`,
    };
  }

  // Extra -ed / -d (e.g. decide -> decided)
  const isExtraEd =
    spokenNorm === `${targetNorm}d` ||
    spokenNorm === `${targetNorm}ed` ||
    (spokenNorm.endsWith('ed') &&
      spokenNorm.length > 4 &&
      spokenNorm[spokenNorm.length - 3] === spokenNorm[spokenNorm.length - 4] &&
      spokenNorm.slice(0, -3) === targetNorm) ||
    (spokenNorm.endsWith('ied') &&
      targetNorm.endsWith('y') &&
      spokenNorm.slice(0, -3) === targetNorm.slice(0, -1));

  if (isExtraEd) {
    return {
      errorType: 'ending-ed',
      detailNote: `Extra ending -ed/-d sound ("${spokenNorm}" instead of "${targetNorm}")`,
    };
  }

  // 3. Missing / Extra -ing
  const isMissingIng =
    targetNorm === `${spokenNorm}ing` ||
    (targetNorm.endsWith('ing') && `${targetNorm.slice(0, -3)}e` === spokenNorm) ||
    (targetNorm.endsWith('ing') &&
      targetNorm.length > 5 &&
      targetNorm[targetNorm.length - 4] === targetNorm[targetNorm.length - 5] &&
      targetNorm.slice(0, -4) === spokenNorm);

  if (isMissingIng) {
    return {
      errorType: 'ending-ing',
      detailNote: `Missing ending -ing sound ("${spokenNorm}" instead of "${targetNorm}")`,
    };
  }

  const isExtraIng =
    spokenNorm === `${targetNorm}ing` ||
    (spokenNorm.endsWith('ing') && `${spokenNorm.slice(0, -3)}e` === targetNorm);

  if (isExtraIng) {
    return {
      errorType: 'ending-ing',
      detailNote: `Extra ending -ing sound ("${spokenNorm}" instead of "${targetNorm}")`,
    };
  }

  return null;
}

interface WordAlignmentResult {
  alignedPairs: Array<{ targetIdx: number; spokenIdx: number | null }>;
  extraSpokenIndices: number[];
}

/**
 * Optimal Needleman-Wunsch sequence alignment for word-by-word comparison.
 * Ensures omitted or extra words never cause cascading misalignment across the sentence.
 */
function alignWordSequences(targetNorms: string[], spokenNorms: string[]): WordAlignmentResult {
  const m = targetNorms.length;
  const n = spokenNorms.length;
  const GAP_PENALTY = -2.5;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  const trace: Array<Array<'diag' | 'up' | 'left'>> = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill('up')
  );

  for (let i = 1; i <= m; i++) {
    dp[i][0] = dp[i - 1][0] + GAP_PENALTY;
    trace[i][0] = 'up';
  }
  for (let j = 1; j <= n; j++) {
    dp[0][j] = dp[0][j - 1] + GAP_PENALTY;
    trace[0][j] = 'left';
  }

  const pairScore = (t: string, s: string): number => {
    if (isWordExactMatch(t, s)) return 10;
    if (detectEndingSoundError(t, s)) return 6;
    const sim = wordSimilarity(t, s);
    if (sim >= 0.45) return sim * 6 - 1;
    return -8; // Better to mark omitted + extra than force an unrelated pair
  };

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const diagVal = dp[i - 1][j - 1] + pairScore(targetNorms[i - 1], spokenNorms[j - 1]);
      const upVal = dp[i - 1][j] + GAP_PENALTY;
      const leftVal = dp[i][j - 1] + GAP_PENALTY;

      if (diagVal >= upVal && diagVal >= leftVal) {
        dp[i][j] = diagVal;
        trace[i][j] = 'diag';
      } else if (upVal >= leftVal) {
        dp[i][j] = upVal;
        trace[i][j] = 'up';
      } else {
        dp[i][j] = leftVal;
        trace[i][j] = 'left';
      }
    }
  }

  const alignedPairs: Array<{ targetIdx: number; spokenIdx: number | null }> = [];
  const usedSpoken = new Set<number>();

  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && trace[i][j] === 'diag') {
      const t = targetNorms[i - 1];
      const s = spokenNorms[j - 1];
      const isValidPair =
        isWordExactMatch(t, s) ||
        detectEndingSoundError(t, s) !== null ||
        wordSimilarity(t, s) >= 0.45;
      if (isValidPair) {
        alignedPairs.push({ targetIdx: i - 1, spokenIdx: j - 1 });
        usedSpoken.add(j - 1);
      } else {
        alignedPairs.push({ targetIdx: i - 1, spokenIdx: null });
      }
      i -= 1;
      j -= 1;
    } else if (i > 0 && (j === 0 || trace[i][j] === 'up')) {
      alignedPairs.push({ targetIdx: i - 1, spokenIdx: null });
      i -= 1;
    } else {
      j -= 1;
    }
  }

  alignedPairs.reverse();
  const extraSpokenIndices: number[] = [];
  for (let k = 0; k < n; k++) {
    if (!usedSpoken.has(k)) {
      extraSpokenIndices.push(k);
    }
  }

  return { alignedPairs, extraSpokenIndices };
}

/**
 * Strict Word-by-Word Pronunciation & Accuracy Diagnostic Evaluator:
 * - Every word is checked strictly (exact match required for 'correct' / 1.0).
 * - Any -s/-es or -ed/-d ending omission/addition (e.g. "expands -> expand", "decided -> decide")
 *   is flagged as an ending error and NEVER scores 100%.
 * - Tracks evaluation source ('voice' vs 'typing') to prevent cross-score contamination.
 */
export function evaluatePronunciation(
  targetSentence: AnalyzedSentence,
  studentTranscript: string,
  source: ShadowingEvaluationSource = 'voice'
): ShadowingResult {
  const targetRawWords = targetSentence.words;
  const targetNorms = targetRawWords.map((w) => normalizeWordToken(w));

  const spokenRawWords = studentTranscript
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^\w'-]/g, ''))
    .filter((w) => normalizeWordToken(w).length > 0);
  const spokenNorms = spokenRawWords.map((w) => normalizeWordToken(w));

  const { alignedPairs, extraSpokenIndices } = alignWordSequences(targetNorms, spokenNorms);
  const extraWords = extraSpokenIndices.map((idx) => spokenRawWords[idx]);

  const wordComparisons: WordComparison[] = [];
  const missedWords: string[] = [];
  const mispronouncedWords: { target: string; spoken: string }[] = [];
  const missingEndings: string[] = [];

  let earnedPoints = 0;
  let exactWordCount = 0;
  let endingErrorCount = 0;

  for (const pair of alignedPairs) {
    const targetNorm = targetNorms[pair.targetIdx];
    const originalFormatted = targetRawWords[pair.targetIdx] || targetNorm;

    if (pair.spokenIdx === null) {
      wordComparisons.push({
        targetWord: originalFormatted,
        status: 'omitted',
        detailNote: 'Omitted or unclear',
        errorType: 'omitted',
      });
      missedWords.push(originalFormatted);
      continue;
    }

    const spokenNorm = spokenNorms[pair.spokenIdx];
    const spokenDisplay = spokenRawWords[pair.spokenIdx] || spokenNorm;

    if (isWordExactMatch(targetNorm, spokenNorm)) {
      wordComparisons.push({
        targetWord: originalFormatted,
        spokenWord: spokenDisplay,
        status: 'correct',
        errorType: 'exact',
      });
      earnedPoints += 1.0;
      exactWordCount += 1;
      continue;
    }

    const endingErr = detectEndingSoundError(targetNorm, spokenNorm);
    if (endingErr) {
      endingErrorCount += 1;
      missingEndings.push(
        `${endingErr.errorType === 'ending-s' ? "'-s/-es'" : endingErr.errorType === 'ending-ed' ? "'-ed/-d'" : "'-ing'"} in "${originalFormatted}" (got "${spokenDisplay}")`
      );
      wordComparisons.push({
        targetWord: originalFormatted,
        spokenWord: spokenDisplay,
        status: 'mispronounced',
        detailNote: endingErr.detailNote,
        errorType: endingErr.errorType,
      });
      earnedPoints += 0.5;
      continue;
    }

    const sim = wordSimilarity(targetNorm, spokenNorm);
    const partialWeight = sim >= 0.7 ? 0.5 : 0.35;
    mispronouncedWords.push({ target: originalFormatted, spoken: spokenDisplay });
    wordComparisons.push({
      targetWord: originalFormatted,
      spokenWord: spokenDisplay,
      status: 'mispronounced',
      detailNote: `Pronunciation mismatch ("${spokenDisplay}" vs "${originalFormatted}")`,
      errorType: 'mispronounced',
    });
    earnedPoints += partialWeight;
  }

  // Deduct small penalty for extra unrelated spoken words
  if (extraWords.length > 0) {
    earnedPoints = Math.max(0, earnedPoints - extraWords.length * 0.25);
  }

  const totalTargetWords = targetNorms.length;
  const rawScore = totalTargetWords > 0 ? (earnedPoints / totalTargetWords) * 100 : 0;
  let accuracyScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  // STRICT RULE: Any word error (especially -s/-ed ending error, mispronunciation, omission, or extra words)
  // MUST NEVER achieve 100%!
  const hasAnyError =
    exactWordCount < totalTargetWords ||
    endingErrorCount > 0 ||
    extraWords.length > 0;

  if (hasAnyError && accuracyScore >= 100) {
    accuracyScore = 99;
  }
  if (totalTargetWords === 0 || spokenNorms.length === 0) {
    accuracyScore = 0;
  }

  // Cat Rating
  let ratingLabel = `🐾 ${accuracyScore}/100 - Cozy Warm-up Needed!`;
  if (accuracyScore === 100) {
    ratingLabel = `🐾 100/100 - Purr-fect! Golden Paw!`;
  } else if (accuracyScore >= 90) {
    ratingLabel = `🐾 ${accuracyScore}/100 - Almost Purr-fect! Check Details!`;
  } else if (accuracyScore >= 75) {
    ratingLabel = `🐾 ${accuracyScore}/100 - Great Whisker Work!`;
  } else if (accuracyScore >= 50) {
    ratingLabel = `🐾 ${accuracyScore}/100 - Good Paws! Keep Scratching!`;
  }

  // Generate dynamic Cat Advice
  let catComment = '';
  if (accuracyScore === 100) {
    catComment = `Meow-velous job! Every single word, ending sound (-s/-ed), and rhythm matched 100%. You sounded just like a native speaker!`;
  } else if (missingEndings.length > 0) {
    catComment = `Good rhythm, but Ms Mèo caught ending-sound slip(s): ${missingEndings.slice(0, 2).join(' and ')}. Ending sounds (-s / -ed) are crucial for tense and grammar, so you can't get 100% until they are crisp!`;
  } else if (accuracyScore >= 80) {
    if (mispronouncedWords.length > 0) {
      catComment = `Wonderful rhythm! Focus slightly more on articulating "${mispronouncedWords[0].target}" (heard "${mispronouncedWords[0].spoken}") — listen to Ms Mèo's sample voice once more.`;
    } else if (missedWords.length > 0) {
      catComment = `Strong pace! You skipped "${missedWords.slice(0, 2).join('", "')}". Try reading every word clearly without dropping small words.`;
    } else {
      catComment = `Very close! Watch out for extra words so your sentence matches cleanly word-for-word.`;
    }
  } else if (accuracyScore >= 55) {
    if (missedWords.length > 0) {
      catComment = `Good effort! You skipped or swallowed "${missedWords.slice(0, 2).join('", "')}". Try listening at 0.75x slow speed and tap your paw to each word beat!`;
    } else {
      catComment = `Nice attempt! Some sounds need tighter accuracy. Listen to Ms Mèo at 0.75x speed and shadow word-by-word.`;
    }
  } else {
    catComment = `Don't worry, little learner! English vowels and endings take patience. Turn on "🔁 Loop Shadowing", listen three times, and repeat softly until every word is clear!`;
  }

  return {
    sentenceId: targetSentence.id,
    studentTranscript,
    accuracyScore,
    ratingLabel,
    catComment,
    wordComparisons,
    timestamp: Date.now(),
    source,
    endingErrorCount,
    exactWordCount,
    totalTargetWords,
    extraWords,
  };
}

export interface DictationWordDiff {
  expected: string;
  actual: string;
  isMatch: boolean;
  errorNote?: string;
}

export interface DictationSentenceEvaluation {
  score: number;
  wordDiffs: DictationWordDiff[];
  endingErrorCount: number;
  exactWordCount: number;
}

/**
 * Strict Dictation Evaluator (Audio-to-Text):
 * Uses optimal word alignment so omitted words don't shift the whole sentence,
 * and requires exact spelling (-s/-ed must match 100%).
 */
export function evaluateDictationSentence(
  targetSentence: AnalyzedSentence,
  userInput: string
): DictationSentenceEvaluation {
  const targetRawWords = targetSentence.words;
  const targetNorms = targetRawWords.map((w) => normalizeWordToken(w));

  const actualRawWords = userInput
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^\w'-]/g, ''))
    .filter((w) => normalizeWordToken(w).length > 0);
  const actualNorms = actualRawWords.map((w) => normalizeWordToken(w));

  const { alignedPairs, extraSpokenIndices } = alignWordSequences(targetNorms, actualNorms);

  let exactWordCount = 0;
  let endingErrorCount = 0;

  const wordDiffs: DictationWordDiff[] = alignedPairs.map((pair) => {
    const expectedDisplay = targetRawWords[pair.targetIdx] || targetNorms[pair.targetIdx];
    const targetNorm = targetNorms[pair.targetIdx];

    if (pair.spokenIdx === null) {
      return {
        expected: expectedDisplay,
        actual: '',
        isMatch: false,
        errorNote: 'Omitted',
      };
    }

    const actualNorm = actualNorms[pair.spokenIdx];
    const actualDisplay = actualRawWords[pair.spokenIdx] || actualNorm;
    const isExact = isWordExactMatch(targetNorm, actualNorm);

    if (isExact) {
      exactWordCount += 1;
      return {
        expected: expectedDisplay,
        actual: actualDisplay,
        isMatch: true,
      };
    }

    const endingErr = detectEndingSoundError(targetNorm, actualNorm);
    if (endingErr) {
      endingErrorCount += 1;
    }

    return {
      expected: expectedDisplay,
      actual: actualDisplay,
      isMatch: false,
      errorNote: endingErr?.detailNote || 'Spelling mismatch',
    };
  });

  const totalTarget = Math.max(1, targetNorms.length);
  const adjustedExact = Math.max(0, exactWordCount - extraSpokenIndices.length * 0.25);
  let score = Math.round((adjustedExact / totalTarget) * 100);
  if ((exactWordCount < targetNorms.length || extraSpokenIndices.length > 0) && score >= 100) {
    score = 99;
  }
  if (actualNorms.length === 0) {
    score = 0;
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    wordDiffs,
    endingErrorCount,
    exactWordCount,
  };
}

/**
 * Built-in mandatory test sentences covering -s ("expands -> expand") and -ed ("decided -> decide")
 * for verification & quick diagnostic testing.
 */
export const MANDATORY_SHADOWING_TEST_CASES = [
  {
    id: 'test-ending-s',
    label: 'T1: Lỗi -s (expands → expand)',
    targetText: 'When students read English for just fifteen minutes every morning, their vocabulary naturally expands.',
    badTranscript: 'When students read English for just fifteen minutes every morning, their vocabulary naturally expand.',
    expectedTargetWord: 'expands',
    expectedSpokenWord: 'expand',
    errorType: 'ending-s' as WordComparisonErrorType,
  },
  {
    id: 'test-ending-ed',
    label: 'T2: Lỗi -ed (decided → decide)',
    targetText: 'Have you decided on your target university yet?',
    badTranscript: 'Have you decide on your target university yet?',
    expectedTargetWord: 'decided',
    expectedSpokenWord: 'decide',
    errorType: 'ending-ed' as WordComparisonErrorType,
  },
];

/**
 * Task 1: Generate 10 Word Recognition Chips (5 Targets from text + 5 Distractors).
 */
export function generateWordRecognitionTask(sentences: AnalyzedSentence[]): WordRecognitionItem[] {
  // Extract all non-stopword words
  const frequencyMap = new Map<string, number>();

  for (const s of sentences) {
    for (const w of s.words) {
      const clean = w.toLowerCase().replace(/[^\w]/g, '');
      if (clean.length >= 4 && !COMMON_STOPWORDS.has(clean) && !/^\d+$/.test(clean)) {
        frequencyMap.set(clean, (frequencyMap.get(clean) || 0) + 1);
      }
    }
  }

  const sortedCandidates = Array.from(frequencyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w);

  // Pick top 5 target words
  const targets = sortedCandidates.slice(0, 5);
  // If text is short, fill with whatever words exist
  if (targets.length < 5) {
    for (const s of sentences) {
      for (const w of s.words) {
        const clean = w.toLowerCase().replace(/[^\w]/g, '');
        if (clean.length >= 3 && !targets.includes(clean)) {
          targets.push(clean);
          if (targets.length >= 5) break;
        }
      }
      if (targets.length >= 5) break;
    }
  }

  // Pick 5 distractors not in text
  const textWordSet = new Set(
    sentences.flatMap((s) => s.words.map((w) => w.toLowerCase().replace(/[^\w]/g, '')))
  );

  const availableDistractors = DISTRACTOR_VOCAB_BANK.filter((w) => !textWordSet.has(w));
  const distractors = availableDistractors.slice(0, 5);

  const items: WordRecognitionItem[] = [
    ...targets.map((word, idx) => ({
      id: `target-${idx}-${word}`,
      word,
      isTarget: true,
      selected: false,
    })),
    ...distractors.map((word, idx) => ({
      id: `distractor-${idx}-${word}`,
      word,
      isTarget: false,
      selected: false,
    })),
  ];

  // Shuffle items deterministically
  return items.sort(() => Math.random() - 0.5);
}

/**
 * Task 2: Generate Quiz with simple questions and concise options (single word, short phrase, or number).
 */
export function generateComprehensionQuiz(
  fullText: string,
  sentences: AnalyzedSentence[]
): QuizQuestion[] {
  const lowerText = fullText.toLowerCase();

  // Preset 1: The Power of Daily Habits
  if (lowerText.includes('fifteen minutes') || lowerText.includes('daily habits') || lowerText.includes('compound interest')) {
    return [
      {
        id: 'quiz-1',
        question: 'How many minutes of daily reading does the text suggest?',
        options: ['15 minutes', '45 minutes', '2 hours', '5 minutes'],
        correctIndex: 0,
        explanation: "Ms Mèo's Tip 🐾: The passage explicitly suggests: 'read English for just fifteen minutes every morning'.",
      },
      {
        id: 'quiz-2',
        question: 'What always beats intensity according to the author?',
        options: ['Consistency', 'Speed', 'Luck', 'Talent'],
        correctIndex: 0,
        explanation: "Ms Mèo's Tip 🐾: 'Consistency always beats intensity because the human brain thrives on repetition.'",
      },
      {
        id: 'quiz-3',
        question: 'What expands naturally when students read every morning?',
        options: ['Vocabulary', 'Expenses', 'Homework', 'Anxiety'],
        correctIndex: 0,
        explanation: "Ms Mèo's Tip 🐾: The author notes that 'their vocabulary naturally expands'.",
      },
      {
        id: 'quiz-4',
        question: 'What does the human brain thrive on?',
        options: ['Repetition', 'Sugar', 'Silence', 'Stress'],
        correctIndex: 0,
        explanation: "Ms Mèo's Tip 🐾: The brain learns and forms habits through repetition!",
      },
    ];
  }

  // Preset 2: Climate Action & Green Innovation
  if (lowerText.includes('solar panels') || lowerText.includes('clean energy') || lowerText.includes('carbon emissions')) {
    return [
      {
        id: 'quiz-1',
        question: 'What do solar panels and wind farms generate?',
        options: ['Electricity', 'Plastics', 'Smoke', 'Noise'],
        correctIndex: 0,
        explanation: "Ms Mèo's Tip 🐾: 'generate sustainable electricity without harmful carbon emissions.'",
      },
      {
        id: 'quiz-2',
        question: 'What are young innovators developing to replace plastics?',
        options: ['Biodegradable materials', 'Fossil fuels', 'Metal cans', 'Coal'],
        correctIndex: 0,
        explanation: "Ms Mèo's Tip 🐾: The text mentions 'biodegradable materials to replace single-use plastics.'",
      },
      {
        id: 'quiz-3',
        question: 'What harmful emissions do clean energy sources avoid?',
        options: ['Carbon emissions', 'Sound waves', 'Sunlight', 'Water vapor'],
        correctIndex: 0,
        explanation: "Ms Mèo's Tip 🐾: Renewable energy avoids harmful carbon emissions!",
      },
    ];
  }

  // Preset 3: Artificial Intelligence & Future Classrooms
  if (lowerText.includes('artificial intelligence') || lowerText.includes('classrooms') || lowerText.includes('teacher')) {
    return [
      {
        id: 'quiz-1',
        question: 'Who remains indispensable for emotional encouragement?',
        options: ['Human teacher', 'Robot', 'Calculator', 'Computer'],
        correctIndex: 0,
        explanation: "Ms Mèo's Tip 🐾: 'the human teacher remains indispensable for emotional encouragement.'",
      },
      {
        id: 'quiz-2',
        question: 'What can interactive learning platforms adapt to?',
        options: ['Learning pace', 'Weather', 'School bell', 'Room size'],
        correctIndex: 0,
        explanation: "Ms Mèo's Tip 🐾: Platforms 'adapt instantly to a student\'s personal learning pace.'",
      },
      {
        id: 'quiz-3',
        question: 'Which skill must be balanced with modern technology?',
        options: ['Critical thinking', 'Daydreaming', 'Fast typing', 'Memorization'],
        correctIndex: 0,
        explanation: "Ms Mèo's Tip 🐾: 'Balancing modern technology with authentic critical thinking will prepare students.'",
      },
    ];
  }

  // Preset 4: A Morning Walk in Covent Garden
  if (lowerText.includes('covent garden') || lowerText.includes('london') || lowerText.includes('violin')) {
    return [
      {
        id: 'quiz-1',
        question: 'In which city does this morning walk take place?',
        options: ['London', 'Paris', 'Tokyo', 'New York'],
        correctIndex: 0,
        explanation: "Ms Mèo's Tip 🐾: 'The morning air in London felt crisp and refreshing.'",
      },
      {
        id: 'quiz-2',
        question: 'Which instrument echoed through the market square?',
        options: ['Violin', 'Drums', 'Trumpet', 'Flute'],
        correctIndex: 0,
        explanation: "Ms Mèo's Tip 🐾: Travelers 'stopped to listen to violin melodies echoing through the market square.'",
      },
      {
        id: 'quiz-3',
        question: 'What filled the cobblestone alleys with a sweet aroma?',
        options: ['Pastries', 'Flowers', 'Coffee', 'Perfume'],
        correctIndex: 0,
        explanation: "Ms Mèo's Tip 🐾: 'Freshly baked pastries filled the cobblestone alleys with an enticing sweet aroma.'",
      },
    ];
  }

  // Dynamic Generator for any arbitrary user text:
  // Extracts key nouns, numbers, or sentence count to produce concise, simple questions
  const questions: QuizQuestion[] = [];
  const totalSent = sentences.length;

  // Question A: Number / Quantity check
  const numberMatch = fullText.match(/\b(\d+|fifteen|twenty|thirty|ten|five|two|three|four|one|hundred)\b/i);
  if (numberMatch) {
    const rawNum = numberMatch[1];
    questions.push({
      id: 'quiz-num',
      question: `Which number or quantity is mentioned in the passage?`,
      options: [rawNum, '99', '1,000', '0'],
      correctIndex: 0,
      explanation: `Ms Mèo's Tip 🐾: The number "${rawNum}" is stated directly in the text!`,
    });
  }

  // Question B: Key vocabulary from sentence 1
  const s1Words = sentences[0]?.words.filter((w) => w.length >= 4 && !COMMON_STOPWORDS.has(w.toLowerCase())) || [];
  const keyWord1 = s1Words[0] || 'English';
  questions.push({
    id: 'quiz-key1',
    question: `Which key term is introduced in the first sentence?`,
    options: [keyWord1, 'Astronomy', 'Algebra', 'Submarine'],
    correctIndex: 0,
    explanation: `Ms Mèo's Tip 🐾: "${keyWord1}" appears right at the beginning of the text.`,
  });

  // Question C: Supporting idea / noun from sentence 2 or mid sentence
  const midSent = sentences[Math.floor(sentences.length / 2)] || sentences[0];
  const midWords = midSent.words.filter((w) => w.length >= 4 && !COMMON_STOPWORDS.has(w.toLowerCase()) && w !== keyWord1);
  const keyWord2 = midWords[0] || (s1Words[1] || 'Practice');
  questions.push({
    id: 'quiz-key2',
    question: `Which concept supports the main discussion in the text?`,
    options: [keyWord2, 'Volcanoes', 'Pyramids', 'Dinosaurs'],
    correctIndex: 0,
    explanation: `Ms Mèo's Tip 🐾: "${keyWord2}" is one of the important keywords in this passage!`,
  });

  // Question D: Sentence structure / count question
  if (questions.length < 3) {
    questions.push({
      id: 'quiz-count',
      question: `How many sentences does this practice passage contain?`,
      options: [
        `${totalSent}`,
        `${totalSent + 3}`,
        `${Math.max(1, totalSent - 2)}`,
        `${totalSent + 7}`,
      ],
      correctIndex: 0,
      explanation: `Ms Mèo's Tip 🐾: Ms Mèo detected exactly ${totalSent} complete sentences in your text.`,
    });
  }

  return questions.slice(0, 4);
}

/**
 * Task 4: Intelligent Ms Mèo Chatbot Response Generator.
 * Provides rich, high-school-tailored explanations for grammar, vocabulary, summaries, and dialogues.
 * STRICT SINGLE-LANGUAGE RULE: Output in 100% of one language only (never mix English & Vietnamese).
 */
export function isVietnameseQuery(text: string): boolean {
  const vnRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  const vnKeywords = /\b(cô|em|ơi|giải thích|phát âm|tiếng việt|bài đọc|nghĩa là|sửa lỗi|nhận xét|cho em|thế nào|tại sao|như thế|hỏi|câu hỏi|ngữ pháp|từ vựng)\b/i;
  return vnRegex.test(text) || vnKeywords.test(text);
}

export function generateMsMeoReply(
  userQuery: string,
  fullText: string,
  sentences: AnalyzedSentence[],
  languageMode: 'en' | 'vi' | 'auto' = 'auto'
): { responseText: string; cleanAudioText: string } {
  const queryLower = userQuery.toLowerCase();
  const useVietnamese = languageMode === 'vi' || (languageMode === 'auto' && isVietnameseQuery(userQuery));

  let reply = '';

  if (useVietnamese) {
    // 100% VIETNAMESE BRANCH - NO MIXING
    if (queryLower.includes('phát âm') || queryLower.includes('pronun') || queryLower.includes('âm') || queryLower.includes('accent')) {
      const sampleWords = sentences
        .flatMap((s) => s.words)
        .filter((w) => w.length >= 6)
        .slice(0, 3);
      const w1 = sampleWords[0] || 'technology';
      const w2 = sampleWords[1] || 'environment';

      reply = `Góc luyện phát âm của Ms Mèo 🎙️🐾

Chào em! Để nói tiếng Anh tự nhiên và chuẩn xác trong bài đọc này, em hãy ghi nhớ 3 bí quyết sau:

1. Bắt buộc bật rõ các âm đuôi (ending sounds) như /-s/, /-z/, /-ed/, /-t/. Người Việt thường quên phát âm âm đuôi, nhưng đây là yếu tố then chốt giúp người bản xứ hiểu em nói số ít hay số nhiều, hiện tại hay quá khứ!
2. Chú ý trọng âm các từ nhiều âm tiết trong bài: Hãy nhấn mạnh vào âm tiết mang trọng âm của các từ như "${w1}" và "${w2}".
3. Nối âm và ngữ điệu: Nối phụ âm cuối của từ đứng trước với nguyên âm đầu của từ đứng sau, lên giọng nhẹ ở dấu phẩy và hạ giọng khi kết thúc câu.

Em hãy mở tab Luyện phát âm (Shadowing Studio) và ghi âm thử câu đầu tiên nhé!`;
    } else if (queryLower.includes('lỗi') || queryLower.includes('sửa') || queryLower.includes('mistake') || queryLower.includes('ngữ pháp')) {
      reply = `Phòng khám lỗi khi nói cùng Ms Mèo 🩺🐾

Rất khen ngợi tinh thần dám nói của em! Dưới đây là 3 lỗi phổ biến nhất học sinh THPT hay gặp và cách sửa ngay:

1. Lỗi hòa hợp chủ vị: Khi chủ ngữ là đại từ bất định như "everyone" hay "each student", động từ phải chia ở ngôi thứ ba số ít.
2. Dùng sai giới từ: Người học hay dịch từ tiếng Việt nên dễ nhầm. Hãy nhớ cụm chuẩn là "interested in", "fond of", "keen on".
3. Dịch thô từng từ: Thay vì nói ghép chữ, hãy dùng các cụm tự nhiên như "I really enjoy reading" thay vì "I very like reading".

Mỗi khi em nói chuyện với cô qua Live Voice Call, cô sẽ lắng nghe và gợi ý câu chuẩn tự nhiên nhất cho em nhé!`;
    } else if (queryLower.includes('chủ đề') || queryLower.includes('hỏi') || queryLower.includes('topic') || queryLower.includes('nội dung')) {
      const topicLead = sentences[0]?.cleanText || fullText.slice(0, 80);
      reply = `Thảo luận chủ đề bài đọc cùng Ms Mèo 💬🐾

Bài đọc của chúng ta xoay quanh nội dung:
"${topicLead}"

Cô có 3 câu hỏi gợi mở để em luyện phản xạ nói:
1. Theo em, ý chính quan trọng nhất mà tác giả muốn gửi gắm trong bài đọc là gì?
2. Em thấy nội dung này có liên hệ gì tới đời sống hoặc việc học tập của học sinh hiện nay?
3. Nếu đưa ra một giải pháp hoặc ý kiến cá nhân về chủ đề này, em sẽ nói gì?

Em hãy bấm micro và trả lời cho cô nghe bằng tiếng Anh hoặc tiếng Việt nhé! ☕🐱`;
    } else if (queryLower.includes('từ vựng') || queryLower.includes('nghĩa') || queryLower.includes('word')) {
      const words = sentences
        .flatMap((s) => s.words)
        .map((w) => w.toLowerCase().replace(/[^\w]/g, ''))
        .filter((w) => w.length >= 5 && !COMMON_STOPWORDS.has(w));
      const uWords = Array.from(new Set(words)).slice(0, 3);
      reply = `Điểm sáng từ vựng trọng tâm từ Ms Mèo 🐱✨

Dưới đây là các từ vựng học thuật quan trọng nhất trích từ bài đọc:
- "${uWords[0] || 'foundation'}": Nền tảng, cơ sở vững chắc để phát triển kiến thức.
- "${uWords[1] || 'perspective'}": Góc nhìn, quan điểm đa chiều về một vấn đề.
- "${uWords[2] || 'consistent'}": Tính kiên trì, nhất quán và đều đặn theo thời gian.

Em hãy ghi nhớ các từ này vào sổ tay từ vựng để vận dụng vào bài thi THPT nhé!`;
    } else {
      reply = `Ms Mèo luôn sẵn sàng đồng hành cùng em! 🐱

Về câu hỏi của em: "${userQuery}"

Để làm chủ bài học tiếng Anh này một cách hiệu quả nhất, cô khuyên em nên:
1. Sang phòng Shadowing Studio để luyện phát âm và kiểm tra độ chuẩn xác từng câu.
2. Làm bài trắc nghiệm đọc hiểu Comprehension Quiz để nắm trọn ý chính bài đọc.
3. Thử sức với phòng Smart Dictation để rèn luyện thính giác và kiểm tra chính tả.

Em có thể hỏi cô bất cứ điều gì về phát âm, ngữ pháp hoặc bấm nút Live Voice Call để đàm thoại trực tiếp cùng cô nhé!`;
    }
  } else {
    // 100% ENGLISH BRANCH - NO MIXING
    if (queryLower.includes('pronun') || queryLower.includes('accent') || queryLower.includes('sound') || queryLower.includes('intonation')) {
      const sampleWords = sentences
        .flatMap((s) => s.words)
        .filter((w) => w.length >= 6)
        .slice(0, 3);
      const w1 = sampleWords[0] || 'technology';
      const w2 = sampleWords[1] || 'environment';

      reply = `Ms Mèo's Pronunciation Clinic 🎙️🐾

Meow! Here is how to perfect your spoken English rhythm for this lesson:

1. Crucial Ending Sounds: Pay close attention to ending sounds like /-s/, /-z/, /-ed/, and /-t/. They clearly distinguish singular from plural and present from past tense.
2. Syllable Stress: Look at multi-syllable words from our text such as "${w1}" and "${w2}". Accentuate the stressed vowel while keeping unstressed vowels light and crisp.
3. Linking & Intonation: Connect final consonants to following vowels, raise your pitch slightly at commas, and finish thoughts with a gentle downward pitch.

Try sentence number 1 in the Shadowing Studio right now to train your vocal muscle memory!`;
    } else if (queryLower.includes('mistake') || queryLower.includes('error') || queryLower.includes('correct') || queryLower.includes('grammar')) {
      reply = `Ms Mèo's Speaking Error Doctor 🩺🐾

Great initiative to speak out! Here are 3 common speaking slips high school learners make and how to fix them:

1. Subject-Verb Agreement: When using indefinite pronouns like "everyone" or "each student", always use singular verb forms.
2. Preposition Pairings: Use standard collocations like "interested in", "fond of", and "keen on" instead of literal translations.
3. Natural Phrasing: Prefer "I really enjoy reading" over awkward word-for-word translated phrases.

Whenever you speak on the Live Voice Call, I will listen attentively and suggest the most natural, native phrasing!`;
    } else if (queryLower.includes('topic') || queryLower.includes('question') || queryLower.includes('discuss') || queryLower.includes('idea')) {
      const topicLead = sentences[0]?.cleanText || fullText.slice(0, 90);
      reply = `Ms Mèo's Topic Discussion Lab 💬🐾

Our reading passage highlights this central idea:
"${topicLead}"

Here are 3 open questions to help you express your thoughts:
1. In your own words, what is the most significant takeaway from this text?
2. How does this topic relate to everyday life or your school studies?
3. If you were invited to propose a personal solution or idea, what would you suggest?

Speak your thoughts into the microphone or share them here, and let's explore together! ☕🐱`;
    } else if (queryLower.includes('vocabulary') || queryLower.includes('word') || queryLower.includes('meaning')) {
      const words = sentences
        .flatMap((s) => s.words)
        .map((w) => w.toLowerCase().replace(/[^\w]/g, ''))
        .filter((w) => w.length >= 5 && !COMMON_STOPWORDS.has(w));
      const uWords = Array.from(new Set(words)).slice(0, 3);
      reply = `Ms Mèo's Vocabulary Spotlight 🐱✨

Here are academic target words selected from your reading passage:
- "${uWords[0] || 'foundation'}" (noun): The solid base upon which something develops.
- "${uWords[1] || 'perspective'}" (noun): A particular outlook or way of regarding situations.
- "${uWords[2] || 'consistent'}" (adjective): Acting or developing in an orderly, steady manner over time.

Add these words to your study notebook and try using them in your next spoken response!`;
    } else if (queryLower.includes('summar') || queryLower.includes('main idea') || queryLower.includes('point')) {
      const s1 = sentences[0]?.cleanText || 'The text opens with a meaningful introduction.';
      const sMid = sentences[Math.floor(sentences.length / 2)]?.cleanText || 'Key supporting points elaborate on the theme.';
      const sEnd = sentences[sentences.length - 1]?.cleanText || 'The passage wraps up with an inspiring conclusion.';

      reply = `Ms Mèo's Quick Summary 🐾

Here is the entire passage summarized in 3 concise points:
• Introduction: ${s1.slice(0, 110)}
• Key Supporting Idea: ${sMid.slice(0, 110)}
• Concluding Message: ${sEnd.slice(0, 110)}

Summarizing ideas in your own words is the quickest path to reading comprehension excellence!`;
    } else {
      reply = `Ms Mèo is here to guide your English journey! 🐱

Regarding your inquiry: "${userQuery}"

To make the most of this lesson, here is what I recommend:
1. Head over to the Shadowing Studio to practice sentence pacing and rhythm.
2. Complete the Comprehension Quiz to test your mastery of key points.
3. Try the Smart Dictation exercise to sharpen your spelling and auditory recognition.

Feel free to ask me about pronunciation, vocabulary, or jump on the Live Voice Call to speak with me directly!`;
    }
  }

  // Audio clean version: Strip speaker tags so TTS reads dialogue naturally
  const cleanAudioText = reply
    .replace(/(?:Ms Mèo|Student|Teacher|Person A|Person B):\s*/gi, '')
    .replace(/\*\*([A-Za-z0-9\s.À-ỹ]+):\*\*/g, '')
    .replace(/^[#*>-]+\s+/gm, '')
    .replace(/[`*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    responseText: reply,
    cleanAudioText,
  };
}

/**
 * 4 High School Sample English Texts for instantaneous testing.
 */
export const SAMPLE_TEXTS = [
  {
    id: 'habits',
    title: 'The Power of Daily Habits',
    level: 'High School General',
    text: `Small daily habits create remarkable results over time. When students read English for just fifteen minutes every morning, their vocabulary naturally expands. Consistency always beats intensity because the human brain thrives on repetition. Small improvements accumulate like compound interest, transforming quiet learners into confident communicators. Stay patient and celebrate every little step forward.`,
  },
  {
    id: 'climate',
    title: 'Climate Action & Green Innovation',
    level: 'Environmental Science',
    text: `Clean energy technologies are revolutionizing the modern world. Solar panels and offshore wind farms generate sustainable electricity without harmful carbon emissions. However, transitioning away from fossil fuels requires courageous policy decisions and dedicated scientific research. Young innovators worldwide are now developing biodegradable materials to replace single-use plastics. Protecting our shared planet demands immediate global cooperation.`,
  },
  {
    id: 'ai-education',
    title: 'Artificial Intelligence & Future Classrooms',
    level: 'Technology & Society',
    text: `Artificial intelligence is reshaping high school education in unexpected ways. Interactive learning platforms can adapt instantly to a student's personal learning pace. While automated tools provide immediate feedback, the human teacher remains indispensable for emotional encouragement and ethical guidance. Balancing modern technology with authentic critical thinking will prepare students for tomorrow's dynamic global careers.`,
  },
  {
    id: 'london-journey',
    title: 'A Morning Walk in Covent Garden',
    level: 'Literature & Narrative',
    text: `The morning air in London felt crisp and refreshing. Street performers prepared their wooden instruments under the historic stone arches of Covent Garden. Freshly baked pastries filled the cobblestone alleys with an enticing sweet aroma. Eager travelers stopped to listen to violin melodies echoing through the market square. Every corner of the city revealed a fascinating new story waiting to be discovered.`,
  },
];

/**
  * 4 High School Sample English Conversations / Dialogues for role-play practice.
  */
export const SAMPLE_CONVERSATIONS = [
  {
    id: 'convo-university',
    title: 'Planning for the University Entrance Exam',
    level: 'High School Conversation',
    text: `Alex: Hi Sarah! Have you decided on your target university yet?
Sarah: Yes, I am preparing for Foreign Trade University. What about you?
Alex: I want to study Computer Science because artificial intelligence fascinates me.
Sarah: That sounds wonderful! How is your English preparation going?
Alex: I practice shadowing with Ms Mèo every day to improve my fluency.
Sarah: That is a smart strategy. Consistent practice makes a huge difference!`,
  },
  {
    id: 'convo-airport',
    title: 'At the International Airport & Flight Check-in',
    level: 'Travel & Daily Communication',
    text: `Officer: Good morning! May I see your passport and ticket, please?
Passenger: Good morning, Officer. Here they are.
Officer: Thank you. Are you checking in any luggage today?
Passenger: Just this single blue suitcase, and I have one carry-on backpack.
Officer: Please place your suitcase on the luggage scale.
Passenger: Sure thing. Could I request a window seat if possible?
Officer: Absolutely! Here is your boarding pass for Gate 14. Have a pleasant flight!`,
  },
  {
    id: 'convo-meo-coaching',
    title: 'Speaking Practice Session with Ms Mèo',
    level: 'School Dialogue with Teacher',
    text: `Ms Mèo: Meow! Welcome to today's English speaking session, dear student!
Student: Hello Ms Mèo! I am excited to practice my pronunciation today.
Ms Mèo: Wonderful enthusiasm! Today we focus on connected speech and rhythm.
Student: Sometimes I feel nervous when speaking in front of the whole class.
Ms Mèo: Take a deep breath and relax. Mistakes are simply stepping stones to fluency!
Student: Thank you Ms Mèo! Your encouragement always boosts my confidence.`,
  },
  {
    id: 'convo-environment',
    title: 'Youth Green Campaign & School Environment Project',
    level: 'Community & School Discussion',
    text: `Minh: Have you heard about our school's new recycling campaign?
Lan: Yes, I joined the volunteer club yesterday! We are eliminating plastic bottles.
Minh: That is fantastic! How can other students participate effectively?
Lan: We can bring personal water tumblers and plant more green trees around campus.
Minh: Count me in! Small green actions create a massive collective impact.`,
  },
];

