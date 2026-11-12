import { ArrowLeft, ArrowRight, Check, Link2 } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Step16Config } from '../../types';
import { createSeededRandom } from '../../utils/seededRandom';

type Props = {
  config: Step16Config;
  onPrev: () => void;
  onNext: () => void;
  isLastGame?: boolean;
  onCorrectAnswer: (answerId: string, points?: number) => void;
  sharedSeed?: string;
};

type Line = { id: string; x1: number; y1: number; x2: number; y2: number };

function shuffled<T>(items: T[], seed: string) {
  const result = [...items];
  const random = createSeededRandom(seed);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function Step16SentencePictureMatch({ config, onPrev, onNext, isLastGame, onCorrectAnswer, sharedSeed }: Props) {
  const pairs = config.pairs.filter(pair => pair.plainText.trim() && pair.imageDataUrl);
  const signature = pairs.map(pair => pair.id).join('|');
  const sentences = useMemo(() => shuffled(pairs, `sentences:${sharedSeed || ''}:${signature}`), [sharedSeed, signature]);
  const pictures = useMemo(() => shuffled(pairs, `pictures:${sharedSeed || ''}:${signature}`), [sharedSeed, signature]);
  const [selectedSentenceId, setSelectedSentenceId] = useState<string | null>(null);
  const [selectedPictureId, setSelectedPictureId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const sentenceRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const pictureRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    setSelectedSentenceId(null);
    setSelectedPictureId(null);
    setMatchedIds([]);
    setWrongIds([]);
  }, [signature]);

  useLayoutEffect(() => {
    const updateLines = () => {
      const board = boardRef.current;
      if (!board) return;
      const bounds = board.getBoundingClientRect();
      setLines(matchedIds.flatMap(id => {
        const sentence = sentenceRefs.current[id]?.getBoundingClientRect();
        const picture = pictureRefs.current[id]?.getBoundingClientRect();
        if (!sentence || !picture) return [];
        return [{ id, x1: sentence.right - bounds.left, y1: sentence.top + sentence.height / 2 - bounds.top, x2: picture.left - bounds.left, y2: picture.top + picture.height / 2 - bounds.top }];
      }));
    };
    updateLines();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(updateLines);
    if (boardRef.current) observer?.observe(boardRef.current);
    window.addEventListener('resize', updateLines);
    return () => { observer?.disconnect(); window.removeEventListener('resize', updateLines); };
  }, [matchedIds, signature]);

  const choose = (sentenceId: string | null, pictureId: string | null) => {
    if (!sentenceId || !pictureId || matchedIds.includes(sentenceId) || matchedIds.includes(pictureId)) return;
    if (sentenceId === pictureId) {
      setMatchedIds(current => current.includes(sentenceId) ? current : [...current, sentenceId]);
      setSelectedSentenceId(null);
      setSelectedPictureId(null);
      onCorrectAnswer(`sentence-picture-${sentenceId}`, 10);
      return;
    }
    setWrongIds([sentenceId, pictureId]);
    setSelectedSentenceId(null);
    setSelectedPictureId(null);
    window.setTimeout(() => setWrongIds([]), 550);
  };

  const selectSentence = (id: string) => {
    if (matchedIds.includes(id)) return;
    setSelectedSentenceId(id);
    choose(id, selectedPictureId);
  };
  const selectPicture = (id: string) => {
    if (matchedIds.includes(id)) return;
    setSelectedPictureId(id);
    choose(selectedSentenceId, id);
  };

  if (pairs.length < 2) return <div className="w-full rounded-2xl bg-amber-50 p-6 text-center text-sm font-bold text-amber-800">Учитель ещё не подготовил пары для этой игры.<div className="mt-4 flex justify-between"><button onClick={onPrev}>Назад</button><button onClick={onNext}>Дальше</button></div></div>;
  const complete = matchedIds.length === pairs.length;

  return <section className="mx-auto w-full max-w-5xl text-center">
    <p className="text-xs font-black uppercase tracking-[.12em] text-pink-600">Прочитай и соедини</p>
    <h2 className="mt-2 text-xl font-black text-slate-800 md:text-2xl">{config.title}</h2>
    {config.instruction && <p className="mt-1 text-sm font-semibold text-slate-500">{config.instruction}</p>}
    <p className="mt-3 text-xs font-black text-violet-600">Соединено: {matchedIds.length} из {pairs.length}</p>
    <div ref={boardRef} className="relative mt-4 grid gap-8 md:grid-cols-2 md:gap-16">
      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible" aria-hidden="true">
        {lines.map(line => <path key={line.id} d={`M ${line.x1} ${line.y1} C ${(line.x1 + line.x2) / 2} ${line.y1}, ${(line.x1 + line.x2) / 2} ${line.y2}, ${line.x2} ${line.y2}`} fill="none" stroke="#22c55e" strokeWidth="5" strokeLinecap="round" />)}
      </svg>
      <div className="relative z-20 space-y-3">
        {sentences.map((pair, index) => {
          const matched = matchedIds.includes(pair.id);
          const wrong = wrongIds.includes(pair.id);
          const selected = selectedSentenceId === pair.id;
          const text = config.displayMode === 'syllables' ? pair.syllabifiedText || pair.plainText : pair.plainText;
          return <button key={pair.id} ref={node => { sentenceRefs.current[pair.id] = node; }} type="button" onClick={() => selectSentence(pair.id)} disabled={matched} className={`min-h-20 w-full rounded-2xl border-2 p-3 text-left text-base font-black leading-relaxed shadow-sm transition md:text-lg ${matched ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : wrong ? 'border-rose-400 bg-rose-50 text-rose-700' : selected ? 'border-pink-500 bg-pink-50 ring-4 ring-pink-100' : 'border-slate-200 bg-white text-slate-800 hover:border-pink-300 hover:bg-pink-50'}`}><span className="mr-2 text-xs text-slate-400">{index + 1}.</span>{text}{matched && <Check className="float-right mt-1 h-5 w-5" />}</button>;
        })}
      </div>
      <div className="relative z-20 space-y-3">
        {pictures.map((pair, index) => {
          const matched = matchedIds.includes(pair.id);
          const wrong = wrongIds.includes(pair.id);
          const selected = selectedPictureId === pair.id;
          return <button key={pair.id} ref={node => { pictureRefs.current[pair.id] = node; }} type="button" onClick={() => selectPicture(pair.id)} disabled={matched} className={`flex min-h-20 w-full items-center gap-3 rounded-2xl border-2 p-2 text-left shadow-sm transition ${matched ? 'border-emerald-400 bg-emerald-50' : wrong ? 'border-rose-400 bg-rose-50' : selected ? 'border-pink-500 bg-pink-50 ring-4 ring-pink-100' : 'border-slate-200 bg-white hover:border-pink-300 hover:bg-pink-50'}`}><span className="w-5 shrink-0 text-xs font-black text-slate-400">{index + 1}</span><img src={pair.imageDataUrl} alt={`Картинка ${index + 1}`} className="h-20 w-full rounded-xl object-contain" />{matched && <Check className="mr-1 h-5 w-5 shrink-0 text-emerald-600" />}</button>;
        })}
      </div>
    </div>
    {!complete && (selectedSentenceId || selectedPictureId) && <p role="status" className="mt-4 rounded-xl bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800">Теперь выбери {selectedSentenceId ? 'подходящую картинку' : 'предложение'}.</p>}
    {wrongIds.length > 0 && <p role="status" className="mt-4 rounded-xl bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700">Эта пара не подходит. Попробуй ещё раз.</p>}
    {complete && <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">Все пары соединены! {isLastGame ? 'Задание выполнено.' : 'Нажми «Дальше». '}</div>}
    <div className="mt-5 flex items-center justify-between gap-3"><button onClick={onPrev} className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-600"><ArrowLeft className="h-4 w-4" />Назад</button>{complete && !isLastGame ? <button onClick={onNext} className="inline-flex items-center gap-1 rounded-xl bg-pink-500 px-5 py-2.5 text-sm font-black text-white shadow"><span>Дальше по уроку</span><ArrowRight className="h-4 w-4" /></button> : !complete ? <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400"><Link2 className="h-4 w-4" />Выбери пару</span> : null}</div>
  </section>;
}
