import React, { useState, useEffect } from 'react';
import { Volume2, Check, RefreshCw, AlertCircle, Sparkles, Award, Sliders, Repeat, Clock } from 'lucide-react';
import { AnalyzedSentence, DifficultyTier, VoiceSettings } from '../types';
import { generateWordHint, levenshteinDistance } from '../utils/textParser';
import { ttsController, resolveSelectedVoice } from '../utils/speech';
import { playSuccessChime, playSoftTone } from '../utils/audio';

interface TaskSmartDictationProps {
  sentences: AnalyzedSentence[];
  tier: DifficultyTier;
  voiceSettings: VoiceSettings;
  onUpdateVoiceSettings?: (newSettings: VoiceSettings) => void;
  soundEnabled: boolean;
  onSentenceEvaluated?: (sentenceId: string, score: number) => void;
}

interface EvaluatedDictation {
  score: number;
  wordDiffs: {
    expected: string;
    actual: string;
    isMatch: boolean;
  }[];
}

export const TaskSmartDictation: React.FC<TaskSmartDictationProps> = ({
  sentences,
  tier,
  voiceSettings,
  onUpdateVoiceSettings,
  soundEnabled,
  onSentenceEvaluated,
}) => {
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});
  const [evaluations, setEvaluations] = useState<Record<string, EvaluatedDictation>>({});
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingMode, setPlayingMode] = useState<'normal' | 'slow' | 'loop' | null>(null);
  const [activeVoiceName, setActiveVoiceName] = useState<string>('Standard Native Voice');

  // Keep active voice display name synced with current voiceSettings
  useEffect(() => {
    const updateVoiceName = () => {
      const v = resolveSelectedVoice(voiceSettings);
      if (v) {
        setActiveVoiceName(`${v.name} (${v.lang})`);
      } else {
        setActiveVoiceName('Native English Voice');
      }
    };

    updateVoiceName();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoiceName;
    }
  }, [voiceSettings]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      ttsController.stop();
    };
  }, []);

  const handlePlaySentenceAudio = (
    sentence: AnalyzedSentence,
    mode: 'normal' | 'slow' = 'normal'
  ) => {
    if (playingId === sentence.id && playingMode === mode) {
      ttsController.stop();
      setPlayingId(null);
      setPlayingMode(null);
      return;
    }

    ttsController.stop();
    setPlayingId(sentence.id);
    setPlayingMode(mode);

    const selectedVoice = resolveSelectedVoice(voiceSettings);
    const effectiveRate = mode === 'slow' ? 0.75 : voiceSettings.rate;

    ttsController.speak(
      sentence.cleanText,
      selectedVoice,
      { ...voiceSettings, rate: effectiveRate },
      () => {
        setPlayingId(sentence.id);
        setPlayingMode(mode);
      },
      () => {
        setPlayingId(null);
        setPlayingMode(null);
      },
      () => {
        setPlayingId(null);
        setPlayingMode(null);
      }
    );
  };

  const handleToggleLoopSentence = (sentence: AnalyzedSentence) => {
    if (playingId === sentence.id && playingMode === 'loop') {
      ttsController.stop();
      setPlayingId(null);
      setPlayingMode(null);
      return;
    }

    ttsController.stop();
    setPlayingId(sentence.id);
    setPlayingMode('loop');

    const selectedVoice = resolveSelectedVoice(voiceSettings);

    ttsController.startLoop(
      sentence.cleanText,
      selectedVoice,
      voiceSettings,
      2000,
      () => {
        setPlayingId(sentence.id);
        setPlayingMode('loop');
      },
      () => {
        setPlayingId(null);
        setPlayingMode(null);
      }
    );
  };

  const handleCheckSentence = (sentence: AnalyzedSentence) => {
    const input = userInputs[sentence.id] || '';
    const cleanExpectedWords = sentence.words.map((w) => w.replace(/[^\w]/g, ''));
    const cleanActualWords = input
      .trim()
      .split(/\s+/)
      .map((w) => w.replace(/[^\w]/g, ''));

    let matches = 0;
    const wordDiffs = cleanExpectedWords.map((exp, idx) => {
      const act = cleanActualWords[idx] || '';
      const isMatch = exp.toLowerCase() === act.toLowerCase();
      if (isMatch) matches += 1;
      return {
        expected: sentence.words[idx] || exp,
        actual: act,
        isMatch,
      };
    });

    const score = Math.round((matches / Math.max(1, cleanExpectedWords.length)) * 100);

    setEvaluations((prev) => ({
      ...prev,
      [sentence.id]: {
        score,
        wordDiffs,
      },
    }));

    onSentenceEvaluated?.(sentence.id, score);

    if (soundEnabled) {
      if (score >= 80) playSuccessChime();
      else playSoftTone();
    }
  };

  const handleReset = (sentenceId: string) => {
    setUserInputs((prev) => {
      const next = { ...prev };
      delete next[sentenceId];
      return next;
    });
    setEvaluations((prev) => {
      const next = { ...prev };
      delete next[sentenceId];
      return next;
    });
    if (soundEnabled) playSoftTone();
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-200 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-pink-100">
        <div>
          <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            TASK 3 • LISTENING ACCURACY
          </span>
          <h3 className="font-heading text-lg sm:text-xl font-bold text-slate-800 mt-1 flex items-center gap-2">
            <span>🎧</span>
            <span>Smart Dictation: Audio-to-Text</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Listen to each sentence using your configured native voice, follow clues, and transcribe what you hear
          </p>
        </div>

        {/* Active Difficulty Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-slate-400 font-semibold">Active Hint Rule:</span>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              tier === 'easy'
                ? 'bg-emerald-100 text-emerald-800'
                : tier === 'medium'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {tier === 'easy'
              ? '🟢 Easy (100% Hint: First & Last)'
              : tier === 'medium'
              ? '🟡 Medium (50% Hint: First Letter)'
              : '🔴 Hard (0% Hint: Blank Inputs)'}
          </span>
        </div>
      </div>

      {/* Voice Configuration & Initial Settings Bar */}
      <div className="bg-gradient-to-r from-pink-50/90 via-rose-50/50 to-pink-50/90 border border-pink-200/90 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-pink-200/70 text-pink-800 shrink-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">Initial Voice Settings:</span>
              <span className="px-2 py-0.5 rounded-full bg-white border border-pink-200 font-semibold text-pink-700">
                {voiceSettings.accent.toUpperCase()} • {voiceSettings.gender} • {voiceSettings.age}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-md">
              Voice: <strong className="text-slate-700">{activeVoiceName}</strong>
            </p>
          </div>
        </div>

        {/* Quick Speed Switcher */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3 text-pink-500" />
            Dictation Speed:
          </span>
          <div className="flex items-center bg-white border border-pink-200 rounded-xl p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => onUpdateVoiceSettings?.({ ...voiceSettings, rate: 0.75 })}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                voiceSettings.rate === 0.75
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-pink-600'
              }`}
              title="0.75x Slow Practice"
            >
              🐢 0.75x
            </button>
            <button
              type="button"
              onClick={() => onUpdateVoiceSettings?.({ ...voiceSettings, rate: 1.0 })}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                voiceSettings.rate === 1.0
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-pink-600'
              }`}
              title="1.0x Normal Speed"
            >
              1.0x
            </button>
            <button
              type="button"
              onClick={() => onUpdateVoiceSettings?.({ ...voiceSettings, rate: 1.25 })}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                voiceSettings.rate === 1.25
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-pink-600'
              }`}
              title="1.25x Fast Challenge"
            >
              1.25x
            </button>
          </div>
        </div>
      </div>

      {/* Dictation Sentences */}
      <div className="space-y-6">
        {sentences.map((sentence, index) => {
          const isPlayingThis = playingId === sentence.id;
          const evaluation = evaluations[sentence.id];
          const hasEvaluated = !!evaluation;

          return (
            <div
              key={sentence.id}
              className="p-5 sm:p-6 rounded-2xl border-2 border-slate-100 hover:border-pink-200 transition-all bg-slate-50/50 space-y-4"
            >
              {/* Top row: Number & Audio buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-pink-600 text-sm">
                    Sentence #{index + 1}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({sentence.wordCount} words)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Standard Play Button with current initial settings */}
                  <button
                    type="button"
                    onClick={() => handlePlaySentenceAudio(sentence, 'normal')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                      isPlayingThis && playingMode === 'normal'
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-pink-100 text-pink-700 hover:bg-pink-200 border border-pink-200'
                    }`}
                    title={`Play at configured speed (${voiceSettings.rate}x) with selected voice`}
                  >
                    <Volume2
                      className={`w-3.5 h-3.5 ${
                        isPlayingThis && playingMode === 'normal' ? 'animate-bounce' : ''
                      }`}
                    />
                    <span>
                      {isPlayingThis && playingMode === 'normal'
                        ? 'Playing Audio...'
                        : `🔊 Listen (${voiceSettings.rate}x)`}
                    </span>
                  </button>

                  {/* Slow Playback (0.75x) for Clear Consonants & Dictation */}
                  <button
                    type="button"
                    onClick={() => handlePlaySentenceAudio(sentence, 'slow')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                      isPlayingThis && playingMode === 'slow'
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                    }`}
                    title="Play at 0.75x slow speed to hear individual syllables and ending consonants"
                  >
                    <span>🐢 Slow (0.75x)</span>
                  </button>

                  {/* Continuous Loop Audio for Dictation */}
                  <button
                    type="button"
                    onClick={() => handleToggleLoopSentence(sentence)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                      isPlayingThis && playingMode === 'loop'
                        ? 'bg-emerald-600 text-white animate-pulse ring-2 ring-emerald-200'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                    title="Repeat playback automatically while you type"
                  >
                    <Repeat className={`w-3 h-3 ${isPlayingThis && playingMode === 'loop' ? 'animate-spin' : ''}`} />
                    <span>{isPlayingThis && playingMode === 'loop' ? 'Looping...' : 'Loop'}</span>
                  </button>
                </div>
              </div>

              {/* Dictation Hint Row */}
              <div className="bg-white p-3 rounded-xl border border-pink-100/80">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Guided Word Clues ({tier.toUpperCase()} Mode):
                </span>
                <div className="flex flex-wrap gap-2 text-xs font-mono font-medium text-slate-600">
                  {sentence.words.map((word, wIdx) => (
                    <span
                      key={`${word}-${wIdx}`}
                      className="px-2 py-1 bg-slate-100 rounded-md border border-slate-200"
                    >
                      {generateWordHint(word, tier)}
                    </span>
                  ))}
                </div>
              </div>

              {/* User Typing Field */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={userInputs[sentence.id] || ''}
                  onChange={(e) =>
                    setUserInputs((prev) => ({
                      ...prev,
                      [sentence.id]: e.target.value,
                    }))
                  }
                  placeholder="Type the full English sentence you heard..."
                  className="w-full text-sm font-medium bg-white border-2 border-pink-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-pink-400 placeholder:text-slate-400"
                />

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleCheckSentence(sentence)}
                    className="px-4 py-2 text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Check Answers</span>
                  </button>

                  {hasEvaluated && (
                    <button
                      type="button"
                      onClick={() => handleReset(sentence.id)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Clear & Try Again</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Word Differences Breakdown */}
              {hasEvaluated && (
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Dictation Accuracy Score:
                    </span>
                    <span
                      className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                        evaluation.score >= 80
                          ? 'bg-emerald-100 text-emerald-800'
                          : evaluation.score >= 50
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {evaluation.score}% Match
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    {evaluation.wordDiffs.map((diff, dIdx) => (
                      <div
                        key={dIdx}
                        className={`px-2.5 py-1 rounded-lg border flex flex-col items-center ${
                          diff.isMatch
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        <span className="font-semibold">{diff.expected}</span>
                        {!diff.isMatch && (
                          <span className="text-[10px] text-rose-500 font-mono mt-0.5">
                            You: "{diff.actual || 'omitted'}"
                          </span>
                        )}
                      </div>
                    ))}
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
