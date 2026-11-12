import { ArrowLeft, ArrowRight, Check, Search } from 'lucide-react';
import { PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Step17Config } from '../../types';
import { normalizedWord, validateWordSearch, wordCells } from '../../utils/wordSearch';

type Props = {
  config: Step17Config;
  onPrev: () => void;
  onNext: () => void;
  isLastGame?: boolean;
  onCorrectAnswer: (answerId: string, points?: number) => void;
};
type Cell = { row: number; column: number };

const sameCell = (first: Cell, second: Cell) => first.row === second.row && first.column === second.column;
const keyFor = (cell: Cell) => `${cell.row}:${cell.column}`;
function cellsBetween(first: Cell, last: Cell) {
  if (first.row !== last.row && first.column !== last.column) return [];
  const rowStep = Math.sign(last.row - first.row);
  const columnStep = Math.sign(last.column - first.column);
  const length = Math.max(Math.abs(last.row - first.row), Math.abs(last.column - first.column));
  return Array.from({ length: length + 1 }, (_, index) => ({ row: first.row + rowStep * index, column: first.column + columnStep * index }));
}

export function Step17WordSearch({ config, onPrev, onNext, isLastGame, onCorrectAnswer }: Props) {
  const error = validateWordSearch(config);
  const [found, setFound] = useState<string[]>([]);
  const [start, setStart] = useState<Cell | null>(null);
  const [end, setEnd] = useState<Cell | null>(null);
  const [wrong, setWrong] = useState<Cell[]>([]);
  const startRef = useRef<Cell | null>(null);
  const endRef = useRef<Cell | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setFound([]); setStart(null); setEnd(null); setWrong([]); }, [config.grid, config.words]);
  const foundCells = useMemo(() => new Set(config.words.filter(word => found.includes(word.id)).flatMap(word => wordCells(word).map(keyFor))), [config.words, found]);
  const selectedCells = useMemo(() => start && end ? cellsBetween(start, end) : start ? [start] : [], [start, end]);
  const wordForSelection = (first: Cell, last: Cell) => config.words.find(word => {
    const cells = wordCells(word);
    const wordStart = cells[0]; const wordEnd = cells[cells.length - 1];
    return (sameCell(first, wordStart) && sameCell(last, wordEnd)) || (sameCell(first, wordEnd) && sameCell(last, wordStart));
  });
  const cellFromEvent = (event: PointerEvent<HTMLDivElement>) => {
    const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-word-cell]');
    if (!element || !boardRef.current?.contains(element)) return null;
    return { row: Number(element.dataset.row), column: Number(element.dataset.column) };
  };
  const finishSelection = () => {
    const first = startRef.current; const last = endRef.current || first;
    if (!first || !last) return;
    const word = wordForSelection(first, last);
    if (word && !found.includes(word.id)) {
      setFound(current => [...current, word.id]);
      onCorrectAnswer(`word-search-${word.id}`, 10);
    } else if (!foundCells.has(keyFor(first)) || !foundCells.has(keyFor(last))) {
      setWrong(cellsBetween(first, last));
      window.setTimeout(() => setWrong([]), 550);
    }
    startRef.current = null; endRef.current = null; setStart(null); setEnd(null);
  };
  const begin = (event: PointerEvent<HTMLButtonElement>, cell: Cell) => {
    if (foundCells.has(keyFor(cell))) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    startRef.current = cell; endRef.current = cell; setStart(cell); setEnd(cell);
  };
  const complete = found.length === config.words.length;

  if (error) return <div className="w-full rounded-2xl bg-amber-50 p-6 text-center text-sm font-bold text-amber-800">Учитель ещё не подготовил поле для поиска слов.<div className="mt-4 flex justify-between"><button onClick={onPrev}>Назад</button><button onClick={onNext}>Дальше</button></div></div>;
  return <section className="mx-auto w-full max-w-3xl text-center">
    <p className="text-xs font-black uppercase tracking-[.12em] text-pink-600">Поиск слов</p>
    <h2 className="mt-2 text-xl font-black text-slate-800 md:text-2xl">{config.title}</h2>
    {config.instruction && <p className="mt-1 text-sm font-semibold text-slate-500">{config.instruction}</p>}
    <p className="mt-3 text-xs font-black text-violet-600">Найдено: {found.length} из {config.words.length}</p>
    <div ref={boardRef} onPointerMove={event => { if (!startRef.current) return; const cell = cellFromEvent(event); if (cell) { endRef.current = cell; setEnd(cell); } }} onPointerUp={finishSelection} onPointerCancel={finishSelection} className="mx-auto mt-4 grid max-w-[560px] touch-none select-none gap-1 rounded-3xl border-2 border-pink-100 bg-pink-50 p-2 shadow-inner" style={{ gridTemplateColumns: `repeat(${config.columns}, minmax(0, 1fr))` }}>
      {config.grid.flatMap((row, rowIndex) => row.map((letter, columnIndex) => {
        const cell = { row: rowIndex, column: columnIndex };
        const selected = selectedCells.some(item => sameCell(item, cell));
        const isFound = foundCells.has(keyFor(cell));
        const isWrong = wrong.some(item => sameCell(item, cell));
        return <button key={`${rowIndex}-${columnIndex}`} data-word-cell data-row={rowIndex} data-column={columnIndex} onPointerDown={event => begin(event, cell)} type="button" className={`aspect-square rounded-lg border text-sm font-black transition sm:text-lg ${isFound ? 'border-emerald-400 bg-emerald-400 text-white' : isWrong ? 'border-rose-400 bg-rose-100 text-rose-700' : selected ? 'border-pink-500 bg-pink-200 text-pink-800' : 'border-white bg-white text-slate-700 hover:border-pink-300'}`}>{letter}</button>;
      }))}
    </div>
    {config.showWordList && <div className="mx-auto mt-4 flex max-w-xl flex-wrap justify-center gap-2">{config.words.map(word => <span key={word.id} className={`rounded-full px-3 py-1.5 text-xs font-black ${found.includes(word.id) ? 'bg-emerald-100 text-emerald-700 line-through' : 'bg-slate-100 text-slate-600'}`}>{word.text}</span>)}</div>}
    {complete && <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">Все слова найдены! {isLastGame ? 'Задание выполнено.' : 'Нажми «Дальше».'}</div>}
    <div className="mt-5 flex items-center justify-between gap-3"><button onClick={onPrev} className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-600"><ArrowLeft className="h-4 w-4" />Назад</button>{complete && !isLastGame ? <button onClick={onNext} className="inline-flex items-center gap-1 rounded-xl bg-pink-500 px-5 py-2.5 text-sm font-black text-white shadow">Дальше по уроку <ArrowRight className="h-4 w-4" /></button> : !complete ? <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400"><Search className="h-4 w-4" />Проведи по слову</span> : null}</div>
  </section>;
}
