import React, { useEffect } from 'react';
import { Sparkles, Trophy, X, Award } from 'lucide-react';
import { BadgeDefinition } from '../types';

interface BadgeUnlockedToastProps {
  badge: BadgeDefinition | null;
  onClose: () => void;
  onOpenBadgesModal: () => void;
}

export const BadgeUnlockedToast: React.FC<BadgeUnlockedToastProps> = ({
  badge,
  onClose,
  onOpenBadgesModal,
}) => {
  useEffect(() => {
    if (!badge) return;
    const timer = setTimeout(() => {
      onClose();
    }, 7000);
    return () => clearTimeout(timer);
  }, [badge, onClose]);

  if (!badge) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-bounceIn">
      <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 p-0.5 rounded-3xl shadow-2xl">
        <div className="bg-white rounded-[22px] p-4 text-slate-800 relative overflow-hidden">
          {/* Top Row with Icon, Title, and Close */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md bg-gradient-to-br ${badge.badgeColor} text-white shrink-0`}
              >
                {badge.icon}
              </div>

              <div>
                <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Huy hiệu mới đã mở khóa!</span>
                </div>
                <h4 className="font-heading font-extrabold text-sm text-slate-900 mt-1">
                  {badge.title}
                </h4>
                <p className="text-xs font-bold text-pink-600">
                  {badge.vietnameseTitle} • 🐾 {badge.catThemeName}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cat Praise Quote */}
          <div className="mt-2.5 p-2 bg-pink-50/70 border border-pink-200 rounded-xl text-[11px] text-pink-950 italic">
            "{badge.catPraise}"
          </div>

          {/* Action Button */}
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenBadgesModal();
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-xs transition-all flex items-center gap-1.5 hover:scale-102"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-200" />
              <span>Xem bộ sưu tập huy hiệu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
