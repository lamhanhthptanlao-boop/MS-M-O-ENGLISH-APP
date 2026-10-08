import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  Square,
  Volume2,
  Sparkles,
  Phone,
  PhoneOff,
  Radio,
  User,
  VolumeX,
  RefreshCw,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { AnalyzedSentence, ChatMessage, VoiceSettings } from '../types';
import {
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
  ttsController,
  stripSpeakerTags,
  resolveSelectedVoice,
} from '../utils/speech';
import { generateMsMeoReply } from '../utils/textParser';
import { playSuccessChime, playSoftTone, playPurr, playErrorTone } from '../utils/audio';
import { LiveVoiceClient } from '../utils/liveVoice';
import mascotImg from '../assets/images/ms_meo_mascot_1790341757214.jpg';

interface TaskMsMeoChatbotProps {
  fullText: string;
  sentences: AnalyzedSentence[];
  voiceSettings: VoiceSettings;
  soundEnabled: boolean;
  onChatActivity?: () => void;
  isStudentMode?: boolean;
}

export const TaskMsMeoChatbot: React.FC<TaskMsMeoChatbotProps> = ({
  fullText,
  sentences,
  voiceSettings,
  soundEnabled,
  onChatActivity,
  isStudentMode = false,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'ms_meo',
      text: "Meow! Hello there! 🐾 I'm Ms Mèo. Ask me anything about our reading passage—like tricky grammar points, vocabulary definitions, sentence summaries, or we can roleplay a practice dialogue! You can type below or tap the microphone to speak directly with me!",
      cleanAudioText:
        "Hello there! I'm Ms Mèo. Ask me anything about our reading passage, like tricky grammar points, vocabulary definitions, sentence summaries, or we can practice a dialogue together. You can type or tap the microphone to speak with me!",
      timestamp: Date.now(),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [isHandsFreeActive, setIsHandsFreeActive] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [isLoadingReply, setIsLoadingReply] = useState(false);

  // Live API Voice Call state
  const [isLiveCallOpen, setIsLiveCallOpen] = useState(false);
  const [liveCallStatus, setLiveCallStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening'
  >('disconnected');
  const [liveVolume, setLiveVolume] = useState(0);
  const [liveCallError, setLiveCallError] = useState<string | null>(null);
  const [liveFocusMode, setLiveFocusMode] = useState<'all' | 'pronunciation' | 'mistakes' | 'topic'>('all');
  const [activeVoiceTip, setActiveVoiceTip] = useState<string | null>(null);
  const [languageMode, setLanguageMode] = useState<'auto' | 'en' | 'vi'>('auto');

  const focusLabels: Record<string, string> = {
    all: 'Toàn diện: Sửa phát âm, sửa lỗi khi nói và hỏi đáp về chủ đề bài đọc',
    pronunciation: 'Chuyên sâu phát âm: Chỉ ra âm đuôi (-s, -ed), trọng âm từ, nối âm và ngữ điệu',
    mistakes: 'Chuyên sâu sửa lỗi nói: Phát hiện lỗi ngữ pháp, dùng từ, cấu trúc câu và gợi ý cách diễn đạt tự nhiên',
    topic: 'Hỏi đáp & Thảo luận chủ đề: Đặt câu hỏi mở, đàm thoại và phân tích ý kiến về bài đọc',
  };

  const recognizerRef = useRef<ReturnType<typeof createSpeechRecognizer> | null>(null);
  const liveClientRef = useRef<LiveVoiceClient | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const isHandsFreeRef = useRef(false);

  useEffect(() => {
    isHandsFreeRef.current = isHandsFreeActive;
  }, [isHandsFreeActive]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoadingReply]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      ttsController.stop();
      if (recognizerRef.current) {
        recognizerRef.current.abort();
      }
      if (liveClientRef.current) {
        liveClientRef.current.stop();
      }
    };
  }, []);

  // Fetch AI reply from server (/api/chat) with fallback to intelligent local parser
  const getMsMeoResponse = async (userText: string): Promise<{ text: string; cleanAudio: string }> => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          fullText,
          conversationHistory: messages.slice(-5),
          languageMode,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.reply) {
          const clean = stripSpeakerTags(data.reply);
          return { text: data.reply, cleanAudio: clean };
        }
      }
    } catch {
      // Fallback
    }

    const localResult = generateMsMeoReply(userText, fullText, sentences, languageMode);
    return { text: localResult.responseText, cleanAudio: localResult.cleanAudioText };
  };

  // Send message and trigger vocal response
  const handleSendMessage = async (textToSend: string, autoSpeak = false) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoadingReply) return;

    if (soundEnabled) playSoftTone();

    const studentMessage: ChatMessage = {
      id: `student-${Date.now()}`,
      sender: 'student',
      text: trimmed,
      cleanAudioText: stripSpeakerTags(trimmed),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, studentMessage]);
    setInputQuery('');
    setIsLoadingReply(true);
    onChatActivity?.();

    const { text, cleanAudio } = await getMsMeoResponse(trimmed);
    setIsLoadingReply(false);

    const msMeoMessage: ChatMessage = {
      id: `meo-${Date.now() + 1}`,
      sender: 'ms_meo',
      text,
      cleanAudioText: cleanAudio,
      timestamp: Date.now() + 1,
    };

    setMessages((prev) => [...prev, msMeoMessage]);
    if (soundEnabled) playPurr();

    // Auto-speak reply if student sent via voice or hands-free mode is on
    if (autoSpeak || isHandsFreeRef.current) {
      speakMessage(msMeoMessage, () => {
        // If hands-free is active, automatically listen again!
        if (isHandsFreeRef.current) {
          startVoiceRecognition();
        }
      });
    }
  };

  // Single TTS message playback with cleaned speaker tags
  const speakMessage = (msg: ChatMessage, onEndCallback?: () => void) => {
    setPlayingMessageId(msg.id);
    const selectedVoice = resolveSelectedVoice(voiceSettings);

    const speechText = msg.cleanAudioText || stripSpeakerTags(msg.text);

    ttsController.speak(
      speechText,
      selectedVoice,
      voiceSettings,
      () => setPlayingMessageId(msg.id),
      () => {
        setPlayingMessageId(null);
        onEndCallback?.();
      },
      () => {
        setPlayingMessageId(null);
        onEndCallback?.();
      }
    );
  };

  // Start Voice Recognition
  const startVoiceRecognition = () => {
    ttsController.stop();
    setPlayingMessageId(null);
    setMicError(null);
    if (soundEnabled) playSoftTone();

    const recognizer = createSpeechRecognizer(
      (transcript, isFinal) => {
        setInputQuery(transcript);
        if (isFinal && transcript.trim()) {
          handleSendMessage(transcript, true);
          if (recognizerRef.current) {
            recognizerRef.current.stop();
          }
          setIsVoiceRecording(false);
        }
      },
      () => {
        setIsVoiceRecording(true);
      },
      () => {
        setIsVoiceRecording(false);
      },
      (err) => {
        setMicError(err);
        setIsVoiceRecording(false);
        setIsHandsFreeActive(false);
      }
    );

    if (!recognizer) {
      setMicError('Speech recognition is not supported in this browser.');
      setIsHandsFreeActive(false);
      return;
    }

    recognizerRef.current = recognizer;
    try {
      recognizer.start();
    } catch {
      setMicError('Could not access microphone.');
      setIsHandsFreeActive(false);
    }
  };

  const handleToggleVoiceInput = () => {
    if (isVoiceRecording) {
      if (recognizerRef.current) {
        recognizerRef.current.stop();
      }
      setIsVoiceRecording(false);
      setIsHandsFreeActive(false);
      return;
    }

    startVoiceRecognition();
  };

  // Live Voice Call with Gemini Live API (gemini-3.8-live)
  const handleStartLiveCall = async () => {
    ttsController.stop();
    setPlayingMessageId(null);
    setIsVoiceRecording(false);
    setIsHandsFreeActive(false);
    setLiveCallError(null);
    setIsLiveCallOpen(true);
    setActiveVoiceTip(null);

    if (soundEnabled) playSuccessChime();
    onChatActivity?.();

    if (!liveClientRef.current) {
      liveClientRef.current = new LiveVoiceClient();
      liveClientRef.current.onStatusChange = (status) => {
        setLiveCallStatus(status);
      };
      liveClientRef.current.onVolumeChange = (vol) => {
        setLiveVolume(vol);
      };
      liveClientRef.current.onError = (err) => {
        setLiveCallError(err);
        if (soundEnabled) playErrorTone();
      };
    }

    try {
      await liveClientRef.current.start(fullText, focusLabels[liveFocusMode], languageMode);
    } catch (err: any) {
      setLiveCallError(err?.message || 'Could not start live voice stream.');
    }
  };

  const handleSwitchFocusMode = (mode: 'all' | 'pronunciation' | 'mistakes' | 'topic') => {
    setLiveFocusMode(mode);
    if (soundEnabled) playSoftTone();
    if (liveClientRef.current) {
      liveClientRef.current.sendContextUpdate(fullText, focusLabels[mode], languageMode);
    }
  };

  const handleSwitchLanguageMode = (mode: 'auto' | 'en' | 'vi') => {
    setLanguageMode(mode);
    if (soundEnabled) playSoftTone();
    if (liveClientRef.current && isLiveCallOpen) {
      liveClientRef.current.sendContextUpdate(fullText, focusLabels[liveFocusMode], mode);
    }
  };

  const handleEndLiveCall = () => {
    if (liveClientRef.current) {
      liveClientRef.current.stop();
    }
    setLiveCallStatus('disconnected');
    setIsLiveCallOpen(false);
    setActiveVoiceTip(null);
    if (soundEnabled) playSoftTone();
  };

  const quickQuestions = [
    'Sửa phát âm câu này cho em',
    'Sửa lỗi khi nói & ngữ pháp',
    'Hỏi em câu hỏi về bài đọc',
    'Explain key grammar rules in this text',
    'What are the main vocabulary words?',
    'Summarize the main idea',
    'Generate a practice dialogue for two people',
  ];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-pink-200 shadow-sm flex flex-col h-[740px] relative overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-pink-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={mascotImg}
              alt="Ms Mèo Mascot"
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-full border-2 border-pink-300 object-cover shadow-xs"
            />
            <span
              className={`w-3.5 h-3.5 border-2 border-white rounded-full absolute bottom-0 right-0 ${
                isLiveCallOpen
                  ? 'bg-rose-500 animate-ping'
                  : isVoiceRecording
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-emerald-500'
              }`}
            />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-slate-800 flex items-center gap-2">
              <span>Ms Mèo's Interactive Classroom</span>
              <span className="text-[11px] font-bold text-pink-700 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-full">
                Gemini Live Voice & Text
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Speak directly in real time • Instant audio feedback with speaker tags stripped
            </p>
          </div>
        </div>

        {/* Language Mode Selector & Live Call Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Language Mode Switcher */}
          <div className="flex items-center gap-1 bg-pink-50/80 border border-pink-200 p-0.5 rounded-xl text-xs">
            <span className="text-[11px] font-bold text-slate-500 pl-1.5 flex items-center gap-1">
              <span>🌐</span>
            </span>
            {[
              { id: 'auto', label: '🔄 1 thứ tiếng (Đổi khi cần)', short: '🔄 Tự đổi' },
              { id: 'en', label: '🇬🇧 EN Only', short: '🇬🇧 EN' },
              { id: 'vi', label: '🇻🇳 Tiếng Việt', short: '🇻🇳 VI' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSwitchLanguageMode(item.id as any)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                  languageMode === item.id
                    ? 'bg-white text-slate-800 shadow-2xs border border-pink-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={
                  item.id === 'auto'
                    ? 'Dùng 1 ngôn ngữ duy nhất mỗi lượt, tự đổi khi bạn nói tiếng Việt'
                    : item.id === 'en'
                    ? '100% tiếng Anh'
                    : '100% tiếng Việt'
                }
              >
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.short}</span>
              </button>
            ))}
          </div>

          {!isLiveCallOpen ? (
            <button
              type="button"
              onClick={handleStartLiveCall}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 shadow-sm transition-all hover:scale-102 ring-2 ring-emerald-200"
              title="Cuộc gọi thoại trực tiếp với Ms Mèo: Sửa phát âm, sửa lỗi khi nói & hỏi đáp theo bài đọc"
            >
              <Phone className="w-3.5 h-3.5 animate-bounce" />
              <span>📞 Live Call</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEndLiveCall}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>End Call</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              ttsController.stop();
              setPlayingMessageId(null);
            }}
            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-slate-100 transition-colors"
            title="Stop all audio"
          >
            <VolumeX className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Voice Call Full-Overlay Screen (when Live Call is active) */}
      {isLiveCallOpen && (
        <div className="absolute inset-x-0 top-16 bottom-0 z-20 bg-gradient-to-b from-white/98 via-pink-50/98 to-rose-50/98 backdrop-blur-md p-4 sm:p-6 flex flex-col items-center justify-between text-center overflow-y-auto animate-fadeIn">
          {/* Top Status & Focus Mode Switcher */}
          <div className="w-full flex flex-col gap-2.5 shrink-0">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {isStudentMode
                    ? 'Gemini 3.8 Live Voice Call • Chatting with Ms Mèo'
                    : 'Gemini 3.8 Live Voice Call • Đồng hành cùng Ms Mèo'}
                </span>
              </div>

              <button
                onClick={handleEndLiveCall}
                className="text-xs font-bold text-slate-500 hover:text-rose-600 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors"
              >
                {isStudentMode ? 'Switch to text chat ✕' : 'Chuyển về khung chat text ✕'}
              </button>
            </div>

            {/* Language Mode Bar (Single Language Discipline) */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 p-1 bg-white/90 border border-pink-200 rounded-2xl shadow-xs max-w-2xl mx-auto">
              <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1">
                <span>🌐 {isStudentMode ? 'Language:' : 'Ngôn ngữ:'}</span>
              </span>
              {[
                {
                  id: 'auto',
                  label: isStudentMode ? '🔄 Auto (English default)' : '🔄 1 Thứ tiếng • Đổi khi cần (Mặc định)',
                  desc: isStudentMode
                    ? 'Ms Mèo speaks strictly one language per turn (default English), switches to Vietnamese only when prompted.'
                    : 'Ms Mèo nói duy nhất một thứ tiếng mỗi lượt (mặc định tiếng Anh), chỉ đổi sang tiếng Việt khi bạn nói tiếng Việt hoặc yêu cầu.',
                },
                {
                  id: 'en',
                  label: isStudentMode ? '🇬🇧 English Only' : '🇬🇧 Chỉ tiếng Anh (EN only)',
                  desc: isStudentMode
                    ? '100% English throughout the call to sharpen fluency.'
                    : '100% tiếng Anh trong toàn bộ cuộc gọi để luyện phản xạ.',
                },
                {
                  id: 'vi',
                  label: isStudentMode ? '🇻🇳 Vietnamese Only' : '🇻🇳 Chỉ tiếng Việt (VI only)',
                  desc: isStudentMode
                    ? 'Vietnamese explanations and feedback.'
                    : '100% tiếng Việt để giải thích và nhận xét cặn kẽ.',
                },
              ].map((l) => {
                const isLangActive = languageMode === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => handleSwitchLanguageMode(l.id as any)}
                    title={l.desc}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      isLangActive
                        ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-xs scale-102'
                        : 'text-slate-600 hover:bg-pink-50 hover:text-pink-600'
                    }`}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>

            {/* Focus Mode Selector Pills */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 p-1 bg-white/80 border border-pink-200 rounded-2xl shadow-xs max-w-2xl mx-auto">
              {[
                {
                  id: 'all',
                  label: isStudentMode ? '🎯 All-in-One (3-in-1)' : '🎯 Toàn diện (3 trong 1)',
                  desc: isStudentMode
                    ? 'Pronunciation + Speaking corrections + Reading Q&A'
                    : 'Sửa phát âm + Lỗi khi nói + Hỏi đáp bài đọc',
                },
                {
                  id: 'pronunciation',
                  label: isStudentMode ? '🎙️ Pronunciation & Intonation' : '🎙️ Sửa phát âm & Ngữ điệu',
                  desc: isStudentMode
                    ? 'Ending sounds, word stress & phonetic clarity'
                    : 'Chỉ ra âm đuôi, trọng âm, nguyên âm khó',
                },
                {
                  id: 'mistakes',
                  label: isStudentMode ? '✍️ Speaking Corrections' : '✍️ Sửa lỗi khi nói',
                  desc: isStudentMode
                    ? 'Grammar slip check, word choice & natural phrasing'
                    : 'Bắt lỗi ngữ pháp, dùng từ, gợi ý câu tự nhiên',
                },
                {
                  id: 'topic',
                  label: isStudentMode ? '💬 Reading Topic Q&A' : '💬 Hỏi đáp theo bài đọc',
                  desc: isStudentMode
                    ? 'Two-way dialogue on the reading passage themes'
                    : 'Đàm thoại & phản xạ theo chủ đề bài đọc',
                },
              ].map((m) => {
                const isActive = liveFocusMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSwitchFocusMode(m.id as any)}
                    title={m.desc}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs scale-102'
                        : 'text-slate-600 hover:bg-pink-50 hover:text-pink-600'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Language Rule Explanation Note */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50/90 border border-emerald-200 px-3 py-1 rounded-full max-w-xl mx-auto">
              <span>✨</span>
              <span>
                {isStudentMode
                  ? languageMode === 'auto'
                    ? 'Single Language Discipline: Ms Mèo speaks 100% English. If you speak Vietnamese, Ms Mèo will switch to Vietnamese!'
                    : languageMode === 'en'
                    ? '100% English Mode: Native English throughout the entire call.'
                    : '100% Vietnamese Mode: Feedback and guidance in Vietnamese.'
                  : languageMode === 'auto'
                  ? 'Quy tắc một ngôn ngữ: Ms Mèo nói 100% tiếng Anh, không chêm tiếng. Nếu bạn nói tiếng Việt, Ms Mèo sẽ tự động chuyển sang tiếng Việt!'
                  : languageMode === 'en'
                  ? 'Chế độ 100% tiếng Anh: Ms Mèo sử dụng hoàn toàn tiếng Anh bản xứ trong toàn bộ cuộc gọi.'
                  : 'Chế độ 100% tiếng Việt: Ms Mèo giải thích và nhận xét hoàn toàn bằng tiếng Việt.'}
              </span>
            </div>
          </div>

          {/* Central Mascot & Audio Visualizer */}
          <div className="my-auto flex flex-col items-center gap-4 py-2">
            <div className="relative">
              {/* Outer pulsing rings */}
              <div
                className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full absolute -inset-2 bg-pink-400/20 transition-transform ${
                  liveCallStatus === 'speaking'
                    ? 'scale-125 animate-ping duration-1000'
                    : liveCallStatus === 'listening'
                    ? 'scale-110 animate-pulse'
                    : ''
                }`}
              />

              <img
                src={mascotImg}
                alt="Ms Mèo Mascot"
                referrerPolicy="no-referrer"
                className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 object-cover shadow-xl transition-all relative z-10 ${
                  liveCallStatus === 'speaking'
                    ? 'border-emerald-400 ring-8 ring-emerald-100'
                    : liveCallStatus === 'listening'
                    ? 'border-pink-400 ring-8 ring-pink-100'
                    : 'border-slate-300'
                }`}
              />

              {/* Status pill badge */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 bg-white border border-pink-200 px-3 py-0.5 rounded-full shadow-md text-xs font-bold text-slate-700 whitespace-nowrap">
                {liveCallStatus === 'speaking' &&
                  (isStudentMode ? '🔊 Ms Mèo is speaking & coaching...' : '🔊 Ms Mèo đang nói & nhận xét...')}
                {liveCallStatus === 'listening' &&
                  (isStudentMode ? '🎙️ Listening to your voice...' : '🎙️ Đang lắng nghe giọng bạn nói...')}
                {liveCallStatus === 'connecting' &&
                  (isStudentMode ? '⏳ Connecting voice channel...' : '⏳ Đang kết nối đường truyền giọng nói...')}
                {liveCallStatus === 'connected' &&
                  (isStudentMode ? '🟢 Connected • Ready to talk' : '🟢 Đã kết nối • Sẵn sàng nói chuyện')}
                {liveCallStatus === 'disconnected' &&
                  (isStudentMode ? 'Call ended' : 'Đã ngắt kết nối')}
              </div>
            </div>

            {/* Sound Wave Bars */}
            <div className="flex items-center gap-1.5 h-8 mt-1">
              {[40, 70, 100, 60, 90, 45, 80, 55, 95, 50].map((h, i) => {
                const dynamicHeight =
                  liveCallStatus === 'speaking'
                    ? Math.max(12, Math.sin(Date.now() / 150 + i) * 26 + 18)
                    : liveCallStatus === 'listening'
                    ? Math.max(8, liveVolume * 40 * ((i % 3) + 1))
                    : 6;

                return (
                  <div
                    key={i}
                    style={{ height: `${dynamicHeight}px` }}
                    className={`w-1.5 rounded-full transition-all duration-75 ${
                      liveCallStatus === 'speaking'
                        ? 'bg-emerald-500'
                        : liveCallStatus === 'listening'
                        ? 'bg-pink-500'
                        : 'bg-slate-300'
                    }`}
                  />
                );
              })}
            </div>

            {/* 3 Core Capability Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-2xl w-full text-left my-1">
              <div className="p-2.5 rounded-2xl bg-white/90 border border-pink-100 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-pink-700">
                  <span>🎙️</span>
                  <span>{isStudentMode ? 'Pronunciation Polish' : 'Sửa phát âm'}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-tight">
                  {isStudentMode
                    ? 'Target ending sounds (-s, -ed, -t), syllable stress, and mouth shape guide.'
                    : 'Nghe âm đuôi (-s, -ed, -t), trọng âm và hướng dẫn khẩu hình chuẩn.'}
                </p>
              </div>

              <div className="p-2.5 rounded-2xl bg-white/90 border border-emerald-100 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <span>✍️</span>
                  <span>{isStudentMode ? 'Speaking Corrections' : 'Sửa lỗi khi nói'}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-tight">
                  {isStudentMode
                    ? 'Identify grammatical slips, wrong word choices, and suggest natural expressions.'
                    : 'Chỉ ra lỗi ngữ pháp, dùng từ sai và gợi ý cách diễn đạt tự nhiên hơn.'}
                </p>
              </div>

              <div className="p-2.5 rounded-2xl bg-white/90 border border-purple-100 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700">
                  <span>💬</span>
                  <span>{isStudentMode ? 'Topic Q&A' : 'Hỏi đáp bài đọc'}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-tight">
                  {isStudentMode
                    ? 'Engage in two-way discussion, clarify difficult words, and test comprehension.'
                    : 'Đàm thoại 2 chiều, giải thích từ khó và đặt câu hỏi mở phản xạ.'}
                </p>
              </div>
            </div>

            {/* Suggested Spoken Prompts / Icebreakers */}
            <div className="max-w-2xl w-full">
              <p className="text-[11px] font-bold text-slate-500 mb-1.5">
                {isStudentMode
                  ? '💡 Recommended sentences you can say into the Mic:'
                  : '💡 Gợi ý câu bạn có thể nói ngay vào Micro với Ms Mèo:'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {(isStudentMode
                  ? [
                      'Ms Mèo, please check my pronunciation of this sentence...',
                      'Could you tell me if my last sentence had any grammar errors?',
                      'Can you ask me a question about the reading passage?',
                      'What is the main takeaway of this topic, Ms Mèo?',
                    ]
                  : [
                      'Ms Mèo ơi, sửa phát âm câu này giúp em...',
                      'Cô nhận xét giúp em câu vừa nói có lỗi ngữ pháp không?',
                      'Cô hỏi em 1 câu về chủ đề bài đọc này đi!',
                      'Chủ đề bài đọc này có thông điệp gì vậy Ms Mèo?',
                    ]
                ).map((promptText, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => {
                      setActiveVoiceTip(promptText);
                      if (soundEnabled) playSoftTone();
                    }}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-pink-100/70 hover:bg-pink-200/70 text-pink-800 border border-pink-200 transition-all hover:scale-102"
                  >
                    🗣️ "{promptText}"
                  </button>
                ))}
              </div>

              {activeVoiceTip && (
                <div className="mt-2 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 animate-fadeIn">
                  <span className="font-bold">
                    {isStudentMode ? '✨ Speak into your Mic:' : '✨ Hãy nói to vào Micro:'}
                  </span>{' '}
                  "{activeVoiceTip}" —{' '}
                  {isStudentMode
                    ? 'Ms Mèo is listening to you!'
                    : 'Ms Mèo đang lắng nghe bạn!'}
                </div>
              )}
            </div>

            {liveCallError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 max-w-md text-left">
                <p className="font-bold">
                  {isStudentMode ? 'Connection Notice:' : 'Thông báo đường truyền:'}
                </p>
                <p className="mt-0.5">{liveCallError}</p>
                <p className="mt-1 text-slate-500">
                  {isStudentMode
                    ? 'Tip: You can also use the hands-free mic button in the text chat below.'
                    : 'Mẹo: Bạn cũng có thể dùng nút micro rảnh tay ở giao diện chat bên dưới.'}
                </p>
              </div>
            )}
          </div>

          {/* Bottom Live Call Controls */}
          <div className="flex items-center gap-4 shrink-0 pt-2">
            <button
              onClick={handleEndLiveCall}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-heading font-bold text-sm shadow-md transition-all hover:scale-105"
            >
              <PhoneOff className="w-4 h-4" />
              <span>
                {isStudentMode
                  ? 'End Voice Call (Hang Up)'
                  : 'Kết thúc cuộc gọi (Hang Up)'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Prompts Bar */}
      <div className="py-2.5 overflow-x-auto flex items-center gap-2 border-b border-pink-50 shrink-0">
        <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">
          Quick Prompts:
        </span>
        {quickQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(q, false)}
            className="text-xs font-semibold px-3 py-1 rounded-xl bg-pink-50/70 hover:bg-pink-100 text-pink-700 border border-pink-200 whitespace-nowrap transition-all hover:scale-102 shadow-xs"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Mic Notice if Error */}
      {micError && (
        <div className="my-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
          <span>{micError}</span>
          <button
            type="button"
            onClick={() => setMicError(null)}
            className="font-bold underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {messages.map((msg) => {
          const isMeo = msg.sender === 'ms_meo';
          const isPlaying = playingMessageId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                isMeo ? 'justify-start' : 'justify-end'
              }`}
            >
              {isMeo && (
                <div className="w-8 h-8 rounded-full bg-pink-100 border border-pink-200 flex items-center justify-center shrink-0 mt-1">
                  🐱
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs relative ${
                  isMeo
                    ? 'bg-pink-50/60 border border-pink-200/90 text-slate-800'
                    : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-tr-none'
                }`}
              >
                {/* Preserved line-breaks */}
                <div className="whitespace-pre-line space-y-2">{msg.text}</div>

                {/* Footer with Audio Playback */}
                {isMeo && (
                  <div className="mt-3 pt-2.5 border-t border-pink-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 font-medium">
                      Natural Speech (Speaker Tags Stripped)
                    </span>

                    <button
                      type="button"
                      onClick={() => speakMessage(msg)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        isPlaying
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-white text-pink-700 hover:bg-pink-100 border border-pink-200'
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{isPlaying ? 'Playing Audio...' : '🔊 Listen to Ms Mèo'}</span>
                    </button>
                  </div>
                )}
              </div>

              {!isMeo && (
                <div className="w-8 h-8 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-rose-700" />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoadingReply && (
          <div className="flex items-center gap-2 text-xs text-pink-600 bg-pink-50/70 p-3 rounded-2xl w-fit">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Ms Mèo is thinking of cozy advice...</span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Input Form with Dual Modes (Text + Voice Recognition + Hands-Free Toggle) */}
      <div className="pt-3 border-t border-pink-100 shrink-0 space-y-2">
        {/* Hands-Free continuous voice dialogue toggle */}
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => {
              const nextVal = !isHandsFreeActive;
              setIsHandsFreeActive(nextVal);
              if (nextVal) {
                startVoiceRecognition();
              } else {
                if (recognizerRef.current) recognizerRef.current.stop();
                setIsVoiceRecording(false);
              }
            }}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors border ${
              isHandsFreeActive
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                : 'text-slate-500 bg-slate-50 border-slate-200 hover:text-pink-600'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isHandsFreeActive ? 'text-emerald-600 animate-pulse' : ''}`} />
            <span>
              {isHandsFreeActive
                ? 'Continuous Voice Dialogue: ON (Hands-Free)'
                : 'Turn on Continuous Voice Dialogue'}
            </span>
          </button>

          {isVoiceRecording && (
            <span className="text-[11px] text-rose-600 font-bold animate-pulse flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Recording voice...
            </span>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputQuery, false);
          }}
          className="flex items-center gap-2"
        >
          {/* Voice Microphone Input Button */}
          <button
            type="button"
            onClick={handleToggleVoiceInput}
            title={isVoiceRecording ? 'Stop speaking' : 'Tap to speak your question'}
            className={`p-3 rounded-2xl text-white transition-all shadow-xs shrink-0 ${
              isVoiceRecording
                ? 'bg-rose-600 animate-mic-pulse ring-4 ring-rose-200'
                : 'bg-pink-100 text-pink-700 hover:bg-pink-200 border border-pink-200'
            }`}
          >
            {isVoiceRecording ? (
              <Square className="w-5 h-5 fill-current" />
            ) : (
              <Mic className="w-5 h-5 text-pink-700" />
            )}
          </button>

          {/* Text Input Field */}
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={
              isVoiceRecording
                ? 'Listening to you speak... (or tap to finish)'
                : 'Ask Ms Mèo about grammar, vocabulary, or pronunciation...'
            }
            className="flex-1 text-sm bg-slate-50 border-2 border-pink-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white transition-all placeholder:text-slate-400"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoadingReply}
            className="p-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
