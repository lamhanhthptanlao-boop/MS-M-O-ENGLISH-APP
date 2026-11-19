import React from 'react';
import {
  PenTool,
  ArrowRight,
  Eye,
  Trophy,
  Flame,
  Sparkles,
} from 'lucide-react';
import mascotImg from '../assets/images/ms_meo_mascot_1790341757214.jpg';
import { Assignment } from '../types';
import { StorageHonestyBanner } from './StorageHonestyBanner';

interface HomeLandingViewProps {
  isStudentMode: boolean;
  activeAssignment: Assignment | null;
  language?: 'en' | 'vi';
  onOpenCreator: () => void;
  onOpenPractice: () => void;
  onOpenAdminDashboard?: () => void;
  onOpenAssignModal?: () => void;
  onOpenBadges?: () => void;
  unlockedBadgeCount: number;
  totalBadgeCount: number;
  onSelectTab: (tabId: 'listening' | 'shadowing' | 'words' | 'quiz' | 'dictation' | 'chatbot') => void;
  onOpenSubmitModal?: () => void;
  isStudentPreview?: boolean;
  onToggleStudentPreview?: () => void;
  totalXp?: number;
  streakDays?: number;
  onOpenLeaderboard?: () => void;
  onDataImported?: () => void;
}

export const HomeLandingView: React.FC<HomeLandingViewProps> = ({
  isStudentMode,
  activeAssignment,
  language = 'en',
  onOpenCreator,
  onOpenPractice,
  isStudentPreview,
  onToggleStudentPreview,
  totalXp = 0,
  streakDays = 0,
  onOpenLeaderboard,
  onDataImported,
}) => {
  const isEn = language === 'en';

  return (
    <div className="space-y-5 animate-fadeIn max-w-4xl mx-auto py-3 sm:py-4">
      {/* App Title & Mascot Branding Hero */}
      <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 rounded-3xl p-6 sm:p-12 text-white shadow-xl relative overflow-hidden text-center flex flex-col items-center justify-center border border-pink-400/40">
        <div className="absolute -top-16 -left-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-rose-400/25 rounded-full blur-2xl pointer-events-none" />

        {/* Mascot Centerpiece */}
        <div className="relative mb-5 group">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white/80 shadow-2xl overflow-hidden bg-white mx-auto transition-transform group-hover:scale-105 duration-300">
            <img
              src={mascotImg}
              alt="Ms Mèo English Mascot"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="absolute -bottom-1 right-1 text-2xl sm:text-3xl filter drop-shadow">🎓</span>
        </div>

        {/* App Title & Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-3">
          <span>{isStudentMode ? '🎒' : '🐱'}</span>
          <span>
            {isStudentMode
              ? activeAssignment
                ? `${isEn ? 'Student Portal • Class:' : 'Cổng Học sinh • Lớp:'} ${activeAssignment.className || 'English'}`
                : isEn ? 'Student Learning Hub' : 'Không gian Học sinh'
              : isEn
              ? 'Ms Mèo English Practice Lab'
              : 'Phòng Luyện Thực Hành Tiếng Anh'}
          </span>
        </div>

        <h1 className="font-heading text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
          Ms Mèo English
        </h1>

        <p className="text-pink-100 text-xs sm:text-base max-w-2xl mt-3 leading-relaxed">
          {isEn
            ? 'Interactive English Speech, Pronunciation & Reading Comprehension Lab. Practice authentic shadowing with Ms Mèo and sharpen your fluency!'
            : 'Phòng Luyện Phát Âm, Nhịp Điệu & Đọc Hiểu Tiếng Anh THPT. Nâng cao phản xạ nói, ngữ điệu tự nhiên và kỹ năng đọc hiểu qua các trạm thực hành tương tác.'}
        </p>

        {/* Compact XP, Streak & Leaderboard Pill */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-extrabold">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>{totalXp.toLocaleString()} XP</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-extrabold">
            <Flame className="w-3.5 h-3.5 text-orange-200" />
            <span>
              {streakDays} {isEn ? 'day streak' : 'ngày liên tiếp'}
            </span>
          </span>
          {onOpenLeaderboard && (
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-xs transition-all"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{isEn ? 'Leaderboard' : 'Bảng xếp hạng'}</span>
            </button>
          )}
        </div>

        {/* Direct Action Launch Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onOpenPractice}
            className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 rounded-2xl font-heading font-extrabold text-sm sm:text-base bg-white text-pink-600 hover:bg-pink-50 shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <span>🚀</span>
            <span>{isEn ? 'Enter Practice Lab' : 'Vào Luyện tập ngay'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {!isStudentMode && (
            <button
              type="button"
              onClick={onOpenCreator}
              className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 rounded-2xl font-heading font-extrabold text-sm sm:text-base bg-pink-700/80 hover:bg-pink-700 text-white border border-white/25 shadow-md hover:shadow-lg transition-all hover:scale-105 backdrop-blur-xs"
            >
              <PenTool className="w-4 h-4" />
              <span>{isEn ? 'Lesson Creator' : 'Soạn bài học mới'}</span>
            </button>
          )}
        </div>

        {/* Teacher Mode Preview Switcher (if available) */}
        {!activeAssignment && onToggleStudentPreview && (
          <div className="mt-6 pt-5 border-t border-white/20 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onToggleStudentPreview}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-sm"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>
                {isStudentPreview
                  ? isEn ? '🔄 Switch to Teacher View' : '🔄 Quay lại giao diện Giáo viên'
                  : isEn ? '👁️ Preview Student Experience' : '👁️ Xem thử giao diện Học sinh'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Honest Storage Notice + Export/Import JSON + Manual Supabase Guide */}
      <StorageHonestyBanner
        language={language}
        compact
        onDataImported={onDataImported}
      />
    </div>
  );
};

