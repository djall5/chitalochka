import React, { useRef, useState, useEffect } from 'react';
import { Step5Config } from '../../types';
import { playChime } from '../../utils/phonetics';
import { RotateCcw, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';

interface Props {
  config: Step5Config;
  onNext: () => void;
  onPrev: () => void;
  onCorrectAnswer?: (answerId: string, points?: number) => void;
}

const PALETTE = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#ec4899'];

export const Step5WordFill: React.FC<Props> = ({ config, onNext, onPrev, onCorrectAnswer }) => {
  const [currentColor, setCurrentColor] = useState(PALETTE[0]);
  const [stampMode, setStampMode] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);

  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const isDrawingRef = useRef<Record<string, boolean>>({});

  const clearAllCanvases = () => {
    config.words.forEach(w => {
      const canvas = canvasRefs.current[w.id];
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });
    setStampMode({});
    setMessage(null);
  };

  const handleStartDraw = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawingRef.current[id] = true;
    const canvas = canvasRefs.current[id];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = currentColor;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleDraw = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current[id]) return;
    e.preventDefault();
    const canvas = canvasRefs.current[id];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleStopDraw = (id: string) => {
    isDrawingRef.current[id] = false;
    const canvas = canvasRefs.current[id];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.beginPath();
  };

  // Stamp letter directly for touch/click convenience
  const handleStampLetter = (id: string, letter: string) => {
    const canvas = canvasRefs.current[id];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = currentColor;
    ctx.font = 'bold 36px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, canvas.width / 2, canvas.height / 2 + 2);

    setStampMode(prev => ({ ...prev, [id]: true }));
    playChime('click');
  };

  const handleCheck = () => {
    const completedWords = config.words.filter(word => stampMode[word.id]);
    completedWords.forEach(word => onCorrectAnswer?.(word.id));
    playChime('celebrate');
    setMessage({
      text: completedWords.length === config.words.length
        ? '🎉 Замечательно! Все слова составлены! Прочитайте их вслух!'
        : `Готово слов: ${completedWords.length} из ${config.words.length}. Можно добавить буквы и проверить ещё раз.`,
      type: 'success',
    });
  };

  return (
    <div className="flex flex-col items-center w-full max-w-lg">
      <h2 className="text-xl md:text-2xl font-black text-pink-600 mb-1 text-center">
        {config.title}
      </h2>
      <p className="text-xs md:text-sm text-slate-600 mb-3 text-center">
        {config.instruction}
      </p>

      {/* Palette */}
      <div className="flex items-center justify-center gap-2 p-2 bg-white/90 rounded-2xl border-2 border-dashed border-pink-200 mb-3 shadow-xs">
        <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Цвет пера:</span>
        {PALETTE.map((color, idx) => {
          const isSelected = currentColor === color;
          return (
            <button
              key={idx}
              onClick={() => setCurrentColor(color)}
              style={{ backgroundColor: color }}
              className={`w-6 h-6 md:w-7 md:h-7 rounded-full border-2 border-white shadow-xs cursor-pointer transition-transform ${
                isSelected ? 'scale-125 ring-2 ring-slate-800' : 'hover:scale-110'
              }`}
            />
          );
        })}
      </div>

      {/* Words Grid */}
      <div className="grid grid-cols-2 gap-2.5 w-full mb-3">
        {config.words.map(item => (
          <div
            key={item.id}
            className="flex items-center justify-center gap-1.5 p-2 bg-white rounded-2xl border-2 border-pink-100 shadow-xs hover:border-pink-300 transition-colors"
          >
            {item.before && (
              <span className="font-black text-lg md:text-xl text-slate-800 tracking-wider">
                {item.before}
              </span>
            )}

            {/* Canvas / stamp letter box */}
            <div className="relative group">
              <canvas
                ref={el => {
                  canvasRefs.current[item.id] = el;
                }}
                width={56}
                height={56}
                onMouseDown={e => handleStartDraw(item.id, e)}
                onMouseMove={e => handleDraw(item.id, e)}
                onMouseUp={() => handleStopDraw(item.id)}
                onMouseLeave={() => handleStopDraw(item.id)}
                onTouchStart={e => handleStartDraw(item.id, e)}
                onTouchMove={e => handleDraw(item.id, e)}
                onTouchEnd={() => handleStopDraw(item.id)}
                className="w-12 h-12 md:w-14 md:h-14 bg-slate-50 border-2 border-dashed border-pink-300 rounded-xl cursor-crosshair touch-none shadow-inner"
              />
              <button
                type="button"
                onClick={() => handleStampLetter(item.id, item.missing || config.targetLetter || 'Й')}
                title="Нажмите, чтобы вставить букву"
                className="absolute -top-1.5 -right-1.5 bg-pink-100 hover:bg-pink-500 hover:text-white text-pink-700 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center opacity-80 group-hover:opacity-100 shadow-xs cursor-pointer"
              >
                +
              </button>
            </div>

            {item.after && (
              <span className="font-black text-lg md:text-xl text-slate-800 tracking-wider">
                {item.after}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
        <button
          onClick={clearAllCanvases}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs md:text-sm transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Очистить
        </button>
        <button
          onClick={handleCheck}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-black text-xs md:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
        >
          <CheckCircle2 className="w-4 h-4" />
          Готово! 🌟
        </button>
        <button
          onClick={onPrev}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs md:text-sm transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs md:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
        >
          Дальше
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {message && (
        <div className="mt-3 text-xs md:text-sm font-bold text-emerald-800 bg-emerald-100 px-4 py-1.5 rounded-lg text-center">
          {message.text}
        </div>
      )}
    </div>
  );
};
