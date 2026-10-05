import { useState, useEffect, useRef } from 'react';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

interface TimerSettings {
  focus: number;
  shortBreak: number;
  longBreak: number;
}

interface DailyStats {
  date: string;
  sessions: number;
  totalFocusMinutes: number;
}

const STORAGE_KEY_SETTINGS = 'pomodoro_settings';
const STORAGE_KEY_STATS = 'pomodoro_stats';
const STORAGE_KEY_SESSION_COUNT = 'pomodoro_session_count';

const MODE_LABELS: Record<TimerMode, string> = {
  focus: 'Фокусировка',
  shortBreak: 'Короткий перерыв',
  longBreak: 'Длинный перерыв',
};

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function loadSettings(): TimerSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { focus: 25, shortBreak: 5, longBreak: 15 };
}

function loadStats(): DailyStats {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_STATS);
    if (saved) {
      const stats = JSON.parse(saved);
      if (stats.date === getTodayKey()) return stats;
    }
  } catch {}
  return { date: getTodayKey(), sessions: 0, totalFocusMinutes: 0 };
}

function loadSessionCount(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SESSION_COUNT);
    if (saved) return parseInt(saved, 10);
  } catch {}
  return 0;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function App() {
  const [settings, setSettings] = useState<TimerSettings>(loadSettings);
  const [stats, setStats] = useState<DailyStats>(loadStats);
  const [sessionCount, setSessionCount] = useState<number>(loadSessionCount);
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState<number>(settings.focus * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState<TimerSettings>(settings);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalTime = settings[mode] * 60;
  const progress = totalTime > 0 ? (totalTime - timeLeft) / totalTime : 0;

  // Save settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // Save stats
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
  }, [stats]);

  // Save session count
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SESSION_COUNT, sessionCount.toString());
  }, [sessionCount]);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setIsRunning(false);
            // Timer completed
            if (mode === 'focus') {
              setStats((s) => ({
                ...s,
                sessions: s.sessions + 1,
                totalFocusMinutes: s.totalFocusMinutes + settings.focus,
              }));
              setSessionCount((c) => c + 1);
            }
            // Play notification sound
            try {
              const audioCtx = new AudioContext();
              const oscillator = audioCtx.createOscillator();
              const gainNode = audioCtx.createGain();
              oscillator.connect(gainNode);
              gainNode.connect(audioCtx.destination);
              oscillator.frequency.value = 800;
              oscillator.type = 'sine';
              gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
              oscillator.start(audioCtx.currentTime);
              oscillator.stop(audioCtx.currentTime + 0.5);
            } catch {}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode, settings.focus]);

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(settings[newMode] * 60);
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleStart = () => setIsRunning(true);
  const handlePause = () => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
  const handleReset = () => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimeLeft(settings[mode] * 60);
  };

  const handleSaveSettings = () => {
    setSettings(tempSettings);
    setTimeLeft(tempSettings[mode] * 60);
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setShowSettings(false);
  };

  // Mode-specific colors
  const getColors = () => {
    switch (mode) {
      case 'focus':
        return {
          bg: 'bg-gradient-to-br from-red-950 via-slate-900 to-slate-950',
          ring: 'stroke-red-500',
          text: 'text-red-400',
          btn: 'bg-red-600 hover:bg-red-500',
        };
      case 'shortBreak':
        return {
          bg: 'bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950',
          ring: 'stroke-emerald-500',
          text: 'text-emerald-400',
          btn: 'bg-emerald-600 hover:bg-emerald-500',
        };
      case 'longBreak':
        return {
          bg: 'bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950',
          ring: 'stroke-blue-500',
          text: 'text-blue-400',
          btn: 'bg-blue-600 hover:bg-blue-500',
        };
    }
  };

  const colors = getColors();
  const circumference = 2 * Math.PI * 140;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className={`min-h-screen ${colors.bg} flex flex-col items-center justify-center p-4 transition-all duration-700`}>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
          🍅 Pomodoro Timer
        </h1>
        <p className="text-slate-400 mt-2 text-sm">Фокусируйся. Отдыхай. Достигай.</p>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-8 bg-slate-800/50 backdrop-blur-sm rounded-xl p-1.5">
        {(Object.keys(MODE_LABELS) as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              mode === m
                ? `${colors.btn} text-white shadow-lg`
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Timer Circle */}
      <div className="relative mb-8">
        <svg width="320" height="320" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="160"
            cy="160"
            r="140"
            fill="none"
            stroke="currentColor"
            className="text-slate-700/50"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="160"
            cy="160"
            r="140"
            fill="none"
            className={`${colors.ring} transition-all duration-1000`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        {/* Timer display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-6xl md:text-7xl font-mono font-bold text-white tracking-wider">
            {formatTime(timeLeft)}
          </span>
          <span className={`text-sm font-medium mt-2 ${colors.text}`}>
            {MODE_LABELS[mode]}
          </span>
          {mode === 'focus' && (
            <span className="text-xs text-slate-500 mt-1">
              Сессия #{sessionCount + 1}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-8">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={timeLeft === 0}
            className={`${colors.btn} text-white px-8 py-3 rounded-xl font-semibold text-lg shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
          >
            {timeLeft === totalTime ? '▶ Старт' : '▶ Продолжить'}
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="bg-amber-600 hover:bg-amber-500 text-white px-8 py-3 rounded-xl font-semibold text-lg shadow-xl transition-all duration-200 active:scale-95"
          >
            ⏸ Пауза
          </button>
        )}
        <button
          onClick={handleReset}
          className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-semibold text-lg shadow-xl transition-all duration-200 active:scale-95"
        >
          ↺ Сброс
        </button>
      </div>

      {/* Stats */}
      <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 w-full max-w-sm border border-slate-700/50">
        <h2 className="text-white font-semibold text-center mb-4">📊 Статистика сегодня</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{stats.sessions}</div>
            <div className="text-xs text-slate-400 mt-1">Сессий</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{stats.totalFocusMinutes}</div>
            <div className="text-xs text-slate-400 mt-1">Минут фокуса</div>
          </div>
        </div>
        {stats.sessions > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Прогресс дня</span>
              <span className="text-white font-medium">
                {Math.min(stats.sessions * 10, 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  mode === 'focus' ? 'bg-red-500' : mode === 'shortBreak' ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(stats.sessions * 10, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              Цель: 10 сессий в день
            </p>
          </div>
        )}
      </div>

      {/* Settings Button */}
      <button
        onClick={() => {
          setTempSettings(settings);
          setShowSettings(!showSettings);
        }}
        className="mt-6 text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2"
      >
        ⚙️ Настройки
      </button>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700 shadow-2xl">
            <h2 className="text-white font-bold text-xl mb-6">⚙️ Настройки таймера</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">
                  🎯 Фокусировка (минуты)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={tempSettings.focus}
                  onChange={(e) => setTempSettings({ ...tempSettings, focus: Math.max(1, Math.min(120, parseInt(e.target.value) || 1)) })}
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-2.5 border border-slate-600 focus:border-red-500 focus:outline-none transition-colors"
                />
              </div>
              
              <div>
                <label className="text-sm text-slate-400 mb-1 block">
                  ☕ Короткий перерыв (минуты)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={tempSettings.shortBreak}
                  onChange={(e) => setTempSettings({ ...tempSettings, shortBreak: Math.max(1, Math.min(30, parseInt(e.target.value) || 1)) })}
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-2.5 border border-slate-600 focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
              
              <div>
                <label className="text-sm text-slate-400 mb-1 block">
                  🌴 Длинный перерыв (минуты)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={tempSettings.longBreak}
                  onChange={(e) => setTempSettings({ ...tempSettings, longBreak: Math.max(1, Math.min(60, parseInt(e.target.value) || 1)) })}
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-2.5 border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveSettings}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-medium transition-colors"
              >
                Сохранить
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg font-medium transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-slate-600">
        Данные сохраняются автоматически • {new Date().toLocaleDateString('ru-RU')}
      </div>
    </div>
  );
}
