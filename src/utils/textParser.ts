import {
  AnalyzedSentence,
  DifficultyTier,
  QuizQuestion,
  ShadowingResult,
  WordComparison,
  WordRecognitionItem,
} from '../types';

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

    return {
      id: `sent-${idx + 1}`,
      originalText: sentence,
      cleanText: sentence.replace(/\s+/g, ' ').trim(),
      words,
      wordCount,
      charCount: sentence.length,
      tier,
      speaker,
      dialogueText: dialogueText || sentence.replace(/\s+/g, ' ').trim(),
    };
  });
}

/**
 * Filter sentences based on selected difficulty rules:
 * - Easy: 1 to 6 words, processes first 3 to 4 sentences (or shortest available)
 * - Medium: 7 to 14 words, processes up to 5 to 6 sentences
 * - Hard: 15+ words, processes ALL sentences in the text
 */
export function filterSentencesForTier(
  analyzedSentences: AnalyzedSentence[],
  tier: DifficultyTier
): AnalyzedSentence[] {
  if (tier === 'easy') {
    const directMatches = analyzedSentences.filter((s) => s.wordCount <= 6);
    if (directMatches.length > 0) {
      return directMatches.slice(0, 4);
    }
    // Fallback: pick the 3-4 shortest sentences in the passage
    const sorted = [...analyzedSentences].sort((a, b) => a.wordCount - b.wordCount);
    return sorted.slice(0, 4);
  }

  if (tier === 'medium') {
    const directMatches = analyzedSentences.filter((s) => s.wordCount >= 7 && s.wordCount <= 14);
    if (directMatches.length > 0) {
      return directMatches.slice(0, 6);
    }
    // Fallback: pick mid-length sentences
    const sorted = [...analyzedSentences].sort((a, b) => Math.abs(a.wordCount - 10) - Math.abs(b.wordCount - 10));
    return sorted.slice(0, 6);
  }

  // Hard Mode: 15+ words or ALL sentences
  const directMatches = analyzedSentences.filter((s) => s.wordCount >= 15);
  if (directMatches.length >= 3) {
    return directMatches;
  }
  return analyzedSentences;
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

/**
 * AI Pronunciation & Accuracy Diagnostic Evaluator:
 * Compares student spoken transcript against target sentence.
 * Returns word-by-word highlight coding (Green, Orange, Red) and Ms Mèo's advice.
 */
export function evaluatePronunciation(
  targetSentence: AnalyzedSentence,
  studentTranscript: string
): ShadowingResult {
  const targetWords = targetSentence.words.map((w) => w.toLowerCase().replace(/[^\w]/g, ''));
  const spokenWords = studentTranscript
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 0);

  const wordComparisons: WordComparison[] = [];
  const missedWords: string[] = [];
  const mispronouncedWords: { target: string; spoken: string }[] = [];
  const missingEndings: string[] = [];

  let spokenIdx = 0;
  let correctCount = 0;

  for (let i = 0; i < targetWords.length; i++) {
    const target = targetWords[i];
    const originalFormatted = targetSentence.words[i] || target;

    // Look in a small sliding window in spokenWords
    let bestMatchIdx = -1;
    let bestSim = 0;

    for (let j = spokenIdx; j < Math.min(spokenIdx + 3, spokenWords.length); j++) {
      const sim = wordSimilarity(target, spokenWords[j]);
      if (sim > bestSim) {
        bestSim = sim;
        bestMatchIdx = j;
      }
    }

    if (bestSim >= 0.82) {
      // Correct!
      wordComparisons.push({
        targetWord: originalFormatted,
        spokenWord: spokenWords[bestMatchIdx],
        status: 'correct',
      });
      correctCount += 1;
      spokenIdx = bestMatchIdx + 1;
    } else if (bestSim >= 0.45 && bestMatchIdx !== -1) {
      // Mispronounced or missing ending sound
      const spokenWord = spokenWords[bestMatchIdx];
      let detail = 'Sound variation detected';

      // Check ending sounds: -ed, -s, -ing
      if ((target.endsWith('ed') || target.endsWith('d')) && !spokenWord.endsWith('d')) {
        detail = 'Check ending -ed sound';
        missingEndings.push(`'-ed' in "${originalFormatted}"`);
      } else if ((target.endsWith('s') || target.endsWith('es')) && !spokenWord.endsWith('s')) {
        detail = 'Missing ending -s sound';
        missingEndings.push(`'-s' in "${originalFormatted}"`);
      } else if (target.endsWith('ing') && !spokenWord.endsWith('ing')) {
        detail = 'Missing -ing ending';
        missingEndings.push(`'-ing' in "${originalFormatted}"`);
      } else {
        mispronouncedWords.push({ target: originalFormatted, spoken: spokenWord });
      }

      wordComparisons.push({
        targetWord: originalFormatted,
        spokenWord,
        status: 'mispronounced',
        detailNote: detail,
      });
      correctCount += 0.5;
      spokenIdx = bestMatchIdx + 1;
    } else {
      // Omitted / Missed
      wordComparisons.push({
        targetWord: originalFormatted,
        status: 'omitted',
        detailNote: 'Omitted or unclear',
      });
      missedWords.push(originalFormatted);
    }
  }

  // Calculate final score (0 - 100)
  const rawScore = targetWords.length > 0 ? (correctCount / targetWords.length) * 100 : 0;
  const accuracyScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Cat Rating
  let ratingLabel = '🐾 92/100 - Purr-fect!';
  if (accuracyScore >= 90) {
    ratingLabel = `🐾 ${accuracyScore}/100 - Purr-fect! Golden Paw!`;
  } else if (accuracyScore >= 75) {
    ratingLabel = `🐾 ${accuracyScore}/100 - Great Whisker Work!`;
  } else if (accuracyScore >= 50) {
    ratingLabel = `🐾 ${accuracyScore}/100 - Good Paws! Keep Scratching!`;
  } else {
    ratingLabel = `🐾 ${accuracyScore}/100 - Cozy Warm-up Needed!`;
  }

  // Generate dynamic Cat Advice
  let catComment = '';
  if (accuracyScore >= 95) {
    catComment = `Meow-velous job! Your rhythm, pronunciation, and linking sounds sounded completely natural. You sounded just like a native speaker!`;
  } else if (accuracyScore >= 80) {
    if (missingEndings.length > 0) {
      catComment = `Almost purr-fect! Just be mindful of your ending sounds: pay extra attention to ${missingEndings.slice(0, 2).join(' and ')}. Keep your tongue relaxed!`;
    } else if (mispronouncedWords.length > 0) {
      catComment = `Wonderful rhythm! Focus slightly more on articulating "${mispronouncedWords[0].target}" — listen to Ms Mèo's sample voice once more to catch the vowel quality.`;
    } else {
      catComment = `Great flow! Your pacing was confident and clear. Practice once more at 1.0x speed to solidify your muscle memory!`;
    }
  } else if (accuracyScore >= 55) {
    if (missedWords.length > 0) {
      catComment = `Good effort! You skipped or swallowed "${missedWords.slice(0, 2).join('", "')}". Try listening at 0.75x slow speed and tap your paw to each word beat!`;
    } else {
      catComment = `Nice attempt! Some vowel sounds were a bit quick. Take a deep breath, listen to Ms Mèo, and shadow word-by-word with the audio player.`;
    }
  } else {
    catComment = `Don't worry, little learner! English vowels and endings take patience. Turn on "🔁 Loop Shadowing", listen three times, and repeat softly until the sounds feel cozy on your tongue!`;
  }

  return {
    sentenceId: targetSentence.id,
    studentTranscript,
    accuracyScore,
    ratingLabel,
    catComment,
    wordComparisons,
    timestamp: Date.now(),
  };
}

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

