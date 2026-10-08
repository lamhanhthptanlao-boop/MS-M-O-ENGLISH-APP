import React from 'react';
import {
  Home,
  PenTool,
  Share2,
  BookOpen,
  BarChart3,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  Trophy,
  Eye,
  Globe,
} from 'lucide-react';
import mascotImg from '../assets/images/ms_meo_mascot_1790341757214.jpg';

interface HeaderProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  language?: 'en' | 'vi';
  onToggleLanguage?: () => void;
  currentView?: 'home' | 'creator' | 'practice';
  onGoHome: () => void;
  onOpenCreator: () => void;
  onOpenPractice: () => void;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onOpenLibrary?: () => void;
  savedCount?: number;
  onOpenBadges?: () => void;
  unlockedBadgeCount?: number;
  totalBadgeCount?: number;
  onOpenAssignModal?: () => void;
  onOpenAdminDashboard?: () => void;
  isStudentMode?: boolean;
  onOpenSubmitModal?: () => void;
  isStudentPreview?: boolean;
  onToggleStudentPreview?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  soundEnabled,
  onToggleSound,
  language = 'en',
  onToggleLanguage,
  currentView = 'home',
  onGoHome,
  onOpenCreator,
  onOpenPractice,
  activeTab,
  onSelectTab,
  onOpenLibrary,
  savedCount = 0,
  onOpenBadges,
  unlockedBadgeCount = 0,
  totalBadgeCount = 10,
  onOpenAssignModal,
  onOpenAdminDashboard,
  isStudentMode = false,
  onOpenSubmitModal,
  isStudentPreview = false,
  onToggleStudentPreview,
}) => {
  const isEn = language === 'en' || isStudentMode;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-pink-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Zone 1: Logo & Brand Lockup (Clicking returns Home) */}
        <button
          type="button"
          onClick={onGoHome}
          className="flex items-center gap-2.5 text-left shrink-0 group focus:outline-none"
          title={isEn ? 'Home' : 'Trang chủ'}
        >
          <div className="relative">
            <img
              src={mascotImg}
              alt="Ms Mèo Mascot"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full border-2 border-pink-300 object-cover shadow-sm transition-transform group-hover:scale-105"
            />
            <span className="absolute -bottom-1 -right-1 text-xs">🎓</span>
          </div>
          <div>
            <span className="font-heading text-base sm:text-lg font-bold tracking-tight text-slate-800 flex items-center gap-1.5">
              <span>Ms Mèo English</span>
              <span className="text-pink-600 text-[10px] font-bold px-2 py-0.2 bg-pink-50 rounded-full border border-pink-200 uppercase tracking-wider">
                {isStudentMode ? 'Student' : 'Lab'}
              </span>
            </span>
            <p className="text-[11px] text-slate-400 hidden lg:block -mt-0.5">
              {isEn
                ? 'Interactive English Shadowing & Comprehension Lab'
                : 'Luyện nói phát âm, nhịp điệu & đọc hiểu THPT'}
            </p>
          </div>
        </button>

        {/* Zone 2: Navigation Buttons (Starting with HOME, followed by standalone buttons) */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1">
          {/* 1. BUTTON HOME (TRANG CHỦ) - Always First! */}
          <button
            type="button"
            onClick={onGoHome}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs hover:scale-102 shrink-0 ${
              currentView === 'home'
                ? 'bg-pink-100 text-pink-700 border border-pink-300 font-extrabold ring-1 ring-pink-300'
                : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200'
            }`}
            title={isEn ? 'Go to Home' : 'Về Trang chủ'}
          >
            <Home className="w-3.5 h-3.5 text-pink-600" />
            <span>{isEn ? 'Home' : 'Trang chủ'}</span>
          </button>

          {isStudentMode ? (
            /* Student Mode Navigation Buttons (100% in English) */
            <>
              {/* Practice Button */}
              <button
                type="button"
                onClick={onOpenPractice}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs hover:scale-102 shrink-0 ${
                  currentView === 'practice'
                    ? 'bg-indigo-600 text-white font-extrabold ring-2 ring-indigo-200 shadow-xs'
                    : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
                }`}
                title="Practice Lab"
              >
                <span>🚀</span>
                <span>Practice</span>
              </button>

              {/* Direct Tab Switches when in Practice */}
              <button
                type="button"
                onClick={() => {
                  onOpenPractice();
                  onSelectTab('listening');
                }}
                className={`hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  currentView === 'practice' && activeTab === 'listening'
                    ? 'bg-pink-100 text-pink-700 border border-pink-300 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>🎧</span>
                <span>Listening</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenPractice();
                  onSelectTab('shadowing');
                }}
                className={`hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  currentView === 'practice' && activeTab === 'shadowing'
                    ? 'bg-pink-100 text-pink-700 border border-pink-300 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>🎙️</span>
                <span>Shadowing</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenPractice();
                  onSelectTab('words');
                }}
                className={`hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  currentView === 'practice' && activeTab === 'words'
                    ? 'bg-pink-100 text-pink-700 border border-pink-300 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>🔍</span>
                <span>Task 1</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenPractice();
                  onSelectTab('quiz');
                }}
                className={`hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  currentView === 'practice' && activeTab === 'quiz'
                    ? 'bg-pink-100 text-pink-700 border border-pink-300 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>📝</span>
                <span>Task 2</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenPractice();
                  onSelectTab('dictation');
                }}
                className={`hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  currentView === 'practice' && activeTab === 'dictation'
                    ? 'bg-pink-100 text-pink-700 border border-pink-300 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>🎧</span>
                <span>Task 3</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenPractice();
                  onSelectTab('chatbot');
                }}
                className={`hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  currentView === 'practice' && activeTab === 'chatbot'
                    ? 'bg-pink-100 text-pink-700 border border-pink-300 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>🐱</span>
                <span>Ms Mèo Chat</span>
              </button>

              {/* Submit Homework Button (English) */}
              {onOpenSubmitModal && (
                <button
                  type="button"
                  onClick={onOpenSubmitModal}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-xs transition-all hover:scale-102 ring-2 ring-amber-200 shrink-0"
                >
                  <Send className="w-3.5 h-3.5 text-slate-900" />
                  <span>📤 Submit Homework</span>
                </button>
              )}
            </>
          ) : (
            /* Teacher / Lab Mode Standalone Buttons */
            <>
              {/* 2. DEDICATED SOẠN BÀI / CREATOR BUTTON */}
              <button
                type="button"
                onClick={onOpenCreator}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-102 shrink-0 ${
                  currentView === 'creator'
                    ? 'bg-rose-600 text-white ring-2 ring-rose-200 font-extrabold shadow-sm'
                    : 'text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600'
                }`}
                title={isEn ? 'Create or edit English reading passage & dialogue' : 'Soạn bài đọc hoặc hội thoại mới'}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>{isEn ? '✍️ Lesson Creator' : '✍️ Soạn bài'}</span>
              </button>

              {/* 3. DEDICATED PRACTICE (LUYỆN TẬP) BUTTON */}
              <button
                type="button"
                onClick={onOpenPractice}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-xs hover:scale-102 shrink-0 ${
                  currentView === 'practice'
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-200 font-extrabold shadow-sm'
                    : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
                }`}
                title={isEn ? 'Practice Lab: Shadowing, Task 1, Task 2, Task 3 & Ms Mèo Chat' : 'Phòng Luyện tập: Shadowing, Task 1, Task 2, Task 3 & Ms Mèo Chat'}
              >
                <span>🚀</span>
                <span>{isEn ? 'Practice' : 'Luyện tập'}</span>
              </button>

              {/* Direct Tab Switches when in Practice view */}
              {currentView === 'practice' && (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectTab('listening')}
                    className={`hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      activeTab === 'listening'
                        ? 'bg-pink-100 text-pink-700 border border-pink-300 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>🎧</span>
                    <span>{isEn ? 'Listening' : 'Nghe Karaoke'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectTab('shadowing')}
                    className={`hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      activeTab === 'shadowing'
                        ? 'bg-pink-100 text-pink-700 border border-pink-300 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>🎙️</span>
                    <span>Shadowing</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectTab('words')}
                    className={`hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      activeTab === 'words'
                        ? 'bg-pink-100 text-pink-700 border border-pink-300 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>🔍</span>
                    <span>Task 1</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectTab('quiz')}
                    className={`hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      activeTab === 'quiz'
                        ? 'bg-pink-100 text-pink-700 border border-pink-300 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>📝</span>
                    <span>Task 2</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectTab('dictation')}
                    className={`hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      activeTab === 'dictation'
                        ? 'bg-pink-100 text-pink-700 border border-pink-300 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>🎧</span>
                    <span>Task 3</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectTab('chatbot')}
                    className={`hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      activeTab === 'chatbot'
                        ? 'bg-pink-100 text-pink-700 border border-pink-300 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>🐱</span>
                    <span>Ms Mèo Chat</span>
                  </button>
                </>
              )}

              {/* 4. GIAO BÀI (LINK) BUTTON */}
              {onOpenAssignModal && (
                <button
                  type="button"
                  onClick={onOpenAssignModal}
                  title={isEn ? 'Assign this lesson to students via share link' : 'Giao bài học này cho học sinh qua chia sẻ link'}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl shadow-xs transition-all hover:scale-102 ring-1 ring-emerald-300 shrink-0"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isEn ? 'Assign' : 'Giao bài'}</span>
                  <span className="sm:hidden">{isEn ? 'Assign' : 'Giao'}</span>
                </button>
              )}

              {/* 5. KHO BÀI (LIBRARY) BUTTON */}
              {onOpenLibrary && (
                <button
                  type="button"
                  onClick={onOpenLibrary}
                  title={isEn ? 'Open saved lessons library' : 'Mở kho bài học đã lưu'}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-xl transition-all shrink-0"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isEn ? 'Library' : 'Kho bài'}</span>
                  {savedCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-pink-500 text-white text-[10px] font-bold">
                      {savedCount}
                    </span>
                  )}
                </button>
              )}

              {/* 6. QUẢN LÝ ADMIN BUTTON */}
              {onOpenAdminDashboard && (
                <button
                  type="button"
                  onClick={onOpenAdminDashboard}
                  title={isEn ? 'Teacher & Admin: Manage assignments & view student scorecards' : 'Trang chủ Admin: Quản lý bài tập & Xem kết quả nộp bài của học sinh'}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all shadow-2xs hover:scale-102 shrink-0"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden md:inline">{isEn ? 'Submissions' : 'Quản lý Admin'}</span>
                  <span className="md:hidden">Admin</span>
                </button>
              )}

              {/* Preview Student Mode Button */}
              {onToggleStudentPreview && (
                <button
                  type="button"
                  onClick={onToggleStudentPreview}
                  title={isStudentPreview ? 'Switch back to Teacher View' : 'Preview Student Experience'}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all shadow-2xs shrink-0 ${
                    isStudentPreview
                      ? 'bg-purple-600 text-white ring-2 ring-purple-200'
                      : 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">{isStudentPreview ? 'Teacher View' : 'Student View'}</span>
                </button>
              )}
            </>
          )}

          {/* 7. HUY HIỆU (BADGES) BUTTON */}
          {onOpenBadges && (
            <button
              type="button"
              onClick={onOpenBadges}
              title={isEn ? 'View Achievements & Badges' : 'Xem danh sách Huy hiệu & Thành tích'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all shadow-2xs hover:scale-102 shrink-0"
            >
              <span>🏅</span>
              <span className="hidden md:inline">{isEn ? 'Badges' : 'Huy hiệu'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-extrabold">
                {unlockedBadgeCount}/{totalBadgeCount}
              </span>
            </button>
          )}

          {/* 8. LANGUAGE TOGGLE (EN / VI) */}
          {onToggleLanguage && (
            <button
              type="button"
              onClick={onToggleLanguage}
              title={language === 'en' ? 'Chuyển sang Tiếng Việt' : 'Switch to English'}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 hover:border-pink-300 hover:bg-pink-50 transition-all shrink-0 text-slate-700 shadow-2xs"
            >
              <Globe className="w-3.5 h-3.5 text-pink-600" />
              <span>{language === 'en' ? '🇺🇸 EN' : '🇻🇳 VI'}</span>
            </button>
          )}

          {/* 9. ÂM THANH (SOUND TOGGLE) BUTTON */}
          <button
            type="button"
            onClick={onToggleSound}
            title={soundEnabled ? (isEn ? 'Mute sound' : 'Tắt âm thanh') : (isEn ? 'Enable sound' : 'Bật âm thanh')}
            className="p-2 text-slate-600 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors border border-slate-200 hover:border-pink-200 shrink-0"
            aria-label="Toggle sound effects"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-pink-600" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

