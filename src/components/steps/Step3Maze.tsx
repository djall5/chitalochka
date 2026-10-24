import React, { useState } from 'react';
import { Step3Config } from '../../types';
import { playChime } from '../../utils/phonetics';
import { RotateCcw, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';

interface Props {
  config: Step3Config;
  onNext: () => void;
  onPrev: () => void;
  onCorrectAnswer?: (answerId: string, points?: number) => void;
}

interface PathStep {
  row: number;
  col: number;
  letter: string;
}

export const Step3Maze: React.FC<Props> = ({ config, onNext, onPrev, onCorrectAnswer }) => {
  const [selectedPath, setSelectedPath] = useState<PathStep[]>([]);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const startRow = config.start?.row ?? 0;
  const startCol = config.start?.col ?? 0;
  const pathLetters = (config.targetLetters?.length ? config.targetLetters : [config.targetLetter])
    .map(letter => letter.trim().toUpperCase())
    .filter(Boolean);
  const expectedLetters = pathLetters.length > 0 ? pathLetters : ['А'];
  const letterLabel = expectedLetters.join(' — ');

  const handleCellClick = (r: number, c: number, letter: string) => {
    // If clicking cell already in path: backtrack to that point
    const existingIndex = selectedPath.findIndex(p => p.row === r && p.col === c);
    if (existingIndex > -1) {
      setSelectedPath(prev => prev.slice(0, existingIndex));
      setMessage(null);
      return;
    }

    // If first cell, must be start
    if (selectedPath.length === 0) {
      if (r === startRow && c === startCol) {
        setSelectedPath([{ row: r, col: c, letter }]);
        setMessage(null);
        playChime('click');
      } else {
        setMessage({
          text: `Начинать нужно со значка СТАРТ (${config.start?.label || 'СТАРТ'})!`,
          type: 'error',
        });
      }
      return;
    }

    // Must be adjacent (up, down, left, right)
    const last = selectedPath[selectedPath.length - 1];
    const isAdjacent = Math.abs(last.row - r) + Math.abs(last.col - c) === 1;

    if (!isAdjacent) {
      setMessage({
        text: 'Переходить можно только на соседний кружочек (вверх, вниз, влево, вправо)!',
        type: 'error',
      });
      return;
    }

    setSelectedPath(prev => [...prev, { row: r, col: c, letter }]);
    setMessage(null);
    playChime('click');
  };

  const handleClear = () => {
    setSelectedPath([]);
    setMessage(null);
  };

  const handleCheck = () => {
    if (selectedPath.length === 0) {
      setMessage({ text: '⚠️ Вы ещё не начали строить дорожку!', type: 'warning' });
      return;
    }

    const nonTargetLetters = selectedPath.filter(
      (p, index) => p.letter.toUpperCase() !== expectedLetters[index % expectedLetters.length]
    );

    if (nonTargetLetters.length > 0) {
      playChime('wrong');
      setMessage({
        text: expectedLetters.length > 1
          ? `❌ Буквы на дорожке должны чередоваться: ${letterLabel}.`
          : `❌ В дорожке есть другие буквы! Дорожка должна состоять только из буквы «${letterLabel}».`,
        type: 'error',
      });
      return;
    }

    // Check if reached goal area
    const last = selectedPath[selectedPath.length - 1];
    const goalRow = config.goal?.row ?? (config.gridRows - 1);
    const goalCol = config.goal?.col ?? (config.gridCols - 1);

    const isNearGoal =
      Math.abs(last.row - goalRow) <= 1 && Math.abs(last.col - goalCol) <= 1;

    if (selectedPath.length < 5 || !isNearGoal) {
      setMessage({
        text: '🏃 Продолжайте дорожку до самого ФИНИША!',
        type: 'warning',
      });
      return;
    }

    playChime('celebrate');
    onCorrectAnswer?.('maze-complete', selectedPath.length);
    setMessage({
      text: expectedLetters.length > 1
        ? `🎉 Ура! Дорожка с чередованием ${letterLabel} построена верно!`
        : `🎉 Ура! Замечательно! Дорожка из буквы «${letterLabel}» построена верно!`,
      type: 'success',
    });
  };

  return (
    <div className="flex flex-col items-center w-full max-w-lg">
      <h2 className="text-xl md:text-2xl font-black text-pink-600 mb-2 text-center">
        {config.title}
      </h2>

      {/* Mascot & Instructions Header */}
      <div className="w-full flex items-center gap-3 p-3 bg-pink-50/90 rounded-2xl border-2 border-dashed border-pink-300 mb-4 shadow-xs">
        <div className="text-3xl md:text-4xl animate-bounce select-none">
          {config.mascot || '🧘'}
        </div>
        <p className="text-xs md:text-sm text-slate-700 leading-snug">
          {config.instruction}
        </p>
      </div>

      {/* Grid Maze */}
      <div className="bg-white p-3 rounded-2xl shadow-md border-2 border-pink-100 mb-4 w-full overflow-x-auto flex flex-col items-center">
        <div
          className="grid gap-1.5 md:gap-2 justify-center"
          style={{
            gridTemplateColumns: `repeat(${config.gridCols}, minmax(0, 1fr))`,
          }}
        >
          {config.cells.map((row, rIdx) =>
            row.map((letter, cIdx) => {
              const isStart = rIdx === startRow && cIdx === startCol;
              const isGoalCell =
                rIdx === (config.goal?.row ?? -1) &&
                cIdx >= (config.goal?.col ?? -1) &&
                cIdx < (config.goal?.col ?? -1) + (config.goal?.span || 1);

              if (isGoalCell && cIdx > (config.goal?.col ?? -1)) {
                // spanned column, don't render duplicate
                return null;
              }

              if (isGoalCell) {
                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    style={{
                      gridColumn: `span ${config.goal?.span || 2}`,
                    }}
                    className="h-9 md:h-10 px-2 rounded-xl bg-pink-50 border-2 border-dashed border-pink-500 text-pink-600 font-black text-xs md:text-sm flex items-center justify-center gap-1 select-none shadow-xs"
                  >
                    <span>{config.goal?.label || 'ФИНИШ'}</span>
                    <span>🏁</span>
                  </div>
                );
              }

              const pathIndex = selectedPath.findIndex(
                p => p.row === rIdx && p.col === cIdx
              );
              const isSelected = pathIndex > -1;

              return (
                <button
                  key={`${rIdx}-${cIdx}`}
                  onClick={() => handleCellClick(rIdx, cIdx, letter)}
                  className={`relative w-8 h-8 md:w-9 md:h-9 rounded-full font-black text-sm md:text-base flex items-center justify-center transition-all cursor-pointer select-none border-2 ${
                    isSelected
                      ? 'bg-pink-200 border-pink-500 text-pink-900 scale-95 shadow-inner'
                      : isStart
                      ? 'bg-emerald-500 border-emerald-600 text-white shadow-md hover:scale-105'
                      : 'bg-white border-slate-300 text-slate-700 hover:border-pink-400 hover:bg-pink-50 hover:scale-105'
                  }`}
                >
                  {isStart && !isSelected && (
                    <span className="absolute -top-3.5 bg-emerald-600 text-white text-[9px] font-black px-1 rounded-sm shadow-xs uppercase">
                      СТАРТ
                    </span>
                  )}
                  {isSelected && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-pink-600 text-white text-[10px] flex items-center justify-center font-bold shadow-xs">
                      {pathIndex + 1}
                    </span>
                  )}
                  {letter}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs md:text-sm transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Сбросить
        </button>
        <button
          onClick={handleCheck}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-black text-xs md:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
        >
          <CheckCircle2 className="w-4 h-4" />
          Проверить 🌟
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
        <div
          className={`mt-3 font-bold text-xs md:text-sm px-4 py-1.5 rounded-lg text-center ${
            message.type === 'success'
              ? 'bg-emerald-100 text-emerald-800'
              : message.type === 'error'
              ? 'bg-rose-100 text-rose-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
};
