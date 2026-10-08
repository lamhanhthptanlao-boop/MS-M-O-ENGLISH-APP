import React, { useState, useEffect } from 'react';
import { Volume2, Sliders, Globe, User, Clock, Play, Check } from 'lucide-react';
import { NativeAccent, VoiceAge, VoiceGender, VoiceSettings } from '../types';
import { filterVoices, ttsController } from '../utils/speech';

interface VoiceToolbarProps {
  settings: VoiceSettings;
  onUpdateSettings: (newSettings: VoiceSettings) => void;
  onPlayTestVoice?: () => void;
}

export const VoiceToolbar: React.FC<VoiceToolbarProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  // Load browser voices
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

  const filteredVoices = filterVoices(
    availableVoices,
    settings.accent,
    settings.gender,
    settings.age
  );

  const selectedVoice =
    filteredVoices[settings.voiceIndex] ||
    availableVoices[0] ||
    null;

  const handleTestVoice = () => {
    if (isPlayingTest) {
      ttsController.stop();
      setIsPlayingTest(false);
      return;
    }

    setIsPlayingTest(true);
    const testPhrase =
      "Hello high school learners! I'm Ms Mèo, your friendly English teacher. Let's purr-fect your pronunciation together!";

    ttsController.speak(
      testPhrase,
      selectedVoice,
      settings,
      () => setIsPlayingTest(true),
      () => setIsPlayingTest(false),
      () => setIsPlayingTest(false)
    );
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-pink-200/80 rounded-2xl p-4 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title & Badge */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-pink-100 text-pink-700">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm text-slate-800 flex items-center gap-2">
              Advanced Native Voice Engine
              <span className="text-[11px] font-medium text-pink-700 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-full">
                {availableVoices.length > 0
                  ? `${filteredVoices.length} Voices Detected`
                  : 'Web Speech TTS'}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Customize Ms Mèo's accent, gender profile, and practice speed
            </p>
          </div>
        </div>

        {/* Toolbar Controls Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-center">
          {/* Accent Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Globe className="w-3 h-3 text-pink-500" />
              Accent
            </label>
            <select
              value={settings.accent}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  accent: e.target.value as NativeAccent,
                  voiceIndex: 0,
                })
              }
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-pink-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-400"
            >
              <option value="all">All English Accents</option>
              <option value="en-US">US English (en-US)</option>
              <option value="en-GB">UK English (en-GB)</option>
              <option value="en-AU">Australian (en-AU)</option>
              <option value="en-CA">Canadian (en-CA)</option>
              <option value="other">Other English</option>
            </select>
          </div>

          {/* Gender Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <User className="w-3 h-3 text-pink-500" />
              Gender
            </label>
            <select
              value={settings.gender}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  gender: e.target.value as VoiceGender,
                  voiceIndex: 0,
                })
              }
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-pink-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-400"
            >
              <option value="all">All Genders</option>
              <option value="female">Female Voice</option>
              <option value="male">Male Voice</option>
            </select>
          </div>

          {/* Age Profile Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <span className="text-pink-500 font-bold">♪</span>
              Age Profile
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
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-pink-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-400"
            >
              <option value="all">Natural / Adult</option>
              <option value="child">Child / Youth (High)</option>
              <option value="adult">Adult (Standard)</option>
              <option value="senior">Senior (Deep)</option>
            </select>
          </div>

          {/* Speed Control */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3 text-pink-500" />
              Speed
            </label>
            <div className="flex items-center bg-slate-50 border border-pink-200 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, rate: 0.75 })}
                className={`flex-1 py-1 text-[11px] font-bold rounded transition-colors ${
                  settings.rate === 0.75
                    ? 'bg-pink-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-pink-600'
                }`}
                title="0.75x Slow Practice"
              >
                0.75x
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, rate: 1.0 })}
                className={`flex-1 py-1 text-[11px] font-bold rounded transition-colors ${
                  settings.rate === 1.0
                    ? 'bg-pink-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-pink-600'
                }`}
                title="1.0x Normal Speed"
              >
                1.0x
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, rate: 1.25 })}
                className={`flex-1 py-1 text-[11px] font-bold rounded transition-colors ${
                  settings.rate === 1.25
                    ? 'bg-pink-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-pink-600'
                }`}
                title="1.25x Fast Challenge"
              >
                1.25x
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Second row: Voice selector dropdown and Test Voice button */}
      <div className="mt-3 pt-3 border-t border-pink-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            Selected Voice:
          </span>
          <select
            value={settings.voiceIndex}
            onChange={(e) =>
              onUpdateSettings({
                ...settings,
                voiceIndex: parseInt(e.target.value, 10),
              })
            }
            className="flex-1 text-xs text-slate-700 bg-white border border-pink-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-400 truncate"
          >
            {filteredVoices.length > 0 ? (
              filteredVoices.map((voice, idx) => (
                <option key={`${voice.name}-${idx}`} value={idx}>
                  {voice.name} ({voice.lang}) {voice.default ? '★' : ''}
                </option>
              ))
            ) : (
              <option value="0">Default System Voice</option>
            )}
          </select>
        </div>

        <button
          type="button"
          onClick={handleTestVoice}
          className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
            isPlayingTest
              ? 'bg-rose-500 text-white animate-pulse'
              : 'bg-pink-100 text-pink-700 hover:bg-pink-200'
          }`}
        >
          {isPlayingTest ? (
            <>
              <Volume2 className="w-3.5 h-3.5 animate-bounce" />
              <span>Playing Sample... (Stop)</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Test Voice Sample</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
