import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Step13Config } from '../../types';
import { decodeRegionMap, drawColoring, imageFromDataUrl, regionAtEvent } from '../../utils/coloringImage';
import { syllabifyRussian } from '../../utils/syllabifyRussian';

type Props = { config: Step13Config; onPrev: () => void; onNext: () => void; onCorrectAnswer: (id: string) => void };

export function Step13ReadAndColor({ config, onPrev, onNext, onCorrectAnswer }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<Uint8Array | null>(null);
  const [colors, setColors] = useState<Record<number, string>>({});
  const [selectedColor, setSelectedColor] = useState(config.palette[0] || '#ef4444');
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [syllables, setSyllables] = useState(true);
  const [checked, setChecked] = useState(false);
  const [loadError, setLoadError] = useState('');
  const sentences = config.sentences.filter(sentence => sentence.trim());
  const activeRegions = config.regions.filter(region => region.enabled);
  const incorrect = checked ? activeRegions.filter(region => colors[region.id] !== region.targetColor) : [];

  useEffect(() => {
    if (!config.imageDataUrl || !config.regionMapDataUrl || !config.imageWidth || !config.imageHeight) return;
    let cancelled = false;
    void Promise.all([imageFromDataUrl(config.imageDataUrl), decodeRegionMap(config.regionMapDataUrl, config.imageWidth, config.imageHeight)]).then(([image, labels]) => {
      if (cancelled) return;
      labelsRef.current = labels;
      if (canvasRef.current) drawColoring(canvasRef.current, image, labels, colors, config.imageWidth, config.imageHeight, checked ? config.regions.filter(region => region.enabled && colors[region.id] !== region.targetColor).map(region => region.id) : []);
      setLoadError('');
    }).catch(() => { if (!cancelled) setLoadError('Не удалось открыть раскраску.'); });
    return () => { cancelled = true; };
  }, [config.imageDataUrl, config.regionMapDataUrl, config.imageWidth, config.imageHeight, config.regions, colors, checked]);

  const check = () => {
    setChecked(true);
    for (const region of activeRegions) if (region.targetColor && colors[region.id] === region.targetColor) onCorrectAnswer(`read-color-${region.id}`);
  };

  if (!config.imageDataUrl || !config.regionMapDataUrl || !activeRegions.length) return <div className="w-full rounded-2xl bg-amber-50 p-6 text-sm font-bold text-amber-800">Учитель ещё не подготовил раскраску для этой игры.<div className="mt-4 flex justify-between"><button onClick={onPrev}>Назад</button><button onClick={onNext}>Дальше</button></div></div>;

  return <div className="mx-auto w-full max-w-3xl text-center">
    <h2 className="text-xl font-black text-pink-600 md:text-2xl">{config.title}</h2>
    <p className="mt-1 text-sm font-semibold text-slate-600">{config.instruction}</p>
    <div className="mt-4 rounded-2xl border-2 border-pink-200 bg-white p-2 shadow-sm">
      <canvas ref={canvasRef} onClick={event => { const labels = labelsRef.current; if (!labels) return; const id = regionAtEvent(event, labels, config.imageWidth, config.imageHeight); if (!config.regions.some(region => region.id === id && region.enabled)) return; setColors(previous => ({ ...previous, [id]: selectedColor })); setChecked(false); }} className="mx-auto block h-auto max-h-[420px] w-auto max-w-full cursor-crosshair rounded-xl object-contain" style={{ aspectRatio: `${config.imageWidth} / ${config.imageHeight}` }} aria-label="Раскраска: нажмите область, чтобы закрасить выбранным цветом" />
    </div>
    {loadError && <p className="mt-2 text-xs font-bold text-rose-600">{loadError}</p>}
    <div className="mt-4 rounded-2xl bg-violet-50 p-4 text-left">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs font-black text-violet-700"><span>Предложение {Math.min(sentenceIndex + 1, sentences.length)} из {sentences.length}</span><button onClick={() => setSyllables(value => !value)} className="rounded-lg bg-white px-2 py-1">{syllables ? 'Обычный текст' : 'По слогам'}</button></div>
      <p className="min-h-16 text-lg font-black leading-relaxed text-slate-800">{syllables ? syllabifyRussian(sentences[sentenceIndex] || '') : sentences[sentenceIndex]}</p>
      <div className="mt-3 flex justify-between gap-2"><button disabled={sentenceIndex === 0} onClick={() => setSentenceIndex(value => value - 1)} className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-black text-violet-700 disabled:opacity-40"><ArrowLeft className="h-4 w-4" />Назад</button><button disabled={sentenceIndex >= sentences.length - 1} onClick={() => setSentenceIndex(value => value + 1)} className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-black text-violet-700 disabled:opacity-40">Следующее<ArrowRight className="h-4 w-4" /></button></div>
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2" aria-label="Палитра цветов">{config.palette.map((color, index) => <button key={`${color}-${index}`} onClick={() => setSelectedColor(color)} aria-label={`Выбрать цвет ${index + 1}`} className={`h-11 w-11 rounded-full border-2 border-white shadow ${selectedColor === color ? 'ring-4 ring-pink-500 ring-offset-2' : ''}`} style={{ backgroundColor: color }} />)}</div>
    <p className="mt-2 text-xs font-semibold text-slate-500">Выберите цвет и нажмите на часть раскраски.</p>
    <div className="mt-4 flex justify-center"><button onClick={check} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow"><Check className="h-4 w-4" />Проверить</button></div>
    {checked && <p role="status" className={`mt-3 rounded-xl px-4 py-2 text-sm font-bold ${incorrect.length ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{incorrect.length ? `Верно: ${activeRegions.length - incorrect.length} из ${activeRegions.length}. Области с ошибками обведены красным. Исправьте их и проверьте снова.` : 'Отлично! Вся раскраска соответствует тексту.'}</p>}
    <div className="mt-5 flex justify-between gap-2"><button onClick={onPrev} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">Назад к игре</button><button onClick={onNext} className="rounded-xl bg-pink-500 px-4 py-2 text-xs font-black text-white">Дальше по уроку</button></div>
  </div>;
}
