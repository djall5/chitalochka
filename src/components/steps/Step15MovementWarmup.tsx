import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Play } from 'lucide-react';
import { Step15Config } from '../../types';

type Props = {
  config: Step15Config;
  onPrev: () => void;
  onNext: () => void;
  isLastGame: boolean;
  onCorrectAnswer: (id: string) => void;
};

export function Step15MovementWarmup({ config, onPrev, onNext, isLastGame, onCorrectAnswer }: Props) {
  const [completed, setCompleted] = useState(false);
  const finish = () => {
    setCompleted(true);
    onCorrectAnswer('movement-warmup-completed');
  };

  if (!config.videoDataUrl) return <div className="w-full rounded-2xl bg-amber-50 p-6 text-center text-sm font-bold text-amber-800">Учитель ещё не загрузил видео для разминки.<div className="mt-4 flex justify-between"><button onClick={onPrev}>Назад</button><button onClick={onNext}>Дальше</button></div></div>;

  return <section className="mx-auto w-full max-w-3xl text-center">
    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-100 text-3xl">🤸</div>
    <h2 className="mt-3 text-2xl font-black text-pink-600">{config.title}</h2>
    <p className="mt-1 text-sm font-semibold text-slate-600">{config.instruction}</p>
    <div className="mt-5 overflow-hidden rounded-3xl border-2 border-pink-200 bg-slate-950 p-2 shadow-lg">
      <video className="mx-auto max-h-[58vh] w-full rounded-2xl bg-black" src={config.videoDataUrl} controls playsInline onEnded={finish}>Ваш браузер не поддерживает видео.</video>
    </div>
    <p className="mt-3 text-xs font-semibold text-slate-400">Повторяй движения вместе с роликом. {config.videoName && `Видео: ${config.videoName}`}</p>
    {completed ? <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">Отлично! Разминка выполнена.</div> : <button onClick={finish} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow"><CheckCircle2 className="h-4 w-4" />Я готов!</button>}
    <div className="mt-5 flex items-center justify-between gap-3"><button onClick={onPrev} className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-600"><ArrowLeft className="h-4 w-4" />Назад</button>{completed && !isLastGame && <button onClick={onNext} className="inline-flex items-center gap-1 rounded-xl bg-pink-500 px-5 py-2.5 text-sm font-black text-white shadow">Дальше по уроку<ArrowRight className="h-4 w-4" /></button>}{!completed && <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400"><Play className="h-4 w-4" />Включи ролик</span>}</div>
  </section>;
}
