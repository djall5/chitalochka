import React, { useState } from 'react';
import { Step6Config } from '../../types';
import { playChime } from '../../utils/phonetics';
import { RotateCcw, ArrowLeft, Sparkles } from 'lucide-react';

interface Props {
  config: Step6Config;
  onPrev: () => void;
  onCorrectAnswer?: (answerId: string, points?: number) => void;
}

export const Step6ReadingCards: React.FC<Props> = ({ config, onPrev, onCorrectAnswer }) => {
  const [readCardIds, setReadCardIds] = useState<string[]>([]);
  const [lastReadWord, setLastReadWord] = useState<string | null>(null);

  const handleCardClick = (id: string, _speakWord: string, displayWord: string) => {
    if (!readCardIds.includes(id)) {
      setReadCardIds(prev => [...prev, id]);
      onCorrectAnswer?.(id);
    }
    setLastReadWord(displayWord);
    playChime('catch');
  };

  const handleReset = () => {
    setReadCardIds([]);
    setLastReadWord(null);
  };

  const totalCards = config.cards.length;
  const readCount = readCardIds.length;

  return (
    <div className="flex flex-col items-center w-full max-w-lg">
      <h2 className="text-xl md:text-2xl font-black text-pink-600 mb-1 text-center">
        {config.title}
      </h2>
      <p className="text-xs md:text-sm text-slate-600 mb-3 text-center">
        {config.instruction}
      </p>

      {/* Progress */}
      <div className="w-full flex items-center justify-between bg-pink-50 px-3.5 py-1.5 rounded-xl border border-pink-200 text-xs font-bold text-pink-800 mb-3">
        <span>Прочитано карточек: {readCount} из {totalCards}</span>
        <div className="flex gap-1">
          {config.cards.map((c, idx) => (
            <span
              key={c.id || idx}
              className={`w-2.5 h-2.5 rounded-full ${
                readCardIds.includes(c.id) ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 gap-3 w-full mb-4">
        {config.cards.map(card => {
          const isRead = readCardIds.includes(card.id);
          const displayWord = card.displayWord.replace(/-/g, '‑');
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id, card.speakWord, displayWord)}
              className={`group flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer shadow-xs select-none ${
                isRead
                  ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 scale-102 ring-2 ring-emerald-200'
                  : 'bg-white border-slate-200 hover:border-pink-400 hover:bg-pink-50/50 hover:-translate-y-0.5'
              }`}
            >
              <div className="text-3xl md:text-4xl mb-1.5 group-hover:scale-110 transition-transform">
                {card.icon || '📖'}
              </div>
              <div className="text-base md:text-lg font-black tracking-wide text-slate-800">
                <span className="whitespace-nowrap">{displayWord}</span>
              </div>
              {isRead && (
                <span className="text-[10px] font-bold text-emerald-600 mt-1 flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" />
                  Прочитано!
                </span>
              )}
            </button>
          );
        })}
      </div>

      {lastReadWord && (
        <div className="text-xs md:text-sm font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg mb-3">
          ✨ Прочитано: <strong>{lastReadWord}</strong>! Молодец!
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs md:text-sm transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Сбросить
        </button>
        <button
          onClick={onPrev}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs md:text-sm transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>
      </div>

    </div>
  );
};
