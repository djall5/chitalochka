import React, { useRef, useState, useEffect } from 'react';
import { Step4Config } from '../../types';
import { playChime } from '../../utils/phonetics';
import { RotateCcw, Sparkles, ArrowRight, ArrowLeft, Eraser } from 'lucide-react';

interface Props {
  config: Step4Config;
  onNext: () => void;
  onPrev: () => void;
}

export const Step4Drawing: React.FC<Props> = ({ config, onNext, onPrev }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentColor, setCurrentColor] = useState<string>(config.paletteColors[0] || '#ef4444');
  const [isEraser, setIsEraser] = useState(false);
  const [lineWidth, setLineWidth] = useState(12);
  const [message, setMessage] = useState<string | null>(null);
  const [canvasBg, setCanvasBg] = useState(config.canvasBg || '#334155');

  const isDrawingRef = useRef(false);

  // Initialize or clear canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill with canvasBg
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [canvasBg]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = isEraser ? canvasBg : currentColor;
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.beginPath();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setMessage(null);
  };

  const handleFinish = () => {
    playChime('celebrate');
    setMessage('✨ Прекрасный рисунок! Настоящий шедевр!');
  };

  return (
    <div className="flex flex-col items-center w-full max-w-lg">
      <h2 className="text-xl md:text-2xl font-black text-pink-600 mb-1 text-center">
        {config.title}
      </h2>
      <p className="text-xs md:text-sm text-slate-600 mb-3 text-center">
        {config.instruction}
      </p>

      {/* Palette Colors */}
      <div className="flex flex-wrap items-center justify-center gap-2 p-2.5 bg-white/90 rounded-2xl border-2 border-dashed border-pink-200 mb-3 shadow-xs">
        {config.paletteColors.map((color, idx) => {
          const isSelected = !isEraser && currentColor === color;
          return (
            <button
              key={idx}
              onClick={() => {
                setCurrentColor(color);
                setIsEraser(false);
              }}
              style={{ backgroundColor: color }}
              className={`w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white shadow-xs transition-transform cursor-pointer ${
                isSelected ? 'scale-125 ring-2 ring-slate-800' : 'hover:scale-110'
              }`}
            />
          );
        })}
        <button
          onClick={() => setIsEraser(prev => !prev)}
          title="Ластик"
          className={`flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full border-2 transition-transform cursor-pointer ${
            isEraser
              ? 'bg-slate-800 text-white scale-125 ring-2 ring-pink-500'
              : 'bg-slate-200 text-slate-700 hover:scale-110'
          }`}
        >
          <Eraser className="w-4 h-4" />
        </button>
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-[10px] font-black text-slate-500"><span>Фон поля:</span>{['#ffffff', '#e0f2fe', '#fef3c7', '#dcfce7', '#334155'].map(color => <button key={color} onClick={() => setCanvasBg(color)} aria-label={`Фон ${color}`} style={{ backgroundColor: color }} className={`h-6 w-6 rounded-full border-2 ${canvasBg === color ? 'border-pink-500 ring-2 ring-pink-200' : 'border-slate-300'}`} />)}</div>

      {/* Canvas */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg border-4 border-white mb-3">
        <canvas
          ref={canvasRef}
          width={280}
          height={260}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="cursor-crosshair touch-none select-none block"
          style={{ width: '280px', height: '260px' }}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs md:text-sm transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Очистить
        </button>
        <button
          onClick={handleFinish}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-black text-xs md:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          Готово 🌟
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
        <div className="mt-2 text-xs md:text-sm font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg">
          {message}
        </div>
      )}
    </div>
  );
};
