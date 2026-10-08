import React, { useState } from 'react';
import { Check, X, Sparkles, RefreshCw, Eye, Trophy } from 'lucide-react';
import { WordRecognitionItem } from '../types';
import { playSuccessChime, playSoftTone, playErrorTone } from '../utils/audio';

interface TaskWordRecognitionProps {
  items: WordRecognitionItem[];
  soundEnabled: boolean;
  onRefresh: () => void;
  onCompletedChange?: (completed: boolean) => void;
}

export const TaskWordRecognition: React.FC<TaskWordRecognitionProps> = ({
  items,
  soundEnabled,
  onRefresh,
  onCompletedChange,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);

  const targetCount = items.filter((i) => i.isTarget).length;
  const correctPicks = items.filter(
    (i) => i.isTarget && selectedIds.has(i.id)
  ).length;
  const incorrectPicks = items.filter(
    (i) => !i.isTarget && selectedIds.has(i.id)
  ).length;

  const isCompleted = correctPicks === targetCount && targetCount > 0;

  const handleToggle = (item: WordRecognitionItem) => {
    const nextSelected = new Set(selectedIds);

    if (nextSelected.has(item.id)) {
      nextSelected.delete(item.id);
      if (soundEnabled) playSoftTone();
    } else {
      nextSelected.add(item.id);
      if (soundEnabled) {
        if (item.isTarget) {
          playSuccessChime();
        } else {
          playErrorTone();
        }
      }
    }

    const nextCorrectPicks = items.filter(
      (i) => i.isTarget && nextSelected.has(i.id)
    ).length;
    if (nextCorrectPicks === targetCount && targetCount > 0) {
      onCompletedChange?.(true);
    }

    setSelectedIds(nextSelected);
  };

  const handleReset = () => {
    setSelectedIds(new Set());
    setRevealed(false);
    if (soundEnabled) playSoftTone();
  };

  const handleRevealAll = () => {
    const allTargets = new Set(items.filter((i) => i.isTarget).map((i) => i.id));
    setSelectedIds(allTargets);
    setRevealed(true);
    if (soundEnabled) playSuccessChime();
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-200 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-pink-100">
        <div>
          <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            TASK 1 • VOCABULARY SCAN
          </span>
          <h3 className="font-heading text-lg sm:text-xl font-bold text-slate-800 mt-1 flex items-center gap-2">
            <span>🔍</span>
            <span>Word Recognition: Target vs. Distractor</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Find the <strong>{targetCount} real vocabulary words</strong> that actually appeared in your reading passage. Avoid the plausible distractors!
          </p>
        </div>

        {/* Score Pill */}
        <div className="flex items-center gap-3">
          <div className="bg-pink-50 border border-pink-200 rounded-2xl px-4 py-2 text-center">
            <span className="text-xs font-semibold text-slate-500 block">
              Targets Found
            </span>
            <span className="font-heading font-extrabold text-lg text-pink-600">
              {correctPicks} / {targetCount}
            </span>
          </div>
        </div>
      </div>

      {/* Completion Banner */}
      {isCompleted && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 animate-fadeIn">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm">
              🐾 Purr-fect Detective Work!
            </h4>
            <p className="text-xs text-emerald-700">
              You found all {targetCount} authentic keywords from the text without getting fooled!
            </p>
          </div>
        </div>
      )}

      {/* 10 Interactive Word Chips Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
        {items.map((item) => {
          const isSelected = selectedIds.has(item.id);
          const isTarget = item.isTarget;

          let cardStyle =
            'bg-slate-50 border-slate-200 text-slate-700 hover:border-pink-300 hover:bg-pink-50/50';

          if (isSelected) {
            if (isTarget) {
              cardStyle =
                'bg-emerald-50 border-emerald-400 text-emerald-900 ring-2 ring-emerald-200 font-bold';
            } else {
              cardStyle =
                'bg-rose-50 border-rose-400 text-rose-900 ring-2 ring-rose-200';
            }
          } else if (revealed && isTarget) {
            cardStyle = 'bg-emerald-50/50 border-emerald-300 text-emerald-700 dashed border-2';
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleToggle(item)}
              className={`p-3.5 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1.5 shadow-xs relative group ${cardStyle}`}
            >
              <span className="font-heading text-sm sm:text-base capitalize">
                {item.word}
              </span>

              {/* Status indicator */}
              <div className="flex items-center gap-1 text-[11px]">
                {isSelected ? (
                  isTarget ? (
                    <span className="flex items-center gap-0.5 text-emerald-600 font-bold">
                      <Check className="w-3.5 h-3.5" /> Target Word
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-rose-600 font-bold">
                      <X className="w-3.5 h-3.5" /> Distractor
                    </span>
                  )
                ) : (
                  <span className="text-slate-400 text-[10px] group-hover:text-pink-600">
                    Tap to verify
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Control Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-pink-100">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Chips</span>
          </button>
          <button
            type="button"
            onClick={handleRevealAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-pink-600 bg-pink-50 hover:bg-pink-100 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Reveal Answers</span>
          </button>
        </div>

        {/* Ms Mèo Advice Box */}
        <div className="text-xs text-slate-500 italic flex items-center gap-1.5">
          <span>🐱</span>
          <span>
            {incorrectPicks > 0
              ? 'Oops! Check your text again for that distractor.'
              : 'Scan the main passage to spot the exact spelling!'}
          </span>
        </div>
      </div>
    </div>
  );
};
