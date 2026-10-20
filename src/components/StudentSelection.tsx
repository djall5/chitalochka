import { ArrowRight, BookOpen, Plus, Sparkles, UserRound } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { StudentRecord } from './StudentProfile';

type Props = {
  students: StudentRecord[];
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
};

export function StudentSelection({ students, onSelect, onCreate }: Props) {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim());
  };

  return <div className="w-full max-w-5xl px-1 pb-8">
    <div className="mx-auto mb-7 max-w-2xl text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg"><BookOpen className="h-8 w-8" /></div><div className="mt-4 text-[10px] font-black uppercase tracking-[.22em] text-pink-600">Кабинет учителя</div><h1 className="mt-1 text-3xl font-black text-slate-800 md:text-4xl">Кто сегодня занимается?</h1><p className="mt-2 text-sm font-semibold text-slate-500">Выберите карточку ученика или создайте новую. У каждого ученика будет своя история и накопленные баллы.</p></div>
    {students.length > 0 && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{students.map((student, index) => {
      const points = student.attempts.reduce((sum, attempt) => sum + attempt.points, 0);
      return <button key={student.id} onClick={() => onSelect(student.id)} className="group rounded-3xl border border-pink-200 bg-white/95 p-5 text-left shadow-lg transition hover:-translate-y-1 hover:border-pink-400 hover:shadow-xl"><div className="flex items-center justify-between"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-pink-100 to-violet-100 text-3xl">{['🧒','👧','🦊','🐻'][index % 4]}</div><ArrowRight className="h-5 w-5 text-pink-400 transition group-hover:translate-x-1" /></div><h2 className="mt-4 truncate text-lg font-black text-slate-800">{student.name}</h2><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-slate-500"><span>📖 {student.lessons.length} в библиотеке</span><span>✅ {student.attempts.length} пройдено</span><span>⭐ {points} баллов</span></div><span className="mt-4 inline-flex rounded-xl bg-pink-50 px-3 py-2 text-xs font-black text-pink-700">Открыть карточку</span></button>;
    })}</div>}
    {isCreating ? <form onSubmit={submit} className="mx-auto mt-4 max-w-xl rounded-3xl border-2 border-pink-200 bg-white p-5 shadow-xl"><h2 className="flex items-center gap-2 text-lg font-black text-slate-800"><UserRound className="h-5 w-5 text-pink-500" />Новый ученик</h2><label className="mt-3 block text-xs font-black text-slate-500">Имя ученика<input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="Например, Маша" className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-3 text-sm font-bold text-slate-800 outline-none focus:border-pink-500" /></label><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setIsCreating(false)} className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-600">Отмена</button><button disabled={!name.trim()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40"><Plus className="h-4 w-4" />Создать карточку</button></div></form> : <button onClick={() => { setIsCreating(true); setName(''); }} className="mx-auto mt-4 flex w-full max-w-xl items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-pink-300 bg-pink-50/50 p-5 text-sm font-black text-pink-700 transition hover:bg-pink-100"><Plus className="h-5 w-5" />Создать карточку нового ученика</button>}
    {students.length === 0 && !isCreating && <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs font-semibold text-slate-400"><Sparkles className="h-4 w-4" />Создайте первую карточку, чтобы начать собирать прогресс.</p>}
  </div>;
}
