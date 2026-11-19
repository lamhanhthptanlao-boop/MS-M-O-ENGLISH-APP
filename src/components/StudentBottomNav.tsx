import React from 'react';
import { Flame, Sparkles, Trophy, Send, Award } from 'lucide-react';
import { AssignedTaskType } from '../types';

interface StudentBottomNavProps {
  language?: 'en' | 'vi';
  activeTab: string;
  assignedTaskType?: AssignedTaskType;
  totalXp: number;
  streakDays: number;
  unlockedBadgeCount?: number;
  onSelectTab?: (tabId: 'listening' | 'shadowing' | 'words' | 'quiz' | 'dictation' | 'chatbot') => void;
  onOpenLeaderboard?: () => void;
  onOpenBadges?: () => void;
  onOpenSubmitModal?: () => void;
}

export const StudentBottomNav: React.FC<StudentBottomNavProps> = ({
  language = 'vi',
  activeTab,
  assignedTaskType = 'all',
  totalXp,
  streakDays,
  unlockedBadgeCount = 0,
  onSelectTab,
  onOpenLeaderboard,
  onOpenBadges,
  onOpenSubmitModal,
}) => {
  const isEn = language === 'en';
  const showAllStations = assignedTaskType === 'all' && !!onSelectTab;

  const stations: {
    id: 'listening' | 'shadowing' | 'words' | 'quiz' | 'dictation' | 'chatbot';
    icon: string;
    labelEn: string;
    labelVi: string;
  }[] = [
    { id: 'listening', icon: '🎧', labelEn: 'Listen', labelVi: 'Nghe' },
    { id: 'shadowing', icon: '🎙️', labelEn: 'Speak', labelVi: 'Nói' },
    { id: 'words', icon: '🔍', labelEn: 'Words', labelVi: 'Từ' },
    { id: 'quiz', icon: '📝', labelEn: 'Quiz', labelVi: 'Quiz' },
    { id: 'dictation', icon: '✍️', labelEn: 'Type', labelVi: 'Viết' },
    { id: 'chatbot', icon: '🐱', labelEn: 'Chat', labelVi: 'Chat' },
  ];

  return (
    <nav
      aria-label={isEn ? 'Student Bottom Navigation' : 'Menu dưới cho học sinh'}
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-pink-200 shadow-[0_-4px_16px_rgba(15,23,42,0.08)]"
    >
      <div className="max-w-4xl mx-auto px-2 py-1.5 flex flex-col gap-1.5">
        {/* If Full Lesson: compact 6-station grid fits cleanly even on 360px */}
        {showAllStations && (
          <div className="grid grid-cols-6 gap-1">
            {stations.map((st) => {
              const isActive = activeTab === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => onSelectTab?.(st.id)}
                  className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-[10px] font-bold transition-all min-w-0 ${
                    isActive
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-pink-50'
                  }`}
                >
                  <span className="text-sm leading-none">{st.icon}</span>
                  <span className="mt-0.5 truncate max-w-full">
                    {isEn ? st.labelEn : st.labelVi}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Quick Status + Action Row (360px safe) */}
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-extrabold shrink-0">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span>{totalXp} XP</span>
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-[11px] font-extrabold shrink-0">
              <Flame className="w-3 h-3 text-orange-500" />
              <span>{streakDays}d</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenLeaderboard && (
              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[11px] font-bold transition-colors"
                title={isEn ? 'Leaderboard & XP' : 'Bảng xếp hạng & XP'}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                <span>{isEn ? 'Rank' : 'XH'}</span>
              </button>
            )}

            {onOpenBadges && (
              <button
                type="button"
                onClick={onOpenBadges}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-800 text-[11px] font-bold transition-colors"
                title={isEn ? 'Badges' : 'Huy hiệu'}
              >
                <Award className="w-3.5 h-3.5 text-pink-600" />
                <span>{unlockedBadgeCount}</span>
              </button>
            )}

            {onOpenSubmitModal && (
              <button
                type="button"
                onClick={onOpenSubmitModal}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-extrabold shadow-xs transition-colors"
              >
                <Send className="w-3 h-3" />
                <span>{isEn ? 'Submit' : 'Nộp bài'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
