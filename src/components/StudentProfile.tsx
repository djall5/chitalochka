import { AlertTriangle, ArrowLeft, Award, BookOpen, Check, CheckCircle2, CircleDot, Copy, Link2, Plus, Star, Trophy } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { LessonData } from '../types';

export interface LessonAttempt {
  id: string;
  lessonId: string;
  lessonTitle: string;
  points: number;
  completedAt: string;
}

export type LearningProgressStatus = 'working' | 'mastered' | 'focus';
export type LearningProgressCategory = 'letters' | 'syllables' | 'words';

export interface LearningProgressItem {
  value: string;
  status: LearningProgressStatus;
}

export interface StudentLearningProgress {
  letters: LearningProgressItem[];
  syllables: LearningProgressItem[];
  words: LearningProgressItem[];
}

export interface StudentRecord {
  id: string;
  name: string;
  attempts: LessonAttempt[];
  lessons: LessonData[];
  learningProgress?: StudentLearningProgress;
}

type ProgressGame = { stepKey: string; config?: unknown };

const categories: { key: LearningProgressCategory; title: string; singular: string; placeholder: string }[] = [
  { key: 'letters', title: 'Буквы и звуки', singular: 'букву или звук', placeholder: 'Например, Р' },
  { key: 'syllables', title: 'Слоги', singular: 'слог', placeholder: 'Например, РА' },
  { key: 'words', title: 'Слова', singular: 'слово', placeholder: 'Например, ракета' },
];

const statusDetails: Record<LearningProgressStatus, { label: string; className: string; icon: typeof CircleDot }> = {
  working: { label: 'В работе', className: 'border-amber-200 bg-amber-50 text-amber-800', icon: CircleDot },
  mastered: { label: 'Хорошо изучено', className: 'border-emerald-200 bg-emerald-50 text-emerald-800', icon: CheckCircle2 },
  focus: { label: 'Особый упор', className: 'border-rose-200 bg-rose-50 text-rose-800', icon: AlertTriangle },
};

const blankProgress = (): StudentLearningProgress => ({ letters: [], syllables: [], words: [] });

function normalizeValue(category: LearningProgressCategory, value: string) {
  const normalized = value.trim().replace(/\s+/g, ' ');
  return category === 'words' ? normalized.toLowerCase() : normalized.toUpperCase();
}

function normalizeItems(category: LearningProgressCategory, items: unknown): LearningProgressItem[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  return items.reduce<LearningProgressItem[]>((result, item) => {
    const rawValue = typeof item === 'string' ? item : item && typeof item === 'object' && 'value' in item ? String(item.value ?? '') : '';
    const value = normalizeValue(category, rawValue);
    const id = value.toLocaleLowerCase('ru-RU');
    if (!value || seen.has(id)) return result;
    seen.add(id);
    const rawStatus = item && typeof item === 'object' && 'status' in item ? item.status : 'working';
    const status: LearningProgressStatus = rawStatus === 'mastered' || rawStatus === 'focus' ? rawStatus : 'working';
    result.push({ value, status });
    return result;
  }, []);
}

export function normalizeLearningProgress(progress?: Partial<StudentLearningProgress> | null): StudentLearningProgress {
  return {
    letters: normalizeItems('letters', progress?.letters),
    syllables: normalizeItems('syllables', progress?.syllables),
    words: normalizeItems('words', progress?.words),
  };
}

function addLetters(set: Set<string>, source?: string) {
  for (const letter of (source || '').toUpperCase().match(/[А-ЯЁ]/g) || []) set.add(letter);
}

function addWords(set: Set<string>, source?: string) {
  for (const word of (source || '').toLowerCase().match(/[а-яё]+(?:-[а-яё]+)*/gi) || []) {
    if (word.length > 1) set.add(word);
  }
}

function addSyllable(set: Set<string>, source?: string) {
  const syllable = normalizeValue('syllables', source || '');
  if (/^[А-ЯЁ]{2,4}$/.test(syllable)) set.add(syllable);
}

/** Finds the material that is deliberately used in the games of a completed lesson. */
export function collectLessonLearningProgress(lesson: LessonData, games: ProgressGame[] = []): StudentLearningProgress {
  const letters = new Set<string>();
  const syllables = new Set<string>();
  const words = new Set<string>();
  addLetters(letters, lesson.targetLetter);
  const sourceGames: ProgressGame[] = games.length ? games : Object.keys(lesson).filter(key => /^step\d+$/.test(key)).map(stepKey => ({ stepKey }));

  sourceGames.forEach(({ stepKey, config }) => {
    const step = (config || (lesson as unknown as Record<string, unknown>)[stepKey]) as Record<string, unknown> | undefined;
    if (!step) return;
    if (stepKey === 'step1') (Array.isArray(step.palette) ? step.palette : []).forEach(item => addSyllable(syllables, item && typeof item === 'object' && 'syllable' in item ? String(item.syllable ?? '') : ''));
    if (stepKey === 'step2') {
      (Array.isArray(step.syllables) ? step.syllables : []).forEach(item => addSyllable(syllables, String(item ?? '')));
      addLetters(letters, String(step.practiceLetters ?? ''));
    }
    if (stepKey === 'step3' || stepKey === 'step10') {
      const targets = Array.isArray(step.targetLetters) ? step.targetLetters : [step.targetLetter];
      targets.forEach(item => addLetters(letters, String(item ?? '')));
    }
    if (stepKey === 'step5') {
      addLetters(letters, String(step.targetLetter ?? ''));
      (Array.isArray(step.words) ? step.words : []).forEach(item => addWords(words, item && typeof item === 'object' && 'fullWord' in item ? String(item.fullWord ?? '') : ''));
    }
    if (stepKey === 'step6') (Array.isArray(step.cards) ? step.cards : []).forEach(item => addWords(words, item && typeof item === 'object' && 'speakWord' in item ? String(item.speakWord ?? '') : ''));
    if (stepKey === 'step7') {
      addLetters(letters, String(step.practiceLetters ?? ''));
      (Array.isArray(step.pages) ? step.pages : []).forEach(item => addWords(words, item && typeof item === 'object' && 'plainText' in item ? String(item.plainText ?? '') : ''));
    }
    if (stepKey === 'step8') (Array.isArray(step.words) ? step.words : []).forEach(item => addWords(words, String(item ?? '')));
    if (stepKey === 'step9') {
      (Array.isArray(step.pairs) ? step.pairs : []).forEach(item => {
        if (!item || typeof item !== 'object') return;
        const pair = item as Record<string, unknown>;
        if (step.mode === 'word-picture') addWords(words, String(pair.word ?? pair.first ?? ''));
        else [pair.first, pair.second].forEach(value => {
          const text = String(value ?? '');
          if (/^[А-ЯЁ]$/i.test(text)) addLetters(letters, text);
          else addSyllable(syllables, text);
        });
      });
    }
  });

  return { letters: [...letters].map(value => ({ value, status: 'working' })), syllables: [...syllables].map(value => ({ value, status: 'working' })), words: [...words].map(value => ({ value, status: 'working' })) };
}

/** Adds new lesson material without overwriting a status that the teacher has already chosen. */
export function mergeLearningProgress(current: StudentLearningProgress | undefined, incoming: StudentLearningProgress): StudentLearningProgress {
  const previous = normalizeLearningProgress(current);
  return categories.reduce((result, { key }) => {
    const saved = new Map(previous[key].map(item => [item.value.toLocaleLowerCase('ru-RU'), item]));
    incoming[key].forEach(item => {
      const id = item.value.toLocaleLowerCase('ru-RU');
      if (!saved.has(id)) saved.set(id, { ...item, status: 'working' });
    });
    result[key] = [...saved.values()];
    return result;
  }, blankProgress());
}

export function updateLearningProgressStatus(progress: StudentLearningProgress | undefined, category: LearningProgressCategory, value: string, status: LearningProgressStatus) {
  const next = normalizeLearningProgress(progress);
  next[category] = next[category].map(item => item.value === value ? { ...item, status } : item);
  return next;
}

export function addLearningProgressItem(progress: StudentLearningProgress | undefined, category: LearningProgressCategory, value: string) {
  const next = normalizeLearningProgress(progress);
  const normalized = normalizeValue(category, value);
  if (!normalized || next[category].some(item => item.value.toLocaleLowerCase('ru-RU') === normalized.toLocaleLowerCase('ru-RU'))) return next;
  next[category] = [...next[category], { value: normalized, status: 'working' }];
  return next;
}

type Props = {
  studentId: string;
  name: string;
  attempts: LessonAttempt[];
  learningProgress?: StudentLearningProgress;
  onNameChange: (name: string) => void;
  onLearningProgressChange: (progress: StudentLearningProgress) => void;
  onBack: () => void;
  onCreatePortalLink: (studentId: string) => Promise<string>;
};

export function StudentProfile({ studentId, name, attempts, learningProgress, onNameChange, onLearningProgressChange, onBack, onCreatePortalLink }: Props) {
  const totalPoints = attempts.reduce((sum, attempt) => sum + attempt.points, 0);
  const average = attempts.length ? Math.round(totalPoints / attempts.length) : 0;
  const [portalUrl, setPortalUrl] = useState('');
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalMessage, setPortalMessage] = useState('');
  const [newItems, setNewItems] = useState<Record<LearningProgressCategory, string>>({ letters: '', syllables: '', words: '' });
  const progress = normalizeLearningProgress(learningProgress);

  const createPortalLink = async () => {
    setPortalBusy(true);
    setPortalMessage('');
    try {
      const url = await onCreatePortalLink(studentId);
      setPortalUrl(url);
      try { await navigator.clipboard.writeText(url); setPortalMessage('Ссылка создана и скопирована. Передайте её ученику.'); }
      catch { setPortalMessage('Ссылка создана. Скопируйте её из поля ниже.'); }
    } catch (error) { setPortalMessage(error instanceof Error ? error.message : 'Не удалось создать ссылку.'); }
    finally { setPortalBusy(false); }
  };

  const addItem = (category: LearningProgressCategory) => {
    const value = newItems[category];
    if (!value.trim()) return;
    onLearningProgressChange(addLearningProgressItem(progress, category, value));
    setNewItems(current => ({ ...current, [category]: '' }));
  };

  return <div className="w-full max-w-5xl px-1 pb-6">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-pink-600">Профиль ученика</div><h1 className="mt-1 text-2xl font-black text-slate-800 md:text-3xl">Карточка ученика</h1><p className="mt-1 text-xs font-semibold text-slate-500">Результаты и материал для отработки сохраняются в облаке.</p></div><button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-pink-200 bg-white px-3 py-2 text-xs font-black text-pink-700"><ArrowLeft className="h-4 w-4" />К урокам</button></div>
    <section className="rounded-3xl border border-pink-200 bg-white/95 p-5 shadow-xl md:p-7">
      <div className="flex flex-wrap items-center gap-4"><div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-pink-100 to-violet-100 text-4xl">🧒</div><div className="min-w-[200px] flex-1"><label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Имя ученика</label><input value={name} onChange={event => onNameChange(event.target.value)} className="mt-1 w-full max-w-sm rounded-xl border border-pink-200 px-3 py-2 text-lg font-black text-slate-800 outline-none focus:border-pink-500" placeholder="Имя ученика" /></div><div className="rounded-2xl bg-amber-50 px-5 py-3 text-center"><div className="flex items-center justify-center gap-2 text-2xl font-black text-amber-600"><Star className="h-5 w-5 fill-current" />{totalPoints}</div><div className="text-[10px] font-black text-amber-700">баллов всего</div></div></div>
      <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/60 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-sm font-black text-slate-800"><Link2 className="h-4 w-4 text-violet-600" />Кабинет ученика</h2><p className="mt-1 text-xs font-medium text-slate-500">Создайте ссылку, чтобы ученик видел свои занятия и результаты.</p></div><button disabled={portalBusy} onClick={() => void createPortalLink()} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"><Copy className="h-4 w-4" />{portalBusy ? 'Создаём…' : 'Создать ссылку'}</button></div>{portalUrl && <input readOnly value={portalUrl} onFocus={event => event.currentTarget.select()} className="mt-3 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-medium text-slate-600" aria-label="Ссылка кабинета ученика" />}{portalMessage && <p role="status" className="mt-2 flex items-center gap-1 text-xs font-bold text-violet-700">{portalMessage.includes('скопирована') && <Check className="h-3.5 w-3.5" />}{portalMessage}</p>}{portalUrl && <p className="mt-2 text-[10px] font-semibold text-slate-400">Создание новой ссылки отключит предыдущую.</p>}</div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><Stat icon={<BookOpen className="h-5 w-5" />} label="Уроков пройдено" value={attempts.length} /><Stat icon={<Award className="h-5 w-5" />} label="Баллов за урок в среднем" value={average} /><Stat icon={<Trophy className="h-5 w-5" />} label="Лучший результат" value={attempts.length ? Math.max(...attempts.map(attempt => attempt.points)) : 0} /></div>

      <section className="mt-7 rounded-2xl border border-sky-100 bg-sky-50/50 p-4 md:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-base font-black text-slate-800"><BookOpen className="h-4 w-4 text-sky-600" />Материал в работе</h2><p className="mt-1 max-w-2xl text-xs font-medium text-slate-500">После завершения урока буквы, слоги и слова из заданий появляются здесь со статусом «в работе». Статус можно изменить вручную.</p></div><div className="flex flex-wrap gap-1.5 text-[10px] font-black">{(Object.entries(statusDetails) as [LearningProgressStatus, typeof statusDetails.working][]).map(([status, detail]) => <span key={status} className={`rounded-full border px-2 py-1 ${detail.className}`}>{detail.label}</span>)}</div></div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">{categories.map(category => <ProgressGroup key={category.key} category={category} items={progress[category.key]} draftValue={newItems[category.key]} onDraftChange={value => setNewItems(current => ({ ...current, [category.key]: value }))} onAdd={() => addItem(category.key)} onStatusChange={(value, status) => onLearningProgressChange(updateLearningProgressStatus(progress, category.key, value, status))} />)}</div>
      </section>

      <div className="mt-7"><h2 className="mb-3 text-base font-black text-slate-800">История занятий</h2>{attempts.length ? <div className="space-y-2">{[...attempts].reverse().map((attempt, index) => <article key={attempt.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-pink-100 bg-white p-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-pink-50 text-lg">{index === 0 ? '🏅' : '📖'}</div><div className="min-w-0 flex-1"><h3 className="truncate text-xs font-black text-slate-800">{attempt.lessonTitle}</h3><p className="mt-1 text-[10px] font-semibold text-slate-400">{new Date(attempt.completedAt).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })}</p></div><div className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">⭐ {attempt.points} баллов</div></article>)}</div> : <div className="rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50/50 p-8 text-center"><div className="text-3xl">🌱</div><p className="mt-2 text-sm font-black text-slate-700">Пока нет завершённых уроков</p><p className="mt-1 text-xs font-semibold text-slate-500">Когда ученик завершит занятие, здесь появятся его результат и отработанный материал.</p></div>}</div>
    </section>
  </div>;
}

function ProgressGroup({ category, items, draftValue, onDraftChange, onAdd, onStatusChange }: { category: typeof categories[number]; items: LearningProgressItem[]; draftValue: string; onDraftChange: (value: string) => void; onAdd: () => void; onStatusChange: (value: string, status: LearningProgressStatus) => void }) {
  return <article className="rounded-2xl border border-white bg-white/90 p-3 shadow-sm"><h3 className="text-sm font-black text-slate-800">{category.title}</h3><div className="mt-2 space-y-1.5">{items.length ? items.map(item => { const detail = statusDetails[item.status]; const Icon = detail.icon; return <div key={item.value} className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 ${detail.className}`}><span className="min-w-0 flex-1 truncate text-sm font-black">{item.value}</span><Icon className="h-3.5 w-3.5 shrink-0" /><select aria-label={`Статус: ${item.value}`} value={item.status} onChange={event => onStatusChange(item.value, event.target.value as LearningProgressStatus)} className="max-w-[125px] rounded-lg border border-current/20 bg-white/70 px-1.5 py-1 text-[10px] font-black outline-none">{Object.entries(statusDetails).map(([status, option]) => <option key={status} value={status}>{option.label}</option>)}</select></div>; }) : <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs font-medium text-slate-400">Пока нет материала.</p>}</div><div className="mt-3 flex gap-1.5"><input value={draftValue} onChange={event => onDraftChange(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') onAdd(); }} placeholder={category.placeholder} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-semibold outline-none focus:border-sky-400" /><button type="button" onClick={onAdd} title={`Добавить ${category.singular}`} className="grid w-9 place-items-center rounded-xl bg-sky-600 text-white hover:bg-sky-700"><Plus className="h-4 w-4" /></button></div></article>;
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <div className="rounded-2xl bg-violet-50/80 p-4"><div className="flex items-center gap-2 text-violet-600">{icon}<span className="text-[10px] font-bold text-slate-500">{label}</span></div><div className="mt-2 text-2xl font-black text-slate-800">{value}</div></div>;
}
