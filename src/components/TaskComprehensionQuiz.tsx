import React, { useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle, Award, RefreshCw, ChevronRight } from 'lucide-react';
import { QuizQuestion } from '../types';
import { playSuccessChime, playErrorTone, playSoftTone } from '../utils/audio';

interface TaskComprehensionQuizProps {
  questions: QuizQuestion[];
  soundEnabled: boolean;
  onQuizProgress?: (correctCount: number, total: number) => void;
}

export const TaskComprehensionQuiz: React.FC<TaskComprehensionQuizProps> = ({
  questions,
  soundEnabled,
  onQuizProgress,
}) => {
  // Store user answer index for each question
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  const handleSelectOption = (question: QuizQuestion, optionIndex: number) => {
    // If already answered, allow reselection or keep choice
    const isCorrect = optionIndex === question.correctIndex;
    const nextAnswers = { ...selectedAnswers, [question.id]: optionIndex };
    setSelectedAnswers(nextAnswers);

    const nextCorrectCount = questions.filter(
      (q) => nextAnswers[q.id] === q.correctIndex
    ).length;

    if (onQuizProgress) {
      onQuizProgress(nextCorrectCount, questions.length);
    }

    if (soundEnabled) {
      if (isCorrect) {
        playSuccessChime();
      } else {
        playErrorTone();
      }
    }
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    if (soundEnabled) playSoftTone();
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const correctCount = questions.filter(
    (q) => selectedAnswers[q.id] === q.correctIndex
  ).length;

  const isAllAnswered = answeredCount === questions.length;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-200 shadow-sm space-y-6">
      {/* Quiz Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-pink-100">
        <div>
          <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            TASK 2 • QUICK QUIZ
          </span>
          <h3 className="font-heading text-lg sm:text-xl font-bold text-slate-800 mt-1 flex items-center gap-2">
            <span>✨</span>
            <span>Quiz: Quick Knowledge Check</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Simple, bite-sized questions with single words, short phrases, or numbers
          </p>
        </div>

        {/* Score Card */}
        <div className="flex items-center gap-3">
          <div className="bg-pink-50 border border-pink-200 rounded-2xl px-4 py-2 text-center">
            <span className="text-xs font-semibold text-slate-500 block">
              Quiz Score
            </span>
            <span className="font-heading font-extrabold text-lg text-pink-600">
              {correctCount} / {questions.length}
            </span>
          </div>
        </div>
      </div>

      {/* Completion Banner */}
      {isAllAnswered && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
            correctCount === questions.length
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white shadow-xs">
              <Award className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-sm">
                {correctCount === questions.length
                  ? '🐾 100% Score! Purr-fect Reading Mastery!'
                  : `Good Effort! You got ${correctCount} out of ${questions.length} correct.`}
              </h4>
              <p className="text-xs opacity-90">
                Check Ms Mèo's explanation cards below to solidify your reading context.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetQuiz}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 shadow-xs border border-slate-200 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Questions Stack */}
      <div className="space-y-6">
        {questions.map((q, qIndex) => {
          const userChoice = selectedAnswers[q.id];
          const hasAnswered = userChoice !== undefined;
          const isCorrect = userChoice === q.correctIndex;

          return (
            <div
              key={q.id}
              className="p-5 sm:p-6 rounded-2xl border-2 border-slate-100 hover:border-pink-200 transition-all bg-slate-50/50 space-y-4"
            >
              {/* Question title */}
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-pink-100 text-pink-700 font-heading font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                  Q{qIndex + 1}
                </span>
                <p className="font-heading text-base font-bold text-slate-800 leading-snug">
                  {q.question}
                </p>
              </div>

              {/* 4 Options */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {q.options.map((opt, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx); // A, B, C, D
                  const isThisSelected = userChoice === optIdx;
                  const isThisTheCorrectAnswer = optIdx === q.correctIndex;

                  let optStyle =
                    'bg-white border-slate-200 text-slate-700 hover:border-pink-300 hover:bg-pink-50/40';

                  if (hasAnswered) {
                    if (isThisTheCorrectAnswer) {
                      optStyle =
                        'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold ring-2 ring-emerald-200';
                    } else if (isThisSelected && !isThisTheCorrectAnswer) {
                      optStyle =
                        'bg-rose-50 border-rose-400 text-rose-900 ring-2 ring-rose-200';
                    } else {
                      optStyle = 'bg-white border-slate-100 text-slate-400 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={`${q.id}-opt-${optIdx}`}
                      type="button"
                      disabled={hasAnswered}
                      onClick={() => handleSelectOption(q, optIdx)}
                      className={`p-3 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-2 shadow-xs ${optStyle}`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                          {letter}
                        </span>
                        <span className="font-medium truncate">{opt}</span>
                      </div>

                      {/* Icon status */}
                      {hasAnswered && isThisTheCorrectAnswer && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      {hasAnswered && isThisSelected && !isThisTheCorrectAnswer && (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Immediate Explanation Card */}
              {hasAnswered && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 animate-fadeIn ${
                    isCorrect
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50/60 border-rose-200 text-rose-900'
                  }`}
                >
                  <span className="text-xl">🐱</span>
                  <div className="flex-1 text-xs sm:text-sm">
                    <p className="font-bold mb-0.5">
                      {isCorrect ? 'Correct! High Paw! 🐾' : 'Keep Learning! 🐾'}
                    </p>
                    <p className="text-slate-700 leading-relaxed">
                      {q.explanation}
                    </p>
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
