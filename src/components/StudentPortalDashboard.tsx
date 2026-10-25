import { BookOpen, Check, Play, Star, Trophy } from 'lucide-react';
import { LessonAttempt, StudentRecord } from './StudentProfile';
import { LessonData } from '../types';

type Props = {
  student: StudentRecord;
  onStart: (lesson: LessonData) => void;
  availablePoints: number | null;
};

export function StudentPortalDashboard({ student, onStart, availablePoints }: Props) {
  const totalPoints = student.attempts.reduce((sum, attempt) => sum + attempt.points, 0);
  const lessonAttempts = student.attempts.filter(attempt => attempt.source !== 'teacher');
  const teacherPoints = totalPoints - lessonAttempts.reduce((sum, attempt) => sum + attempt.points, 0);
  const completed = new Set(lessonAttempts.map(attempt => attempt.lessonId));

  return <div className="w-full max-w-5xl px-1 pb-8">
    <div className="mx-auto mb-7 max-w-2xl text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-pink-500 to-purple-600 text-3xl text-white shadow-lg">🌟</div>
      <div className="mt-4 text-[10px] font-black uppercase tracking-[.22em] text-pink-600">Мой кабинет</div>
      <h1 className="mt-1 text-3xl font-black text-slate-800 md:text-4xl">Привет, {student.name}!</h1>
      <p className="mt-2 text-sm font-semibold text-slate-500">Здесь собраны твои занятия и успехи.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-4 py-2 text-xs font-black text-amber-700"><Star className="h-4 w-4 fill-current" />{availablePoints === null ? '…' : availablePoints} баллов для пустыни</span>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700"><Trophy className="h-4 w-4" />{lessonAttempts.length} занятий завершено</span>
      </div>
    </div>
    <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-800"><BookOpen className="h-5 w-5 text-pink-500" />Мои занятия</h2>
    {student.lessons.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{student.lessons.map((lesson, index) => {
      const lessonAttempts: LessonAttempt[] = student.attempts.filter(attempt => attempt.lessonId === lesson.id);
      return <article key={lesson.id} className="rounded-3xl border border-pink-200 bg-white/95 p-5 shadow-lg">
        <div className="flex items-start justify-between gap-2"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-pink-100 to-violet-100 text-2xl">{['📖', '🦊', '🌈', '⭐'][index % 4]}</div>{lessonAttempts.length > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700"><Check className="h-3 w-3" />{lessonAttempts.length} раз</span>}</div>
        <h3 className="mt-4 line-clamp-2 text-base font-black text-slate-800">{lesson.title}</h3>
        {lesson.subtitle && <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-500">{lesson.subtitle}</p>}
        <button onClick={() => onStart(lesson)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-3 text-xs font-black text-white shadow transition hover:brightness-105"><Play className="h-4 w-4 fill-current" />{completed.has(lesson.id) ? 'Повторить занятие' : 'Начать занятие'}</button>
      </article>;
    })}</div> : <div className="rounded-3xl border-2 border-dashed border-pink-200 bg-white/80 p-8 text-center"><div className="text-3xl">🌱</div><p className="mt-2 text-sm font-black text-slate-700">Пока нет занятий</p><p className="mt-1 text-xs font-semibold text-slate-500">Попроси учителя добавить урок в твою карточку.</p></div>}
    <p className="mt-5 text-center text-[10px] font-semibold text-slate-400">За занятия заработано {totalPoints - teacherPoints} баллов{teacherPoints > 0 ? `, учитель добавил ${teacherPoints}` : ''}. Доступный остаток уменьшается после покупок в пустыне.</p>
  </div>;
}
