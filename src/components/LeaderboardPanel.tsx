import React from 'react';
import { Flame, Sparkles, Trophy, Medal } from 'lucide-react';
import { GamificationState, LeaderboardEntry } from '../types';

interface LeaderboardPanelProps {
  language?: 'en' | 'vi';
  gamification: GamificationState;
  entries: LeaderboardEntry[];
  effectiveLocalXp?: number;
}

export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({
  language = 'vi',
  gamification,
  entries,
  effectiveLocalXp,
}) => {
  const isEn = language === 'en';
  const displayXp = effectiveLocalXp ?? gamification.totalXp;

  return (
    <div className="space-y-4 max-w-full">
      {/* XP & Streak Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              {isEn ? 'Total XP Earned' : 'Tổng điểm XP'}
            </p>
            <p className="text-xl font-black text-indigo-950">{displayXp.toLocaleString()} XP</p>
          </div>
        </div>

        <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Flame className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700">
              {isEn ? 'Study Streak' : 'Chuỗi ngày học'}
            </p>
            <p className="text-xl font-black text-orange-950">
              {gamification.currentStreakDays}{' '}
              <span className="text-xs font-bold text-orange-700">
                {isEn ? 'days' : 'ngày'}
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              {isEn ? 'Best Streak' : 'Kỷ lục chuỗi'}
            </p>
            <p className="text-xl font-black text-emerald-950">
              {gamification.longestStreakDays}{' '}
              <span className="text-xs font-bold text-emerald-700">
                {isEn ? 'days' : 'ngày'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Medal className="w-4 h-4 text-amber-500 shrink-0" />
            <h4 className="font-heading text-xs sm:text-sm font-extrabold text-slate-900 truncate">
              {isEn ? 'Class Leaderboard (Real Scores)' : 'Bảng xếp hạng thật'}
            </h4>
          </div>
          <span className="text-[10px] font-bold text-slate-500 shrink-0">
            {entries.length} {isEn ? 'entries' : 'học sinh'}
          </span>
        </div>

        {entries.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            {isEn
              ? 'No real XP or student submissions recorded yet. Practice any station or submit homework to appear on the leaderboard!'
              : 'Chưa có bài nộp hoặc điểm thực hành thật nào. Hãy luyện tập hoặc nộp bài để xuất hiện trên bảng xếp hạng!'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {entries.map((entry, idx) => {
              const rank = idx + 1;
              const rankBadge =
                rank === 1
                  ? 'bg-amber-400 text-amber-950'
                  : rank === 2
                  ? 'bg-slate-300 text-slate-800'
                  : rank === 3
                  ? 'bg-orange-300 text-orange-950'
                  : 'bg-slate-100 text-slate-600';

              return (
                <div
                  key={entry.id}
                  className={`px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 ${
                    entry.isCurrentUser ? 'bg-pink-50/70' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${rankBadge}`}
                    >
                      {rank}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                        <span className="truncate">{entry.studentName}</span>
                        {entry.isCurrentUser && (
                          <span className="px-1.5 py-0.5 rounded-md bg-pink-600 text-white text-[9px] font-extrabold shrink-0">
                            {isEn ? 'YOU' : 'BẠN'}
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                        {entry.studentClass || (isEn ? 'Practice Session' : 'Tự luyện')} •{' '}
                        {entry.completedTasks} {isEn ? 'tasks' : 'trạm'} • {entry.avgAccuracy}%
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-black">
                      {entry.xp} XP
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
