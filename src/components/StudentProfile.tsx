import { AlertTriangle, ArrowLeft, Award, BookOpen, Check, CheckCircle2, CircleDot, Copy, Link2, Star, Trophy } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { DEFAULT_GAME_LIBRARY, GameLibraryItem, lessonGameOrder } from '../gameLibrary';
import { LessonData } from '../types';
import { CharacterEditor } from './CharacterEditor';
import type { CharacterImages } from './DesertGame';

export interface LessonAttempt {
  id: string;
  lessonId: string;
  lessonTitle: string;
  points: number;
  completedAt: string;
  source?: 'teacher';
}

export type LearningProgressStatus = 'working' | 'mastered' | 'focus';
export type LearningProgressCategory = 'letters' | 'syllables' | 'words';

export interface LearningProgressItem {
  value: string;
  status: LearningProgressStatus | 'not_started';
  /** Syllables and words are teacher notes, rather than automatically collected material. */
  manual?: boolean;
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
  teacherNotes?: string;
  character?: CharacterImages;
}

type ProgressGame = { stepKey: string; config?: unknown };

const categories: { key: LearningProgressCategory; title: string; singular: string; placeholder: string }[] = [
  { key: 'letters', title: 'Буквы и звуки', singular: 'букву или звук', placeholder: 'Например, Р' },
  { key: 'syllables', title: 'Слоги · вручную', singular: 'слог', placeholder: 'Например, РА' },
  { key: 'words', title: 'Слова · вручную', singular: 'слово', placeholder: 'Например, ракета' },
];

const statusDetails: Record<LearningProgressStatus, { label: string; className: string; icon: typeof CircleDot }> = {
  working: { label: 'В работе', className: 'border-amber-200 bg-amber-50 text-amber-800', icon: CircleDot },
  mastered: { label: 'Хорошо изучено', className: 'border-emerald-200 bg-emerald-50 text-emerald-800', icon: CheckCircle2 },
  focus: { label: 'Особый упор', className: 'border-rose-200 bg-rose-50 text-rose-800', icon: AlertTriangle },
};

const russianAlphabet = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('');
const statusCycle: (LearningProgressStatus | null)[] = [null, 'working', 'mastered', 'focus'];

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
    const status: LearningProgressItem['status'] = rawStatus === 'mastered' || rawStatus === 'focus' || rawStatus === 'not_started' ? rawStatus : 'working';
    const manual = Boolean(item && typeof item === 'object' && 'manual' in item && item.manual);
    result.push({ value, status, ...(manual ? { manual: true } : {}) });
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

/** Finds only the letters that are deliberately practised in the games of a completed lesson. */
export function collectLessonLearningProgress(lesson: LessonData, games: ProgressGame[] = []): StudentLearningProgress {
  const letters = new Set<string>();
  addLetters(letters, lesson.targetLetter);
  const sourceGames: ProgressGame[] = games.length ? games : Object.keys(lesson).filter(key => /^step\d+$/.test(key)).map(stepKey => ({ stepKey }));

  sourceGames.forEach(({ stepKey, config }) => {
    const step = (config || (lesson as unknown as Record<string, unknown>)[stepKey]) as Record<string, unknown> | undefined;
    if (!step) return;
    if (stepKey === 'step2') {
      addLetters(letters, String(step.practiceLetters ?? ''));
    }
    if (stepKey === 'step11') {
      (Array.isArray(step.syllables) ? step.syllables : []).forEach(item => addLetters(letters, String(item ?? '')));
    }
    if (stepKey === 'step3' || stepKey === 'step10') {
      const targets = Array.isArray(step.targetLetters) ? step.targetLetters : [step.targetLetter];
      targets.forEach(item => addLetters(letters, String(item ?? '')));
    }
    if (stepKey === 'step5') addLetters(letters, String(step.targetLetter ?? ''));
    if (stepKey === 'step7') {
      addLetters(letters, String(step.practiceLetters ?? ''));
    }
    if (stepKey === 'step9') {
      (Array.isArray(step.pairs) ? step.pairs : []).forEach(item => {
        if (!item || typeof item !== 'object') return;
        const pair = item as Record<string, unknown>;
        if (step.mode !== 'word-picture') [pair.first, pair.second].forEach(value => {
          const text = String(value ?? '');
          if (/^[А-ЯЁ]$/i.test(text)) addLetters(letters, text);
        });
      });
    }
  });

  return { letters: [...letters].map(value => ({ value, status: 'working' })), syllables: [], words: [] };
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

function setLetterStatus(progress: StudentLearningProgress, letter: string, status: LearningProgressStatus | null) {
  const next = normalizeLearningProgress(progress);
  const existing = next.letters.find(item => item.value === letter);
  const savedStatus = status || 'not_started';
  next.letters = existing ? next.letters.map(item => item.value === letter ? { ...item, status: savedStatus } : item) : [...next.letters, { value: letter, status: savedStatus }];
  return { letters: next.letters, syllables: [], words: [] };
}

export function addLearningProgressItem(progress: StudentLearningProgress | undefined, category: LearningProgressCategory, value: string) {
  const next = normalizeLearningProgress(progress);
  const normalized = normalizeValue(category, value);
  if (!normalized || next[category].some(item => item.value.toLocaleLowerCase('ru-RU') === normalized.toLocaleLowerCase('ru-RU'))) return next;
  next[category] = [...next[category], { value: normalized, status: 'working', manual: true }];
  return next;
}

function learningProgressForLesson(lesson: LessonData, games: GameLibraryItem[]) {
  const lessonGames: ProgressGame[] = lessonGameOrder(lesson).flatMap(id => {
    const sourceId = lesson.gameInstances?.[id]?.sourceGameId || id;
    const game = games.find(item => item.id === sourceId) || DEFAULT_GAME_LIBRARY.find(item => item.id === sourceId);
    return game ? [{ stepKey: game.stepKey, config: lesson.gameInstances?.[id]?.config[game.stepKey] }] : [];
  });
  return collectLessonLearningProgress(lesson, lessonGames);
}

type Props = {
  studentId: string;
  name: string;
  attempts: LessonAttempt[];
  lessons: LessonData[];
  games: GameLibraryItem[];
  learningProgress?: StudentLearningProgress;
  teacherNotes: string;
  saveState: 'saved' | 'saving' | 'error';
  onNameChange: (name: string) => void;
  onLearningProgressChange: (progress: StudentLearningProgress) => void;
  onTeacherNotesChange: (notes: string) => void;
  onBack: () => void;
  onCreatePortalLink: (studentId: string) => Promise<string>;
  character?: CharacterImages;
  onCharacterChange: (character: CharacterImages) => void;
  desertBalance: number | null;
  onAwardPoints: (points: number) => Promise<void>;
  onOpenDesert: () => void;
};

export function StudentProfile({ studentId, name, attempts, lessons, games, learningProgress, teacherNotes, saveState, character, onCharacterChange, desertBalance, onAwardPoints, onOpenDesert, onNameChange, onLearningProgressChange, onTeacherNotesChange, onBack, onCreatePortalLink }: Props) {
  const totalPoints = attempts.reduce((sum, attempt) => sum + attempt.points, 0);
  const lessonAttempts = attempts.filter(attempt => attempt.source !== 'teacher');
  const lessonPoints = lessonAttempts.reduce((sum, attempt) => sum + attempt.points, 0);
  const average = lessonAttempts.length ? Math.round(lessonPoints / lessonAttempts.length) : 0;
  const [awardAmount, setAwardAmount] = useState('');
  const [awardBusy, setAwardBusy] = useState(false);
  const [awardMessage, setAwardMessage] = useState('');
  const [portalUrl, setPortalUrl] = useState('');
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalMessage, setPortalMessage] = useState('');
  const [profileTab, setProfileTab] = useState<'letters' | 'notes'>('letters');
  const storedProgress = normalizeLearningProgress(learningProgress);
  const lettersOnlyProgress = { letters: storedProgress.letters, syllables: [], words: [] };
  const completedLessonIds = new Set(attempts.map(attempt => attempt.lessonId));
  const historicalProgress = lessons.reduce((result, lesson) => completedLessonIds.has(lesson.id) ? mergeLearningProgress(result, learningProgressForLesson(lesson, games)) : result, blankProgress());
  const progress = mergeLearningProgress(lettersOnlyProgress, historicalProgress);

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

  const awardPoints = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const points = Number(awardAmount);
    if (!Number.isInteger(points) || points < 1 || points > 5000) {
      setAwardMessage('Введите целое число от 1 до 5000.');
      return;
    }
    setAwardBusy(true);
    setAwardMessage('');
    try {
      await onAwardPoints(points);
      setAwardAmount('');
      setAwardMessage(`Начислено ${points} баллов.`);
    } catch (error) { setAwardMessage(error instanceof Error ? error.message : 'Не удалось начислить баллы.'); }
    finally { setAwardBusy(false); }
  };

  const cycleLetterStatus = (letter: string) => {
    const storedStatus = progress.letters.find(item => item.value === letter)?.status;
    const currentStatus = storedStatus === 'not_started' ? null : storedStatus || null;
    const nextStatus = statusCycle[(statusCycle.indexOf(currentStatus) + 1) % statusCycle.length];
    onLearningProgressChange(setLetterStatus(progress, letter, nextStatus));
  };

  return <div className="w-full max-w-5xl px-1 pb-6">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-pink-600">Профиль ученика</div><h1 className="mt-1 text-2xl font-black text-slate-800 md:text-3xl">Карточка ученика</h1><p className={`mt-1 text-xs font-semibold ${saveState === 'error' ? 'text-rose-600' : 'text-slate-500'}`} role="status">{saveState === 'saved' ? 'Изменения сохранены в облаке' : saveState === 'saving' ? 'Сохраняем изменения…' : 'Не удалось сохранить. Повторяем попытку…'}</p></div><button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-pink-200 bg-white px-3 py-2 text-xs font-black text-pink-700"><ArrowLeft className="h-4 w-4" />К урокам</button></div>
    <section className="rounded-3xl border border-pink-200 bg-white/95 p-5 shadow-xl md:p-7">
      <div className="flex flex-wrap items-center gap-4"><div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-pink-100 to-violet-100 text-4xl">🧒</div><div className="min-w-[200px] flex-1"><label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Имя ученика</label><input value={name} onChange={event => onNameChange(event.target.value)} className="mt-1 w-full max-w-sm rounded-xl border border-pink-200 px-3 py-2 text-lg font-black text-slate-800 outline-none focus:border-pink-500" placeholder="Имя ученика" /></div><div className="rounded-2xl bg-amber-50 px-5 py-3 text-center"><div className="flex items-center justify-center gap-2 text-2xl font-black text-amber-600"><Star className="h-5 w-5 fill-current" />{totalPoints}</div><div className="text-[10px] font-black text-amber-700">баллов всего</div></div></div>
      <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/60 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-sm font-black text-slate-800"><Link2 className="h-4 w-4 text-violet-600" />Кабинет ученика</h2><p className="mt-1 text-xs font-medium text-slate-500">Создайте ссылку, чтобы ученик видел свои занятия и результаты.</p></div><button disabled={portalBusy} onClick={() => void createPortalLink()} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"><Copy className="h-4 w-4" />{portalBusy ? 'Создаём…' : 'Создать ссылку'}</button></div>{portalUrl && <input readOnly value={portalUrl} onFocus={event => event.currentTarget.select()} className="mt-3 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-medium text-slate-600" aria-label="Ссылка кабинета ученика" />}{portalMessage && <p role="status" className="mt-2 flex items-center gap-1 text-xs font-bold text-violet-700">{portalMessage.includes('скопирована') && <Check className="h-3.5 w-3.5" />}{portalMessage}</p>}{portalUrl && <p className="mt-2 text-[10px] font-semibold text-slate-400">Создание новой ссылки отключит предыдущую.</p>}</div>
      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-black text-emerald-900">🌍 Пустыня {name}</h2><p className="mt-1 text-xs font-bold text-emerald-800">Доступно для покупок: ⭐ {desertBalance === null ? 'загружаем…' : desertBalance}</p></div><button onClick={onOpenDesert} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white">Открыть пустыню</button></div></div>
      <form noValidate onSubmit={event => void awardPoints(event)} className="mt-3 flex flex-wrap items-end gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="min-w-[180px] flex-1"><label htmlFor="teacher-award-points" className="text-xs font-black text-amber-900">Добавить баллы ученику</label><p className="mt-1 text-[11px] font-medium text-amber-800">Баллы сразу пополнят его запас для пустыни.</p></div><input id="teacher-award-points" type="number" min="1" max="5000" step="1" value={awardAmount} onChange={event => setAwardAmount(event.target.value)} placeholder="Например, 50" className="w-32 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-amber-500" /><button type="submit" disabled={awardBusy} className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-amber-950 disabled:opacity-50">{awardBusy ? 'Начисляем…' : 'Начислить'}</button>{awardMessage && <p role="status" className="w-full text-xs font-bold text-amber-900">{awardMessage}</p>}</form>
      <CharacterEditor character={character} onChange={onCharacterChange} />
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><Stat icon={<BookOpen className="h-5 w-5" />} label="Уроков пройдено" value={lessonAttempts.length} /><Stat icon={<Award className="h-5 w-5" />} label="Баллов за урок в среднем" value={average} /><Stat icon={<Trophy className="h-5 w-5" />} label="Лучший результат" value={lessonAttempts.length ? Math.max(...lessonAttempts.map(attempt => attempt.points)) : 0} /></div>

      <section className="mt-7 rounded-2xl border border-sky-100 bg-sky-50/50 p-4 md:p-5">
        <div className="inline-flex rounded-xl border border-sky-100 bg-white p-1 text-xs font-black">
          <button type="button" onClick={() => setProfileTab('letters')} className={`rounded-lg px-3 py-2 transition ${profileTab === 'letters' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 hover:bg-sky-50'}`}>Буквы</button>
          <button type="button" onClick={() => setProfileTab('notes')} className={`rounded-lg px-3 py-2 transition ${profileTab === 'notes' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 hover:bg-sky-50'}`}>Заметки учителя</button>
        </div>
        {profileTab === 'letters' ? <><div className="mt-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-base font-black text-slate-800"><BookOpen className="h-4 w-4 text-sky-600" />Прогресс по буквам</h2><p className="mt-1 max-w-2xl text-xs font-medium text-slate-500">Серые буквы ещё не взяты в работу. После завершения урока его буква становится жёлтой. Нажимайте на букву, чтобы изменить её статус.</p></div><div className="flex flex-wrap gap-1.5 text-[10px] font-black"><span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-slate-500">Не в работе</span>{(Object.entries(statusDetails) as [LearningProgressStatus, typeof statusDetails.working][]).map(([status, detail]) => <span key={status} className={`rounded-full border px-2 py-1 ${detail.className}`}>{detail.label}</span>)}</div></div>
          <div className="mt-5 grid grid-cols-6 gap-2 sm:grid-cols-9 md:grid-cols-11">{russianAlphabet.map(letter => { const status = progress.letters.find(item => item.value === letter)?.status; const detail = status && status !== 'not_started' ? statusDetails[status] : null; const label = detail?.label || 'Не в работе'; return <button key={letter} type="button" onClick={() => cycleLetterStatus(letter)} title={`${letter}: ${label}. Нажмите, чтобы изменить.`} aria-label={`${letter}: ${label}. Нажмите, чтобы изменить.`} className={`aspect-square rounded-xl border text-lg font-black shadow-sm transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-300 ${detail ? detail.className : 'border-slate-200 bg-slate-100 text-slate-400'}`}>{letter}</button>; })}</div>
        </> : <div className="mt-4 rounded-2xl border border-violet-100 bg-white p-4"><h2 className="flex items-center gap-2 text-base font-black text-slate-800"><BookOpen className="h-4 w-4 text-violet-600" />Заметки учителя</h2><p className="mt-1 text-xs font-medium text-slate-500">Запишите слоги, слова и задачи, которые нужно взять в работу с учеником.</p><textarea value={teacherNotes} onChange={event => onTeacherNotesChange(event.target.value)} rows={8} placeholder={'Например:\n• Слоги: ША, ШО, ШУ\n• Слова: шапка, машина\n• Отработать звук [Ш] в начале слова'} className="mt-4 w-full resize-y rounded-xl border border-violet-200 bg-violet-50/30 px-3 py-3 text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-500" aria-label="Заметки учителя" /><p className="mt-2 text-[10px] font-semibold text-slate-400">Состояние сохранения показано вверху карточки.</p></div>}
      </section>

      <div className="mt-7"><h2 className="mb-3 text-base font-black text-slate-800">История баллов</h2>{attempts.length ? <div className="space-y-2">{[...attempts].reverse().map((attempt, index) => <article key={attempt.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-pink-100 bg-white p-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-pink-50 text-lg">{attempt.source === 'teacher' ? '⭐' : index === 0 ? '🏅' : '📖'}</div><div className="min-w-0 flex-1"><h3 className="truncate text-xs font-black text-slate-800">{attempt.lessonTitle}</h3><p className="mt-1 text-[10px] font-semibold text-slate-400">{new Date(attempt.completedAt).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })}</p></div><div className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">⭐ {attempt.points} баллов</div></article>)}</div> : <div className="rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50/50 p-8 text-center"><div className="text-3xl">🌱</div><p className="mt-2 text-sm font-black text-slate-700">Пока нет начислений</p><p className="mt-1 text-xs font-semibold text-slate-500">Баллы появятся после урока или начисления учителем.</p></div>}</div>
    </section>
  </div>;
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <div className="rounded-2xl bg-violet-50/80 p-4"><div className="flex items-center gap-2 text-violet-600">{icon}<span className="text-[10px] font-bold text-slate-500">{label}</span></div><div className="mt-2 text-2xl font-black text-slate-800">{value}</div></div>;
}
