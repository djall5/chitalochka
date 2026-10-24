import { PointerEvent as ReactPointerEvent, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, RotateCcw, Sparkles } from 'lucide-react';
import { Step10Config } from '../../types';
import { createSeededRandom } from '../../utils/seededRandom';

type LetterTile = { id: string; letter: string; x: number; y: number; rotation: number };
type DragState = { id: string; pointerId: number; startX: number; startY: number; tileX: number; tileY: number; width: number; height: number; moved: boolean };
type Props = { config: Step10Config; onPrev: () => void; onNext: () => void; isLastGame: boolean; onCorrectAnswer?: (answerId: string, points?: number) => void; sharedSeed?: string };
const RUSSIAN_ALPHABET = [...'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'];

function generateLetterScatter(targets: string[], count: number, seed: string): LetterTile[] {
  const random = createSeededRandom(seed);
  const targetUpper = targets.length ? targets : ['А'];
  const distractorCount = Math.max(12, Math.ceil(count * 0.75));
  const letters = Array.from({ length: count }, (_, index) => { const target = targetUpper[index % targetUpper.length]; return index % 2 === 0 ? target : target.toLocaleLowerCase('ru-RU'); });
  for (let index = 0; index < distractorCount; index += 1) {
    const candidates = RUSSIAN_ALPHABET.filter(letter => !targetUpper.includes(letter));
    const distractor = candidates[Math.floor(random() * candidates.length)];
    letters.push(index % 2 === 0 ? distractor : distractor.toLocaleLowerCase('ru-RU'));
  }
  const tiles = letters.map((letter, index) => {
    const isLeft = index % 2 === 0;
    return {
      id: `jar-letter-${seed}-${index}`,
      letter,
      x: isLeft ? 2 + random() * 18 : 80 + random() * 7,
      y: 3 + random() * 84,
      rotation: -9 + random() * 18,
    };
  });
  for (let index = tiles.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [tiles[index], tiles[randomIndex]] = [tiles[randomIndex], tiles[index]];
  }
  return tiles;
}

export function Step10FillJar({ config, onPrev, onNext, isLastGame, onCorrectAnswer, sharedSeed }: Props) {
  const targetLetters = (config.targetLetters?.length ? config.targetLetters : [config.targetLetter || 'А']).map(letter => [...letter.toLocaleUpperCase('ru-RU')][0]).filter(Boolean);
  const targetLetter = targetLetters[0] || 'А';
  const targetCount = Math.max(2, Math.min(30, Math.floor(config.targetCount || 16)));
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [placedIds, setPlacedIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [movedPositions, setMovedPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const jarRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef<string | null>(null);
  const tiles = useMemo(() => generateLetterScatter(targetLetters, targetCount, `${sharedSeed || crypto.randomUUID()}:${shuffleSeed}:${targetLetters.join('')}:${targetCount}`), [targetLetters.join(''), targetCount, shuffleSeed, sharedSeed]);
  const placedLetters = placedIds.map(id => tiles.find(tile => tile.id === id)?.letter || '');
  const completed = placedIds.length === targetCount;
  const remainingTiles = tiles.map((tile, index) => ({ tile, index })).filter(({ tile }) => !placedIds.includes(tile.id));
  const putInJar = (tileId: string | null) => {
    if (!tileId || completed || placedIds.includes(tileId)) return;
    const tile = tiles.find(item => item.id === tileId);
    if (!tile) return;
    if (!targetLetters.includes(tile.letter.toLocaleUpperCase('ru-RU'))) {
      setSelectedId(null);
      setMessage(`Это другая буква. Ищи: ${targetLetters.join(', ')}.`);
      return;
    }
    const answerNumber = placedIds.length + 1;
    setPlacedIds(previous => [...previous, tile.id]);
    setSelectedId(null);
    setMessage('Верно! Буква в банке.');
    onCorrectAnswer?.(`jar-${targetLetters.join('')}-${answerNumber}`);
  };

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>, tile: LetterTile) => {
    const stage = stageRef.current;
    const bounds = stage?.getBoundingClientRect();
    if (!bounds) return;
    const position = movedPositions[tile.id] || tile;
    dragRef.current = {
      id: tile.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      tileX: (position.x / 100) * bounds.width,
      tileY: (position.y / 100) * bounds.height,
      width: bounds.width,
      height: bounds.height,
      moved: false,
    };
    if (event.isTrusted) event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(tile.id);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 4) drag.moved = true;
    if (!drag.moved) return;
    const tileSize = window.innerWidth >= 640 ? 44 : 40;
    const x = Math.max(0, Math.min(drag.width - tileSize, drag.tileX + deltaX));
    const y = Math.max(0, Math.min(drag.height - tileSize, drag.tileY + deltaY));
    setMovedPositions(previous => ({ ...previous, [drag.id]: { x: (x / drag.width) * 100, y: (y / drag.height) * 100 } }));
  };

  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.moved) {
      suppressClickRef.current = drag.id;
      const jarBounds = jarRef.current?.getBoundingClientRect();
      if (jarBounds && event.clientX >= jarBounds.left && event.clientX <= jarBounds.right && event.clientY >= jarBounds.top && event.clientY <= jarBounds.bottom) putInJar(drag.id);
      window.setTimeout(() => { suppressClickRef.current = null; }, 0);
    }
    dragRef.current = null;
    setDraggingId(null);
  };

  const renderTiles = () => <>
    {remainingTiles.map(({ tile }) => {
      const position = movedPositions[tile.id] || tile;
      return <button key={tile.id} type="button" onPointerDown={event => startDrag(event, tile)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onClick={() => { if (suppressClickRef.current === tile.id) { suppressClickRef.current = null; return; } setSelectedId(tile.id === selectedId ? null : tile.id); setMessage(`Найди: ${targetLetters.join(', ')} и перетащи в банку.`); }} aria-label={`Буква ${tile.letter}`} style={{ left: `${position.x}%`, top: `${position.y}%`, transform: `rotate(${tile.rotation}deg)` }} className={`absolute grid h-10 w-10 touch-none select-none place-items-center rounded-xl border-[3px] bg-white text-base font-black shadow-md transition hover:-translate-y-0.5 active:scale-95 sm:h-11 sm:w-11 ${draggingId === tile.id ? 'z-30 cursor-grabbing shadow-xl' : 'z-10 cursor-grab'} ${selectedId === tile.id ? 'border-violet-500 text-violet-700 ring-2 ring-violet-200' : 'border-pink-400 text-pink-600 hover:border-pink-600'}`}>{tile.letter}</button>;
    })}
  </>;

  return <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
    <h2 className="text-xl font-black text-pink-600 md:text-2xl">{config.title}</h2>
    <p className="mb-3 mt-1 max-w-xl text-sm font-semibold text-slate-600">{config.instruction}</p>
    <div className="mb-3 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-black text-amber-800">Найди буквы: {targetLetters.join(', ')}</div>
    <p className="mb-2 text-xs font-black text-slate-600">Перетащи нужные буквы в банку. На телефоне нажми на букву, затем на банку.</p>
    <div ref={stageRef} className="relative min-h-[470px] w-full overflow-hidden rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50/80 sm:min-h-[510px]">
      {renderTiles()}
      <div ref={jarRef} onClick={() => putInJar(selectedId)} aria-label="Банка: перетащи сюда нужную букву" className="absolute left-1/2 top-1/2 z-0 flex h-[290px] w-[34%] min-w-[130px] max-w-[240px] -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center justify-between rounded-[1.7rem_1.7rem_2rem_2rem] border-[5px] border-slate-400 bg-sky-100/75 px-3 py-3 shadow-inner sm:h-[330px]">
        <div className="absolute -top-2 left-1/2 h-3 w-16 -translate-x-1/2 rounded-t-lg border-[3px] border-b-0 border-slate-500 bg-slate-300" />
        <div className="grid w-full flex-1 content-end grid-cols-4 gap-1.5 overflow-hidden pb-2">{placedLetters.map((letter, index) => <span key={`${index}-${letter}`} className="grid h-8 place-items-center rounded-lg bg-white/85 text-base font-black text-pink-600 shadow-sm">{letter}</span>)}</div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">Банка ({placedIds.length}/{targetCount})</span>
      </div>
    </div>
    <div aria-live="polite" className={`mt-3 min-h-6 text-xs font-black ${message.startsWith('Верно') ? 'text-emerald-600' : message.startsWith('Это') ? 'text-rose-600' : 'text-violet-700'}`}>{completed ? 'Банка заполнена! Ты нашёл все нужные буквы!' : message}</div>
    {completed && <div className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700"><Sparkles className="h-5 w-5" />Отличная работа!</div>}
    {completed && !isLastGame && <button onClick={onNext} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-pink-500 px-5 py-2.5 text-xs font-black text-white shadow">Дальше по уроку <Check className="h-4 w-4" /></button>}
    <div className="mt-4 flex w-full items-center justify-between gap-2"><button onClick={onPrev} className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600"><ArrowLeft className="h-4 w-4" />Назад к игре</button><button onClick={() => { setPlacedIds([]); setSelectedId(null); setMovedPositions({}); setMessage(''); setShuffleSeed(value => value + 1); }} className="inline-flex items-center gap-1 rounded-xl bg-violet-50 px-3 py-2 text-xs font-black text-violet-700"><RotateCcw className="h-3.5 w-3.5" />Заново</button></div>
  </div>;
}
