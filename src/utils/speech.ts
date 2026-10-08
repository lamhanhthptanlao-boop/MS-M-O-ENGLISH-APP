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

/**
 * Heuristics to detect gender of a system voice.
 */
export function detectVoiceGender(voice: SpeechSynthesisVoice): 'female' | 'male' | 'unknown' {
  const name = voice.name.toLowerCase();
  
  const femaleKeywords = [
    'female', 'zira', 'samantha', 'victoria', 'karen', 'jenny', 'susan', 'fiona', 
    'moira', 'tessa', 'ava', 'aria', 'cora', 'sara', 'emma', 'olivia', 'mia', 
    'hazel', 'clara', 'catherine', 'allison', 'kate', 'joana', 'veena', 'priya'
  ];
  const maleKeywords = [
    'male', 'david', 'george', 'guy', 'james', 'richard', 'daniel', 'tom', 
    'alex', 'mark', 'michael', 'eric', 'brian', 'arthur', 'rishi', 'oliver', 
    'liam', 'noah', 'william', 'thomas', 'fred'
  ];

  if (femaleKeywords.some((kw) => name.includes(kw))) return 'female';
  if (maleKeywords.some((kw) => name.includes(kw))) return 'male';
  return 'unknown';
}

/**
 * Heuristics to detect voice age profile.
 */
export function detectVoiceAge(voice: SpeechSynthesisVoice): 'child' | 'adult' | 'senior' {
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
 * Filter voices based on accent, gender, and age settings.
 */
export function filterVoices(
  allVoices: SpeechSynthesisVoice[],
  accent: NativeAccent,
  gender: VoiceGender,
  age: VoiceAge
): SpeechSynthesisVoice[] {
  // First, prefer English voices
  const englishVoices = allVoices.filter((v) => v.lang.startsWith('en'));
  const candidatePool = englishVoices.length > 0 ? englishVoices : allVoices;

  return candidatePool.filter((voice) => {
    // Accent filter
    if (accent !== 'all') {
      if (accent === 'en-US' && !voice.lang.toLowerCase().startsWith('en-us')) return false;
      if (accent === 'en-GB' && !voice.lang.toLowerCase().startsWith('en-gb')) return false;
      if (accent === 'en-AU' && !voice.lang.toLowerCase().startsWith('en-au')) return false;
      if (accent === 'en-CA' && !voice.lang.toLowerCase().startsWith('en-ca')) return false;
      if (accent === 'other') {
        const lang = voice.lang.toLowerCase();
        if (lang.startsWith('en-us') || lang.startsWith('en-gb') || lang.startsWith('en-au') || lang.startsWith('en-ca')) {
          return false;
        }
      }
    }

    // Gender filter
    if (gender !== 'all') {
      const detectedGender = detectVoiceGender(voice);
      if (detectedGender !== 'unknown' && detectedGender !== gender) {
        return false;
      }
    }

    // Age filter
    if (age !== 'all') {
      const detectedAge = detectVoiceAge(voice);
      if (detectedAge !== age) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Helper to resolve the exact SpeechSynthesisVoice matching the user's VoiceSettings
 * (taking into account accent, gender, age filter, and voiceIndex).
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
  return allVoices[0] || null;
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
