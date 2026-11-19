import { NativeAccent, VoiceAge, VoiceGender, VoiceSettings } from '../types';

/**
 * CRITICAL SPEAKER TAG STRIPPING RULE (AUDIO CLEANING):
 * When Ms Mèo responds or when reading dialogue out loud via TTS,
 * the speech engine MUST automatically clean the text by removing speaker names/character tags
 * (e.g., stripping "Alice:", "John:", "Teacher:", "Ms Mèo:", "Person A:", "**Ms Mèo:**")
 * so the audio reads ONLY the actual spoken conversation naturally.
 */
export function stripSpeakerTags(rawText: string): string {
  if (!rawText) return '';

  return (
    rawText
      // Remove Markdown bold/italic wraps around speaker names: **Ms Mèo:** or *Teacher:*
      .replace(/\*\*([A-Za-z0-9\s.À-ỹ]+):\*\*/g, '')
      .replace(/\*([A-Za-z0-9\s.À-ỹ]+):\*/g, '')
      // Remove common speaker label prefixes: e.g. "Ms Mèo:", "Teacher:", "Student:", "Person A:", "Alice:", "John:"
      .replace(/^[A-Za-z0-9\s.À-ỹ]{2,20}:\s*/gm, '')
      // Remove inline dialogue speaker tags at line starts or after quotes
      .replace(/(?:^|\n)\s*(?:Ms Mèo|Ms Meo|Teacher|Student|Person [A-Z]|Speaker \d+|Alice|Bob|John|Sarah|Narrator):\s*/gi, ' ')
      // Remove stage directions in parentheses or brackets e.g. "(smiling)", "[gently]"
      .replace(/\([a-zA-Z\s,.-]+\)/g, '')
      .replace(/\[[a-zA-Z\s,.-]+\]/g, '')
      // Remove markdown heading hashtags, list bullets, backticks
      .replace(/^[#*>-]+\s+/gm, '')
      .replace(/[`*]/g, '')
      // Collapse multiple whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
}

export interface DeviceVoiceLike {
  name: string;
  lang: string;
  default?: boolean;
  voiceURI?: string;
  localService?: boolean;
}

/**
 * Heuristics to detect gender of a system voice.
 */
export function detectVoiceGender(voice: DeviceVoiceLike): 'female' | 'male' | 'unknown' {
  const name = voice.name.toLowerCase();

  const femaleKeywords = [
    'female', 'zira', 'samantha', 'victoria', 'karen', 'jenny', 'susan', 'fiona',
    'moira', 'tessa', 'ava', 'aria', 'cora', 'sara', 'emma', 'olivia', 'mia',
    'hazel', 'clara', 'catherine', 'allison', 'kate', 'joana', 'veena', 'priya',
    'sonia', 'libby', 'natasha', 'serena', 'martha', 'nicky'
  ];
  const maleKeywords = [
    'male', 'david', 'george', 'guy', 'james', 'richard', 'daniel', 'tom',
    'alex', 'mark', 'michael', 'eric', 'brian', 'arthur', 'rishi', 'oliver',
    'liam', 'noah', 'william', 'thomas', 'fred', 'ryan', 'christopher', 'lee'
  ];

  if (femaleKeywords.some((kw) => name.includes(kw))) return 'female';
  if (maleKeywords.some((kw) => name.includes(kw))) return 'male';
  return 'unknown';
}

/**
 * Heuristics to detect voice age profile.
 */
export function detectVoiceAge(voice: DeviceVoiceLike): 'child' | 'adult' | 'senior' {
  const name = voice.name.toLowerCase();
  if (name.includes('junior') || name.includes('child') || name.includes('kid') || name.includes('ivy') || name.includes('justin')) {
    return 'child';
  }
  if (name.includes('grandpa') || name.includes('grandma') || name.includes('senior') || name.includes('elder')) {
    return 'senior';
  }
  return 'adult';
}

/**
 * Detection helper to identify high-fidelity, realistic, human-like neural voices
 * available in modern browsers (Edge Natural, Chrome Google, Apple Enhanced/Premium, Android).
 */
export function isRealisticVoice(voice: DeviceVoiceLike): boolean {
  const name = voice.name.toLowerCase();
  return (
    name.includes('natural') ||
    name.includes('neural') ||
    name.includes('online') ||
    name.includes('enhanced') ||
    name.includes('premium') ||
    name.includes('google') ||
    name.includes('siri') ||
    name.includes('studio') ||
    name.includes('wavenet') ||
    name.includes('high quality')
  );
}

/**
 * Rates the quality/naturalness score of a voice to bubble up the best human-sounding voices first.
 */
export function getVoiceQualityScore(voice: DeviceVoiceLike): number {
  const name = voice.name.toLowerCase();
  let score = 20;

  if (name.includes('natural') || name.includes('online')) {
    score += 80;
  } else if (name.includes('enhanced') || name.includes('premium') || name.includes('studio')) {
    score += 65;
  } else if (name.includes('google')) {
    score += 50;
  } else if (name.includes('siri')) {
    score += 45;
  }

  if (name.includes('jenny') || name.includes('aria') || name.includes('guy') || name.includes('sonia') || name.includes('samantha') || name.includes('ava') || name.includes('oliver')) {
    score += 15;
  }

  if (name.includes('desktop') || name.includes('espeak')) {
    score -= 15;
  }

  return score;
}

export interface RecommendedVoiceSpec {
  id: string;
  name: string;
  accent: NativeAccent;
  accentLabelVi: string;
  accentLabelEn: string;
  flag: string;
  gender: VoiceGender;
  roleVi: string;
  roleEn: string;
  descriptionVi: string;
  descriptionEn: string;
  preferredKeywords: string[];
  sampleSentence: string;
}

export const RECOMMENDED_REALISTIC_VOICES: RecommendedVoiceSpec[] = [
  {
    id: 'us-jenny-female',
    name: 'Jenny / Samantha (US Natural)',
    accent: 'en-US',
    accentLabelVi: 'Mỹ (US)',
    accentLabelEn: 'American (US)',
    flag: '🇺🇸',
    gender: 'female',
    roleVi: 'Giọng nữ chuẩn Mỹ tự nhiên & truyền cảm',
    roleEn: 'Warm & Natural US Female',
    descriptionVi: 'Giọng đọc nữ êm dịu, ngữ điệu chân thực như người bản xứ, cực kỳ rõ âm đuôi cho học sinh THPT.',
    descriptionEn: 'Expressive and clear American female voice, ideal for high school comprehension and rhythm.',
    preferredKeywords: ['jenny', 'aria', 'samantha', 'ava', 'google us', 'zira'],
    sampleSentence: "Hello! Listening attentively is the secret to sounding like a native speaker.",
  },
  {
    id: 'us-guy-male',
    name: 'Guy / Ryan (US Natural)',
    accent: 'en-US',
    accentLabelVi: 'Mỹ (US)',
    accentLabelEn: 'American (US)',
    flag: '🇺🇸',
    gender: 'male',
    roleVi: 'Giọng nam Mỹ thân thiện & rõ ràng',
    roleEn: 'Friendly & Expressive US Male',
    descriptionVi: 'Giọng nam ấm áp, tiết tấu tự nhiên, phát âm chuẩn xác từng phụ âm và nối âm.',
    descriptionEn: 'Friendly, warm native American male voice with natural cadence and clean linking sounds.',
    preferredKeywords: ['guy', 'ryan', 'alex', 'eric', 'david', 'google us'],
    sampleSentence: "Practice shadowing sentence by sentence, and you will notice quick improvements!",
  },
  {
    id: 'uk-sonia-female',
    name: 'Sonia / Libby (UK Natural RP)',
    accent: 'en-GB',
    accentLabelVi: 'Anh (UK)',
    accentLabelEn: 'British (UK)',
    flag: '🇬🇧',
    gender: 'female',
    roleVi: 'Giọng nữ Anh chuẩn Received Pronunciation (RP)',
    roleEn: 'Polite & Elegant British Female',
    descriptionVi: 'Ngữ điệu quý phái Anh-Anh chuẩn Cambridge & Oxford, trọng âm rõ rệt, tuyệt vời cho ôn thi học sinh giỏi.',
    descriptionEn: 'Standard British RP voice, refined pitch and impeccable intonation for exam preparation.',
    preferredKeywords: ['sonia', 'libby', 'hazel', 'victoria', 'google uk', 'fiona', 'serena', 'martha'],
    sampleSentence: "Welcome to today's English lesson. Please observe the rhythm and intonation closely.",
  },
  {
    id: 'uk-oliver-male',
    name: 'Oliver / George (UK Natural)',
    accent: 'en-GB',
    accentLabelVi: 'Anh (UK)',
    accentLabelEn: 'British (UK)',
    flag: '🇬🇧',
    gender: 'male',
    roleVi: 'Giọng nam Anh-Anh lịch thiệp chuẩn mực',
    roleEn: 'Refined Standard British Male',
    descriptionVi: 'Giọng nam Anh trầm ấm, chuẩn mực BBC, giúp rèn luyện khả năng bắt từ và nhận diện nối âm.',
    descriptionEn: 'Classic British male voice with natural pauses and authentic BBC-style delivery.',
    preferredKeywords: ['oliver', 'george', 'daniel', 'google uk', 'arthur', 'ryan'],
    sampleSentence: "Consistency in listening every day will dramatically elevate your fluency.",
  },
  {
    id: 'au-natasha-female',
    name: 'Natasha / Karen (AU Natural)',
    accent: 'en-AU',
    accentLabelVi: 'Úc (AU)',
    accentLabelEn: 'Australian (AU)',
    flag: '🇦🇺',
    gender: 'female',
    roleVi: 'Giọng nữ Úc thân thiện & tươi vui',
    roleEn: 'Vibrant Australian Female',
    descriptionVi: 'Giọng bản xứ Úc tự nhiên, độ mở nguyên âm chuẩn, giúp làm quen với nhiều accent thực tế.',
    descriptionEn: 'Authentic Australian English voice with lively rhythm and clear diphthongs.',
    preferredKeywords: ['natasha', 'karen', 'catherine', 'google australia'],
    sampleSentence: "G'day learners! Ready to tackle today's dialogue and sharpen your ears?",
  },
  {
    id: 'ca-liam-male',
    name: 'Liam / Clara (CA Natural)',
    accent: 'en-CA',
    accentLabelVi: 'Canada (CA)',
    accentLabelEn: 'Canadian (CA)',
    flag: '🇨🇦',
    gender: 'male',
    roleVi: 'Giọng Canada trung tính & dễ tiếp thu',
    roleEn: 'Smooth Canadian Native',
    descriptionVi: 'Chất giọng Bắc Mỹ trung tính, tròn vành rõ chữ, phù hợp cho học sinh mới làm quen luyện nghe.',
    descriptionEn: 'Neutral Canadian English cadence, exceptionally legible and smooth for all levels.',
    preferredKeywords: ['liam', 'clara', 'canadian'],
    sampleSentence: "Keep up the great work! Every single word you practice builds lasting confidence.",
  },
];

function normalizeLangTag(lang: string): string {
  return (lang || '').toLowerCase().replace('_', '-');
}

function matchesAccentTag(lang: string, accent: NativeAccent): boolean {
  if (accent === 'all') return true;
  const norm = normalizeLangTag(lang);
  if (accent === 'other') {
    return (
      norm.startsWith('en') &&
      !norm.startsWith('en-us') &&
      !norm.startsWith('en-gb') &&
      !norm.startsWith('en-au') &&
      !norm.startsWith('en-ca')
    );
  }
  return norm.startsWith(accent.toLowerCase());
}

/**
 * STRICT device-real matcher: returns a real device voice ONLY if the device genuinely has
 * an English voice matching that spec's accent (and gender if detected). Never spoofs accents!
 */
export function findStrictDeviceVoiceForSpec<T extends DeviceVoiceLike>(
  spec: RecommendedVoiceSpec,
  availableVoices: T[]
): T | null {
  if (!availableVoices || availableVoices.length === 0) return null;

  const accentVoices = availableVoices.filter((v) => matchesAccentTag(v.lang, spec.accent));
  if (accentVoices.length === 0) return null;

  // 1. Preferred keywords inside matching accent voices (respecting gender when known)
  for (const kw of spec.preferredKeywords) {
    const matched = accentVoices.find((v) => {
      if (!v.name.toLowerCase().includes(kw)) return false;
      const detectedGender = detectVoiceGender(v);
      return spec.gender === 'all' || detectedGender === 'unknown' || detectedGender === spec.gender;
    });
    if (matched) return matched;
  }

  // 2. Realistic voice matching accent + gender
  const naturalMatch = accentVoices.find((v) => {
    if (spec.gender === 'all') return isRealisticVoice(v);
    return detectVoiceGender(v) === spec.gender && isRealisticVoice(v);
  });
  if (naturalMatch) return naturalMatch;

  // 3. Any voice matching accent + gender (or unknown gender if accent has single voice matching gender explicitly)
  const genderMatch = accentVoices.find(
    (v) => spec.gender === 'all' || detectVoiceGender(v) === spec.gender
  );
  if (genderMatch) return genderMatch;

  // Only fall back within the SAME accent if voice gender metadata was 'unknown'
  const unknownGenderSameAccent = accentVoices.find((v) => detectVoiceGender(v) === 'unknown');
  return unknownGenderSameAccent || null;
}

export interface DeviceMatchedPreset<T extends DeviceVoiceLike = SpeechSynthesisVoice> {
  spec: RecommendedVoiceSpec;
  deviceVoice: T;
  deviceVoiceName: string;
}

/**
 * Returns ONLY recommended presets that actually map to real voices installed on this device.
 * If a device only has en-US and en-GB voices, AU and CA presets are NOT shown.
 */
export function getMatchingRecommendedSpecs<T extends DeviceVoiceLike>(
  availableVoices: T[]
): DeviceMatchedPreset<T>[] {
  if (!availableVoices || availableVoices.length === 0) return [];
  const results: DeviceMatchedPreset<T>[] = [];
  const usedVoiceKeys = new Set<string>();

  for (const spec of RECOMMENDED_REALISTIC_VOICES) {
    const match = findStrictDeviceVoiceForSpec(spec, availableVoices);
    if (!match) continue;
    const key = `${match.name}::${match.lang}`;
    if (usedVoiceKeys.has(key)) continue;
    usedVoiceKeys.add(key);
    results.push({
      spec,
      deviceVoice: match,
      deviceVoiceName: match.name,
    });
  }

  return results;
}

/**
 * Discovers which English accents actually exist on the current device.
 */
export function getDeviceSupportedAccents<T extends DeviceVoiceLike>(
  allVoices: T[]
): NativeAccent[] {
  if (!allVoices || allVoices.length === 0) return ['all'];
  const englishVoices = allVoices.filter((v) => normalizeLangTag(v.lang).startsWith('en'));
  const pool = englishVoices.length > 0 ? englishVoices : allVoices;
  const supported: NativeAccent[] = ['all'];
  const candidates: NativeAccent[] = ['en-US', 'en-GB', 'en-AU', 'en-CA', 'other'];
  for (const acc of candidates) {
    if (pool.some((v) => matchesAccentTag(v.lang, acc))) {
      supported.push(acc);
    }
  }
  return supported;
}

/**
 * Discovers which gender filters actually produce at least 1 real device voice.
 */
export function getDeviceSupportedGenders<T extends DeviceVoiceLike>(
  allVoices: T[],
  accent: NativeAccent
): VoiceGender[] {
  const accentPool = filterVoices(allVoices, accent, 'all', 'all');
  const genders: VoiceGender[] = ['all'];
  if (accentPool.some((v) => detectVoiceGender(v) === 'female')) genders.push('female');
  if (accentPool.some((v) => detectVoiceGender(v) === 'male')) genders.push('male');
  return genders;
}

/**
 * Backward-compatible helper that prioritizes strict accent matching; only falls back if caller uses legacy callers.
 */
export function findBestVoiceForSpec<T extends DeviceVoiceLike>(
  spec: RecommendedVoiceSpec,
  availableVoices: T[]
): T | null {
  return findStrictDeviceVoiceForSpec(spec, availableVoices);
}

/**
 * Filter real device voices based on accent, gender, and age settings,
 * AND sort realistic, human-like voices to the very top!
 * Returns [] if no real English/matching voice exists on this device (never fabricates voices).
 */
export function filterVoices<T extends DeviceVoiceLike>(
  allVoices: T[],
  accent: NativeAccent,
  gender: VoiceGender,
  age: VoiceAge
): T[] {
  if (!allVoices || allVoices.length === 0) return [];
  const englishVoices = allVoices.filter((v) => normalizeLangTag(v.lang).startsWith('en'));
  const candidatePool = englishVoices.length > 0 ? englishVoices : allVoices;

  const filtered = candidatePool.filter((voice) => {
    if (!matchesAccentTag(voice.lang, accent)) {
      return false;
    }

    if (gender !== 'all') {
      const detectedGender = detectVoiceGender(voice);
      if (detectedGender !== gender) {
        return false;
      }
    }

    if (age !== 'all') {
      const detectedAge = detectVoiceAge(voice);
      if (detectedAge !== age) {
        return false;
      }
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    const scoreA = getVoiceQualityScore(a);
    const scoreB = getVoiceQualityScore(b);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Helper to resolve the exact SpeechSynthesisVoice matching the user's VoiceSettings
 * from voices genuinely available on the device.
 */
export function resolveSelectedVoice(settings: VoiceSettings): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }
  const allVoices = window.speechSynthesis.getVoices();
  if (!allVoices || allVoices.length === 0) return null;

  const filtered = filterVoices(allVoices, settings.accent, settings.gender, settings.age);
  if (filtered.length > 0) {
    return filtered[settings.voiceIndex] || filtered[0];
  }
  const englishVoices = filterVoices(allVoices, 'all', 'all', 'all');
  return englishVoices[0] || allVoices[0] || null;
}

/**
 * Web Speech Synthesis TTS player.
 */
class TTSController {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isLooping = false;
  private loopTimeoutId: number | null = null;

  public stop() {
    this.isLooping = false;
    if (this.loopTimeoutId) {
      window.clearTimeout(this.loopTimeoutId);
      this.loopTimeoutId = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
  }

  public speak(
    rawText: string,
    voice: SpeechSynthesisVoice | null,
    settings: VoiceSettings,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: unknown) => void,
    onBoundary?: (charIndex: number, charLength?: number) => void
  ) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onError?.(new Error('Speech synthesis is not supported on this browser.'));
      return;
    }

    this.stop();

    // Critical speaker tag clean
    const cleanedText = stripSpeakerTags(rawText);
    if (!cleanedText) {
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'en-US';
    }

    utterance.rate = settings.rate;
    
    // Apply pitch based on age profile setting
    let effectivePitch = settings.pitch || 1.0;
    if (settings.age === 'child') effectivePitch = 1.35;
    if (settings.age === 'senior') effectivePitch = 0.82;
    utterance.pitch = effectivePitch;

    utterance.onstart = () => {
      onStart?.();
    };

    if (onBoundary) {
      utterance.onboundary = (event: SpeechSynthesisEvent) => {
        // Support all browsers: Chromium provides name 'word', WebKit / others may provide empty or undefined name
        if (!event.name || event.name === 'word') {
          if (typeof event.charIndex === 'number') {
            onBoundary(event.charIndex, event.charLength);
          }
        }
      };
    }

    utterance.onend = () => {
      this.currentUtterance = null;
      onEnd?.();
    };

    utterance.onerror = (event) => {
      if (event.error === 'interrupted' || event.error === 'canceled') {
        // Normal cancellation
        return;
      }
      this.currentUtterance = null;
      onError?.(event);
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  public startLoop(
    text: string,
    voice: SpeechSynthesisVoice | null,
    settings: VoiceSettings,
    intervalMs = 1800,
    onLoopCycleStart?: () => void,
    onError?: (err: unknown) => void
  ) {
    this.stop();
    this.isLooping = true;

    const runCycle = () => {
      if (!this.isLooping) return;
      this.speak(
        text,
        voice,
        settings,
        () => onLoopCycleStart?.(),
        () => {
          if (!this.isLooping) return;
          this.loopTimeoutId = window.setTimeout(() => {
            if (this.isLooping) {
              runCycle();
            }
          }, intervalMs);
        },
        onError
      );
    };

    runCycle();
  }
}

export const ttsController = new TTSController();

/**
 * Web Speech Recognition helper.
 */
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

export function createSpeechRecognizer(
  onTranscriptChange: (transcript: string, isFinal: boolean) => void,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: string) => void
): SpeechRecognitionInstance | null {
  if (typeof window === 'undefined') return null;

  const SpeechRecognitionClass =
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    onError?.('Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.');
    return null;
  }

  try {
    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      onStart?.();
    };

    recognition.onresult = (event: unknown) => {
      const recognitionEvent = event as {
        resultIndex: number;
        results: {
          length: number;
          [index: number]: {
            isFinal: boolean;
            [transcriptIndex: number]: { transcript: string };
          };
        };
      };

      let currentTranscript = '';
      let isFinal = false;

      for (let i = recognitionEvent.resultIndex; i < recognitionEvent.results.length; i++) {
        const res = recognitionEvent.results[i];
        if (res && res[0]) {
          currentTranscript += res[0].transcript;
          if (res.isFinal) {
            isFinal = true;
          }
        }
      }

      onTranscriptChange(currentTranscript.trim(), isFinal);
    };

    recognition.onerror = (event: unknown) => {
      const errEvent = event as { error: string };
      let message = 'Microphone error occurred.';
      if (errEvent.error === 'not-allowed') {
        message = 'Microphone access was denied. Please allow microphone permissions in your browser.';
      } else if (errEvent.error === 'no-speech') {
        message = 'No speech detected. Please speak closer to your microphone.';
      } else if (errEvent.error === 'network') {
        message = 'Network error during recognition. Please check your internet connection.';
      }
      onError?.(message);
    };

    recognition.onend = () => {
      onEnd?.();
    };

    return recognition;
  } catch (e) {
    onError?.('Failed to initialize speech recognition: ' + (e instanceof Error ? e.message : String(e)));
    return null;
  }
}
