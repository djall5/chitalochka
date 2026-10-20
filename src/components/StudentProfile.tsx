import { ArrowLeft, Award, BookOpen, Star, Trophy } from 'lucide-react';
import { ReactNode } from 'react';
import { LessonData } from '../types';

export interface LessonAttempt {
  id: string;
  lessonId: string;
  lessonTitle: string;
  points: number;
  completedAt: string;
}

export interface StudentRecord {
  id: string;
  name: string;
  attempts: LessonAttempt[];
  lessons: LessonData[];
}

type Props = {
  name: string;
  attempts: LessonAttempt[];
  onNameChange: (name: string) => void;
  onBack: () => void;
};

export function StudentProfile({ name, attempts, onNameChange, onBack }: Props) {
  const totalPoints = attempts.reduce((sum, attempt) => sum + attempt.points, 0);
  const average = attempts.length ? Math.round(totalPoints / attempts.length) : 0;

  return <div className="w-full max-w-4xl px-1 pb-6">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-pink-600">Профиль ученика</div><h1 className="mt-1 text-2xl font-black text-slate-800 md:text-3xl">Карточка ученика</h1><p className="mt-1 text-xs font-semibold text-slate-500">Результаты всех завершённых уроков сохраняются в этом браузере.</p></div><button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-pink-200 bg-white px-3 py-2 text-xs font-black text-pink-700"><ArrowLeft className="h-4 w-4" />К урокам</button></div>
    <section className="rounded-3xl border border-pink-200 bg-white/95 p-5 shadow-xl md:p-7">
      <div className="flex flex-wrap items-center gap-4"><div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-pink-100 to-violet-100 text-4xl">🧒</div><div className="min-w-[200px] flex-1"><label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Имя ученика</label><input value={name} onChange={event => onNameChange(event.target.value)} className="mt-1 w-full max-w-sm rounded-xl border border-pink-200 px-3 py-2 text-lg font-black text-slate-800 outline-none focus:border-pink-500" placeholder="Имя ученика" /></div><div className="rounded-2xl bg-amber-50 px-5 py-3 text-center"><div className="flex items-center justify-center gap-2 text-2xl font-black text-amber-600"><Star className="h-5 w-5 fill-current" />{totalPoints}</div><div className="text-[10px] font-black text-amber-700">баллов всего</div></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><Stat icon={<BookOpen className="h-5 w-5" />} label="Уроков пройдено" value={attempts.length} /><Stat icon={<Award className="h-5 w-5" />} label="Баллов за урок в среднем" value={average} /><Stat icon={<Trophy className="h-5 w-5" />} label="Лучший результат" value={attempts.length ? Math.max(...attempts.map(attempt => attempt.points)) : 0} /></div>
      <div className="mt-7"><h2 className="mb-3 text-base font-black text-slate-800">История занятий</h2>{attempts.length ? <div className="space-y-2">{[...attempts].reverse().map((attempt, index) => <article key={attempt.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-pink-100 bg-white p-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-pink-50 text-lg">{index === 0 ? '🏅' : '📖'}</div><div className="min-w-0 flex-1"><h3 className="truncate text-xs font-black text-slate-800">{attempt.lessonTitle}</h3><p className="mt-1 text-[10px] font-semibold text-slate-400">{new Date(attempt.completedAt).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })}</p></div><div className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">⭐ {attempt.points} баллов</div></article>)}</div> : <div className="rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50/50 p-8 text-center"><div className="text-3xl">🌱</div><p className="mt-2 text-sm font-black text-slate-700">Пока нет завершённых уроков</p><p className="mt-1 text-xs font-semibold text-slate-500">Когда ученик завершит занятие, здесь появится его результат.</p></div>}</div>
    </section>
  </div>;
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <div className="rounded-2xl bg-violet-50/80 p-4"><div className="flex items-center gap-2 text-violet-600">{icon}<span className="text-[10px] font-bold text-slate-500">{label}</span></div><div className="mt-2 text-2xl font-black text-slate-800">{value}</div></div>;
}
