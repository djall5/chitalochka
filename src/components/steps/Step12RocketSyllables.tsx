import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Sparkles } from 'lucide-react';
import { Step12Config } from '../../types';
import { generateRocketStages } from '../../utils/rocketSyllables';
import { playTransitionSound } from '../../utils/audio';

type Props = {
  config: Step12Config;
  onPrev: () => void;
  onNext: () => void;
  isLastGame: boolean;
  onCorrectAnswer?: (answerId: string, points?: number) => void;
};

type Planet = { left: string; top: string; size: number; color: string; ring?: boolean; drift: number };

const planetLayers: Planet[][] = [
  [
    { left: '8%', top: '17%', size: 68, color: 'linear-gradient(145deg, #ec8f42, #b74538)', drift: -14 },
    { left: '76%', top: '28%', size: 92, color: 'linear-gradient(145deg, #6c83de, #35418d)', ring: true, drift: 13 },
    { left: '18%', top: '71%', size: 54, color: 'linear-gradient(145deg, #bc6cc7, #683576)', drift: 10 },
  ],
  [
    { left: '72%', top: '10%', size: 62, color: 'linear-gradient(145deg, #e9ae59, #ab5630)', drift: -13 },
    { left: '9%', top: '43%', size: 98, color: 'linear-gradient(145deg, #58a6ca, #305a9d)', drift: 16 },
    { left: '74%', top: '75%', size: 50, color: 'linear-gradient(145deg, #d2695e, #83324a)', drift: -10 },
  ],
  [
    { left: '14%', top: '12%', size: 104, color: 'linear-gradient(145deg, #9c72db, #56398b)', ring: true, drift: 12 },
    { left: '72%', top: '43%', size: 72, color: 'linear-gradient(145deg, #d98d54, #99432d)', drift: -15 },
    { left: '20%', top: '78%', size: 58, color: 'linear-gradient(145deg, #5ebeb9, #26717d)', drift: 8 },
  ],
  [
    { left: '73%', top: '16%', size: 108, color: 'linear-gradient(145deg, #d35f88, #74365d)', drift: -16 },
    { left: '9%', top: '49%', size: 64, color: 'linear-gradient(145deg, #d5b656, #85653b)', drift: 13 },
    { left: '74%', top: '75%', size: 48, color: 'linear-gradient(145deg, #78b3dc, #3d619b)', drift: -8 },
  ],
  [
    { left: '15%', top: '16%', size: 76, color: 'linear-gradient(145deg, #d77951, #8c3c4d)', drift: 14 },
    { left: '73%', top: '43%', size: 96, color: 'linear-gradient(145deg, #7c6fda, #403779)', ring: true, drift: -14 },
    { left: '20%', top: '77%', size: 56, color: 'linear-gradient(145deg, #4eb5bd, #266f7b)', drift: 11 },
  ],
];

const atmospheres = [
  'radial-gradient(circle at 50% 20%, #142652 0%, #070f29 45%, #030615 100%)',
  'radial-gradient(circle at 35% 30%, #1a3155 0%, #09132b 48%, #030615 100%)',
  'radial-gradient(circle at 70% 25%, #202653 0%, #0a1129 48%, #030615 100%)',
  'radial-gradient(circle at 45% 30%, #123541 0%, #07152a 48%, #030615 100%)',
  'radial-gradient(circle at 55% 20%, #251b4a 0%, #0a1028 48%, #030615 100%)',
];

function stageColumn(config: Step12Config) {
  return config.stages.length ? config.stages : generateRocketStages(config.vowels, config.consonants);
}

export function Step12RocketSyllables({ config, onPrev, onNext, isLastGame, onCorrectAnswer }: Props) {
  const stages = useMemo(() => stageColumn(config).filter(stage => stage.length), [config]);
  const [stage, setStage] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(() => new Set());
  const [launched, setLaunched] = useState(false);
  const safeStage = Math.min(stage, Math.max(0, stages.length - 1));
  const displayStage = launched ? stages.length : safeStage;
  const words = stages[safeStage] || [];
  const widestWord = Math.max(1, ...words.map(word => [...word].length));
  const columnWidth = `${Math.max(2, Math.min(5, widestWord + 1))}ch`;
  const compactColumn = words.length >= 9;

  useEffect(() => {
    setStage(0);
    setCompleted(new Set());
    setLaunched(false);
  }, [config.stages, config.vowels, config.consonants]);

  const moveUp = () => {
    if (!completed.has(safeStage)) {
      setCompleted(previous => new Set(previous).add(safeStage));
      onCorrectAnswer?.(`rocket-stage-${safeStage + 1}`, 1);
    }
    playTransitionSound();
    if (safeStage >= stages.length - 1) {
      setLaunched(true);
      return;
    }
    setStage(previous => previous + 1);
  };

  const restart = () => {
    setStage(0);
    setCompleted(new Set());
    setLaunched(false);
  };

  if (!stages.length) return <div className="rounded-3xl bg-slate-950 p-8 text-center text-sm font-bold text-white">Добавьте хотя бы один столбик в редакторе игры.</div>;

  return <section className="w-full max-w-[620px] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl shadow-slate-950/40">
    <div className="relative min-h-[680px] overflow-hidden px-4 pb-5 pt-4 text-white transition-[background] duration-[1600ms]" style={{ background: atmospheres[Math.min(displayStage, atmospheres.length - 1)] }}>
      <div className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: 'radial-gradient(circle at 12% 12%, white 0 1px, transparent 1.5px), radial-gradient(circle at 86% 15%, white 0 1px, transparent 1.5px), radial-gradient(circle at 28% 58%, #c9dcff 0 1px, transparent 1.5px), radial-gradient(circle at 83% 83%, white 0 1px, transparent 1.5px), radial-gradient(circle at 47% 7%, white 0 1px, transparent 1.5px)', backgroundSize: '152px 168px, 226px 198px, 192px 220px, 240px 174px, 283px 208px' }} />

      {planetLayers.map((layer, layerIndex) => layer.map((planet, index) => {
        const distance = displayStage - layerIndex;
        const active = distance === 0;
        const passed = distance > 0;
        const transform = launched ? `translate3d(${planet.drift * 1.4}px, 920px, 0) scale(1.24)` : active ? 'translate3d(0, 0, 0) scale(1)' : passed ? `translate3d(${planet.drift}px, 760px, 0) scale(1.18)` : `translate3d(${planet.drift}px, -360px, 0) scale(.82)`;
        return <div key={`${layerIndex}-${index}`} className="pointer-events-none absolute z-[1] rounded-full transition-all duration-[1200ms] ease-in" style={{ left: planet.left, top: planet.top, width: planet.size, height: planet.size, opacity: launched ? 0 : active ? 0.9 : 0, transform, background: planet.color, boxShadow: 'inset -12px -12px 20px rgba(0,0,0,.18), inset 9px 8px 16px rgba(255,255,255,.16)' }}>
          <span className="absolute left-[19%] top-[18%] h-[15%] w-[28%] rounded-full bg-white/15" />
          <span className="absolute bottom-[20%] right-[18%] h-[12%] w-[18%] rounded-full bg-black/10" />
          {planet.ring && <span className="absolute left-[-25%] top-[44%] h-[20%] w-[150%] -rotate-[19deg] rounded-[50%] border-[5px] border-amber-200/75" />}
        </div>;
      }))}

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="rounded-full border border-white/15 bg-slate-950/30 px-3 py-1.5 text-[10px] font-black tracking-wide text-sky-100">КОСМИЧЕСКОЕ ЧТЕНИЕ</div>
        <div className="rounded-full border border-white/15 bg-slate-950/30 px-3 py-1.5 text-[10px] font-black text-amber-100">{launched ? 'В КОСМОСЕ!' : `${safeStage + 1} / ${stages.length}`}</div>
      </div>

      <div className="absolute left-1/2 top-[54px] z-20 w-[min(82vw,330px)] -translate-x-1/2">
        <div className={launched ? 'rocket-launch-motion' : ''}>
          <img src={`${import.meta.env.BASE_URL}games/rocket-syllables.png`} alt="Ракета" className="block h-auto w-full drop-shadow-[0_18px_28px_rgba(0,0,0,.42)]" draggable={false} />
          <div className={`absolute left-1/2 top-[24%] grid h-[34%] -translate-x-1/2 items-center font-black leading-none text-slate-800 [text-shadow:0_1px_0_rgba(255,255,255,.9)] ${compactColumn ? 'text-[clamp(0.76rem,3.1vw,1rem)]' : 'text-[clamp(0.86rem,3.8vw,1.22rem)]'}`} style={{ width: columnWidth, gridTemplateRows: `repeat(${Math.min(words.length, 10)}, minmax(0, 1fr))` }} aria-label={words.join(', ')}>
            {words.slice(0, 10).map((word, index) => <span key={`${word}-${index}`} className="block w-full whitespace-nowrap text-left">{word}</span>)}
          </div>
        </div>
      </div>

      <div className="absolute inset-x-4 bottom-5 z-30 rounded-2xl border border-white/15 bg-slate-950/45 p-3 text-center backdrop-blur-sm">
        {launched ? <>
          <div className="flex items-center justify-center gap-1 text-base font-black text-amber-100"><Sparkles className="h-4 w-4" />Ракета улетела в космос!</div>
          <p className="mt-1 text-[11px] font-semibold text-sky-100/85">Все столбики прочитаны. Отличный полёт.</p>
          <div className="mt-3 flex justify-center gap-2"><button onClick={restart} className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-black text-white transition hover:bg-white/25"><RotateCcw className="h-3.5 w-3.5" />Заново</button>{!isLastGame && <button onClick={onNext} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-300 px-3 py-2 text-xs font-black text-slate-900 transition hover:bg-amber-200">Дальше<ArrowRight className="h-3.5 w-3.5" /></button>}</div>
        </> : <>
          <p className="text-xs font-black text-white">{config.instruction}</p>
          <p className="mt-1 text-[10px] font-semibold text-sky-100/80">Прочитайте столбик — каждое подтверждение поднимает ракету выше.</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            {safeStage === 0 ? <button onClick={onPrev} className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:bg-white/20"><ArrowLeft className="h-3.5 w-3.5" />Назад</button> : <button onClick={() => setStage(previous => Math.max(0, previous - 1))} className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:bg-white/20"><RotateCcw className="h-3.5 w-3.5" />Повторить</button>}
            <button onClick={moveUp} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-3 py-2 text-xs font-black text-slate-950 shadow-lg transition hover:brightness-110">{safeStage === stages.length - 1 ? 'Готово — в космос!' : 'Взлетаем выше'}<ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
        </>}
      </div>
    </div>
  </section>;
}
