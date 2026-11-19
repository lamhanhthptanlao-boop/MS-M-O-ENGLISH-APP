import React, { useState, useEffect, useMemo } from 'react';
import { Volume2, Sliders, Globe, User, Clock, Play, Check, Sparkles, Star, AlertCircle } from 'lucide-react';
import { NativeAccent, VoiceAge, VoiceGender, VoiceSettings } from '../types';
import {
  filterVoices,
  ttsController,
  isRealisticVoice,
  RecommendedVoiceSpec,
  findStrictDeviceVoiceForSpec,
  getMatchingRecommendedSpecs,
  getDeviceSupportedAccents,
  getDeviceSupportedGenders,
} from '../utils/speech';

interface VoiceToolbarProps {
  settings: VoiceSettings;
  onUpdateSettings: (newSettings: VoiceSettings) => void;
  language?: 'en' | 'vi';
  onPlayTestVoice?: () => void;
}

export const VoiceToolbar: React.FC<VoiceToolbarProps> = ({
  settings,
  onUpdateSettings,
  language = 'vi',
}) => {
  const isEn = language === 'en';
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [testingVoiceId, setTestingVoiceId] = useState<string | null>(null);

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      }
    };

    loadVoices();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Only show accents, genders, and presets that genuinely exist on this device!
  const supportedAccents = useMemo(
    () => getDeviceSupportedAccents(availableVoices),
    [availableVoices]
  );

  const supportedGenders = useMemo(
    () => getDeviceSupportedGenders(availableVoices, settings.accent),
    [availableVoices, settings.accent]
  );

  const matchingRecommended = useMemo(
    () => getMatchingRecommendedSpecs(availableVoices),
    [availableVoices]
  );

  const filteredVoices = useMemo(
    () => filterVoices(availableVoices, settings.accent, settings.gender, settings.age),
    [availableVoices, settings.accent, settings.gender, settings.age]
  );

  const selectedVoice =
    filteredVoices[settings.voiceIndex] ||
    filteredVoices[0] ||
    availableVoices[0] ||
    null;

  const naturalVoicesCount = availableVoices.filter(
    (v) => v.lang.toLowerCase().startsWith('en') && isRealisticVoice(v)
  ).length;

  const getAccentLabel = (acc: NativeAccent) => {
    switch (acc) {
      case 'all':
        return isEn ? '🌍 All Device Voices' : '🌍 Tất cả giọng trên máy';
      case 'en-US':
        return isEn ? '🇺🇸 American (US)' : '🇺🇸 Mỹ (US English)';
      case 'en-GB':
        return isEn ? '🇬🇧 British (UK)' : '🇬🇧 Anh (UK English)';
      case 'en-AU':
        return isEn ? '🇦🇺 Australian (AU)' : '🇦🇺 Úc (AU English)';
      case 'en-CA':
        return isEn ? '🇨🇦 Canadian (CA)' : '🇨🇦 Canada (CA English)';
      default:
        return isEn ? '🌐 Other English' : '🌐 Giọng tiếng Anh khác';
    }
  };

  const getGenderLabel = (g: VoiceGender) => {
    switch (g) {
      case 'all':
        return isEn ? 'All Genders' : 'Tất cả giới tính';
      case 'female':
        return isEn ? 'Female' : 'Nữ (Female)';
      case 'male':
        return isEn ? 'Male' : 'Nam (Male)';
    }
  };

  const handleTestVoice = (customText?: string, voiceToUse?: SpeechSynthesisVoice | null) => {
    if (isPlayingTest) {
      ttsController.stop();
      setIsPlayingTest(false);
      setTestingVoiceId(null);
      return;
    }

    setIsPlayingTest(true);
    const testPhrase =
      customText ||
      "Hello high school learners! I'm Ms Mèo, your friendly English teacher. Let's practice with authentic native pronunciation!";

    ttsController.speak(
      testPhrase,
      voiceToUse || selectedVoice,
      settings,
      () => setIsPlayingTest(true),
      () => {
        setIsPlayingTest(false);
        setTestingVoiceId(null);
      },
      () => {
        setIsPlayingTest(false);
        setTestingVoiceId(null);
      }
    );
  };

  const handleSelectRecommended = (spec: RecommendedVoiceSpec) => {
    const targetVoice = findStrictDeviceVoiceForSpec(spec, availableVoices);
    if (!targetVoice) return;

    const candidateList = filterVoices(availableVoices, spec.accent, spec.gender, 'all');
    let newIndex = 0;
    const foundIdx = candidateList.findIndex((v) => v.name === targetVoice.name);
    if (foundIdx >= 0) {
      newIndex = foundIdx;
    }

    onUpdateSettings({
      ...settings,
      accent: spec.accent,
      gender: spec.gender,
      age: 'all',
      voiceIndex: newIndex,
    });
  };

  const handlePreviewRecommended = (spec: RecommendedVoiceSpec, e: React.MouseEvent) => {
    e.stopPropagation();
    if (testingVoiceId === spec.id) {
      ttsController.stop();
      setIsPlayingTest(false);
      setTestingVoiceId(null);
      return;
    }

    const targetVoice = findStrictDeviceVoiceForSpec(spec, availableVoices);
    if (!targetVoice) return;

    setTestingVoiceId(spec.id);
    setIsPlayingTest(true);

    ttsController.speak(
      spec.sampleSentence,
      targetVoice,
      { ...settings, accent: spec.accent, gender: spec.gender, rate: 1.0 },
      () => setIsPlayingTest(true),
      () => {
        setIsPlayingTest(false);
        setTestingVoiceId(null);
      },
      () => {
        setIsPlayingTest(false);
        setTestingVoiceId(null);
      }
    );
  };

  return (
    <div className="bg-white/95 backdrop-blur-md border border-pink-200/90 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4 max-w-full overflow-hidden">
      {/* 1. Header & Engine Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-pink-100">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-sm shrink-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-black text-sm text-slate-800 flex items-center gap-2 flex-wrap">
              <span>{isEn ? 'Device Voice & Accent Filter' : 'Bộ lọc Giọng đọc thật của Thiết bị'}</span>
              {naturalVoicesCount > 0 && (
                <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>
                    {isEn
                      ? `${naturalVoicesCount} Natural Voices Available`
                      : `${naturalVoicesCount} Giọng tự nhiên trên máy`}
                  </span>
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEn
                ? 'Only displays accents & voices actually installed on this browser/device.'
                : 'Chỉ hiển thị đúng các giọng và accent thực sự có sẵn trên trình duyệt/thiết bị này.'}
            </p>
          </div>
        </div>

        {/* Global Test Sample Button */}
        <button
          type="button"
          onClick={() => handleTestVoice()}
          disabled={availableVoices.length === 0}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all shadow-xs self-start sm:self-auto disabled:opacity-50 ${
            isPlayingTest && !testingVoiceId
              ? 'bg-rose-500 text-white animate-pulse'
              : 'bg-pink-100 text-pink-700 hover:bg-pink-200'
          }`}
        >
          {isPlayingTest && !testingVoiceId ? (
            <>
              <Volume2 className="w-4 h-4 animate-bounce" />
              <span>{isEn ? 'Stop Preview' : 'Đang phát thử (Dừng)'}</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isEn ? 'Test Current Voice' : 'Nghe thử giọng hiện tại'}</span>
            </>
          )}
        </button>
      </div>

      {/* 2. DEVICE-VERIFIED RECOMMENDED VOICES ONLY */}
      <div className="space-y-2.5 bg-gradient-to-r from-amber-50/70 via-pink-50/50 to-indigo-50/70 p-3.5 rounded-2xl border border-amber-200/70">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-lg bg-amber-400 text-slate-950 font-black text-xs shadow-2xs shrink-0">
              ⭐
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              {isEn
                ? `Available Device Voice Presets (${matchingRecommended.length})`
                : `Giọng thật tìm thấy trên thiết bị (${matchingRecommended.length})`}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 hidden md:inline">
            {isEn
              ? 'Click to select or hit ▶ to preview'
              : 'Bấm để chọn giọng thật hoặc bấm ▶ để nghe thử'}
          </span>
        </div>

        {matchingRecommended.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {matchingRecommended.map(({ spec, deviceVoice, deviceVoiceName }) => {
              const isSelectedExact = selectedVoice?.name === deviceVoiceName;
              const isActive =
                isSelectedExact ||
                (settings.accent === spec.accent && settings.gender === spec.gender);
              const isPlayingThis = testingVoiceId === spec.id;

              return (
                <div
                  key={spec.id}
                  onClick={() => handleSelectRecommended(spec)}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-start justify-between gap-2 select-none min-w-0 ${
                    isActive
                      ? 'bg-white border-pink-400 shadow-sm ring-2 ring-pink-300/60'
                      : 'bg-white/80 hover:bg-white border-slate-200/90 hover:border-pink-300'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm">{spec.flag}</span>
                      <span className="text-xs font-extrabold text-slate-900 truncate">
                        {deviceVoiceName}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-black text-pink-700 bg-pink-100 px-1.5 py-0.2 rounded-md border border-pink-300 inline-flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" /> {isEn ? 'Active' : 'Đang dùng'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-pink-600 mt-0.5 truncate">
                      {isEn ? spec.roleEn : spec.roleVi}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {deviceVoice.lang} • {isRealisticVoice(deviceVoice) ? 'Natural/Neural' : 'Standard OS'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handlePreviewRecommended(spec, e)}
                    title={isEn ? `Preview ${deviceVoiceName}` : `Nghe thử ${deviceVoiceName}`}
                    className={`p-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      isPlayingThis
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-slate-100 hover:bg-pink-100 text-slate-700 hover:text-pink-700'
                    }`}
                  >
                    {isPlayingThis ? (
                      <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl bg-white/80 border border-amber-200 p-3 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              {availableVoices.length === 0
                ? isEn
                  ? 'Loading system TTS voices from your device...'
                  : 'Đang tải danh sách giọng đọc thật từ hệ điều hành/trình duyệt...'
                : isEn
                ? `Detected ${availableVoices.length} voice(s) on this device. Choose one from the detailed voice selector below.`
                : `Thiết bị hiện có ${availableVoices.length} giọng. Hãy chọn trực tiếp ở ô Giọng đọc chi tiết bên dưới.`}
            </span>
          </div>
        )}
      </div>

      {/* 3. Detailed Parameter Controls — 360px safe */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {/* Accent Selector (ONLY accents supported on this device) */}
        <div className="flex flex-col gap-1 min-w-0">
          <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
            <Globe className="w-3 h-3 text-pink-500 shrink-0" />
            <span>{isEn ? 'Device Accent' : 'Vùng miền trên máy'}</span>
          </label>
          <select
            value={supportedAccents.includes(settings.accent) ? settings.accent : 'all'}
            onChange={(e) =>
              onUpdateSettings({
                ...settings,
                accent: e.target.value as NativeAccent,
                voiceIndex: 0,
              })
            }
            className="w-full min-w-0 text-xs font-semibold text-slate-800 bg-slate-50 border border-pink-200 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400"
          >
            {supportedAccents.map((acc) => (
              <option key={acc} value={acc}>
                {getAccentLabel(acc)}
              </option>
            ))}
          </select>
        </div>

        {/* Gender Selector (ONLY genders found on this device for chosen accent) */}
        <div className="flex flex-col gap-1 min-w-0">
          <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
            <User className="w-3 h-3 text-pink-500 shrink-0" />
            <span>{isEn ? 'Voice Gender' : 'Giới tính giọng'}</span>
          </label>
          <select
            value={supportedGenders.includes(settings.gender) ? settings.gender : 'all'}
            onChange={(e) =>
              onUpdateSettings({
                ...settings,
                gender: e.target.value as VoiceGender,
                voiceIndex: 0,
              })
            }
            className="w-full min-w-0 text-xs font-semibold text-slate-800 bg-slate-50 border border-pink-200 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400"
          >
            {supportedGenders.map((g) => (
              <option key={g} value={g}>
                {getGenderLabel(g)}
              </option>
            ))}
          </select>
        </div>

        {/* Age Profile Selector */}
        <div className="flex flex-col gap-1 min-w-0">
          <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
            <Star className="w-3 h-3 text-pink-500 shrink-0" />
            <span>{isEn ? 'Tone / Pitch' : 'Độ tuổi / Âm vực'}</span>
          </label>
          <select
            value={settings.age}
            onChange={(e) =>
              onUpdateSettings({
                ...settings,
                age: e.target.value as VoiceAge,
                voiceIndex: 0,
              })
            }
            className="w-full min-w-0 text-xs font-semibold text-slate-800 bg-slate-50 border border-pink-200 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400"
          >
            <option value="all">{isEn ? 'Natural Default' : 'Tự nhiên (Mặc định)'}</option>
            <option value="adult">{isEn ? 'Adult Standard' : 'Người lớn (Chuẩn)'}</option>
            <option value="child">{isEn ? 'Youth / Higher Pitch' : 'Trẻ / Âm cao hơn'}</option>
            <option value="senior">{isEn ? 'Deep / Calm Pitch' : 'Trầm ấm (Deep)'}</option>
          </select>
        </div>

        {/* Global Speed Selector */}
        <div className="flex flex-col gap-1 min-w-0">
          <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
            <Clock className="w-3 h-3 text-pink-500 shrink-0" />
            <span>{isEn ? 'Playback Speed' : 'Tốc độ phát âm'}</span>
          </label>
          <div className="flex items-center bg-slate-50 border border-pink-200 rounded-xl p-0.5">
            {[0.75, 1.0, 1.25].map((rateVal) => (
              <button
                key={rateVal}
                type="button"
                onClick={() => onUpdateSettings({ ...settings, rate: rateVal })}
                className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-colors ${
                  settings.rate === rateVal
                    ? 'bg-pink-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-pink-600'
                }`}
              >
                {rateVal === 1.0 ? '1.0x' : `${rateVal}x`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Specific Device Voice List Selection */}
      <div className="pt-2 border-t border-pink-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 min-w-0">
        <div className="flex-1 flex flex-col xs:flex-row xs:items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-600 shrink-0">
            {isEn ? 'Exact Device Voice:' : 'Giọng đọc trên thiết bị:'}
          </span>
          <select
            value={filteredVoices[settings.voiceIndex] ? settings.voiceIndex : 0}
            onChange={(e) =>
              onUpdateSettings({
                ...settings,
                voiceIndex: parseInt(e.target.value, 10) || 0,
              })
            }
            className="w-full min-w-0 flex-1 text-xs font-medium text-slate-800 bg-white border border-pink-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-400 truncate"
          >
            {filteredVoices.length > 0 ? (
              filteredVoices.map((voice, idx) => {
                const isReal = isRealisticVoice(voice);
                return (
                  <option key={`${voice.name}-${idx}`} value={idx}>
                    {isReal ? '✨ ' : ''}
                    {voice.name} ({voice.lang}) {voice.default ? '★' : ''}
                  </option>
                );
              })
            ) : (
              <option value="0">
                {isEn ? 'Default OS system voice' : 'Giọng mặc định của thiết bị'}
              </option>
            )}
          </select>
        </div>

        {selectedVoice && isRealisticVoice(selectedVoice) && (
          <div className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0 self-start sm:self-auto">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{isEn ? 'High-clarity Neural Voice' : 'Giọng tự nhiên chất lượng cao'}</span>
          </div>
        )}
      </div>
    </div>
  );
};
