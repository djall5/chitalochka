import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Step2Config } from '../../types';
import { formatTextWithColors, playChime, speakRussianText } from '../../utils/phonetics';
import { RotateCcw, ArrowRight, ArrowLeft, Volume2 } from 'lucide-react';

interface Props {
  config: Step2Config;
  onNext: () => void;
  onPrev: () => void;
  onCorrectAnswer?: (answerId: string, points?: number) => void;
}

interface FallingItem {
  id: number;
  syllable: string;
  x: number;
  y: number;
  speed: number;
  isCaught: boolean;
}

export const Step2Falling: React.FC<Props> = ({ config, onNext, onPrev, onCorrectAnswer }) => {
  const [caught, setCaught] = useState(0);
  const [missed, setMissed] = useState(0);
  const [currentItem, setCurrentItem] = useState<FallingItem | null>(null);
  const [remainingPool, setRemainingPool] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedSpeed, setSelectedSpeed] = useState<'slow' | 'medium' | 'fast'>(config.speed || 'slow');

  const arenaRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const isCaughtRef = useRef(false);

  // Pixels per second for smooth, relaxed falling suitable for young learners
  // slow: ~22 px/sec (~12-13 seconds to reach bottom)
  // medium: ~35 px/sec (~8 seconds)
  // fast: ~50 px/sec (~5.5 seconds)
  const speedPxPerSec = selectedSpeed === 'slow' ? 22 : selectedSpeed === 'fast' ? 50 : 35;

  // Initialize game
  const initGame = useCallback(() => {
    // Shuffle syllables
    const shuffled = [...config.syllables].sort(() => Math.random() - 0.5);
    // Limit to targetCatchCount if provided
    const pool = shuffled.slice(0, Math.max(config.targetCatchCount, 6));
    setRemainingPool(pool);
    setCaught(0);
    setMissed(0);
    setIsFinished(false);
    setCurrentItem(null);
  }, [config.syllables, config.targetCatchCount]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // Spawn next syllable
  const spawnNext = useCallback(() => {
    if (remainingPool.length === 0) {
      setIsFinished(true);
      playChime('celebrate');
      return;
    }

    const arena = arenaRef.current;
    const arenaWidth = arena ? arena.clientWidth : 320;
    const randomX = Math.floor(Math.random() * Math.max(arenaWidth - 100, 60)) + 40;

    const nextSyllable = remainingPool[0];
    setRemainingPool(prev => prev.slice(1));

    isCaughtRef.current = false;
    lastTimeRef.current = performance.now();
    setCurrentItem({
      id: Date.now(),
      syllable: nextSyllable,
      x: randomX,
      y: -40,
      speed: speedPxPerSec,
      isCaught: false,
    });
  }, [remainingPool, speedPxPerSec]);

  // If no item and not finished, spawn next
  useEffect(() => {
    if (!currentItem && !isFinished && remainingPool.length > 0) {
      const timer = setTimeout(() => {
        spawnNext();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentItem, isFinished, remainingPool.length, spawnNext]);

  // Animation loop with delta-time (frame rate independent)
  useEffect(() => {
    if (!currentItem || currentItem.isCaught || isFinished) return;

    let localY = currentItem.y;
    lastTimeRef.current = performance.now();

    const step = (timestamp: number) => {
      const deltaSec = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = timestamp;

      const arena = arenaRef.current;
      const arenaHeight = arena ? arena.clientHeight : 260;

      localY += speedPxPerSec * deltaSec;

      if (localY > arenaHeight - 55) {
        // Missed!
        setMissed(prev => prev + 1);
        setCurrentItem(null);
        if (remainingPool.length === 0) {
          setIsFinished(true);
        }
        return;
      }

      setCurrentItem(prev => (prev ? { ...prev, y: localY } : null));
      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [currentItem?.id, currentItem?.isCaught, isFinished, remainingPool.length, speedPxPerSec]);

  const handleCatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentItem || currentItem.isCaught) return;

    isCaughtRef.current = true;
    playChime('catch');

    setCurrentItem(prev => (prev ? { ...prev, isCaught: true } : null));
    setCaught(prev => prev + 1);
    onCorrectAnswer?.(String(currentItem.id));

    setTimeout(() => {
      setCurrentItem(null);
      if (remainingPool.length === 0) {
        setIsFinished(true);
        playChime('celebrate');
      }
    }, 280);
  };

  const totalSyllables = Math.max(config.targetCatchCount, 6);

  return (
    <div className="flex flex-col items-center w-full max-w-lg">
      <h2 className="text-xl md:text-2xl font-black text-pink-600 mb-1 text-center">
        {config.title}
      </h2>
      <p className="text-xs md:text-sm text-slate-600 mb-2 text-center">
        {config.instruction}
      </p>

      {/* Speed Selector Controls */}
      <div className="w-full flex items-center justify-between bg-white/90 px-3 py-1.5 rounded-xl border border-pink-200 mb-2 text-xs">
        <span className="font-bold text-slate-500 flex items-center gap-1">
          <span>Скорость:</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSelectedSpeed('slow')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              selectedSpeed === 'slow'
                ? 'bg-emerald-500 text-white shadow-xs scale-105'
                : 'bg-slate-100 text-slate-600 hover:bg-emerald-50'
            }`}
          >
            🐢 Медленно
          </button>
          <button
            onClick={() => setSelectedSpeed('medium')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              selectedSpeed === 'medium'
                ? 'bg-sky-500 text-white shadow-xs scale-105'
                : 'bg-slate-100 text-slate-600 hover:bg-sky-50'
            }`}
          >
            🚶 Спокойно
          </button>
          <button
            onClick={() => setSelectedSpeed('fast')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              selectedSpeed === 'fast'
                ? 'bg-amber-500 text-white shadow-xs scale-105'
                : 'bg-slate-100 text-slate-600 hover:bg-amber-50'
            }`}
          >
            ⚡ Быстрее
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="w-full flex items-center justify-between bg-slate-100 px-4 py-2 rounded-xl text-xs md:text-sm font-bold text-slate-700 mb-3 border border-slate-200">
        <div className="flex items-center gap-1.5 text-emerald-600">
          <span>Поймано:</span>
          <span className="bg-emerald-100 px-2 py-0.5 rounded-md font-black">
            {caught} / {totalSyllables}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-rose-500">
          <span>Пропущено:</span>
          <span className="bg-rose-100 px-2 py-0.5 rounded-md font-black">{missed}</span>
        </div>
        <div className="flex items-center gap-1 text-sky-600">
          <span>Осталось:</span>
          <span className="bg-sky-100 px-2 py-0.5 rounded-md font-black">
            {remainingPool.length + (currentItem ? 1 : 0)}
          </span>
        </div>
      </div>

      {/* Sky Arena */}
      <div
        ref={arenaRef}
        className="w-full h-[280px] relative rounded-2xl overflow-hidden border-2 border-sky-300 shadow-inner select-none cursor-pointer"
        style={{
          background: 'linear-gradient(to bottom, #bae6fd 0%, #e0f2fe 75%, #dcfce7 100%)',
        }}
      >
        {/* Floating clouds */}
        <div
          className="absolute top-4 w-24 h-8 bg-white/80 rounded-full blur-[0.5px] pointer-events-none animate-pulse"
          style={{ left: '10%' }}
        />
        <div
          className="absolute top-12 w-32 h-10 bg-white/70 rounded-full blur-[0.5px] pointer-events-none"
          style={{ right: '15%' }}
        />

        {/* Grass Ground */}
        <div className="absolute bottom-0 left-0 w-full h-10 bg-gradient-to-t from-green-700 to-emerald-500 z-10 pointer-events-none flex items-center justify-around px-2">
          <span className="text-xs">🌱</span>
          <span className="text-sm animate-bounce">🌼</span>
          <span className="text-xs">🌿</span>
          <span className="text-sm">🌷</span>
          <span className="text-xs">🌱</span>
          <span className="text-sm animate-bounce">🌸</span>
          <span className="text-xs">🌿</span>
          <span className="text-sm">🌼</span>
          <span className="text-xs">🌱</span>
        </div>

        {/* Falling Syllable Item */}
        {currentItem && (
          <button
            onClick={handleCatch}
            style={{
              left: `${currentItem.x}px`,
              top: `${currentItem.y}px`,
            }}
            className={`absolute -translate-x-1/2 py-2 px-4 rounded-2xl bg-white border-3 border-indigo-500 shadow-xl cursor-pointer select-none transition-transform z-20 ${
              currentItem.isCaught
                ? 'scale-125 bg-emerald-500 border-emerald-500 ring-4 ring-emerald-300'
                : 'hover:scale-110 active:scale-95'
            }`}
          >
            <div
              className="text-2xl md:text-3xl font-black tracking-wider"
              dangerouslySetInnerHTML={{
                __html: currentItem.isCaught
                  ? `<span class="text-white">${currentItem.syllable}</span>`
                  : formatTextWithColors(currentItem.syllable),
              }}
            />
          </button>
        )}

        {/* Completion Message in Sky */}
        {isFinished && (
          <div className="absolute inset-0 bg-white/85 backdrop-blur-xs flex flex-col items-center justify-center z-30 p-4 text-center">
            <span className="text-4xl mb-2">🎉</span>
            <div className="text-xl font-black text-emerald-600 mb-1">
              Отличная реакция!
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Поймано слогов: <strong className="text-emerald-700">{caught}</strong> из {totalSyllables}
            </p>
            <button
              onClick={initGame}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-500 text-white font-bold text-xs shadow-md hover:bg-pink-600 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Сыграть ещё раз
            </button>
          </div>
        )}
      </div>

      {/* Phonetic Legend */}
      <div className="flex items-center justify-center gap-4 text-xs font-semibold mt-2.5 text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#e11d48]" />
          Гласный
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a]" />
          Мягкий
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
          Твёрдый
        </span>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
        <button
          onClick={onPrev}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-sm transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>
        <button
          onClick={initGame}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Заново
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
        >
          Дальше
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
