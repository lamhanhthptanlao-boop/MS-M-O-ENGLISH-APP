import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Repeat,
  Mic,
  Square,
  AlertCircle,
  Sliders,
  Keyboard,
} from 'lucide-react';
import { AnalyzedSentence, ShadowingResult, VoiceSettings } from '../types';
import {
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
  ttsController,
  resolveSelectedVoice,
} from '../utils/speech';
import {
  evaluatePronunciation,
  MANDATORY_SHADOWING_TEST_CASES,
} from '../utils/textParser';
import { playSuccessChime, playSoftTone, playErrorTone } from '../utils/audio';

interface ShadowingStudioProps {
  sentences: AnalyzedSentence[];
  voiceSettings: VoiceSettings;
  soundEnabled: boolean;
  language?: 'en' | 'vi';
  voiceResults: Record<string, ShadowingResult>;
  typingMatchResults: Record<string, ShadowingResult>;
  onSaveVoiceResult: (sentenceId: string, result: ShadowingResult) => void;
  onSaveTypingMatchResult: (sentenceId: string, result: ShadowingResult) => void;
}

function renderResultPanel(
  result: ShadowingResult,
  panelType: 'voice' | 'typing',
  isEn: boolean
) {
  const isVoice = panelType === 'voice';
  const title = isVoice
    ? isEn ? '🎙️ Voice Score (Mic)' : '🎙️ Điểm Nói (Mic)'
    : isEn ? '⌨️ Typing Match' : '⌨️ Điểm Gõ Thử';
  const containerTheme = isVoice
    ? 'border-pink-200 bg-pink-50/40'
    : 'border-indigo-200 bg-indigo-50/40';
  const badgeTheme = isVoice
    ? 'bg-pink-100 text-pink-800 border-pink-300'
    : 'bg-indigo-100 text-indigo-800 border-indigo-300';

  return (
    <div className={`mt-4 p-4 rounded-2xl border ${containerTheme} space-y-3.5`}>
      {/* Top Result Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-heading font-extrabold text-lg shadow-xs shrink-0 ${
              result.accuracyScore >= 85
                ? 'bg-emerald-600 text-white'
                : result.accuracyScore >= 60
                ? 'bg-amber-500 text-white'
                : 'bg-rose-600 text-white'
            }`}
          >
            {result.accuracyScore}%
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[11px] font-black px-2.5 py-0.5 rounded-md border uppercase tracking-wide ${badgeTheme}`}
              >
                {title}
              </span>
              {(result.endingErrorCount ?? 0) > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300">
                  {isEn
                    ? `⚠️ Ending -s/-ed errors (${result.endingErrorCount}) — Max 99%`
                    : `⚠️ Lỗi âm đuôi -s/-ed (${result.endingErrorCount}) — Tối đa 99%`}
                </span>
              )}
            </div>
            <span className="font-heading font-bold text-sm text-slate-900 block mt-1">
              {result.ratingLabel}
            </span>
            <span className="text-xs text-slate-600 block break-words">
              {isEn ? 'Transcript:' : 'Bài ghi nhận:'} &ldquo;{result.studentTranscript}&rdquo;
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600 shrink-0">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            {isEn ? 'Exact' : 'Đúng'}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            {isEn ? '-s/-ed / Sound' : '-s/-ed / Âm'}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            {isEn ? 'Omitted' : 'Thiếu từ'}
          </span>
        </div>
      </div>

      {/* Word-by-Word Color Highlight Coding */}
      <div>
        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
          {isEn
            ? `Word-by-Word Strict Check (${result.exactWordCount ?? 0}/${result.totalTargetWords ?? result.wordComparisons.length} exact words):`
            : `Kiểm tra chặt từng từ (${result.exactWordCount ?? 0}/${result.totalTargetWords ?? result.wordComparisons.length} từ chính xác):`}
        </span>
        <div className="flex flex-wrap gap-2">
          {result.wordComparisons.map((item, wIdx) => {
            const isEndingErr =
              item.errorType === 'ending-s' ||
              item.errorType === 'ending-ed' ||
              item.errorType === 'ending-ing';

            let badgeStyle =
              'bg-emerald-50 text-emerald-900 border-emerald-300';
            let icon = '✓';

            if (isEndingErr) {
              badgeStyle = 'bg-rose-50 text-rose-900 border-rose-400 ring-1 ring-rose-200';
              icon = item.errorType === 'ending-s' ? '-s!' : item.errorType === 'ending-ed' ? '-ed!' : '-ing!';
            } else if (item.status === 'mispronounced') {
              badgeStyle = 'bg-amber-50 text-amber-900 border-amber-300';
              icon = '~';
            } else if (item.status === 'omitted') {
              badgeStyle =
                'bg-rose-50 text-rose-800 border-rose-300 line-through';
              icon = '✕';
            }

            return (
              <div
                key={`${item.targetWord}-${wIdx}`}
                className={`group relative flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs sm:text-sm font-semibold transition-all shadow-2xs ${badgeStyle}`}
              >
                <span>{item.targetWord}</span>
                {item.spokenWord && item.status !== 'correct' && (
                  <span className="text-[10px] font-mono text-rose-700 bg-white/80 px-1 rounded">
                    &rarr; {item.spokenWord}
                  </span>
                )}
                <span className="text-[10px] font-bold opacity-80 font-mono">
                  {icon}
                </span>

                {item.detailNote && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-md z-20">
                    {item.detailNote}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {result.extraWords && result.extraWords.length > 0 && (
          <p className="mt-2 text-[11px] font-semibold text-rose-700">
            Extra words detected: {result.extraWords.join(', ')}
          </p>
        )}
      </div>

      {/* Cat Advice Box */}
      <div className="bg-white border border-pink-200/90 rounded-xl p-3.5 shadow-2xs flex items-start gap-3">
        <div className="text-xl bg-pink-50 p-1.5 rounded-lg border border-pink-200 shrink-0">
          🐱
        </div>
        <div className="flex-1">
          <span className="font-heading font-bold text-xs text-pink-900 block mb-0.5">
            {isEn ? "Ms Mèo's Coaching Advice" : 'Lời khuyên từ cô Ms Mèo'}
          </span>
          <p className="text-xs text-slate-700 leading-relaxed">
            {result.catComment}
          </p>
        </div>
      </div>
    </div>
  );
}

export const ShadowingStudio: React.FC<ShadowingStudioProps> = ({
  sentences,
  voiceSettings,
  soundEnabled,
  language = 'vi',
  voiceResults,
  typingMatchResults,
  onSaveVoiceResult,
  onSaveTypingMatchResult,
}) => {
  const isEn = language === 'en';
  const [activeSentenceId, setActiveSentenceId] = useState<string>(
    sentences[0]?.id || ''
  );
  const [playingSentenceId, setPlayingSentenceId] = useState<string | null>(null);
  const [loopingSentenceId, setLoopingSentenceId] = useState<string | null>(null);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSentenceId, setRecordingSentenceId] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [manualInputFallback, setManualInputFallback] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState<boolean>(false);

  const recognizerRef = useRef<ReturnType<typeof createSpeechRecognizer> | null>(null);
  isSpeechRecognitionSupported();

  // Sentence Selection Mode ("Tự chọn số câu"): 'all' | '3' | '5' | '10' | 'custom'
  const [sentenceSelectionMode, setSentenceSelectionMode] = useState<'all' | '3' | '5' | '10' | 'custom'>('all');
  const [customRangeFrom, setCustomRangeFrom] = useState<number>(1);
  const [customRangeTo, setCustomRangeTo] = useState<number>(() => Math.min(5, sentences.length || 1));
  const [showCustomRangeBox, setShowCustomRangeBox] = useState<boolean>(false);

  // Reset local interactive state cleanly whenever the lesson sentences change
  const lessonSignature = sentences.map((s) => s.id).join('|');
  useEffect(() => {
    setActiveSentenceId(sentences[0]?.id || '');
    setManualInputFallback('');
    setShowManualInput(false);
    setInterimTranscript('');
    setRecognitionError(null);
    setCustomRangeFrom(1);
    setCustomRangeTo(Math.min(5, sentences.length || 1));
  }, [lessonSignature]);

  const activeSentences = React.useMemo(() => {
    if (!sentences || sentences.length === 0) return [];
    if (sentenceSelectionMode === 'all') return sentences;
    if (sentenceSelectionMode === '3') return sentences.slice(0, Math.min(3, sentences.length));
    if (sentenceSelectionMode === '5') return sentences.slice(0, Math.min(5, sentences.length));
    if (sentenceSelectionMode === '10') return sentences.slice(0, Math.min(10, sentences.length));
    if (sentenceSelectionMode === 'custom') {
      const from = Math.max(1, Math.min(customRangeFrom, sentences.length));
      const to = Math.max(from, Math.min(customRangeTo, sentences.length));
      return sentences.slice(from - 1, to);
    }
    return sentences;
  }, [sentences, sentenceSelectionMode, customRangeFrom, customRangeTo]);

  useEffect(() => {
    if (activeSentences.length > 0 && !activeSentences.some((s) => s.id === activeSentenceId)) {
      setActiveSentenceId(activeSentences[0].id);
    }
  }, [activeSentences, activeSentenceId]);

  useEffect(() => {
    return () => {
      ttsController.stop();
      if (recognizerRef.current) {
        recognizerRef.current.abort();
      }
    };
  }, []);

  // Compute separated header stats strictly from Voice vs Typing Match
  const voiceScores = Object.values(voiceResults).map((r) => r.accuracyScore || 0);
  const voiceAvg =
    voiceScores.length > 0
      ? Math.round(voiceScores.reduce((a, b) => a + b, 0) / voiceScores.length)
      : 0;

  const typingScores = Object.values(typingMatchResults).map((r) => r.accuracyScore || 0);
  const typingAvg =
    typingScores.length > 0
      ? Math.round(typingScores.reduce((a, b) => a + b, 0) / typingScores.length)
      : 0;

  // Handle single TTS play
  const handleListen = (sentence: AnalyzedSentence) => {
    if (playingSentenceId === sentence.id) {
      ttsController.stop();
      setPlayingSentenceId(null);
      setLoopingSentenceId(null);
      return;
    }

    if (loopingSentenceId) {
      ttsController.stop();
      setLoopingSentenceId(null);
    }

    setPlayingSentenceId(sentence.id);
    setActiveSentenceId(sentence.id);

    const selectedVoice = resolveSelectedVoice(voiceSettings);
    const speechText = sentence.dialogueText || sentence.cleanText;

    ttsController.speak(
      speechText,
      selectedVoice,
      voiceSettings,
      () => setPlayingSentenceId(sentence.id),
      () => setPlayingSentenceId(null),
      () => setPlayingSentenceId(null)
    );
  };

  // Handle loop shadowing toggle
  const handleToggleLoop = (sentence: AnalyzedSentence) => {
    if (loopingSentenceId === sentence.id) {
      ttsController.stop();
      setLoopingSentenceId(null);
      setPlayingSentenceId(null);
      return;
    }

    setPlayingSentenceId(null);
    setLoopingSentenceId(sentence.id);
    setActiveSentenceId(sentence.id);

    const selectedVoice = resolveSelectedVoice(voiceSettings);
    const speechText = sentence.dialogueText || sentence.cleanText;

    ttsController.startLoop(
      speechText,
      selectedVoice,
      voiceSettings,
      1800,
      () => {},
      () => {
        setLoopingSentenceId(null);
      }
    );
  };

  // Start speech recognition recording (Voice Score)
  const handleStartRecording = (sentence: AnalyzedSentence) => {
    if (isRecording) {
      handleStopRecording();
      return;
    }

    ttsController.stop();
    setPlayingSentenceId(null);
    setLoopingSentenceId(null);

    setRecognitionError(null);
    setInterimTranscript('');
    setRecordingSentenceId(sentence.id);
    setActiveSentenceId(sentence.id);

    if (soundEnabled) playSoftTone();

    const recognizer = createSpeechRecognizer(
      (transcript, isFinal) => {
        setInterimTranscript(transcript);
        if (isFinal && transcript.trim()) {
          evaluateVoiceTranscript(sentence, transcript);
        }
      },
      () => {
        setIsRecording(true);
      },
      () => {
        setIsRecording(false);
        setRecordingSentenceId(null);
      },
      (err) => {
        setRecognitionError(err);
        setIsRecording(false);
        setRecordingSentenceId(null);
        if (soundEnabled) playErrorTone();
      }
    );

    if (!recognizer) {
      setRecognitionError(
        'Speech Recognition is not available in this browser. You can use ⌨️ Type Test below (scored separately as Typing Match).'
      );
      setShowManualInput(true);
      return;
    }

    recognizerRef.current = recognizer;
    try {
      recognizer.start();
    } catch {
      setRecognitionError('Could not start microphone. Please check permissions.');
    }
  };

  const handleStopRecording = () => {
    if (recognizerRef.current) {
      recognizerRef.current.stop();
    }
    setIsRecording(false);

    if (recordingSentenceId && interimTranscript.trim()) {
      const sentence = sentences.find((s) => s.id === recordingSentenceId);
      if (sentence) {
        evaluateVoiceTranscript(sentence, interimTranscript);
      }
    }
    setRecordingSentenceId(null);
  };

  // Evaluate Mic transcript -> saves strictly to Voice Score
  const evaluateVoiceTranscript = (sentence: AnalyzedSentence, transcript: string) => {
    const result = evaluatePronunciation(sentence, transcript, 'voice');
    onSaveVoiceResult(sentence.id, result);

    if (soundEnabled) {
      if (result.accuracyScore >= 75) playSuccessChime();
      else playSoftTone();
    }
  };

  // Evaluate manual Type Test -> saves strictly to Typing Match (never affects Voice Score)
  const handleEvaluateManual = (sentence: AnalyzedSentence, overrideText?: string) => {
    const inputText = overrideText ?? manualInputFallback;
    if (!inputText.trim()) return;
    const result = evaluatePronunciation(sentence, inputText, 'typing');
    onSaveTypingMatchResult(sentence.id, result);

    if (soundEnabled) {
      if (result.accuracyScore >= 75) playSuccessChime();
      else playSoftTone();
    }
  };

  // Build simulated -s / -ed error text for the current sentence so students/teachers can test on any sentence
  const applyBuiltInTestToSentence = (
    sentence: AnalyzedSentence,
    testId: 'test-ending-s' | 'test-ending-ed'
  ) => {
    const benchmark = MANDATORY_SHADOWING_TEST_CASES.find((t) => t.id === testId);
    const text = sentence.dialogueText || sentence.cleanText;

    // If current sentence matches the benchmark sentence, use exact benchmark badTranscript
    if (benchmark && text.toLowerCase().includes(benchmark.expectedTargetWord)) {
      const regex = new RegExp(`\\b${benchmark.expectedTargetWord}\\b`, 'i');
      const simulated = text.replace(regex, benchmark.expectedSpokenWord);
      setManualInputFallback(simulated);
      handleEvaluateManual(sentence, simulated);
      return;
    }

    // Otherwise simulate an -s or -ed drop on a matching word in this sentence, or fill benchmark badTranscript
    const words = sentence.words;
    let modified = false;
    const tweakedWords = words.map((w) => {
      if (modified) return w;
      const lower = w.toLowerCase();
      if (testId === 'test-ending-s' && lower.length > 3 && lower.endsWith('s') && !lower.endsWith('ss')) {
        modified = true;
        return w.slice(0, -1);
      }
      if (testId === 'test-ending-ed' && lower.length > 4 && lower.endsWith('ed')) {
        modified = true;
        return w.slice(0, -2);
      }
      return w;
    });

    const output = modified ? tweakedWords.join(' ') : (benchmark?.badTranscript || text);
    setManualInputFallback(output);
    handleEvaluateManual(sentence, output);
  };

  return (
    <div className="space-y-6">
      {/* Studio Header with Strictly Separated Voice Score vs Typing Match */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-pink-200 shadow-xs">
        <div>
          <h2 className="font-heading text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>🎙️</span>
            <span>{isEn ? 'Sentence-by-Sentence Shadowing Studio' : 'Phòng Luyện Shadowing Từng Câu'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {isEn ? (
              <>
                Strict word-by-word grading: dropping <strong className="text-rose-600">-s / -ed</strong> endings never scores 100%. Mic Voice &amp; Typing scores are strictly separated.
              </>
            ) : (
              <>
                Chấm chặt theo từng từ: lỗi âm cuối <strong className="text-rose-600">-s / -ed</strong> không bao giờ được 100%. Điểm Mic &amp; Điểm gõ thử được tách riêng hoàn toàn.
              </>
            )}
          </p>
        </div>

        {/* Separated Score Counters */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          <div className="px-3.5 py-2 rounded-xl bg-pink-50 border border-pink-200 text-xs">
            <span className="text-slate-500 font-semibold block text-[10px] uppercase">
              {isEn ? '🎙️ Voice Score (Mic)' : '🎙️ Điểm Nói (Mic)'}
            </span>
            <span className="font-heading font-extrabold text-pink-700 text-sm">
              {voiceScores.length > 0 ? `${voiceAvg}%` : '--'}
            </span>
            <span className="text-[11px] text-slate-500 ml-1.5">
              ({voiceScores.length}/{activeSentences.length} {isEn ? 'sent.' : 'câu'})
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-xs">
            <span className="text-slate-500 font-semibold block text-[10px] uppercase">
              {isEn ? '⌨️ Typing Match' : '⌨️ Điểm Gõ Thử'}
            </span>
            <span className="font-heading font-extrabold text-indigo-700 text-sm">
              {typingScores.length > 0 ? `${typingAvg}%` : '--'}
            </span>
            <span className="text-[11px] text-slate-500 ml-1.5">
              ({typingScores.length}/{activeSentences.length} {isEn ? 'sent.' : 'câu'})
            </span>
          </div>
        </div>
      </div>

      {/* DEDICATED SENTENCE COUNT CONTROLLER (NÚT TỰ CHỌN SỐ CÂU) */}
      <div className="bg-white p-3.5 rounded-2xl border border-pink-200 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1 rounded-lg bg-pink-100 text-pink-700 border border-pink-200">
              <Sliders className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              {isEn ? 'Shadowing Sentence Count:' : 'Tự chọn số câu Shadowing:'}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-pink-50 text-pink-700 border border-pink-300 text-xs font-black font-mono">
              {activeSentences.length}/{sentences.length} {isEn ? 'sent.' : 'câu'}
            </span>
            {sentenceSelectionMode !== 'all' && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                {sentenceSelectionMode === 'custom'
                  ? isEn
                    ? `From #${Math.max(1, customRangeFrom)} - ${Math.min(sentences.length, customRangeTo)}`
                    : `Từ câu ${Math.max(1, customRangeFrom)} - ${Math.min(sentences.length, customRangeTo)}`
                  : isEn
                  ? `First ${sentenceSelectionMode} sent.`
                  : `${sentenceSelectionMode} câu đầu`}
              </span>
            )}
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSentenceSelectionMode('all');
                setShowCustomRangeBox(false);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                sentenceSelectionMode === 'all'
                  ? 'bg-rose-600 text-white shadow-xs font-black ring-1 ring-rose-400'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isEn ? `All (${sentences.length})` : `Tất cả (${sentences.length} câu)`}
            </button>

            {sentences.length >= 3 && (
              <button
                type="button"
                onClick={() => {
                  setSentenceSelectionMode('3');
                  setShowCustomRangeBox(false);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  sentenceSelectionMode === '3'
                    ? 'bg-rose-600 text-white shadow-xs font-black ring-1 ring-rose-400'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isEn ? '3 sent.' : '3 câu'}
              </button>
            )}

            {sentences.length >= 5 && (
              <button
                type="button"
                onClick={() => {
                  setSentenceSelectionMode('5');
                  setShowCustomRangeBox(false);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  sentenceSelectionMode === '5'
                    ? 'bg-rose-600 text-white shadow-xs font-black ring-1 ring-rose-400'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isEn ? '5 sent.' : '5 câu'}
              </button>
            )}

            {sentences.length >= 10 && (
              <button
                type="button"
                onClick={() => {
                  setSentenceSelectionMode('10');
                  setShowCustomRangeBox(false);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  sentenceSelectionMode === '10'
                    ? 'bg-rose-600 text-white shadow-xs font-black ring-1 ring-rose-400'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isEn ? '10 sent.' : '10 câu'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowCustomRangeBox(!showCustomRangeBox)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                sentenceSelectionMode === 'custom' || showCustomRangeBox
                  ? 'bg-amber-400 text-slate-900 font-black shadow-xs ring-2 ring-amber-300'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>⚙️</span>
              <span>{isEn ? 'Custom range...' : 'Tự chọn số câu...'}</span>
            </button>
          </div>
        </div>

        {/* Custom Range Inputs */}
        {showCustomRangeBox && (
          <div className="pt-2.5 mt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 animate-fadeIn text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">{isEn ? 'From #:' : 'Từ câu:'}</span>
              <input
                type="number"
                min={1}
                max={sentences.length}
                value={customRangeFrom}
                onChange={(e) =>
                  setCustomRangeFrom(
                    Math.max(1, Math.min(sentences.length, parseInt(e.target.value) || 1))
                  )
                }
                className="w-16 px-2 py-1 text-center font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-pink-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">{isEn ? 'To #:' : 'Đến câu:'}</span>
              <input
                type="number"
                min={customRangeFrom}
                max={sentences.length}
                value={customRangeTo}
                onChange={(e) =>
                  setCustomRangeTo(
                    Math.max(
                      customRangeFrom,
                      Math.min(sentences.length, parseInt(e.target.value) || customRangeFrom)
                    )
                  )
                }
                className="w-16 px-2 py-1 text-center font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-pink-500"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setSentenceSelectionMode('custom');
                setShowCustomRangeBox(false);
              }}
              className="px-3.5 py-1 rounded-xl text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-300 transition-all shadow-xs"
            >
              {isEn ? '✓ Apply' : '✓ Áp dụng'}
            </button>

            <span className="text-[11px] text-slate-400 italic">
              ({isEn ? 'Total' : 'Tổng'}: {Math.max(1, customRangeTo - customRangeFrom + 1)} {isEn ? 'sent.' : 'câu'})
            </span>
          </div>
        )}
      </div>

      {/* Recognition Error notice if any */}
      {recognitionError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Microphone Notice</p>
            <p className="mt-0.5">{recognitionError}</p>
            <button
              type="button"
              onClick={() => setShowManualInput(!showManualInput)}
              className="mt-2 text-pink-600 font-bold hover:underline inline-block"
            >
              {showManualInput ? 'Hide Type Test Box' : 'Open ⌨️ Type Test (Typing Match) →'}
            </button>
          </div>
        </div>
      )}

      {/* Sentences List */}
      <div className="grid grid-cols-1 gap-5">
        {activeSentences.map((sentence, index) => {
          const isCurrentActive = activeSentenceId === sentence.id;
          const isCurrentlyPlaying = playingSentenceId === sentence.id;
          const isCurrentlyLooping = loopingSentenceId === sentence.id;
          const isCurrentlyRecording = isRecording && recordingSentenceId === sentence.id;
          const voiceResult = voiceResults[sentence.id];
          const typingResult = typingMatchResults[sentence.id];
          const primaryResult = voiceResult || typingResult;

          return (
            <div
              key={sentence.id}
              className={`transition-all rounded-3xl border-2 p-4 sm:p-6 bg-white shadow-xs relative overflow-hidden ${
                isCurrentActive
                  ? 'border-pink-300 ring-4 ring-pink-50/80 shadow-md'
                  : 'border-slate-100 hover:border-pink-200'
              }`}
            >
              {/* Left color indicator */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-2 ${
                  primaryResult
                    ? primaryResult.accuracyScore >= 85
                      ? 'bg-emerald-500'
                      : primaryResult.accuracyScore >= 50
                      ? 'bg-amber-400'
                      : 'bg-rose-500'
                    : 'bg-pink-300'
                }`}
              />

              {/* Card Meta Top Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-pink-600 text-sm">
                    #{index + 1}
                  </span>
                  <span>•</span>
                  <span>{sentence.wordCount} {isEn ? 'words' : 'từ'}</span>
                  <span>•</span>
                  <span className="capitalize text-slate-500 font-medium">
                    {sentence.tier} {isEn ? 'sentence' : 'câu'}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {voiceResult && (
                    <span
                      className={`font-heading font-bold text-xs px-2.5 py-0.5 rounded-lg border ${
                        voiceResult.accuracyScore >= 85
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : voiceResult.accuracyScore >= 60
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}
                    >
                      🎙️ Voice: {voiceResult.accuracyScore}%
                    </span>
                  )}
                  {typingResult && (
                    <span className="font-heading font-bold text-xs px-2.5 py-0.5 rounded-lg border bg-indigo-50 text-indigo-800 border-indigo-200">
                      ⌨️ Typing Match: {typingResult.accuracyScore}%
                    </span>
                  )}
                </div>
              </div>

              {/* Sentence Text */}
              <div className="mb-5">
                {sentence.speaker && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold mb-2.5 bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs">
                    <span>{sentence.speaker.toLowerCase().includes('mèo') ? '🐱' : '👤'}</span>
                    <span>{sentence.speaker}:</span>
                  </div>
                )}
                <p className="text-base sm:text-xl font-medium text-slate-800 leading-relaxed tracking-normal font-sans break-words">
                  {sentence.dialogueText || sentence.cleanText}
                </p>
              </div>

              {/* Interactive Controls Row */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleListen(sentence)}
                  className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    isCurrentlyPlaying
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200'
                  }`}
                >
                  <Volume2
                    className={`w-4 h-4 ${isCurrentlyPlaying ? 'animate-bounce' : ''}`}
                  />
                  <span>
                    {isCurrentlyPlaying
                      ? isEn ? 'Playing Audio...' : 'Đang phát...'
                      : isEn ? '🔊 Listen to Ms Mèo' : '🔊 Nghe câu mẫu'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleLoop(sentence)}
                  className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    isCurrentlyLooping
                      ? 'bg-purple-600 text-white shadow-purple-200'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                  }`}
                  title={isEn ? 'Loops the sentence with breath pause so you can practice shadowing' : 'Lặp lại câu kèm khoảng nghỉ để bạn nhại theo'}
                >
                  <Repeat className={`w-4 h-4 ${isCurrentlyLooping ? 'animate-spin' : ''}`} />
                  <span>
                    {isCurrentlyLooping
                      ? isEn ? 'Looping Active (Stop)' : 'Đang lặp (Bấm dừng)'
                      : isEn ? '🔁 Loop Shadowing' : '🔁 Lặp Shadowing'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isCurrentlyRecording) {
                      handleStopRecording();
                    } else {
                      handleStartRecording(sentence);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    isCurrentlyRecording
                      ? 'bg-rose-600 text-white animate-mic-pulse ring-4 ring-rose-200'
                      : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600'
                  }`}
                >
                  {isCurrentlyRecording ? (
                    <>
                      <Square className="w-4 h-4 fill-current animate-pulse" />
                      <span>{isEn ? 'Recording... (Evaluate)' : 'Đang thu... (Chấm điểm)'}</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>{isEn ? '🎙️ Start Shadowing' : '🎙️ Thu âm Shadowing'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveSentenceId(sentence.id);
                    setShowManualInput(!(showManualInput && isCurrentActive));
                  }}
                  className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-colors sm:ml-auto ${
                    showManualInput && isCurrentActive
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-indigo-700 hover:border-indigo-300'
                  }`}
                  title={isEn ? 'Type test (scored separately in Typing Match)' : 'Gõ chữ thử (chấm riêng vào Typing Match, không ảnh hưởng Voice Score)'}
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>
                    {showManualInput && isCurrentActive
                      ? isEn ? 'Hide Type Test' : 'Ẩn Gõ Thử'
                      : isEn ? '⌨️ Type Test' : '⌨️ Gõ Thử'}
                  </span>
                </button>
              </div>

              {/* Live recording preview */}
              {isCurrentlyRecording && (
                <div className="mt-3 p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                  <p className="italic">
                    {isEn ? 'Listening to you: ' : 'Đang nghe bạn nói: '}
                    <strong>{interimTranscript || (isEn ? 'Speak into your microphone now...' : 'Hãy đọc to vào micro...')}</strong>
                  </p>
                </div>
              )}

              {/* Manual Input Fallback Drawer (Strictly scored as Typing Match) */}
              {showManualInput && isCurrentActive && (
                <div className="mt-4 p-3.5 sm:p-4 bg-indigo-50/50 border border-indigo-200 rounded-2xl space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-xs font-bold text-indigo-950">
                      {isEn
                        ? '⌨️ Typing Match Test (Strictly isolated from Voice Score):'
                        : '⌨️ Kiểm tra Gõ Thử (Tách biệt hoàn toàn với Voice Score):'}
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyBuiltInTestToSentence(sentence, 'test-ending-s')}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-rose-700 border border-rose-300 hover:bg-rose-50 transition-colors"
                      >
                        {isEn ? 'Test -s drop (expands → expand)' : 'Test mẫu lỗi -s (expands → expand)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => applyBuiltInTestToSentence(sentence, 'test-ending-ed')}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-rose-700 border border-rose-300 hover:bg-rose-50 transition-colors"
                      >
                        {isEn ? 'Test -ed drop (decided → decide)' : 'Test mẫu lỗi -ed (decided → decide)'}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={manualInputFallback}
                      onChange={(e) => setManualInputFallback(e.target.value)}
                      placeholder={
                        isEn
                          ? 'Type the sentence to check every word & -s/-ed ending...'
                          : 'Gõ câu để kiểm tra chặt từng từ & âm đuôi -s/-ed...'
                      }
                      className="min-w-0 flex-1 text-xs bg-white border border-indigo-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleEvaluateManual(sentence)}
                      className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shrink-0"
                    >
                      {isEn ? 'Grade Typing Match' : 'Chấm Typing Match'}
                    </button>
                  </div>
                </div>
              )}

              {/* Separated Diagnostic Panels */}
              {voiceResult && renderResultPanel(voiceResult, 'voice', isEn)}
              {typingResult && renderResultPanel(typingResult, 'typing', isEn)}
            </div>
          );
        })}
      </div>
    </div>
  );
};
