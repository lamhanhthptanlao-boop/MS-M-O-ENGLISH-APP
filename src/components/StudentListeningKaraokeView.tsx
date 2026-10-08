import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Repeat,
  Sparkles,
  Send,
  BookOpen,
  MessageSquare,
  Users,
  Calendar,
  CheckCircle2,
  Languages,
  Sliders,
  Check,
  Trophy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Gauge,
  Zap,
} from 'lucide-react';
import { Assignment, AnalyzedSentence, VoiceSettings, NativeAccent } from '../types';
import { ttsController, resolveSelectedVoice, filterVoices, stripSpeakerTags } from '../utils/speech';
import { playSuccessChime, playSoftTone, playPurr } from '../utils/audio';
import { submitAssignmentResult } from '../storage/assignments';
import mascotImg from '../assets/images/ms_meo_mascot_1790341757214.jpg';

export interface KaraokeWordToken {
  word: string; // The token displayed in UI, e.g. "Hello,", "tomorrow."
  cleanWord: string; // Stripped of outer punctuation for single-word pronunciation / definition
  startIndex: number; // Exact char index in spokenText
  endIndex: number; // Exact char index in spokenText
  weight: number; // Estimated duration weight for smooth fallback
}

/**
 * Returns clean dialogue speech text without speaker tags, stage directions, or markdown.
 */
export function getCleanDialogueText(sentence?: AnalyzedSentence | null): string {
  if (!sentence) return '';
  const raw = sentence.dialogueText || sentence.cleanText || sentence.originalText || '';
  return stripSpeakerTags(raw);
}

/**
 * Tokenize speech text into discrete word tokens preserving character offsets
 * and calculating speech weights based on syllable/length heuristics and punctuation pauses.
 */
export function tokenizeSentenceWords(text: string): KaraokeWordToken[] {
  if (!text) return [];
  const tokens: KaraokeWordToken[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const rawWord = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + rawWord.length;
    const cleanWord = rawWord.replace(/^[^\w]+|[^\w]+$/g, '').trim() || rawWord;

    // Weight calculation based on syllables/length + pause for punctuation
    let weight = Math.max(1, Math.min(6, rawWord.length * 0.45));
    if (/[,;:]$/.test(rawWord)) {
      weight += 1.6; // Natural pause for comma / colon
    } else if (/[.!?]$/.test(rawWord)) {
      weight += 2.2; // Sentence ending pause
    } else if (/[-—]$/.test(rawWord)) {
      weight += 1.0;
    }

    tokens.push({
      word: rawWord,
      cleanWord,
      startIndex,
      endIndex,
      weight,
    });
  }

  return tokens;
}

/**
 * Match charIndex from Web Speech API's onboundary event to the exact word token.
 */
export function findWordIndexForChar(charIndex: number, tokens: KaraokeWordToken[]): number {
  if (!tokens || tokens.length === 0) return -1;
  if (tokens.length === 1) return 0;
  if (charIndex <= tokens[0].startIndex) return 0;
  if (charIndex >= tokens[tokens.length - 1].startIndex) return tokens.length - 1;

  for (let i = 0; i < tokens.length; i++) {
    const curr = tokens[i];
    const next = tokens[i + 1];
    if (next) {
      if (charIndex >= curr.startIndex && charIndex < next.startIndex) {
        return i;
      }
    } else {
      if (charIndex >= curr.startIndex) {
        return i;
      }
    }
  }
  return 0;
}

interface StudentListeningKaraokeViewProps {
  assignment: Assignment;
  sentences: AnalyzedSentence[];
  rawText: string;
  language?: 'en' | 'vi';
  voiceSettings: VoiceSettings;
  onUpdateVoiceSettings?: (settings: VoiceSettings) => void;
  onSwitchToOtherTask?: (task: string) => void;
  onExitStudentMode?: () => void;
  availableVoices?: SpeechSynthesisVoice[];
}

export const StudentListeningKaraokeView: React.FC<StudentListeningKaraokeViewProps> = ({
  assignment,
  sentences,
  rawText,
  language = 'en',
  voiceSettings,
  onUpdateVoiceSettings,
  onSwitchToOtherTask,
  onExitStudentMode,
  availableVoices = [],
}) => {
  const isEn = language === 'en';
  const isConversation = assignment.lessonFormat === 'conversation';

  // Playback state
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);
  const [isLoopingSentence, setIsLoopingSentence] = useState<boolean>(false);
  const [autoPlayFull, setAutoPlayFull] = useState<boolean>(true);

  // Dedicated playback rate specifically for listening mode (completely independent of global voiceSettings)
  const [listeningSpeed, setListeningSpeed] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ms_meo_listening_speed');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 2.0) {
          return parsed;
        }
      }
    }
    return 1.0;
  });

  const [showBilingualSub, setShowBilingualSub] = useState<boolean>(false);

  // Track listened sentences for completion
  const [listenedSentenceIds, setListenedSentenceIds] = useState<Set<string>>(new Set());
  const [totalListeningSeconds, setTotalListeningSeconds] = useState<number>(0);

  // Student submission state
  const [studentName, setStudentName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ms_meo_student_name') || '';
    }
    return '';
  });
  const [studentClass, setStudentClass] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ms_meo_student_class') || assignment.className || '';
    }
    return assignment.className || '';
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  // Selected word definition tooltip
  const [selectedWordInfo, setSelectedWordInfo] = useState<string | null>(null);

  // References for timing animation and karaoke synchronization
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasNativeBoundaryRef = useRef<boolean>(false);
  const currentTokensRef = useRef<KaraokeWordToken[]>([]);
  const activeWordRef = useRef<number>(-1);
  const isPlayingRef = useRef<boolean>(false);
  isPlayingRef.current = isPlaying;

  const currentSentence = sentences[currentSentenceIndex] || sentences[0];

  // Clean dialogue text for current sentence
  const currentSpeechText = useMemo(() => {
    return getCleanDialogueText(currentSentence);
  }, [currentSentence]);

  // Clean tokens array for current sentence
  const currentSentenceTokens = useMemo(() => {
    return tokenizeSentenceWords(currentSpeechText);
  }, [currentSpeechText]);

  // Keep currentTokensRef updated
  useEffect(() => {
    currentTokensRef.current = currentSentenceTokens;
  }, [currentSentenceTokens]);

  // Track listening timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setTotalListeningSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ttsController.stop();
      if (fallbackTimerRef.current) {
        clearInterval(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      hasNativeBoundaryRef.current = false;
    };
  }, []);

  // Start playing a specific sentence with karaoke word highlight using the independent listening rate
  const playSentenceAtIndex = (index: number, speedOverride?: number) => {
    if (index < 0 || index >= sentences.length) {
      setIsPlaying(false);
      setActiveWordIndex(-1);
      return;
    }

    const effectiveSpeed = speedOverride ?? listeningSpeed;
    const sentence = sentences[index];
    setCurrentSentenceIndex(index);
    setIsPlaying(true);
    setActiveWordIndex(0);
    activeWordRef.current = 0;

    // Reset boundary tracker and timers
    hasNativeBoundaryRef.current = false;
    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    // Mark as listened
    setListenedSentenceIds((prev) => new Set(prev).add(sentence.id));

    // Get canonical cleaned dialogue text and pre-calculate tokens
    const spokenText = getCleanDialogueText(sentence);
    const tokens = tokenizeSentenceWords(spokenText);
    currentTokensRef.current = tokens;

    // Prepare weighted fallback timeline in case browser doesn't emit native onboundary
    const totalWeight = tokens.reduce((sum, t) => sum + t.weight, 0);
    const totalChars = spokenText.length;
    // Base duration for normal English speech at 1.0x is ~14 chars per sec
    const estimatedDurationSec = Math.max(0.8, (totalChars / 14) / effectiveSpeed);
    const totalDurationMs = estimatedDurationSec * 1000;

    const wordTimelines: number[] = [];
    let accumulatedMs = 0;
    for (let i = 0; i < tokens.length; i++) {
      wordTimelines.push(accumulatedMs);
      const wordDuration = (tokens[i].weight / Math.max(1, totalWeight)) * totalDurationMs;
      accumulatedMs += wordDuration;
    }

    const startFallbackTimer = () => {
      if (fallbackTimerRef.current) {
        clearInterval(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      if (hasNativeBoundaryRef.current || tokens.length <= 1) return;

      const startTime = performance.now();
      fallbackTimerRef.current = setInterval(() => {
        // If native boundary has arrived, stop fallback immediately!
        if (hasNativeBoundaryRef.current || !isPlayingRef.current) {
          if (fallbackTimerRef.current) {
            clearInterval(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }
          return;
        }

        const elapsed = performance.now() - startTime;
        let matchedIdx = 0;
        for (let i = 0; i < wordTimelines.length; i++) {
          if (elapsed >= wordTimelines[i]) {
            matchedIdx = i;
          } else {
            break;
          }
        }

        if (matchedIdx !== activeWordRef.current && matchedIdx < tokens.length) {
          activeWordRef.current = matchedIdx;
          setActiveWordIndex(matchedIdx);
        }

        if (elapsed >= accumulatedMs) {
          if (fallbackTimerRef.current) {
            clearInterval(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }
        }
      }, 35);
    };

    // Use listeningSpeed strictly for this utterance, leaving global voiceSettings untouched
    const voice = resolveSelectedVoice({ ...voiceSettings, rate: effectiveSpeed });

    ttsController.speak(
      spokenText,
      voice,
      { ...voiceSettings, rate: effectiveSpeed },
      () => {
        // onStart: speech has physically started
        setIsPlaying(true);
        setActiveWordIndex(0);
        activeWordRef.current = 0;
        // Start fallback timer ONLY if native boundary hasn't fired yet
        if (!hasNativeBoundaryRef.current) {
          startFallbackTimer();
        }
      },
      () => {
        // onEnd: sentence finished
        if (fallbackTimerRef.current) {
          clearInterval(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
        hasNativeBoundaryRef.current = false;
        setActiveWordIndex(tokens.length); // Briefly mark all words as completed

        // Check if looping single sentence
        if (isLoopingSentence) {
          setTimeout(() => {
            if (isPlayingRef.current || isLoopingSentence) {
              playSentenceAtIndex(index, effectiveSpeed);
            }
          }, 500);
          return;
        }

        // Check if continuous auto-play
        if (autoPlayFull && index + 1 < sentences.length) {
          setTimeout(() => {
            playSentenceAtIndex(index + 1, effectiveSpeed);
          }, 450);
        } else {
          setIsPlaying(false);
          setActiveWordIndex(-1);
          if (index + 1 >= sentences.length) {
            playSuccessChime();
          }
        }
      },
      (err) => {
        // onError
        if (fallbackTimerRef.current) {
          clearInterval(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
        hasNativeBoundaryRef.current = false;
        setIsPlaying(false);
        setActiveWordIndex(-1);
      },
      (charIndex) => {
        // Native onBoundary word event from Web Speech API
        hasNativeBoundaryRef.current = true;
        // Native boundary is active -> IMMEDIATELY kill fallback timer to avoid any jitter
        if (fallbackTimerRef.current) {
          clearInterval(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }

        const matchedIdx = findWordIndexForChar(charIndex, currentTokensRef.current);
        if (matchedIdx >= 0 && matchedIdx !== activeWordRef.current) {
          activeWordRef.current = matchedIdx;
          setActiveWordIndex(matchedIdx);
        }
      }
    );
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      ttsController.stop();
      if (fallbackTimerRef.current) {
        clearInterval(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      hasNativeBoundaryRef.current = false;
      setIsPlaying(false);
      setActiveWordIndex(-1);
    } else {
      playSentenceAtIndex(currentSentenceIndex);
    }
  };

  const handleReplayCurrent = () => {
    ttsController.stop();
    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    hasNativeBoundaryRef.current = false;
    playSentenceAtIndex(currentSentenceIndex);
  };

  const handlePrevSentence = () => {
    if (currentSentenceIndex > 0) {
      ttsController.stop();
      if (fallbackTimerRef.current) {
        clearInterval(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      hasNativeBoundaryRef.current = false;
      playSentenceAtIndex(currentSentenceIndex - 1);
    }
  };

  const handleNextSentence = () => {
    if (currentSentenceIndex < sentences.length - 1) {
      ttsController.stop();
      if (fallbackTimerRef.current) {
        clearInterval(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      hasNativeBoundaryRef.current = false;
      playSentenceAtIndex(currentSentenceIndex + 1);
    }
  };

  const handleSentenceClick = (index: number) => {
    ttsController.stop();
    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    hasNativeBoundaryRef.current = false;
    playSentenceAtIndex(index);
  };

  // Dedicated speed adjustment function (modifies ONLY listeningSpeed, NOT global settings)
  const handleSpeedChange = (newSpeed: number) => {
    const clamped = Math.min(2.0, Math.max(0.5, Math.round(newSpeed * 100) / 100));
    setListeningSpeed(clamped);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ms_meo_listening_speed', String(clamped));
    }
    // If currently playing, smoothly replay the current sentence at the newly selected rate
    if (isPlaying) {
      ttsController.stop();
      if (fallbackTimerRef.current) {
        clearInterval(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      hasNativeBoundaryRef.current = false;
      setTimeout(() => {
        playSentenceAtIndex(currentSentenceIndex, clamped);
      }, 120);
    }
  };

  const handleWordClick = (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '').trim();
    if (!cleanWord) return;
    setSelectedWordInfo(cleanWord);
    // Pronounce the single clicked word at a comfortable rate
    const voice = resolveSelectedVoice(voiceSettings);
    ttsController.speak(cleanWord, voice, { ...voiceSettings, rate: Math.min(1.0, listeningSpeed) });
  };

  const handleSubmitHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setSubmitError(isEn ? 'Please enter your name.' : 'Vui lòng nhập họ và tên của bạn.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('ms_meo_student_name', studentName.trim());
        localStorage.setItem('ms_meo_student_class', studentClass.trim());
      }

      await submitAssignmentResult(assignment.id, {
        studentName: studentName.trim(),
        studentClass: studentClass.trim(),
        taskType: 'listening',
        listeningCompleted: true,
        listeningDurationSeconds: totalListeningSeconds,
        shadowingCount: 0,
        shadowingAvgScore: 100,
        quizScore: 100,
        quizCorrectCount: 0,
        quizTotal: 0,
        wordHuntCompleted: false,
        dictationScore: 0,
        studentNote: `Đã hoàn thành luyện nghe ${listenedSentenceIds.size}/${sentences.length} câu với English Sub Karaoke. Thời gian nghe: ${Math.round(totalListeningSeconds / 60)} phút.`,
      });

      setIsSubmitted(true);
      setShowSubmitModal(false);
      playSuccessChime();
    } catch (err: any) {
      setSubmitError(err.message || 'Không thể nộp bài.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const completionPercent = Math.round(
    (listenedSentenceIds.size / Math.max(1, sentences.length)) * 100
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. STUDENT HEADER: Clear Homework Identity & Instructions */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden border border-indigo-800/60">
        <div className="absolute top-0 right-0 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-3.5">
            <img
              src={mascotImg}
              alt="Ms Mèo"
              className="w-14 h-14 rounded-2xl border-2 border-pink-400/80 object-cover shadow-lg shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-pink-500/20 text-pink-300 border border-pink-400/40">
                  <span>🎧</span>
                  <span>{isEn ? 'Listening & Karaoke Subtitles' : 'Luyện nghe & Phụ đề Karaoke'}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {isConversation ? '💬 Conversation' : '📄 Reading Passage'}
                </span>
                {assignment.className && (
                  <span className="text-[11px] text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Users className="w-3 h-3 text-pink-300" />
                    <span>Lớp: {assignment.className}</span>
                  </span>
                )}
                {assignment.dueDate && (
                  <span className="text-[11px] text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Hạn: {assignment.dueDate}</span>
                  </span>
                )}
              </div>

              <h1 className="font-heading text-xl sm:text-2xl font-black text-white tracking-tight">
                {assignment.title}
              </h1>

              {assignment.teacherNotes && (
                <div className="mt-2 text-xs text-indigo-200/90 italic flex items-start gap-1.5 bg-white/5 p-2 rounded-xl border border-white/10 max-w-2xl">
                  <MessageSquare className="w-3.5 h-3.5 text-pink-400 shrink-0 mt-0.5" />
                  <span><strong>Lời dặn của cô:</strong> "{assignment.teacherNotes}"</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Row: Submit button & Progress */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-indigo-800/60">
            <div className="text-right hidden sm:block">
              <div className="text-[11px] text-indigo-200 font-bold">
                {isEn ? 'Progress' : 'Tiến độ nghe'}: {completionPercent}%
              </div>
              <div className="w-24 bg-white/10 rounded-full h-2 mt-1 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-teal-400 to-pink-500 h-full transition-all duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className={`px-5 py-2.5 rounded-2xl font-heading font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all hover:scale-103 ${
                isSubmitted
                  ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-amber-400 via-pink-500 to-rose-500 text-white shadow-pink-500/20 hover:from-amber-300 hover:to-rose-400'
              }`}
            >
              {isSubmitted ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>{isEn ? '✓ Submitted' : '✓ Đã nộp bài'}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{isEn ? '📤 Submit Homework' : '📤 Nộp bài luyện nghe'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* 2. MAIN CINEMATIC KARAOKE SUBTITLE DISPLAY (THEATER VIEW) */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border-2 border-indigo-500/40 relative overflow-hidden">
        {/* Ambient audio visualizer glow */}
        <div className={`absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 ${
          isPlaying ? 'bg-pink-500/25 opacity-100' : 'bg-indigo-500/10 opacity-40'
        }`} />

        {/* Top bar: Sentence counter, format tag & audio indicator */}
        <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800 text-xs text-slate-300 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 font-extrabold border border-indigo-400/30 text-xs">
              {isEn ? 'Sentence' : 'Câu'} {currentSentenceIndex + 1} / {sentences.length}
            </span>
            {currentSentence?.speaker && (
              <span className="px-3 py-1 rounded-full bg-pink-500/30 text-pink-200 font-bold border border-pink-400/40 text-xs flex items-center gap-1.5">
                <span>🗣️</span>
                <span>{currentSentence.speaker}</span>
              </span>
            )}
          </div>

          {/* Playing indicator */}
          <div className="flex items-center gap-2">
            {isPlaying && (
              <div className="flex items-center gap-1 text-pink-400 font-mono text-[11px] font-bold">
                <span className="inline-block w-2 h-2 rounded-full bg-pink-500 animate-ping" />
                <span>{isEn ? 'PLAYING AUDIO...' : 'ĐANG PHÁT...'}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowBilingualSub(!showBilingualSub)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border ${
                showBilingualSub
                  ? 'bg-teal-500/20 text-teal-300 border-teal-400/50'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{isEn ? 'Subtitles' : 'Phụ đề song ngữ'}</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. KARAOKE SUBTITLE BOX WITH SYNCHRONIZED COLOR-CHANGING WORDS           */}
        {/* ========================================================================= */}
        <div className="py-6 sm:py-8 text-center relative z-10 min-h-[140px] sm:min-h-[170px] flex flex-col justify-center items-center">
          {/* Main English Karaoke Subtitle */}
          <div className="font-heading text-xl sm:text-3xl md:text-4xl font-extrabold leading-relaxed sm:leading-relaxed max-w-4xl mx-auto tracking-normal px-2">
            {currentSentenceTokens.map((token, wIdx) => {
              const isCurrent = isPlaying && wIdx === activeWordIndex;
              const isPast = isPlaying && wIdx < activeWordIndex;

              return (
                <span
                  key={`${currentSentence?.id}-tok-${wIdx}-${token.word}`}
                  onClick={(e) => handleWordClick(token.cleanWord, e)}
                  title={isEn ? `Click to hear "${token.cleanWord}"` : `Nhấn để nghe phát âm "${token.cleanWord}"`}
                  className={`inline-block mx-1.5 my-1 px-2 py-0.5 rounded-lg cursor-pointer transition-all duration-150 select-none ${
                    isCurrent
                      ? 'text-yellow-300 font-black scale-105 bg-amber-400/25 ring-2 ring-yellow-400 shadow-md drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]'
                      : isPast
                      ? 'text-pink-300 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                      : 'text-slate-100 font-semibold hover:text-white hover:scale-105'
                  }`}
                >
                  {token.word}
                </span>
              );
            })}
          </div>

          {/* Optional Bilingual / Vietnamese Translation Hint */}
          {showBilingualSub && (
            <p className="mt-4 text-xs sm:text-sm text-teal-300/90 max-w-2xl mx-auto font-sans italic bg-white/5 py-2 px-4 rounded-xl border border-teal-500/20">
              💡 {currentSentence?.cleanText}
            </p>
          )}

          {/* Word Definition Tooltip if clicked */}
          {selectedWordInfo && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs animate-bounce">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isEn ? 'Word' : 'Từ vừa chọn'}: <strong>"{selectedWordInfo}"</strong> (click 🔊 to pronounce)</span>
              <button
                type="button"
                onClick={() => setSelectedWordInfo(null)}
                className="ml-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 4. DEDICATED INDEPENDENT LISTENING SPEED CONTROLLER                       */}
        {/* Allows students to adjust playback rate specifically for listening mode   */}
        {/* completely independently of the global voice settings                     */}
        {/* ========================================================================= */}
        <div className="pt-5 pb-2 border-t border-slate-800 relative z-10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1 rounded-lg bg-pink-500/20 text-pink-300 border border-pink-400/30">
                <Gauge className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                {isEn ? 'Listening Speed Controller:' : 'Bộ chỉnh tốc độ Luyện nghe độc lập:'}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-pink-500/20 text-pink-300 border border-pink-400/40 text-xs font-black font-mono">
                {listeningSpeed.toFixed(2)}x
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                listeningSpeed <= 0.75
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : listeningSpeed <= 1.05
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
              }`}>
                {listeningSpeed <= 0.75
                  ? (isEn ? '🐢 Slow & Clear Study' : '🐢 Nghe chậm từng âm')
                  : listeningSpeed <= 1.05
                  ? (isEn ? '🎯 Natural Native Pace' : '🎯 Tốc độ chuẩn tự nhiên')
                  : (isEn ? '⚡ Fast Reflex Challenge' : '⚡ Luyện phản xạ nhanh')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                {isEn ? 'Listening mode only (doesn’t alter global voice)' : 'Riêng cho phòng nghe, không đổi giọng chung'}
              </span>
              {listeningSpeed !== 1.0 && (
                <button
                  type="button"
                  onClick={() => handleSpeedChange(1.0)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-black text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 transition-colors flex items-center gap-1"
                  title={isEn ? 'Reset to default 1.0x' : 'Đặt lại tốc độ 1.0x'}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>1.0x</span>
                </button>
              )}
            </div>
          </div>

          {/* Speed Presets & Fine-tuning Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80">
            {/* Quick Speed Preset Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                {isEn ? 'Presets:' : 'Chọn nhanh:'}
              </span>
              {[0.5, 0.75, 0.85, 1.0, 1.15, 1.25, 1.5].map((speed) => {
                const isSelected = Math.abs(listeningSpeed - speed) < 0.02;
                return (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => handleSpeedChange(speed)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 ${
                      isSelected
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md ring-2 ring-pink-300/50 scale-105'
                        : 'text-slate-300 hover:text-white bg-slate-700/70 hover:bg-slate-700'
                    }`}
                  >
                    {speed}x
                  </button>
                );
              })}
            </div>

            {/* Stepper + Continuous Range Slider for fine-tuning */}
            <div className="flex items-center gap-2.5 shrink-0 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => handleSpeedChange(Math.max(0.5, listeningSpeed - 0.05))}
                disabled={listeningSpeed <= 0.5}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-sm disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title={isEn ? 'Decrease speed (-0.05x)' : 'Giảm tốc độ (-0.05x)'}
              >
                −
              </button>

              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0.5"
                  max="1.75"
                  step="0.05"
                  value={listeningSpeed}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="w-24 sm:w-32 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  title={`Speed: ${listeningSpeed.toFixed(2)}x`}
                />
                <span className="font-mono text-xs font-black text-pink-300 w-11 text-right">
                  {listeningSpeed.toFixed(2)}x
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleSpeedChange(Math.min(1.75, listeningSpeed + 0.05))}
                disabled={listeningSpeed >= 1.75}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-sm disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title={isEn ? 'Increase speed (+0.05x)' : 'Tăng tốc độ (+0.05x)'}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. MAIN AUDIO PLAYBACK BUTTONS & MODES                                    */}
        {/* ========================================================================= */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          <div className="text-xs text-slate-400 hidden sm:flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>{isEn ? 'Press Play to start synchronized karaoke audio' : 'Bấm Play để nghe phụ đề Karaoke'}</span>
          </div>

          {/* Center Main Playback Buttons */}
          <div className="flex items-center gap-3">
            {/* Previous Sentence */}
            <button
              type="button"
              onClick={handlePrevSentence}
              disabled={currentSentenceIndex === 0}
              title={isEn ? 'Previous sentence' : 'Câu trước'}
              className="p-3 rounded-2xl bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            {/* Replay Current */}
            <button
              type="button"
              onClick={handleReplayCurrent}
              title={isEn ? 'Replay this sentence' : 'Phát lại câu này'}
              className="p-3 rounded-2xl bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Big Main Play/Pause Button */}
            <button
              type="button"
              onClick={handleTogglePlay}
              className={`px-7 py-4 rounded-3xl font-heading font-black text-sm sm:text-base flex items-center gap-2.5 transition-all shadow-xl hover:scale-105 ${
                isPlaying
                  ? 'bg-rose-500 text-white shadow-rose-500/40 ring-4 ring-rose-400/30'
                  : 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white shadow-pink-500/40 hover:from-pink-400 hover:to-amber-400 ring-4 ring-pink-400/30'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-6 h-6 fill-white" />
                  <span>{isEn ? 'PAUSE' : 'TẠM DỪNG'}</span>
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 fill-white" />
                  <span>{isEn ? 'PLAY KARAOKE' : 'NGHE KARAOKE'}</span>
                </>
              )}
            </button>

            {/* Next Sentence */}
            <button
              type="button"
              onClick={handleNextSentence}
              disabled={currentSentenceIndex >= sentences.length - 1}
              title={isEn ? 'Next sentence' : 'Câu tiếp theo'}
              className="p-3 rounded-2xl bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Toggles: Auto-play full vs Loop sentence */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsLoopingSentence(!isLoopingSentence);
                if (!isLoopingSentence) setAutoPlayFull(false);
              }}
              title={isEn ? 'Loop current sentence' : 'Lặp lại câu này liên tục'}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                isLoopingSentence
                  ? 'bg-amber-500/30 text-amber-300 border-amber-400/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>{isEn ? 'Loop Sentence' : 'Lặp lại câu'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAutoPlayFull(!autoPlayFull);
                if (!autoPlayFull) setIsLoopingSentence(false);
              }}
              title={isEn ? 'Auto-play through all sentences' : 'Tự động phát toàn bài'}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                autoPlayFull
                  ? 'bg-teal-500/30 text-teal-300 border-teal-400/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <span>{autoPlayFull ? (isEn ? '✓ Auto-play full' : '✓ Tự động hết bài') : (isEn ? 'Pause per line' : 'Dừng từng câu')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. FULL READING PASSAGE / CONVERSATION SCRIPT (INTERACTIVE CLICK-TO-PLAY) */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-pink-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-pink-100 text-pink-700 text-xs font-bold uppercase tracking-wider mb-1">
              <BookOpen className="w-3.5 h-3.5 text-pink-600" />
              <span>{isConversation ? 'Toàn bộ nội dung Hội thoại' : 'Toàn bộ nội dung Bài đọc'}</span>
            </div>
            <h3 className="font-heading text-lg sm:text-xl font-black text-slate-900">
              {isEn ? 'Full Passage & Interactive Sentence Navigator' : 'Bài đọc đầy đủ (Nhấn vào câu bất kỳ để nghe ngay)'}
            </h3>
            <p className="text-xs text-slate-500">
              {isEn
                ? 'Click on any sentence or word in the passage to jump audio playback directly to that line.'
                : 'Em có thể nhấn vào bất kỳ câu hoặc từ nào trong văn bản dưới đây để phát âm thanh từ vị trí đó.'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span>{sentences.length} {isConversation ? 'lượt thoại' : 'câu'}</span>
            <span>•</span>
            <span className="font-bold text-teal-700">{listenedSentenceIds.size} đã nghe</span>
          </div>
        </div>

        {/* Passage Sentences List */}
        <div className="space-y-3 pt-2">
          {sentences.map((sent, idx) => {
            const isCurrent = idx === currentSentenceIndex;
            const isListened = listenedSentenceIds.has(sent.id);
            const sentTokens = tokenizeSentenceWords(getCleanDialogueText(sent));

            return (
              <div
                key={sent.id}
                onClick={() => handleSentenceClick(idx)}
                className={`p-4 rounded-2xl transition-all cursor-pointer border flex items-start gap-3.5 group ${
                  isCurrent
                    ? 'bg-gradient-to-r from-pink-50/90 via-rose-50/70 to-amber-50/60 border-pink-400 ring-2 ring-pink-200 shadow-md scale-[1.01]'
                    : isListened
                    ? 'bg-white border-slate-200 hover:border-pink-300 hover:bg-pink-50/30'
                    : 'bg-slate-50/60 border-slate-200 hover:border-pink-300 hover:bg-pink-50/30'
                }`}
              >
                {/* Sentence Number & Play status icon */}
                <div className="shrink-0 flex flex-col items-center gap-1 mt-0.5">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                      isCurrent
                        ? 'bg-pink-600 text-white shadow-xs ring-2 ring-pink-300'
                        : isListened
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600 group-hover:bg-pink-100 group-hover:text-pink-700'
                    }`}
                  >
                    {isCurrent && isPlaying ? (
                      <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>
                  {isListened && (
                    <span className="text-[10px] text-emerald-600 font-extrabold">✓</span>
                  )}
                </div>

                {/* Sentence Content */}
                <div className="flex-1">
                  {sent.speaker && (
                    <div className="mb-1">
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[11px] font-extrabold border border-purple-200">
                        {sent.speaker}:
                      </span>
                    </div>
                  )}

                  <p className="text-sm sm:text-base leading-relaxed text-slate-900 font-medium">
                    {sentTokens.map((token, wIdx) => {
                      const isWordActive = isCurrent && isPlaying && wIdx === activeWordIndex;
                      const isWordPast = isCurrent && isPlaying && wIdx < activeWordIndex;

                      return (
                        <span
                          key={`passage-${sent.id}-${wIdx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWordClick(token.cleanWord, e);
                          }}
                          className={`inline-block mx-0.5 px-0.5 rounded transition-all duration-150 cursor-pointer ${
                            isWordActive
                              ? 'bg-amber-300 text-slate-950 font-black scale-105 shadow-xs'
                              : isWordPast
                              ? 'text-pink-600 font-semibold'
                              : 'text-slate-900 hover:text-pink-600'
                          }`}
                        >
                          {token.word}
                        </span>
                      );
                    })}
                  </p>
                </div>

                {/* Quick listen button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSentenceClick(idx);
                  }}
                  className={`p-2 rounded-xl shrink-0 transition-colors ${
                    isCurrent
                      ? 'bg-pink-500 text-white'
                      : 'text-slate-400 hover:text-pink-600 hover:bg-pink-100'
                  }`}
                  title={isEn ? 'Play this line' : 'Nghe câu này'}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. HOMEWORK SUBMISSION BANNER AT BOTTOM */}
      <section className="bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 rounded-3xl p-6 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h4 className="font-heading font-extrabold text-base sm:text-lg">
              {isEn ? 'Completed your listening assignment?' : 'Em đã hoàn thành bài luyện nghe chưa?'}
            </h4>
            <p className="text-xs text-teal-100">
              {isEn
                ? 'Submit your listening homework so your teacher can see your completion and score in their dashboard!'
                : 'Nhấn nút nộp bài để kết quả và thời gian luyện nghe được gửi trực tiếp tới giáo viên nhé!'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowSubmitModal(true)}
          className="px-6 py-3 rounded-2xl font-heading font-black text-sm text-emerald-950 bg-amber-300 hover:bg-amber-200 shadow-md hover:shadow-lg transition-all hover:scale-105 shrink-0"
        >
          {isSubmitted ? '✓ ĐÃ NỘP BÀI THÀNH CÔNG' : '📤 NỘP BÀI CHO GIÁO VIÊN NGAY'}
        </button>
      </section>

      {/* 7. SUBMIT HOMEWORK MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div
            className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-pink-200 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 pb-3 border-b border-pink-100">
              <img
                src={mascotImg}
                alt="Ms Mèo"
                className="w-10 h-10 rounded-full border border-pink-300 object-cover"
              />
              <div>
                <h4 className="font-heading font-black text-lg text-slate-900">
                  {isEn ? 'Submit Listening Homework' : 'Nộp bài Luyện nghe Karaoke'}
                </h4>
                <p className="text-xs text-slate-500">
                  {assignment.title}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitHomework} className="space-y-4 pt-4">
              {submitError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  ⚠️ {submitError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên học sinh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full text-xs border border-slate-300 focus:border-pink-500 rounded-xl p-2.5 focus:ring-1 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lớp học
                </label>
                <input
                  type="text"
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  placeholder="Ví dụ: 12A1"
                  className="w-full text-xs border border-slate-300 focus:border-pink-500 rounded-xl p-2.5 focus:ring-1 focus:ring-pink-500"
                />
              </div>

              {/* Progress Summary Card */}
              <div className="p-3 bg-pink-50 border border-pink-200 rounded-2xl text-xs space-y-1 text-slate-700">
                <div className="flex justify-between">
                  <span>Tiến độ đã nghe:</span>
                  <strong className="text-pink-600">{listenedSentenceIds.size} / {sentences.length} câu ({completionPercent}%)</strong>
                </div>
                <div className="flex justify-between">
                  <span>Thời gian luyện nghe:</span>
                  <strong className="text-pink-600">{Math.round(totalListeningSeconds / 60)} phút ({totalListeningSeconds}s)</strong>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-600 hover:to-rose-600 shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Đang nộp...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Xác nhận Nộp bài</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
