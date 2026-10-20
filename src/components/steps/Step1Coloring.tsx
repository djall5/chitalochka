import React, { useState } from 'react';
import { Step1Config } from '../../types';
import { playChime } from '../../utils/phonetics';
import { RotateCcw, CheckCircle2, ArrowRight } from 'lucide-react';

interface Props {
  config: Step1Config;
  onNext: () => void;
  onEditStep?: () => void;
  onCorrectAnswer?: (answerId: string, points?: number) => void;
}

export const Step1Coloring: React.FC<Props> = ({ config, onNext, onCorrectAnswer }) => {
  const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(null);
  // cellIndex -> paletteId
  const [paintedCells, setPaintedCells] = useState<Record<number, string>>({});
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  const activePalette = config.palette.find(p => p.id === selectedPaletteId);

  const handleSelectPalette = (id: string) => {
    setSelectedPaletteId(id);
    setStatusMessage(null);
  };

  const handleCellClick = (index: number) => {
    if (!selectedPaletteId) {
      setStatusMessage({ text: 'Сначала выберите слог и цвет в палитре сверху!', type: 'warning' });
      return;
    }
    setPaintedCells(prev => ({
      ...prev,
      [index]: selectedPaletteId,
    }));
    setStatusMessage(null);
  };

  const handleReset = () => {
    setPaintedCells({});
    setStatusMessage(null);
  };

  const handleCheck = () => {
    const totalCells = config.cells.length;
    const paintedCount = Object.keys(paintedCells).length;

    if (paintedCount < totalCells) {
      setStatusMessage({
        text: `⚠️ Раскрашены не все карточки (осталось: ${totalCells - paintedCount})`,
        type: 'warning',
      });
      return;
    }

    let errors = 0;
    config.cells.forEach((syllable, idx) => {
      const pId = paintedCells[idx];
      const pItem = config.palette.find(p => p.id === pId);
      if (!pItem || pItem.syllable !== syllable) {
        errors++;
      }
    });

    if (errors > 0) {
      playChime('wrong');
      setStatusMessage({
        text: `❌ Найдено ошибок: ${errors}. Попробуйте ещё раз внимательно!`,
        type: 'error',
      });
    } else {
      playChime('success');
      onCorrectAnswer?.('all-cells', totalCells);
      setStatusMessage({
        text: '🎉 Отлично! Все слоги раскрашены верно!',
        type: 'success',
      });
    }
  };

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-xl md:text-2xl font-black text-pink-600 mb-2 text-center">
        {config.title}
      </h2>
      <p className="text-sm md:text-base text-slate-600 mb-4 text-center max-w-lg">
        {config.instruction}
      </p>

      {/* Palette */}
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xs p-3 rounded-2xl border-2 border-dashed border-pink-200 mb-5 shadow-xs">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
          Выберите образец:
        </div>
        <div className="grid grid-cols-4 gap-2">
          {config.palette.map(item => {
            const isSelected = selectedPaletteId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectPalette(item.id)}
                style={{
                  backgroundColor: item.color,
                  color: item.textColor || '#ffffff',
                }}
                className={`py-2 px-3 rounded-xl font-black text-base md:text-lg transition-all duration-200 shadow-sm cursor-pointer ${
                  isSelected
                    ? 'ring-4 ring-slate-800 scale-105 shadow-md -translate-y-0.5'
                    : 'hover:scale-102 hover:brightness-105 opacity-90'
                }`}
              >
                {item.syllable}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards Grid */}
      <div
        className="grid gap-2.5 p-3.5 bg-white/95 rounded-2xl shadow-md border-2 border-pink-100 mb-4 w-full max-w-md"
        style={{
          gridTemplateColumns: `repeat(${config.gridCols || 4}, minmax(0, 1fr))`,
        }}
      >
        {config.cells.map((syllable, idx) => {
          const paintedPaletteId = paintedCells[idx];
          const paintedPalette = config.palette.find(p => p.id === paintedPaletteId);

          return (
            <button
              key={idx}
              onClick={() => handleCellClick(idx)}
              style={
                paintedPalette
                  ? {
                      backgroundColor: paintedPalette.color,
                      color: paintedPalette.textColor || '#ffffff',
                      borderColor: paintedPalette.color,
                    }
                  : undefined
              }
              className={`aspect-square rounded-xl font-black text-lg md:text-xl flex items-center justify-center transition-all duration-200 select-none cursor-pointer border-2 shadow-xs ${
                paintedPalette
                  ? 'scale-98 shadow-inner ring-1 ring-black/10'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-pink-400 hover:bg-pink-50/50 hover:scale-105'
              }`}
            >
              {syllable}
            </button>
          );
        })}
      </div>

      {/* Controls & Feedback */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-sm transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Сбросить
        </button>
        <button
          onClick={handleCheck}
          className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-black text-sm shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
        >
          <CheckCircle2 className="w-4 h-4" />
          Проверить 🌟
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
        >
          Дальше
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {statusMessage && (
        <div
          className={`mt-3 font-bold text-sm px-4 py-1.5 rounded-lg text-center ${
            statusMessage.type === 'success'
              ? 'bg-emerald-100 text-emerald-800'
              : statusMessage.type === 'error'
              ? 'bg-rose-100 text-rose-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {statusMessage.text}
        </div>
      )}
    </div>
  );
};
