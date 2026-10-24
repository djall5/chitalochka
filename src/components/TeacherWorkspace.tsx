import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, ChevronDown, ChevronUp, CopyPlus, Gamepad2, Library, Pencil, Play, Plus, Search, Trash2, Upload, UserRound, WandSparkles, X } from 'lucide-react';
import { LessonData, MemoryPair, ReadingTextPage } from '../types';
import { cloneLesson, GameLibraryItem, GameStepKey, lessonGameOrder } from '../gameLibrary';
import { applyLetterToSelectedGames, isRussianLetter } from '../letterLesson';
import { syllabifyRussian } from '../utils/syllabifyRussian';

type Props = {
  lessons: LessonData[];
  games: GameLibraryItem[];
  onNewLesson: (preselectedGameId?: string) => void;
  onOpenLesson: (lesson: LessonData, mode: 'play' | 'edit') => void;
  onDeleteLesson: (id: string) => void;
  onCreateGame: (game: GameLibraryItem) => void;
  onOpenStudent: () => void;
  studentName: string;
  onSwitchStudent: () => void;
};

const panel = 'bg-white/90 backdrop-blur-md rounded-3xl border border-pink-200 shadow-xl';
const pinkButton = 'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2.5 text-xs font-black text-white shadow-md transition hover:brightness-105 active:scale-[.98]';
const lightButton = 'inline-flex items-center justify-center gap-2 rounded-xl border border-pink-200 bg-pink-50 px-3 py-2 text-xs font-black text-pink-700 transition hover:bg-pink-100';

export function TeacherWorkspace({ lessons, games, onNewLesson, onOpenLesson, onDeleteLesson, onCreateGame, onOpenStudent, studentName, onSwitchStudent }: Props) {
  const [tab, setTab] = useState<'lessons' | 'games'>('lessons');
  const [query, setQuery] = useState('');
  const [showNewGame, setShowNewGame] = useState(false);
  const filteredGames = useMemo(() => games.filter(game => `${game.title} ${game.description} ${game.category}`.toLowerCase().includes(query.toLowerCase())), [games, query]);
  const filteredLessons = useMemo(() => lessons.filter(item => `${item.title} ${item.subtitle}`.toLowerCase().includes(query.toLowerCase())), [lessons, query]);

  return (
    <div className="w-full max-w-6xl px-1 pb-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-pink-600">Пространство учителя</div>
          <h1 className="mt-1 text-2xl font-black text-slate-800 md:text-3xl">Соберите урок из любимых игр</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">Выбирайте задания, меняйте их порядок и сохраняйте свои занятия.</p>
        </div>
        <div className="flex flex-wrap gap-2"><button className={lightButton} onClick={onSwitchStudent}><UserRound className="h-4 w-4" />{studentName} · сменить</button><button className={lightButton} onClick={onOpenStudent}><UserRound className="h-4 w-4" />Карточка ученика</button><button className={pinkButton} onClick={() => tab === 'lessons' ? onNewLesson() : setShowNewGame(true)}>
          <Plus className="h-4 w-4" />{tab === 'lessons' ? 'Создать урок' : 'Добавить игру'}
        </button></div>
      </div>

      <div className={`${panel} p-3 md:p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pink-100 pb-3">
          <div className="flex gap-2">
            <button onClick={() => { setTab('lessons'); setQuery(''); }} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${tab === 'lessons' ? 'bg-pink-500 text-white shadow' : 'bg-slate-50 text-slate-600 hover:bg-pink-50'}`}><BookOpen className="h-4 w-4" />Библиотека уроков <span className="rounded-full bg-white/25 px-2 py-0.5">{lessons.length}</span></button>
            <button onClick={() => { setTab('games'); setQuery(''); }} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${tab === 'games' ? 'bg-pink-500 text-white shadow' : 'bg-slate-50 text-slate-600 hover:bg-pink-50'}`}><Gamepad2 className="h-4 w-4" />Библиотека игр <span className="rounded-full bg-white/25 px-2 py-0.5">{games.length}</span></button>
          </div>
          <label className="flex min-w-[210px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-400"><Search className="h-4 w-4" /><input value={query} onChange={event => setQuery(event.target.value)} className="w-full bg-transparent text-xs font-semibold text-slate-700 outline-none" placeholder={tab === 'lessons' ? 'Найти урок…' : 'Найти игру…'} /></label>
        </div>

        {tab === 'lessons' ? (
          filteredLessons.length ? <div className="grid gap-3 pt-4 sm:grid-cols-2 xl:grid-cols-3">{filteredLessons.map(item => {
            const order = lessonGameOrder(item);
            const lessonGames = order.map(id => games.find(game => game.id === id)).filter(Boolean) as GameLibraryItem[];
            return <article key={item.id} className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-pink-50 text-2xl">📖</div><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-600">{item.targetLetter ? `Буква ${item.targetLetter}` : 'Чтение'}</span></div>
              <h2 className="mt-3 line-clamp-2 text-base font-black text-slate-800">{item.title}</h2><p className="mt-1 line-clamp-2 min-h-8 text-[11px] font-semibold leading-relaxed text-slate-500">{item.subtitle || 'Урок грамоты и чтения'}</p>
              <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-slate-400"><Library className="h-3.5 w-3.5" />{order.length} игр</div>
              <div className="mt-3 flex flex-wrap gap-1.5">{lessonGames.slice(0, 4).map((game, i) => <span key={`${game.id}-${i}`} title={game.title} className="rounded-lg bg-pink-50 px-2 py-1 text-[10px] font-bold text-pink-700">{game.emoji} {game.title}</span>)}{lessonGames.length > 4 && <span className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">+{lessonGames.length - 4}</span>}</div>
              <div className="mt-4 flex gap-2"><button className={`${pinkButton} flex-1`} onClick={() => onOpenLesson(item, 'play')}><Play className="h-3.5 w-3.5 fill-current" />Играть</button><button className={lightButton} title="Изменить игры и содержание" onClick={() => onOpenLesson(item, 'edit')}><Pencil className="h-3.5 w-3.5" /></button><button className="rounded-xl bg-slate-50 px-3 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="Удалить урок" onClick={() => onDeleteLesson(item.id)}><Trash2 className="h-3.5 w-3.5" /></button></div>
            </article>;
          })}</div> : <EmptyState icon="📚" title={query ? 'Ничего не найдено' : 'Пока нет уроков'} text={query ? 'Попробуйте изменить запрос.' : 'Создайте урок и добавьте в него игры из библиотеки.'} action={!query ? <button className={pinkButton} onClick={() => onNewLesson()}><Plus className="h-4 w-4" />Создать первый урок</button> : undefined} />
        ) : (
          filteredGames.length ? <div className="grid gap-3 pt-4 sm:grid-cols-2 xl:grid-cols-3">{filteredGames.map(game => <article key={game.id} className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-pink-50 text-2xl">{game.emoji}</div><span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black text-sky-700">{game.category}</span></div><h2 className="mt-3 text-base font-black text-slate-800">{game.title}</h2><p className="mt-1 min-h-10 text-[11px] font-semibold leading-relaxed text-slate-500">{game.description}</p><div className="mt-3 flex items-center justify-between"><span className="text-[10px] font-bold text-slate-400">Механика: {game.stepKey.replace('step', 'игра ')}</span>{game.custom && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700">Ваша игра</span>}</div><button className={`${lightButton} mt-4 w-full`} onClick={() => onNewLesson(game.id)}><CopyPlus className="h-3.5 w-3.5" />Использовать в уроке</button></article>)}</div> : <EmptyState icon="🎮" title="Игр не найдено" text="Измените запрос или добавьте новую игру." />
        )}
      </div>

      {showNewGame && <NewGameModal games={games} onClose={() => setShowNewGame(false)} onCreate={game => { onCreateGame(game); setShowNewGame(false); setQuery(''); }} />}
    </div>
  );
}

function EmptyState({ icon, title, text, action }: { icon: string; title: string; text: string; action?: React.ReactNode }) {
  return <div className="flex min-h-64 flex-col items-center justify-center py-10 text-center"><div className="text-4xl">{icon}</div><h2 className="mt-3 text-lg font-black text-slate-700">{title}</h2><p className="mt-1 max-w-sm text-xs font-semibold text-slate-500">{text}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

function NewGameModal({ games, onClose, onCreate }: { games: GameLibraryItem[]; onClose: () => void; onCreate: (game: GameLibraryItem) => void }) {
  const [title, setTitle] = useState('Моя игра');
  const [description, setDescription] = useState('Новое задание для урока чтения.');
  const [stepKey, setStepKey] = useState<GameStepKey>('step6');
  const template = games.find(game => game.stepKey === stepKey) || games[0];
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div className="w-full max-w-lg rounded-3xl border-2 border-pink-200 bg-white p-5 shadow-2xl"><div className="flex items-start justify-between"><div><div className="text-[10px] font-black uppercase tracking-widest text-pink-600">Библиотека игр</div><h2 className="mt-1 text-xl font-black">Добавить свою игру</h2></div><button className="rounded-xl bg-slate-100 p-2 text-slate-500" onClick={onClose}><X className="h-4 w-4" /></button></div><p className="mt-2 text-xs leading-relaxed text-slate-500">Создайте карточку на основе готовой механики. Позже её можно будет выбрать в любом уроке и настроить содержимое.</p><label className="mt-4 block text-[11px] font-black text-slate-600">Название игры<input value={title} onChange={event => setTitle(event.target.value)} className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-pink-500" /></label><label className="mt-3 block text-[11px] font-black text-slate-600">Описание для учителя<textarea value={description} onChange={event => setDescription(event.target.value)} rows={3} className="mt-1 w-full resize-none rounded-xl border border-pink-200 px-3 py-2.5 text-xs font-semibold outline-none focus:border-pink-500" /></label><label className="mt-3 block text-[11px] font-black text-slate-600">Игровая механика<select value={stepKey} onChange={event => setStepKey(event.target.value as GameStepKey)} className="mt-1 w-full rounded-xl border border-pink-200 bg-white px-3 py-2.5 text-xs font-bold outline-none">{games.filter((game, index, list) => list.findIndex(candidate => candidate.stepKey === game.stepKey) === index).map(game => <option key={game.stepKey} value={game.stepKey}>{game.emoji} {game.title}</option>)}</select></label><div className="mt-5 flex justify-end gap-2"><button className={lightButton} onClick={onClose}>Отмена</button><button className={pinkButton} disabled={!title.trim()} onClick={() => onCreate({ id: `custom-${crypto.randomUUID()}`, title: title.trim(), emoji: template?.emoji || '🎮', category: template?.category || 'Своя игра', description: description.trim(), stepKey, custom: true })}><Plus className="h-4 w-4" />Добавить в библиотеку</button></div></div></div>;
}

type BuilderProps = {
  initialLesson: LessonData;
  games: GameLibraryItem[];
  isEditing?: boolean;
  onBack: () => void;
  onSave: (lesson: LessonData, play: boolean) => void;
};

export function LessonBuilder({ initialLesson, games, isEditing = false, onBack, onSave }: BuilderProps) {
  const [data, setData] = useState<LessonData>(() => cloneLesson(initialLesson));
  const [generatedLetter, setGeneratedLetter] = useState(() => initialLesson.targetLetter || '');
  const [filter, setFilter] = useState('Все');
  const [error, setError] = useState('');
  const [editingGame, setEditingGame] = useState<GameLibraryItem | null>(null);
  const [editorSnapshot, setEditorSnapshot] = useState<LessonData | null>(null);
  const selectedGames = (data.gameOrder || []).map(id => games.find(game => game.id === id)).filter(Boolean) as GameLibraryItem[];
  const categories = ['Все', ...Array.from(new Set(games.map(game => game.category)))];
  const filteredGames = games.filter(game => filter === 'Все' || game.category === filter);
  const addGame = (game: GameLibraryItem) => {
    if (selectedGames.some(item => item.stepKey === game.stepKey)) return;
    const activeLetter = generatedLetter || (isRussianLetter(data.targetLetter || '') ? data.targetLetter || '' : '');
    setData(previous => {
      const next = { ...previous, gameOrder: [...(previous.gameOrder || []), game.id] };
      if (game.custom) {
        Object.assign(next, { [game.stepKey]: { ...next[game.stepKey], title: `${game.emoji} ${game.title}`, instruction: game.description } });
      }
      return activeLetter ? applyLetterToSelectedGames(next, [game.stepKey], activeLetter) : next;
    });
    if (activeLetter) setGeneratedLetter(activeLetter);
    setError('');
  };
  const moveGame = (index: number, offset: number) => setData(previous => {
    const order = [...(previous.gameOrder || [])];
    const target = index + offset;
    if (target < 0 || target >= order.length) return previous;
    [order[index], order[target]] = [order[target], order[index]];
    return { ...previous, gameOrder: order };
  });
  const removeGame = (id: string) => setData(previous => ({ ...previous, gameOrder: (previous.gameOrder || []).filter(item => item !== id) }));
  const updateTargetLetter = (value: string) => {
    const letter = value.toLocaleUpperCase('ru-RU').slice(-1);
    setData(previous => ({ ...previous, targetLetter: letter }));
    if (!isRussianLetter(letter) || !selectedGames.length) return;
    if (!generatedLetter) {
      const keys = selectedGames.map(game => game.stepKey);
      setData(previous => applyLetterToSelectedGames(previous, keys, letter));
      setGeneratedLetter(letter);
    }
  };
  const refreshSelectedGames = () => {
    const letter = data.targetLetter || '';
    if (!isRussianLetter(letter) || !selectedGames.length) return;
    if (!window.confirm('Обновить выбранные упражнения для новой буквы? Ручные изменения в этих упражнениях будут заменены.')) return;
    setData(previous => applyLetterToSelectedGames(previous, selectedGames.map(game => game.stepKey), letter));
    setGeneratedLetter(letter);
  };
  const save = (play: boolean) => {
    if (!data.gameOrder?.length) { setError('Добавьте в урок хотя бы одну игру.'); return; }
    onSave(cloneLesson(data), play);
  };

  if (editingGame) {
    return <GameContentEditor game={editingGame} lesson={data} onChange={setData} onSave={() => { setEditingGame(null); setEditorSnapshot(null); }} onCancel={() => { if (editorSnapshot) setData(editorSnapshot); setEditingGame(null); setEditorSnapshot(null); }} />;
  }

  return <div className="w-full max-w-6xl px-1 pb-6">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-pink-600">{isEditing ? 'Редактирование урока' : 'Новый урок'}</div><h1 className="mt-1 text-2xl font-black text-slate-800 md:text-3xl">Конструктор занятия</h1><p className="mt-1 text-xs font-semibold text-slate-500">Добавляйте игры по одной, меняйте набор и порядок заданий.</p></div><button className={lightButton} onClick={onBack}>← К библиотеке уроков</button></div>
    <div className="grid items-start gap-4 lg:grid-cols-[.92fr_1.08fr]">
      <section className={`${panel} p-4 md:p-5`}><h2 className="mb-4 flex items-center gap-2 text-base font-black"><span className="grid h-7 w-7 place-items-center rounded-lg bg-pink-500 text-xs text-white">1</span>Параметры урока</h2><label className="mb-3 block text-[11px] font-black text-slate-600">Название<input value={data.title} onChange={event => setData({ ...data, title: event.target.value })} className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-pink-500" placeholder="Например, Путешествие к букве Ё" /></label><label className="mb-3 block text-[11px] font-black text-slate-600">Описание<textarea value={data.subtitle} onChange={event => setData({ ...data, subtitle: event.target.value })} rows={2} className="mt-1 w-full resize-none rounded-xl border border-pink-200 px-3 py-2.5 text-xs font-semibold outline-none focus:border-pink-500" placeholder="Тема и цель занятия" /></label><div className="mb-5 rounded-2xl bg-pink-50/70 p-3"><div className="flex flex-wrap items-center gap-3"><label className="text-[11px] font-black text-slate-600">Изучаемая буква<input value={data.targetLetter || ''} maxLength={1} onChange={event => updateTargetLetter(event.target.value)} className="ml-2 w-16 rounded-xl border border-pink-200 bg-white px-3 py-2 text-center text-sm font-black outline-none focus:border-pink-500" /></label><button type="button" className={lightButton} disabled={!isRussianLetter(data.targetLetter || '') || !selectedGames.length} onClick={refreshSelectedGames}>Обновить {selectedGames.length || ''} упражнений</button></div><p className="mt-2 text-[10px] font-semibold text-slate-500">Первая введённая буква сразу заполнит выбранные игры. Позже кнопку можно использовать для новой буквы: сайт спросит перед заменой ручных правок.</p></div><h2 className="mb-3 flex items-center justify-between text-base font-black"><span className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-pink-500 text-xs text-white">2</span>Добавьте игры</span><span className="rounded-full bg-pink-50 px-2.5 py-1 text-[10px] font-black text-pink-700">{games.length} в библиотеке</span></h2><div className="mb-3 flex flex-wrap gap-1.5">{categories.map(category => <button key={category} onClick={() => setFilter(category)} className={`rounded-full px-2.5 py-1 text-[10px] font-black ${filter === category ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-pink-50'}`}>{category}</button>)}</div><div className="max-h-[370px] space-y-2 overflow-auto pr-1">{filteredGames.map(game => { const added = selectedGames.some(item => item.stepKey === game.stepKey); return <div key={game.id} className="flex items-center gap-3 rounded-2xl border border-pink-100 bg-white p-2.5"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pink-50 text-xl">{game.emoji}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-black text-slate-800">{game.title}</div><div className="truncate text-[10px] font-semibold text-slate-400">{game.category} · {game.description}</div></div><button disabled={added} onClick={() => addGame(game)} className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl font-black ${added ? 'bg-emerald-50 text-emerald-600' : 'bg-pink-50 text-pink-600 hover:bg-pink-100'}`} title={added ? 'Уже добавлена' : 'Добавить игру'}>{added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</button></div>; })}</div></section>
      <section className={`${panel} p-4 md:p-5`}><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-black"><span className="grid h-7 w-7 place-items-center rounded-lg bg-purple-600 text-xs text-white">3</span>Порядок урока</h2><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700">{selectedGames.length} игр</span></div>{selectedGames.length ? <div className="space-y-2">{selectedGames.map((game, index) => <div key={game.id} className="flex items-center gap-3 rounded-2xl border border-pink-100 bg-white p-3"><div className="text-sm font-black text-slate-300">{String(index + 1).padStart(2, '0')}</div><div className="grid h-10 w-10 place-items-center rounded-xl bg-pink-50 text-xl">{game.emoji}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-black text-slate-800">{game.title}</div><div className="text-[10px] font-semibold text-slate-400">{game.category}</div></div><div className="flex gap-1"><button onClick={() => { setEditorSnapshot(cloneLesson(data)); setEditingGame(game); }} className="rounded-lg bg-pink-50 p-2 text-pink-600 hover:bg-pink-100" title="Редактировать игру в этом уроке"><Pencil className="h-3.5 w-3.5" /></button><button disabled={index === 0} onClick={() => moveGame(index, -1)} className="rounded-lg bg-slate-50 p-2 text-slate-500 disabled:opacity-30" title="Выше"><ChevronUp className="h-3.5 w-3.5" /></button><button disabled={index === selectedGames.length - 1} onClick={() => moveGame(index, 1)} className="rounded-lg bg-slate-50 p-2 text-slate-500 disabled:opacity-30" title="Ниже"><ChevronDown className="h-3.5 w-3.5" /></button><button onClick={() => removeGame(game.id)} className="rounded-lg bg-rose-50 p-2 text-rose-500" title="Убрать из урока"><X className="h-3.5 w-3.5" /></button></div></div>)}</div> : <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50/40 px-6 text-center"><WandSparkles className="h-8 w-8 text-pink-400" /><p className="mt-2 text-sm font-black text-slate-600">Пока пусто</p><p className="mt-1 text-[11px] font-semibold text-slate-400">Нажмите «+» у игр слева, чтобы добавить их в урок.</p></div>}
        <div className="mt-4 rounded-2xl bg-gradient-to-r from-pink-50 to-violet-50 p-3 text-[10px] font-semibold leading-relaxed text-slate-500">Нажмите карандаш у добавленной игры, чтобы сразу изменить её задания, тексты и карточки. Настройки сохранятся только в этом уроке.</div>{error && <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-600">{error}</div>}<div className="mt-4 flex flex-wrap justify-end gap-2"><button className={lightButton} onClick={() => save(false)}><Check className="h-3.5 w-3.5" />Сохранить урок</button><button className={pinkButton} onClick={() => save(true)}><Play className="h-3.5 w-3.5 fill-current" />Сохранить и играть</button></div>
      </section>
    </div>
  </div>;
}

type GameContentEditorProps = {
  game: GameLibraryItem;
  lesson: LessonData;
  onChange: React.Dispatch<React.SetStateAction<LessonData>>;
  onSave: () => void;
  onCancel: () => void;
};

function GameContentEditor({ game, lesson, onChange, onSave, onCancel }: GameContentEditorProps) {
  const [imageError, setImageError] = useState('');
  const [activeTextPageId, setActiveTextPageId] = useState(() => lesson.step7.pages[0]?.id || '');
  const stepKey = game.stepKey;
  const activeTextPage = lesson.step7.pages.find(page => page.id === activeTextPageId) || lesson.step7.pages[0];
  const updateConfig = (patch: Record<string, unknown>) => onChange(previous => {
    const next = cloneLesson(previous);
    Object.assign(next, { [stepKey]: { ...next[stepKey], ...patch } });
    return next;
  });
  const updateWord = (index: number, patch: Record<string, string>) => {
    const words = lesson.step5.words.map((word, wordIndex) => wordIndex === index ? { ...word, ...patch } : word);
    updateConfig({ words });
  };
  const updateCard = (index: number, patch: Record<string, string>) => {
    const cards = lesson.step6.cards.map((card, cardIndex) => cardIndex === index ? { ...card, ...patch } : card);
    updateConfig({ cards });
  };
  const updateTextPage = (pageId: string, patch: Partial<ReadingTextPage>) => {
    updateConfig({ pages: lesson.step7.pages.map(page => page.id === pageId ? { ...page, ...patch } : page) });
  };
  useEffect(() => {
    if (stepKey !== 'step7' || !activeTextPage) return;
    const generated = syllabifyRussian(activeTextPage.plainText);
    if (generated !== activeTextPage.syllabifiedText) updateTextPage(activeTextPage.id, { syllabifiedText: generated });
  }, [stepKey, activeTextPage?.id, activeTextPage?.plainText]);
  useEffect(() => {
    if (!lesson.step7.pages.some(page => page.id === activeTextPageId)) setActiveTextPageId(lesson.step7.pages[0]?.id || '');
  }, [lesson.step7.pages, activeTextPageId]);
  const inputClass = 'mt-1 w-full rounded-xl border border-pink-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-pink-500';
  const handleImageUpload = async (pageId: string, file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setImageError('Выберите файл изображения.'); return; }
    if (file.size > 12 * 1024 * 1024) { setImageError('Изображение должно быть меньше 12 МБ.'); return; }
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1200 / bitmap.width, 800 / bitmap.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      updateTextPage(pageId, { imageDataUrl: canvas.toDataURL('image/jpeg', 0.84) });
      setImageError('');
    } catch { setImageError('Не удалось прочитать этот файл изображения.'); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-3 md:p-6" onMouseDown={event => { if (event.target === event.currentTarget) onCancel(); }}>
    <section className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border-2 border-pink-200 bg-white shadow-2xl">
      <header className="flex items-center justify-between gap-3 bg-gradient-to-r from-pink-500 to-purple-600 px-5 py-4 text-white"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-pink-100">Игра в создаваемом уроке</div><h2 className="mt-1 text-lg font-black">{game.emoji} Настройка задания</h2><p className="text-xs font-semibold text-white/80">Изменения относятся только к этому уроку.</p></div><button onClick={onCancel} className="rounded-xl bg-white/20 p-2 text-white hover:bg-white/30" aria-label="Закрыть редактор"><X className="h-4 w-4" /></button></header>
      <div className="space-y-4 overflow-y-auto p-5">
        <label className="block text-[11px] font-black text-slate-600">Заголовок игры<input className={inputClass} value={lesson[stepKey].title} onChange={event => updateConfig({ title: event.target.value })} /></label>
        <label className="block text-[11px] font-black text-slate-600">Инструкция для ученика<textarea className={inputClass} rows={2} value={lesson[stepKey].instruction} onChange={event => updateConfig({ instruction: event.target.value })} /></label>

        {stepKey === 'step1' && <div className="space-y-3 rounded-2xl bg-pink-50/60 p-4"><h3 className="text-xs font-black text-pink-700">Слоги и образцы</h3><label className="block text-[11px] font-bold text-slate-600">Слоги на карточках<textarea className={inputClass} rows={2} value={lesson.step1.cells.join(', ')} onChange={event => updateConfig({ cells: event.target.value.split(/[,;\s]+/).map(item => item.trim().toUpperCase()).filter(Boolean) })} /></label><div className="grid gap-2 sm:grid-cols-2">{lesson.step1.palette.map((item, index) => <label key={item.id} className="text-[10px] font-bold text-slate-500">Образец {index + 1}<input className={inputClass} value={item.syllable} onChange={event => updateConfig({ palette: lesson.step1.palette.map((paletteItem, paletteIndex) => paletteIndex === index ? { ...paletteItem, syllable: event.target.value.toUpperCase() } : paletteItem) })} /></label>)}</div></div>}

        {stepKey === 'step2' && <div className="grid gap-3 rounded-2xl bg-pink-50/60 p-4 sm:grid-cols-2"><label className="text-[11px] font-bold text-slate-600">Слоги для ловли<input className={inputClass} value={lesson.step2.syllables.join(', ')} onChange={event => updateConfig({ syllables: event.target.value.split(/[,;\s]+/).map(item => item.trim().toUpperCase()).filter(Boolean) })} /></label><label className="text-[11px] font-bold text-slate-600">Количество слогов<input type="number" min={1} max={30} className={inputClass} value={lesson.step2.targetCatchCount} onChange={event => updateConfig({ targetCatchCount: Number(event.target.value) })} /></label><label className="text-[11px] font-bold text-slate-600">Скорость<select className={inputClass} value={lesson.step2.speed} onChange={event => updateConfig({ speed: event.target.value })}><option value="slow">Медленно</option><option value="medium">Спокойно</option><option value="fast">Быстрее</option></select></label></div>}

        {stepKey === 'step3' && <div className="grid gap-3 rounded-2xl bg-pink-50/60 p-4 sm:grid-cols-2"><label className="text-[11px] font-bold text-slate-600">Буква дорожки<input maxLength={1} className={inputClass} value={lesson.step3.targetLetter} onChange={event => updateConfig({ targetLetter: event.target.value.toLocaleUpperCase('ru-RU') })} /></label><label className="text-[11px] font-bold text-slate-600">Герой-талисман<input className={inputClass} value={lesson.step3.mascot} onChange={event => updateConfig({ mascot: event.target.value })} /></label></div>}

        {stepKey === 'step4' && <label className="block rounded-2xl bg-pink-50/60 p-4 text-[11px] font-bold text-slate-600">Слово-подсказка для рисунка<input className={inputClass} value={lesson.step4.promptWord || ''} onChange={event => updateConfig({ promptWord: event.target.value })} /></label>}

        {stepKey === 'step5' && <div className="space-y-2 rounded-2xl bg-pink-50/60 p-4"><div className="flex items-center justify-between"><h3 className="text-xs font-black text-pink-700">Слова и пропущенные буквы</h3><button className={lightButton} onClick={() => updateConfig({ words: [...lesson.step5.words, { id: `w_${crypto.randomUUID()}`, before: 'СА', missing: lesson.step5.targetLetter || 'А', after: '', fullWord: `СА${lesson.step5.targetLetter || 'А'}` }] })}><Plus className="h-3.5 w-3.5" />Добавить слово</button></div>{lesson.step5.words.map((word, index) => <div key={word.id} className="grid grid-cols-[1fr_70px_1fr_auto] items-end gap-2"><label className="text-[10px] font-bold text-slate-500">Начало<input className={inputClass} value={word.before} onChange={event => updateWord(index, { before: event.target.value.toUpperCase() })} /></label><label className="text-[10px] font-bold text-pink-600">Буква<input className={inputClass} maxLength={1} value={word.missing} onChange={event => updateWord(index, { missing: event.target.value.toUpperCase() })} /></label><label className="text-[10px] font-bold text-slate-500">Конец<input className={inputClass} value={word.after} onChange={event => updateWord(index, { after: event.target.value.toUpperCase() })} /></label><button className="mb-0.5 rounded-lg bg-rose-50 p-2 text-rose-500" title="Удалить слово" onClick={() => updateConfig({ words: lesson.step5.words.filter((_, wordIndex) => wordIndex !== index) })}><Trash2 className="h-4 w-4" /></button></div>)}</div>}

        {stepKey === 'step6' && <div className="space-y-2 rounded-2xl bg-pink-50/60 p-4"><div className="flex items-center justify-between"><h3 className="text-xs font-black text-pink-700">Карточки для чтения</h3><button className={lightButton} onClick={() => updateConfig({ cards: [...lesson.step6.cards, { id: `c_${crypto.randomUUID()}`, icon: '⭐', displayWord: 'НОВОЕ-СЛОВО', speakWord: 'новое слово' }] })}><Plus className="h-3.5 w-3.5" />Добавить карточку</button></div>{lesson.step6.cards.map((card, index) => <div key={card.id} className="grid grid-cols-[64px_1fr_1fr_auto] items-end gap-2"><label className="text-[10px] font-bold text-slate-500">Значок<input className={inputClass} value={card.icon} onChange={event => updateCard(index, { icon: event.target.value })} /></label><label className="text-[10px] font-bold text-slate-500">Слово на карточке<input className={inputClass} value={card.displayWord} onChange={event => updateCard(index, { displayWord: event.target.value.toLocaleUpperCase('ru-RU') })} /></label><label className="text-[10px] font-bold text-slate-500">Для озвучки<input className={inputClass} value={card.speakWord} onChange={event => updateCard(index, { speakWord: event.target.value })} /></label><button className="mb-0.5 rounded-lg bg-rose-50 p-2 text-rose-500" title="Удалить карточку" onClick={() => updateConfig({ cards: lesson.step6.cards.filter((_, cardIndex) => cardIndex !== index) })}><Trash2 className="h-4 w-4" /></button></div>)}</div>}

        {stepKey === 'step7' && activeTextPage && <div className="space-y-3 rounded-2xl bg-pink-50/60 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-xs font-black text-pink-700">Страницы текста</h3><p className="mt-1 text-[10px] font-semibold text-slate-500">Для каждой страницы можно добавить свою картинку и отдельный текст.</p></div><button className={lightButton} onClick={() => { const page: ReadingTextPage = { id: `reading-page-${crypto.randomUUID()}`, imageDataUrl: '', plainText: '', syllabifiedText: '' }; updateConfig({ pages: [...lesson.step7.pages, page] }); setActiveTextPageId(page.id); setImageError(''); }}><Plus className="h-3.5 w-3.5" />Добавить страницу</button></div>
          <div className="flex flex-wrap gap-2">{lesson.step7.pages.map((page, index) => <button key={page.id} className={`rounded-xl px-3 py-2 text-xs font-black ${page.id === activeTextPage.id ? 'bg-pink-500 text-white' : 'bg-white text-slate-600 ring-1 ring-pink-100'}`} onClick={() => { setActiveTextPageId(page.id); setImageError(''); }}>Страница {index + 1}</button>)}</div>
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] font-black text-slate-500">Иллюстрация к странице {lesson.step7.pages.findIndex(page => page.id === activeTextPage.id) + 1}</span>{lesson.step7.pages.length > 1 && <button className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-600" onClick={() => { const pages = lesson.step7.pages.filter(page => page.id !== activeTextPage.id); updateConfig({ pages }); setActiveTextPageId(pages[0].id); setImageError(''); }}>Удалить страницу</button>}</div>
          <div className="flex flex-wrap gap-2"><label className={`${lightButton} cursor-pointer`}><Upload className="h-3.5 w-3.5" />Загрузить картинку<input type="file" accept="image/*" className="hidden" onChange={event => { void handleImageUpload(activeTextPage.id, event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>{activeTextPage.imageDataUrl && <button className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-600" onClick={() => updateTextPage(activeTextPage.id, { imageDataUrl: '' })}>Убрать картинку</button>}</div>
          {activeTextPage.imageDataUrl && <img src={activeTextPage.imageDataUrl} alt={`Иллюстрация страницы ${lesson.step7.pages.findIndex(page => page.id === activeTextPage.id) + 1}`} className="max-h-52 w-full rounded-xl border border-pink-200 bg-white object-contain" />}{imageError && <p className="text-xs font-bold text-rose-600">{imageError}</p>}
          <label className="block text-[11px] font-bold text-slate-600">Текст для чтения на этой странице<textarea className={inputClass} rows={3} value={activeTextPage.plainText} onChange={event => updateTextPage(activeTextPage.id, { plainText: event.target.value })} placeholder="Введите рассказ обычным текстом" /></label><label className="block text-[11px] font-bold text-slate-600">Вариант по слогам · заполняется автоматически<textarea className={inputClass} rows={3} value={activeTextPage.syllabifiedText} onChange={event => updateTextPage(activeTextPage.id, { syllabifiedText: event.target.value })} placeholder="Текст с дефисами между слогами появится здесь" /></label><p className="text-[10px] font-semibold text-slate-400">Вариант заполняется автоматически для каждой страницы. При необходимости можно скорректировать деление на слоги вручную.</p>
        </div>}

        {stepKey === 'step8' && <div className="space-y-3 rounded-2xl bg-amber-50/70 p-4"><div className="flex items-center justify-between gap-2"><div><h3 className="text-xs font-black text-amber-800">Слова на кирпичиках</h3><p className="mt-1 text-[10px] font-semibold text-slate-500">Добавьте слова, которые ученик будет читать, чтобы построить дом.</p></div><button className={lightButton} onClick={() => updateConfig({ words: [...lesson.step8.words, 'НОВОЕ СЛОВО'] })}><Plus className="h-3.5 w-3.5" />Добавить слово</button></div>{lesson.step8.words.map((word, index) => <div key={`house-word-${index}`} className="flex items-end gap-2"><label className="flex-1 text-[10px] font-bold text-slate-500">Кирпичик {index + 1}<input className={inputClass} value={word} onChange={event => updateConfig({ words: lesson.step8.words.map((item, wordIndex) => wordIndex === index ? event.target.value : item) })} placeholder="Например, КИРПИЧ" /></label><button className="mb-0.5 rounded-lg bg-rose-50 p-2 text-rose-500" title="Удалить слово" onClick={() => updateConfig({ words: lesson.step8.words.filter((_, wordIndex) => wordIndex !== index) })}><Trash2 className="h-4 w-4" /></button></div>)}{lesson.step8.words.length === 0 && <p className="rounded-xl bg-white p-3 text-xs font-semibold text-slate-500">Добавьте хотя бы одно слово, чтобы ребёнок мог построить дом.</p>}</div>}

        {stepKey === 'step9' && <div className="space-y-3 rounded-2xl bg-violet-50/70 p-4"><div><h3 className="text-xs font-black text-violet-800">Настройки игры «Мемори»</h3><p className="mt-1 text-[10px] font-semibold text-slate-500">Добавляйте сколько нужно пар. Поле расширится, звёздочка останется в центре.</p></div><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold text-slate-600">Буквы или слоги для поиска пар</span><button className={lightButton} onClick={() => { const value = 'НОВЫЙ СЛОГ'; const pair: MemoryPair = { id: `memory-${crypto.randomUUID()}`, first: value, second: value }; updateConfig({ mode: 'symbols', pairs: [...lesson.step9.pairs, pair] }); }}><Plus className="h-3.5 w-3.5" />Добавить пару</button></div>{lesson.step9.pairs.map((pair, index) => <div key={pair.id} className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-xl bg-white p-2"><label className="text-[10px] font-bold text-slate-500">Пара {index + 1} · буква/слог<input className={inputClass} value={pair.first} onChange={event => updateConfig({ mode: 'symbols', pairs: lesson.step9.pairs.map((item, pairIndex) => pairIndex === index ? { ...item, first: event.target.value, second: event.target.value } : item) })} placeholder="Например, МА" /></label><button className="mb-0.5 rounded-lg bg-rose-50 p-2 text-rose-500" title="Удалить пару" onClick={() => updateConfig({ pairs: lesson.step9.pairs.filter((_, pairIndex) => pairIndex !== index) })}><Trash2 className="h-4 w-4" /></button></div>)}{lesson.step9.pairs.length === 0 && <p className="rounded-xl bg-white p-3 text-xs font-semibold text-slate-500">Добавьте пары карточек, чтобы начать игру.</p>}</div>}

        {stepKey === 'step10' && <div className="space-y-3 rounded-2xl bg-sky-50/70 p-4"><div><h3 className="text-xs font-black text-sky-800">Настройки игры «Заполни банку»</h3><p className="mt-1 text-[10px] font-semibold text-slate-500">Буквы на поле создаются автоматически. Искомая буква всегда есть в рассыпи, в заглавном и строчном вариантах.</p></div><label className="block text-[10px] font-bold text-slate-600">Какую букву найти?<input maxLength={1} className={inputClass} value={lesson.step10.targetLetter} onChange={event => { const targetLetter = event.target.value.toLocaleUpperCase('ru-RU').slice(-1); updateConfig({ targetLetter, instruction: `Найди букву ${targetLetter} или ${targetLetter.toLocaleLowerCase('ru-RU')} среди остальных и перетащи её в банку.` }); }} placeholder="Например, А" /></label><label className="block text-[10px] font-bold text-slate-600">Сколько нужных букв собрать?<input type="number" min={2} max={30} className={inputClass} value={lesson.step10.targetCount} onChange={event => updateConfig({ targetCount: Math.max(2, Math.min(30, Number(event.target.value) || 2)) })} /></label><p className="text-[10px] font-semibold text-slate-400">В рассыпи будут вперемешку нужные и отвлекающие буквы русского алфавита.</p></div>}
      </div>
      <footer className="flex justify-end gap-2 border-t border-pink-100 bg-slate-50 p-4"><button className={lightButton} onClick={onCancel}>Отмена</button><button className={pinkButton} onClick={onSave}><Check className="h-4 w-4" />Сохранить в урок</button></footer>
    </section>
  </div>;
}

