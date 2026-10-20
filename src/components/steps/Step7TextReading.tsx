import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Type } from 'lucide-react';
import { Step7Config } from '../../types';

type Props = { config: Step7Config; onPrev: () => void; onNext: () => void; onCorrectAnswer?: (answerId: string) => void };

export function Step7TextReading({ config, onPrev, onNext, onCorrectAnswer }: Props) {
  const [mode, setMode] = useState<'syllables' | 'plain'>('syllables');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [readPageIds, setReadPageIds] = useState<string[]>([]);
  const pages = config.pages.length ? config.pages : [{ id: 'reading-page-fallback', imageDataUrl: '', plainText: '', syllabifiedText: '' }];
  const page = pages[Math.min(currentPageIndex, pages.length - 1)];
  const isRead = readPageIds.includes(page.id);

  const markRead = () => {
    if (isRead) return;
    setReadPageIds(previous => [...previous, page.id]);
    onCorrectAnswer?.(`read-text-${page.id}`);
  };

  const changePage = (offset: number) => {
    setCurrentPageIndex(index => Math.max(0, Math.min(index + offset, pages.length - 1)));
    setMode('syllables');
  };

  return <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
    <h2 className="text-xl font-black text-pink-600 md:text-2xl">{config.title}</h2>
    <p className="mb-2 mt-1 text-sm font-semibold text-slate-600">{config.instruction}</p>
    {pages.length > 1 && <div className="mb-3 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-black text-violet-700">Страница {currentPageIndex + 1} из {pages.length}</div>}
    <div className="w-full rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-3 md:p-5">
      {page.imageDataUrl ? <img src={page.imageDataUrl} alt={`Иллюстрация к странице ${currentPageIndex + 1}`} className="mx-auto max-h-[280px] w-full max-w-md rounded-2xl border-[3px] border-dashed border-pink-400 bg-white object-cover shadow-md" /> : <div className="mx-auto flex h-48 w-full max-w-md flex-col items-center justify-center rounded-2xl border-2 border-dashed border-pink-200 bg-white text-center"><span className="text-5xl">🖼️</span><span className="mt-2 text-xs font-bold text-slate-400">Учитель добавит иллюстрацию к этому тексту</span></div>}
      <div className="mx-auto mt-4 flex w-fit rounded-xl bg-slate-200 p-1"><button onClick={() => setMode('syllables')} className={`rounded-lg px-3 py-1.5 text-[11px] font-black ${mode === 'syllables' ? 'bg-white text-pink-600 shadow' : 'text-slate-500'}`}>По слогам</button><button onClick={() => setMode('plain')} className={`rounded-lg px-3 py-1.5 text-[11px] font-black ${mode === 'plain' ? 'bg-white text-pink-600 shadow' : 'text-slate-500'}`}>Обычный текст</button></div>
      <div className="mx-auto mt-3 max-w-3xl rounded-2xl border-[3px] border-pink-400 bg-white px-5 py-4 text-left text-xl font-black leading-relaxed text-slate-800 shadow-md md:px-7 md:text-2xl">{mode === 'syllables' ? page.syllabifiedText || page.plainText : page.plainText || page.syllabifiedText}</div>
    </div>
    <div className="mt-4 flex flex-wrap justify-center gap-2"><button onClick={markRead} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black ${isRead ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500 text-white shadow'}`}><Check className="h-4 w-4" />{isRead ? 'Прочитано · +10 баллов' : 'Я прочитал(а) вслух'}</button><button onClick={() => setMode(mode === 'syllables' ? 'plain' : 'syllables')} className="inline-flex items-center gap-2 rounded-xl bg-violet-50 px-4 py-2.5 text-xs font-black text-violet-700"><Type className="h-4 w-4" />{mode === 'syllables' ? 'Прочитать целиком' : 'Читать по слогам'}</button></div>
    {pages.length > 1 && <div className="mt-4 flex w-full justify-between"><button disabled={currentPageIndex === 0} onClick={() => changePage(-1)} className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600 disabled:opacity-40"><ArrowLeft className="h-4 w-4" />Предыдущая страница</button><button disabled={currentPageIndex === pages.length - 1} onClick={() => changePage(1)} className="inline-flex items-center gap-1 rounded-xl bg-violet-500 px-4 py-2 text-xs font-black text-white disabled:opacity-40">Следующая страница<ArrowRight className="h-4 w-4" /></button></div>}
    <div className="mt-4 flex w-full justify-between"><button onClick={onPrev} className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600"><ArrowLeft className="h-4 w-4" />Назад к игре</button>{currentPageIndex === pages.length - 1 && <button onClick={onNext} className="inline-flex items-center gap-1 rounded-xl bg-pink-500 px-4 py-2 text-xs font-black text-white">Дальше по уроку<ArrowRight className="h-4 w-4" /></button>}</div>
  </div>;
}
