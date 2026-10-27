import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, TimerReset } from 'lucide-react';
import { Step11Config } from '../../types';
import { phonemeCharacterColor } from '../../utils/lessonContent';
import { playChime } from '../../utils/phonetics';

type Props = {
  config: Step11Config;
  onPrev: () => void;
  onNext: () => void;
  isLastGame: boolean;
  onCorrectAnswer?: (answerId: string, points?: number) => void;
};

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function Step11SpeedSyllables({ config, onPrev, onNext, isLastGame, onCorrectAnswer }: Props) {
  const syllables = useMemo(() => config.syllables.map(item => item.trim()).filter(Boolean), [config.syllables]);
  const configKey = `${syllables.join('|')}:${config.timeLimit}:${config.optionsPerRound}`;
  const [queue, setQueue] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [message, setMessage] = useState('');
  const [finished, setFinished] = useState(false);

  const restart = useCallback(() => {
    setQueue(shuffle(config.syllables.map(item => item.trim()).filter(Boolean)));
    setRound(0);
    setTimeLeft(Math.max(5, config.timeLimit || 30));
    setMessage('');
    setFinished(false);
  }, [config.syllables, config.timeLimit]);

  useEffect(() => { restart(); }, [configKey, restart]);

  const target = queue[round] || '';
  const complete = finished || (queue.length > 0 && round >= queue.length);
  const options = useMemo(() => {
    if (!target) return [];
    const desiredCount = Math.min(Math.max(2, config.optionsPerRound || 4), syllables.length);
    const distractors = shuffle(syllables.filter(item => item !== target)).slice(0, Math.max(0, desiredCount - 1));
    return shuffle([target, ...distractors]);
  }, [target, syllables, config.optionsPerRound]);

  useEffect(() => {
    if (complete || queue.length === 0) return;
    const timer = window.setInterval(() => {
      setTimeLeft(previous => {
        if (previous <= 1) {
          window.clearInterval(timer);
          setFinished(true);
          setMessage('⏰ Время вышло. Попробуйте ещё раз!');
          playChime('wrong');
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [complete, queue.length, target]);

  const choose = (syllable: string) => {
    if (complete || !target) return;
    if (syllable !== target) {
      setMessage(`❌ Не тот слог. Ищем «${target}».`);
      playChime('wrong');
      return;
    }
    playChime('catch');
    onCorrectAnswer?.(`speed-syllable-${round}-${target}`);
    const nextRound = round + 1;
    if (nextRound >= queue.length) {
      setRound(nextRound);
      setFinished(true);
      setMessage('🎉 Все слоги найдены! Отличная скорость!');
      playChime('celebrate');
      return;
    }
    setRound(nextRound);
    setMessage(`✨ Верно, это «${target}»!`);
  };

  const coloredSyllable = (value: string) => <>{[...value].map((character, index) => <span key={`${character}-${index}`} className={phonemeCharacterColor(value, index)}>{character}</span>)}</>;

  if (syllables.length < 2) {
    return <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center"><h2 className="text-xl font-black text-pink-600">{config.title}</h2><p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">Добавьте в настройках игры хотя бы два слога.</p><button onClick={onPrev} className="mt-4 inline-flex items-center gap-1 rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600"><ArrowLeft className="h-4 w-4" />Назад</button></div>;
  }

  return <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
    <h2 className="text-xl font-black text-pink-600 md:text-2xl">{config.title}</h2>
    <p className="mb-3 mt-1 text-sm font-semibold text-slate-600">{config.instruction}</p>
    <div className="flex w-full items-center justify-between rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs font-black text-violet-800"><span className="inline-flex items-center gap-1"><TimerReset className="h-4 w-4" />Осталось: {timeLeft} сек.</span><span>⭐ Найдено: {Math.min(round, queue.length)} / {queue.length}</span></div>
    {!complete ? <>
      <div className="mt-4 rounded-3xl border-2 border-pink-200 bg-pink-50 px-8 py-5 shadow-sm"><div className="text-[10px] font-black tracking-wider text-slate-500">ИЩЕМ СЛОГ</div><div className="mt-1 text-5xl font-black tracking-wide">{coloredSyllable(target)}</div></div>
      <div className="mt-4 grid w-full grid-cols-2 gap-3 sm:grid-cols-3">{options.map((syllable, index) => <button key={`${syllable}-${index}`} onClick={() => choose(syllable)} className="rounded-2xl border-2 border-sky-200 bg-white px-3 py-5 text-2xl font-black shadow-sm transition hover:-translate-y-0.5 hover:border-pink-400 hover:bg-pink-50 active:scale-95">{coloredSyllable(syllable)}</button>)}</div>
      {message && <p className={`mt-3 text-sm font-bold ${message.startsWith('❌') ? 'text-rose-600' : 'text-emerald-600'}`}>{message}</p>}
    </> : <div className={`mt-5 w-full rounded-3xl px-5 py-6 text-sm font-black ${timeLeft === 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{message || '🎉 Все слоги найдены!'}</div>}
    <div className="mt-5 flex flex-wrap justify-center gap-2"><button onClick={onPrev} className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600"><ArrowLeft className="h-4 w-4" />Назад</button><button onClick={restart} className="inline-flex items-center gap-1 rounded-xl bg-violet-50 px-4 py-2 text-xs font-black text-violet-700"><RotateCcw className="h-4 w-4" />Заново</button>{complete && !isLastGame && <button onClick={onNext} className="inline-flex items-center gap-1 rounded-xl bg-pink-500 px-4 py-2 text-xs font-black text-white">Дальше<ArrowRight className="h-4 w-4" /></button>}</div>
  </div>;
}
