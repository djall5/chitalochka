import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, RotateCcw, Sparkles } from 'lucide-react';
import { Step9Config } from '../../types';
import { createSeededRandom } from '../../utils/seededRandom';
import { emojiForWord, phonemeColor } from '../../utils/lessonContent';

type MemoryCard = { id: string; pairId: string; face: string; emoji?: string; imageDataUrl?: string; kind: 'text' | 'bonus' | 'empty' };
type Props = { config: Step9Config; onPrev: () => void; onNext: () => void; isLastGame: boolean; onCorrectAnswer?: (answerId: string, points?: number) => void; sharedSeed?: string };

function makeDeck(config: Step9Config, sharedSeed?: string): MemoryCard[] {
  const pairs = config.pairs.filter(pair => (config.mode === 'word-picture' ? pair.word || pair.first : pair.first).trim());
  const cards: MemoryCard[] = pairs.flatMap(pair => [
    { id: `${pair.id}-a`, pairId: pair.id, face: config.mode === 'word-picture' ? pair.word || pair.first : pair.first, emoji: pair.emoji, imageDataUrl: pair.imageDataUrl, kind: 'text' as const },
    { id: `${pair.id}-b`, pairId: pair.id, face: config.mode === 'word-picture' ? pair.word || pair.first : pair.first, emoji: pair.emoji, imageDataUrl: pair.imageDataUrl, kind: 'text' as const },
  ]);
  const random = createSeededRandom(sharedSeed || crypto.randomUUID());
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [cards[index], cards[randomIndex]] = [cards[randomIndex], cards[index]];
  }
  let rows = Math.max(1, Math.ceil((cards.length + 1) / 3));
  if (rows % 2 === 0) rows += 1;
  const board: MemoryCard[] = Array.from({ length: rows * 3 }, (_, index) => ({ id: `memory-empty-${index}`, pairId: 'empty', face: '', kind: 'empty' }));
  const centerIndex = Math.floor(rows / 2) * 3 + 1;
  board[centerIndex] = { id: 'memory-center-star', pairId: 'bonus', face: '⭐', kind: 'bonus' };
  let cardIndex = 0;
  board.forEach((card, index) => {
    if (index !== centerIndex && cardIndex < cards.length) board[index] = cards[cardIndex++];
  });
  return board;
}

export function Step9Memory({ config, onPrev, onNext, isLastGame, onCorrectAnswer, sharedSeed }: Props) {
  const deck = useMemo(() => makeDeck(config, sharedSeed), [config, sharedSeed]);
  const pairCount = new Set(deck.filter(card => card.pairId !== 'bonus').map(card => card.pairId)).size;
  const [revealed, setRevealed] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [resolving, setResolving] = useState(false);
  const mismatchTimer = useRef<number | null>(null);
  const complete = matchedPairs.length === pairCount;

  useEffect(() => () => { if (mismatchTimer.current !== null) window.clearTimeout(mismatchTimer.current); }, []);

  const flipCard = (index: number) => {
    const card = deck[index];
    if (resolving || card.pairId === 'bonus' || revealed.includes(index) || matchedPairs.includes(card.pairId)) return;
    const nextRevealed = [...revealed, index];
    setRevealed(nextRevealed);
    if (nextRevealed.length < 2) return;
    const [firstIndex, secondIndex] = nextRevealed;
    if (deck[firstIndex].pairId === deck[secondIndex].pairId) {
      setMatchedPairs(previous => [...previous, card.pairId]);
      setRevealed([]);
      onCorrectAnswer?.(`memory-pair-${card.pairId}`);
    } else {
      setResolving(true);
      mismatchTimer.current = window.setTimeout(() => {
        setRevealed([]);
        setResolving(false);
        mismatchTimer.current = null;
      }, 850);
    }
  };

  const reset = () => {
    if (mismatchTimer.current !== null) window.clearTimeout(mismatchTimer.current);
    mismatchTimer.current = null;
    setRevealed([]);
    setMatchedPairs([]);
    setResolving(false);
  };

  return <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
    <h2 className="text-xl font-black text-pink-600 md:text-2xl">{config.title}</h2>
    <p className="mb-3 mt-1 max-w-lg text-sm font-semibold text-slate-600">{config.instruction}</p>
    <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-[10px] font-black"><span className="rounded-full bg-violet-50 px-3 py-1.5 text-violet-700">Найдено пар: {matchedPairs.length} из {pairCount}</span><span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">⭐ всегда открыта и находится в центре</span></div>

    <div className="grid w-full max-w-md grid-cols-3 gap-2.5 sm:gap-3" role="grid" aria-label="Поле Мемори 3 на 3">
      {deck.map((card, index) => {
        const isCenterStar = card.pairId === 'bonus';
        const isEmpty = card.kind === 'empty';
        const isOpen = isCenterStar || revealed.includes(index) || matchedPairs.includes(card.pairId);
        const isMatched = isCenterStar || matchedPairs.includes(card.pairId);
        return <button key={card.id} role="gridcell" onClick={() => flipCard(index)} disabled={resolving || isMatched || isEmpty} aria-label={isEmpty ? 'Пустая ячейка' : isCenterStar ? 'Звёздочка, всегда открытая центральная карточка' : isOpen ? `Открытая карточка: ${card.face}` : 'Закрытая карточка'} className={`relative flex aspect-square min-w-0 flex-col items-center justify-center rounded-2xl border-2 p-1 text-lg font-black shadow-sm transition sm:text-2xl ${isEmpty ? 'pointer-events-none border-transparent bg-transparent shadow-none' : isMatched ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : isOpen ? 'border-pink-300 bg-white text-slate-800' : 'border-violet-300 bg-gradient-to-br from-violet-500 to-pink-500 text-white hover:-translate-y-0.5 hover:brightness-105'}`}>
          {!isEmpty && (isOpen ? card.kind === 'bonus' ? <span className="text-3xl">{card.face}</span> : config.mode === 'word-picture' ? <><span className="text-3xl">{card.imageDataUrl ? <img src={card.imageDataUrl} alt="" className="h-10 w-10 rounded-lg object-cover" /> : card.emoji || emojiForWord(card.face)}</span><span className="break-words text-[10px] leading-tight text-slate-700 sm:text-xs">{card.face}</span></> : <span className={`break-words ${phonemeColor(card.face)}`}>{card.face}</span> : <span className="text-2xl sm:text-3xl">?</span>)}
          {isMatched && !isCenterStar && <Check className="absolute h-3.5 w-3.5 translate-x-7 -translate-y-7 text-emerald-600 sm:translate-x-10 sm:-translate-y-10" />}
        </button>;
      })}
    </div>

    {complete && <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700"><Sparkles className="h-5 w-5" />Все пары найдены! Отличная память!</div>}
    <div className="mt-4 flex w-full items-center justify-between gap-2"><button onClick={onPrev} className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 sm:px-4"><ArrowLeft className="h-4 w-4" />Назад к игре</button><button onClick={reset} className="inline-flex items-center gap-1 rounded-xl bg-violet-50 px-3 py-2 text-xs font-black text-violet-700"><RotateCcw className="h-3.5 w-3.5" />Заново</button>{complete && !isLastGame && <button onClick={onNext} className="inline-flex items-center gap-1 rounded-xl bg-pink-500 px-3 py-2 text-xs font-black text-white sm:px-4">Дальше<ArrowRight className="h-4 w-4" /></button>}</div>
  </div>;
}
