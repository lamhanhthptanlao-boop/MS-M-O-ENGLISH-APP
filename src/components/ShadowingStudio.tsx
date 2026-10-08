import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Repeat,
  Mic,
  Square,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Award,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { AnalyzedSentence, ShadowingResult, VoiceSettings } from '../types';
import {
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
  ttsController,
  resolveSelectedVoice,
} from '../utils/speech';
import { evaluatePronunciation } from '../utils/textParser';
import { playSuccessChime, playSoftTone, playErrorTone } from '../utils/audio';

interface ShadowingStudioProps {
  sentences: AnalyzedSentence[];
  voiceSettings: VoiceSettings;
  soundEnabled: boolean;
  shadowingResults: Record<string, ShadowingResult>;
  onSaveResult: (sentenceId: string, result: ShadowingResult) => void;
}

export const ShadowingStudio: React.FC<ShadowingStudioProps> = ({
  sentences,
  voiceSettings,
  soundEnabled,
  shadowingResults,
  onSaveResult,
}) => {
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
  const isSupported = isSpeechRecognitionSupported();

  // Set active sentence if sentences change
  useEffect(() => {
    if (sentences.length > 0 && !sentences.some((s) => s.id === activeSentenceId)) {
      setActiveSentenceId(sentences[0].id);
    }
  }, [sentences, activeSentenceId]);

  // Cleanup speech/audio on unmount
  useEffect(() => {
    return () => {
      ttsController.stop();
      if (recognizerRef.current) {
        recognizerRef.current.abort();
      }
    };
  }, []);

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

    // Get current selected voice matching initial toolbar settings
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
      () => {
        // loop cycle started
      },
      () => {
        setLoopingSentenceId(null);
      }
    );
  };

  // Start speech recognition recording
  const handleStartRecording = (sentence: AnalyzedSentence) => {
    if (isRecording) {
      handleStopRecording();
      return;
    }

    // Stop any ongoing TTS audio
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
          // Final result arrived
          evaluateTranscript(sentence, transcript);
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
        'Speech Recognition is not available in this browser. You can type or use the test runner below!'
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

  // Stop recording manually
  const handleStopRecording = () => {
    if (recognizerRef.current) {
      recognizerRef.current.stop();
    }
    setIsRecording(false);

    if (recordingSentenceId && interimTranscript.trim()) {
      const sentence = sentences.find((s) => s.id === recordingSentenceId);
      if (sentence) {
        evaluateTranscript(sentence, interimTranscript);
      }
    }
    setRecordingSentenceId(null);
  };

  // Evaluate transcript and save result
  const evaluateTranscript = (sentence: AnalyzedSentence, transcript: string) => {
    const result = evaluatePronunciation(sentence, transcript);
    onSaveResult(sentence.id, result);

    if (soundEnabled) {
      if (result.accuracyScore >= 75) {
        playSuccessChime();
      } else {
        playSoftTone();
      }
    }
  };

  // Manual fallback evaluation
  const handleEvaluateManual = (sentence: AnalyzedSentence) => {
    if (!manualInputFallback.trim()) return;
    evaluateTranscript(sentence, manualInputFallback);
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-pink-200 shadow-xs">
        <div>
          <h2 className="font-heading text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>🎙️</span>
            <span>Sentence-by-Sentence Shadowing Studio</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Listen, loop-shadow, record your voice, and get Ms Mèo's instant AI pronunciation diagnosis
          </p>
        </div>

        {/* Global Progress Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-slate-500 font-semibold">Mastery:</span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-pink-100 text-pink-700">
            {Object.keys(shadowingResults).length} / {sentences.length} Practiced
          </span>
        </div>
      </div>

      {/* Recognition Error notice if any */}
      {recognitionError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Microphone Notice</p>
            <p className="mt-0.5">{recognitionError}</p>
            <button
              onClick={() => setShowManualInput(!showManualInput)}
              className="mt-2 text-pink-600 font-bold hover:underline inline-block"
            >
              {showManualInput ? 'Hide Manual Test Box' : 'Type Spoken Words Manually for Diagnosis →'}
            </button>
          </div>
        </div>
      )}

      {/* Sentences List */}
      <div className="grid grid-cols-1 gap-5">
        {sentences.map((sentence, index) => {
          const isCurrentActive = activeSentenceId === sentence.id;
          const isCurrentlyPlaying = playingSentenceId === sentence.id;
          const isCurrentlyLooping = loopingSentenceId === sentence.id;
          const isCurrentlyRecording = isRecording && recordingSentenceId === sentence.id;
          const result = shadowingResults[sentence.id];

          return (
            <div
              key={sentence.id}
              className={`transition-all rounded-3xl border-2 p-5 sm:p-6 bg-white shadow-xs relative overflow-hidden ${
                isCurrentActive
                  ? 'border-pink-300 ring-4 ring-pink-50/80 shadow-md'
                  : 'border-slate-100 hover:border-pink-200'
              }`}
            >
              {/* Note-card style decorative left bar */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-2 ${
                  result
                    ? result.accuracyScore >= 80
                      ? 'bg-emerald-400'
                      : result.accuracyScore >= 50
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                    : 'bg-pink-300'
                }`}
              />

              {/* Card Meta Top Row */}
              <div className="flex items-center justify-between gap-2 mb-3 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-pink-600 text-sm">
                    #{index + 1}
                  </span>
                  <span>•</span>
                  <span>{sentence.wordCount} words</span>
                  <span>•</span>
                  <span className="capitalize text-slate-500 font-medium">
                    {sentence.tier} sentence
                  </span>
                </div>

                {result && (
                  <span
                    className={`font-heading font-bold text-xs px-2.5 py-0.5 rounded-full ${
                      result.accuracyScore >= 85
                        ? 'bg-emerald-100 text-emerald-800'
                        : result.accuracyScore >= 60
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {result.ratingLabel}
                  </span>
                )}
              </div>

              {/* Clear Sentence Display (Large typography & generous line height) */}
              <div className="mb-5">
                {sentence.speaker && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold mb-2.5 bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs">
                    <span>{sentence.speaker.toLowerCase().includes('mèo') ? '🐱' : '👤'}</span>
                    <span>{sentence.speaker}:</span>
                  </div>
                )}
                <p className="text-lg sm:text-xl font-medium text-slate-800 leading-relaxed tracking-normal font-sans">
                  {sentence.dialogueText || sentence.cleanText}
                </p>
              </div>

              {/* Interactive Controls Row */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
                {/* 1. Listen Button */}
                <button
                  type="button"
                  onClick={() => handleListen(sentence)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    isCurrentlyPlaying
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200'
                  }`}
                >
                  <Volume2
                    className={`w-4 h-4 ${
                      isCurrentlyPlaying ? 'animate-bounce' : ''
                    }`}
                  />
                  <span>
                    {isCurrentlyPlaying ? 'Playing Audio...' : '🔊 Listen to Ms Mèo'}
                  </span>
                </button>

                {/* 2. Loop Shadowing Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleLoop(sentence)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    isCurrentlyLooping
                      ? 'bg-purple-600 text-white shadow-purple-200'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                  }`}
                  title="Loops the sentence with breath pause so you can practice shadowing"
                >
                  <Repeat
                    className={`w-4 h-4 ${
                      isCurrentlyLooping ? 'animate-spin' : ''
                    }`}
                  />
                  <span>
                    {isCurrentlyLooping ? 'Looping Active (Tap to Stop)' : '🔁 Loop Shadowing'}
                  </span>
                </button>

                {/* 3. Start Shadowing (Microphone) */}
                <button
                  type="button"
                  onClick={() => {
                    if (isCurrentlyRecording) {
                      handleStopRecording();
                    } else {
                      handleStartRecording(sentence);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    isCurrentlyRecording
                      ? 'bg-rose-600 text-white animate-mic-pulse ring-4 ring-rose-200'
                      : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600'
                  }`}
                >
                  {isCurrentlyRecording ? (
                    <>
                      <Square className="w-4 h-4 fill-current animate-pulse" />
                      <span>Recording... (Tap to Evaluate)</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>🎙️ Start Shadowing</span>
                    </>
                  )}
                </button>

                {/* Manual input trigger for testing or fallback */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSentenceId(sentence.id);
                    setShowManualInput(!showManualInput);
                  }}
                  className="text-xs text-slate-400 hover:text-pink-600 font-medium px-2 py-1 ml-auto"
                  title="Simulate speech or type manual pronunciation transcript"
                >
                  {showManualInput && isCurrentActive ? 'Hide Test Box' : '⌨️ Type Test'}
                </button>
              </div>

              {/* Live recording preview */}
              {isCurrentlyRecording && (
                <div className="mt-3 p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                  <p className="italic">
                    Listening to you:{' '}
                    <strong>{interimTranscript || 'Speak into your microphone now...'}</strong>
                  </p>
                </div>
              )}

              {/* Manual Input Fallback Drawer */}
              {showManualInput && isCurrentActive && (
                <div className="mt-4 p-4 bg-slate-50 border border-pink-200 rounded-2xl">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Simulate / Type Spoken Words:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualInputFallback}
                      onChange={(e) => setManualInputFallback(e.target.value)}
                      placeholder="Type what was spoken to test diagnostic evaluator..."
                      className="flex-1 text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleEvaluateManual(sentence)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-pink-500 rounded-lg hover:bg-pink-600"
                    >
                      Evaluate
                    </button>
                  </div>
                </div>
              )}

              {/* AI Pronunciation & Accuracy Diagnostic Evaluator (Section 4 Requirement) */}
              {result && (
                <div className="mt-5 pt-5 border-t border-slate-100 space-y-4">
                  {/* Top Result Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-pink-50/50 p-3.5 rounded-2xl border border-pink-100">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-heading font-extrabold text-lg shadow-xs ${
                          result.accuracyScore >= 80
                            ? 'bg-emerald-500 text-white'
                            : result.accuracyScore >= 50
                            ? 'bg-amber-500 text-white'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {result.accuracyScore}%
                      </div>
                      <div>
                        <span className="font-heading font-bold text-sm text-slate-800 block">
                          {result.ratingLabel}
                        </span>
                        <span className="text-xs text-slate-500">
                          Recognized transcript: "{result.studentTranscript}"
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        Correct
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                        Mispronounced
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                        Missed/Ending
                      </span>
                    </div>
                  </div>

                  {/* Word-by-Word Color Highlight Coding */}
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Word-by-Word Diagnostic Alignment:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {result.wordComparisons.map((item, wIdx) => {
                        let badgeStyle =
                          'bg-emerald-50 text-emerald-800 border-emerald-300';
                        let icon = '✓';

                        if (item.status === 'mispronounced') {
                          badgeStyle =
                            'bg-amber-50 text-amber-800 border-amber-300';
                          icon = '~';
                        } else if (item.status === 'omitted') {
                          badgeStyle =
                            'bg-rose-50 text-rose-800 border-rose-300 line-through';
                          icon = '✕';
                        }

                        return (
                          <div
                            key={`${item.targetWord}-${wIdx}`}
                            className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-semibold transition-all shadow-xs ${badgeStyle}`}
                          >
                            <span>{item.targetWord}</span>
                            <span className="text-[10px] opacity-70 font-mono">
                              {icon}
                            </span>

                            {/* Tooltip on hover */}
                            {item.detailNote && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-md z-20">
                                {item.detailNote}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cat Advice Box 🐱 */}
                  <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200/90 rounded-2xl p-4 shadow-xs flex items-start gap-3.5">
                    <div className="text-2xl bg-white p-2 rounded-xl shadow-xs border border-pink-200">
                      🐱
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-heading font-bold text-sm text-pink-900">
                          Ms Mèo's Coaching Advice
                        </span>
                        <span className="text-[10px] font-bold text-pink-600 bg-pink-100 px-2 py-0.5 rounded-full">
                          Personalized
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                        {result.catComment}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
