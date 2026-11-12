import React, { useRef, useState, useEffect } from 'react';
import { Step4Config } from '../../types';
import { playChime } from '../../utils/phonetics';
import { RotateCcw, Sparkles, ArrowRight, ArrowLeft, Eraser } from 'lucide-react';

export type DrawingSyncEvent = { id: string; pageIndex: number; clear?: boolean; from?: { x: number; y: number }; to?: { x: number; y: number }; color?: string; isEraser?: boolean; lineWidth?: number };

interface Props {
  config: Step4Config;
  onNext: () => void;
  onPrev: () => void;
  remoteEvent?: DrawingSyncEvent | null;
  onDrawingEvent?: (event: DrawingSyncEvent) => void;
}

export const Step4Drawing: React.FC<Props> = ({ config, onNext, onPrev, remoteEvent, onDrawingEvent }) => {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const pages = (config.drawingPages?.length ? config.drawingPages : [{}]).slice(0, 3);
  const sideBySide = config.drawingLayout !== 'tabs' && pages.length > 1;
  const [currentColor, setCurrentColor] = useState<string>(config.paletteColors[0] || '#ef4444');
  const [isEraser, setIsEraser] = useState(false);
  const [lineWidth, setLineWidth] = useState(12);
  const [message, setMessage] = useState<string | null>(null);
  const [canvasBg, setCanvasBg] = useState(config.canvasBg || '#334155');

  const drawingPageRef = useRef<number | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const appliedRemoteEventRef = useRef<string | null>(null);

  useEffect(() => { setPageIndex(0); }, [config]);
  useEffect(() => {
    if (!remoteEvent || remoteEvent.id === appliedRemoteEventRef.current) return;
    const canvas = canvasRefs.current[remoteEvent.pageIndex];
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    appliedRemoteEventRef.current = remoteEvent.id;
    if (remoteEvent.clear) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
    if (!remoteEvent.from || !remoteEvent.to) return;
    ctx.beginPath();
    ctx.lineWidth = remoteEvent.lineWidth || 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = remoteEvent.isEraser ? 'destination-out' : 'source-over';
    ctx.strokeStyle = remoteEvent.color || '#ef4444';
    ctx.moveTo(remoteEvent.from.x, remoteEvent.from.y);
    ctx.lineTo(remoteEvent.to.x, remoteEvent.to.y);
    ctx.stroke();
    ctx.beginPath();
  }, [remoteEvent]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent, index: number) => {
    const canvas = canvasRefs.current[index];
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent, index: number) => {
    e.preventDefault();
    drawingPageRef.current = index;
    setPageIndex(index);
    const canvas = canvasRefs.current[index];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e, index);
    lastPointRef.current = coords;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent, index: number) => {
    if (drawingPageRef.current !== index) return;
    e.preventDefault();
    const canvas = canvasRefs.current[index];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e, index);
    const previous = lastPointRef.current || coords;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
    ctx.strokeStyle = currentColor;
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    lastPointRef.current = coords;
    onDrawingEvent?.({ id: crypto.randomUUID(), pageIndex: index, from: previous, to: coords, color: currentColor, isEraser, lineWidth });
  };

  const stopDrawing = () => {
    const index = drawingPageRef.current;
    drawingPageRef.current = null;
    lastPointRef.current = null;
    const canvas = index === null ? null : canvasRefs.current[index];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.beginPath();
  };

  const handleClear = () => {
    const canvas = canvasRefs.current[pageIndex];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onDrawingEvent?.({ id: crypto.randomUUID(), pageIndex, clear: true });
    setMessage(null);
  };

  const handleFinish = () => {
    playChime('celebrate');
    setMessage('✨ Прекрасный рисунок! Настоящий шедевр!');
  };

  return (
    <div className="flex flex-col items-center w-full max-w-full">
      <h2 className="text-xl md:text-2xl font-black text-pink-600 mb-1 text-center">
        {config.title}
      </h2>
      <p className="text-xs md:text-sm text-slate-600 mb-3 text-center">
        {config.instruction}
      </p>
      {!sideBySide && pages.length > 1 && <div className="mb-3 flex gap-2" aria-label="Экраны для рисования">{pages.map((_, index) => <button key={index} onClick={() => { stopDrawing(); setPageIndex(index); setMessage(null); }} className={`rounded-xl px-3 py-1.5 text-xs font-bold ${pageIndex === index ? 'bg-pink-500 text-white' : 'bg-white text-pink-700'}`}>Экран {index + 1}</button>)}</div>}

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

      {/* Canvases stay mounted so drawings survive page changes. */}
      <div className={`mb-3 flex w-full gap-2 ${sideBySide ? 'overflow-x-auto' : 'justify-center'}`}>
        {pages.map((page, index) => <div key={index} className={`${!sideBySide && pageIndex !== index ? 'hidden' : 'block'} ${sideBySide ? 'min-w-[150px] flex-1' : 'w-[280px] max-w-full'}`}>
          {sideBySide && <div className={`mb-1 text-xs font-bold ${pageIndex === index ? 'text-pink-600' : 'text-slate-500'}`}>Экран {index + 1}</div>}
          <div className={`relative overflow-hidden rounded-2xl border-4 bg-white shadow-lg ${pageIndex === index ? 'border-pink-300' : 'border-white'}`} style={{ backgroundColor: canvasBg, backgroundImage: page.backgroundImageDataUrl ? `url('${page.backgroundImageDataUrl}')` : undefined, backgroundPosition: 'center', backgroundSize: 'contain', backgroundRepeat: 'no-repeat' }}>
            <canvas ref={element => { canvasRefs.current[index] = element; }} width={280} height={260}
              onMouseDown={event => startDrawing(event, index)} onMouseMove={event => draw(event, index)} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
              onTouchStart={event => startDrawing(event, index)} onTouchMove={event => draw(event, index)} onTouchEnd={stopDrawing}
              className="block w-full cursor-crosshair touch-none select-none" style={{ aspectRatio: '280 / 260' }} aria-label={`Поле для рисования, экран ${index + 1}`} />
          </div>
        </div>)}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs md:text-sm transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          {sideBySide ? `Очистить экран ${pageIndex + 1}` : 'Очистить'}
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
