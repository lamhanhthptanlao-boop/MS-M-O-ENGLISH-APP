import React, { useState } from 'react';
import {
  X,
  Award,
  CheckCircle2,
  Lock,
  Sparkles,
  Trophy,
  Star,
  ExternalLink,
  RotateCcw,
  Flame,
  HelpCircle,
} from 'lucide-react';
import { BadgeDefinition, UnlockedBadge } from '../types';
import { ALL_BADGES } from '../utils/badges';
import mascotImg from '../assets/images/ms_meo_mascot_1790341757214.jpg';

interface BadgesModalProps {
  isOpen: boolean;
  onClose: () => void;
  unlockedBadges: UnlockedBadge[];
  onResetBadges?: () => void;
  onNavigateToTab?: (tab: 'shadowing' | 'words' | 'quiz' | 'dictation' | 'chatbot') => void;
}

export const BadgesModal: React.FC<BadgesModalProps> = ({
  isOpen,
  onClose,
  unlockedBadges,
  onResetBadges,
  onNavigateToTab,
}) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null);

  if (!isOpen) return null;

  const unlockedMap = new Map<string, string>();
  unlockedBadges.forEach((b) => unlockedMap.set(b.badgeId, b.unlockedAt));

  const totalCount = ALL_BADGES.length;
  const unlockedCount = unlockedBadges.length;
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  const filteredBadges = ALL_BADGES.filter((b) => {
    const isUnlocked = unlockedMap.has(b.id);
    if (filter === 'unlocked') return isUnlocked;
    if (filter === 'locked') return !isUnlocked;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-pink-200 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 p-5 sm:p-6 text-white shrink-0 relative overflow-hidden">
          <div className="flex items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <img
                  src={mascotImg}
                  alt="Ms Mèo Mascot"
                  referrerPolicy="no-referrer"
                  className="w-13 h-13 sm:w-14 sm:h-14 rounded-full border-3 border-white/80 object-cover shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 text-base bg-amber-400 rounded-full p-0.5 shadow-xs">
                  🏆
                </span>
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider">
                  <span>🐱 Ms Mèo's Trophy Room</span>
                </div>
                <h2 className="font-heading text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5">
                  Badges & Achievements
                </h2>
                <p className="text-xs text-pink-100 hidden sm:block">
                  Huy hiệu & Thành tích học tập tiếng Anh dễ thương cùng cô giáo Ms Mèo
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar Container */}
          <div className="mt-4 pt-3 border-t border-white/20 relative z-10">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="flex items-center gap-1.5">
                <span>⭐ Tiến độ mở khóa huy hiệu:</span>
                <span className="text-amber-200 font-extrabold text-sm">
                  {unlockedCount} / {totalCount}
                </span>
              </span>
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px]">
                {progressPercent}% Hoàn thành
              </span>
            </div>
            <div className="w-full h-3 bg-black/20 rounded-full overflow-hidden p-0.5 border border-white/20">
              <div
                className="h-full bg-gradient-to-r from-amber-300 to-yellow-200 rounded-full transition-all duration-700 shadow-xs"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Decorative background glow */}
          <div className="absolute -right-8 -top-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Filters and Navigation Tabs */}
        <div className="px-5 py-3 border-b border-pink-100 bg-pink-50/50 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-pink-200 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filter === 'all'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-pink-600'
              }`}
            >
              Tất cả ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unlocked')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filter === 'unlocked'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-600'
              }`}
            >
              Đã mở khóa ({unlockedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('locked')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filter === 'locked'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chưa mở khóa ({totalCount - unlockedCount})
            </button>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
            <span>💡 Bấm vào từng huy hiệu để xem lời khen của Ms Mèo!</span>
          </div>
        </div>

        {/* Badges Grid View */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredBadges.map((badge) => {
              const isUnlocked = unlockedMap.has(badge.id);
              const unlockedTime = unlockedMap.get(badge.id);

              return (
                <div
                  key={badge.id}
                  onClick={() => setSelectedBadge(badge)}
                  className={`cursor-pointer rounded-2xl p-4 border transition-all hover:scale-101 relative flex flex-col justify-between ${
                    isUnlocked
                      ? 'bg-gradient-to-b from-white to-pink-50/60 border-pink-300 shadow-sm hover:shadow-md ring-1 ring-pink-200'
                      : 'bg-slate-50/80 border-slate-200 opacity-75 hover:opacity-95'
                  }`}
                >
                  {/* Top Badge Icon & Category */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={`w-13 h-13 rounded-2xl flex items-center justify-center text-2xl shadow-sm border ${
                          isUnlocked
                            ? `bg-gradient-to-br ${badge.badgeColor} text-white ${badge.borderGlow}`
                            : 'bg-slate-200 text-slate-400 border-slate-300'
                        }`}
                      >
                        {badge.icon}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {isUnlocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Đã đạt được!</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600 border border-slate-300">
                            <Lock className="w-3 h-3 text-slate-500" />
                            <span>Chưa mở</span>
                          </span>
                        )}

                        <span className="text-[10px] font-semibold text-pink-600 bg-pink-100/60 px-2 py-0.5 rounded-md">
                          🐾 {badge.catThemeName}
                        </span>
                      </div>
                    </div>

                    {/* Badge Title & Subtitle */}
                    <div className="mt-3">
                      <h3
                        className={`font-heading font-extrabold text-sm ${
                          isUnlocked ? 'text-slate-800' : 'text-slate-600'
                        }`}
                      >
                        {badge.title}
                      </h3>
                      <p className="text-xs font-semibold text-pink-600">
                        {badge.vietnameseTitle}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                        {badge.description}
                      </p>
                    </div>
                  </div>

                  {/* Bottom unlock hint or praise */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                    {isUnlocked ? (
                      <div className="text-[11px] text-emerald-800 bg-emerald-50/70 p-2 rounded-xl border border-emerald-200">
                        <p className="font-semibold italic">"{badge.catPraise}"</p>
                        {unlockedTime && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            📅 Mở khóa: {new Date(unlockedTime).toLocaleDateString('vi-VN')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 bg-white/70 p-2 rounded-xl border border-slate-200">
                        <span className="font-bold text-slate-700">🎯 Cách nhận:</span>{' '}
                        <span>{badge.requirementHint}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-pink-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>🐾 Học đều đặn mỗi ngày để sưu tầm trọn bộ 10 huy hiệu Ms Mèo!</span>
          </div>

          <div className="flex items-center gap-2">
            {onResetBadges && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Bạn có chắc muốn đặt lại toàn bộ huy hiệu để thử thách mở khóa từ đầu?')) {
                    onResetBadges();
                  }
                }}
                className="text-xs text-slate-400 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors flex items-center gap-1"
                title="Đặt lại huy hiệu (dành cho thử nghiệm)"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-xs transition-all hover:scale-102"
            >
              Tiếp tục học bài
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
