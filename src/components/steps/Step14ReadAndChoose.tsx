import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ImageOff } from 'lucide-react';
import { ReadAndChooseTask, Step14Config } from '../../types';

type Props = {
  config: Step14Config;
  onPrev: () => void;
  onNext: () => void;
  isLastGame: boolean;
  onCorrectAnswer: (id: string) => void;
};

function validTasks(tasks: ReadAndChooseTask[]) {
  return tasks.filter(task => task.plainText.trim() && task.answers.filter(answer => answer.imageDataUrl).length >= 2 && task.answers.some(answer => answer.isCorrect));
}

export function Step14ReadAndChoose({ config, onPrev, onNext, isLastGame, onCorrectAnswer }: Props) {
  const tasks = validTasks(config.tasks);
  const [taskIndex, setTaskIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [correct, setCorrect] = useState(false);

  useEffect(() => {
    setTaskIndex(index => Math.min(index, Math.max(0, tasks.length - 1)));
    setSelectedId(null);
    setCorrect(false);
  }, [config.tasks]);

  if (!tasks.length) return <div className="w-full rounded-2xl bg-amber-50 p-6 text-center text-sm font-bold text-amber-800">Учитель ещё не подготовил задания для этой игры.<div className="mt-4 flex justify-between"><button onClick={onPrev}>Назад</button><button onClick={onNext}>Дальше</button></div></div>;

  const task = tasks[taskIndex];
  const text = task.displayMode === 'syllables' ? task.syllabifiedText || task.plainText : task.plainText;
  const answers = task.answers.filter(answer => answer.imageDataUrl);
  const choose = (answerId: string) => {
    if (correct) return;
    const answer = answers.find(item => item.id === answerId);
    if (!answer) return;
    setSelectedId(answerId);
    if (answer.isCorrect) {
      setCorrect(true);
      onCorrectAnswer(`read-choose-${task.id}`);
    }
  };
  const advance = () => {
    if (taskIndex < tasks.length - 1) {
      setTaskIndex(index => index + 1);
      setSelectedId(null);
      setCorrect(false);
    } else if (!isLastGame) onNext();
  };

  return <section className="mx-auto w-full max-w-4xl text-center">
    <p className="text-xs font-black uppercase tracking-[.12em] text-pink-600">Прочитай предложение и выбери подходящую картинку</p>
    <h2 className="mt-2 text-xl font-black text-slate-800 md:text-2xl">{config.title}</h2>
    {config.instruction && <p className="mt-1 text-sm font-semibold text-slate-500">{config.instruction}</p>}
    <p className="mt-4 text-xs font-black text-violet-600">Задание {taskIndex + 1} из {tasks.length}</p>
    <div className="mx-auto mt-2 max-w-3xl rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 shadow-sm md:px-8">
      <p className="text-xl font-black leading-relaxed text-slate-900 md:text-2xl">{text}</p>
    </div>
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {answers.map((answer, index) => {
        const selected = selectedId === answer.id;
        const classes = correct && answer.isCorrect ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-200' : selected ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-200' : 'border-slate-200 bg-white hover:border-pink-300 hover:bg-pink-50';
        return <button key={answer.id} onClick={() => choose(answer.id)} disabled={correct} className={`group relative min-h-32 overflow-hidden rounded-2xl border-2 p-2 shadow-sm transition ${classes}`} aria-label={`Вариант ${index + 1}`}>
          <img src={answer.imageDataUrl} alt={`Вариант ответа ${index + 1}`} className="h-28 w-full rounded-xl object-contain" />
          {correct && answer.isCorrect && <span className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-4 w-4" /></span>}
        </button>;
      })}
    </div>
    {selectedId && !correct && <p role="status" className="mt-4 rounded-xl bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800">Попробуй ещё раз: внимательно прочитай предложение.</p>}
    {correct && <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">Верно! Отлично прочитано. {taskIndex < tasks.length - 1 ? 'Нажми «Дальше».' : isLastGame ? 'Все задания выполнены.' : 'Можно перейти к следующей игре.'}</div>}
    <div className="mt-5 flex items-center justify-between gap-3">
      <button onClick={onPrev} className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-600"><ArrowLeft className="h-4 w-4" />Назад</button>
      {correct && (!isLastGame || taskIndex < tasks.length - 1) && <button onClick={advance} className="inline-flex items-center gap-1 rounded-xl bg-pink-500 px-5 py-2.5 text-sm font-black text-white shadow"><span>{taskIndex < tasks.length - 1 ? 'Дальше' : 'Дальше по уроку'}</span><ArrowRight className="h-4 w-4" /></button>}
      {!correct && <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400"><ImageOff className="h-4 w-4" />Выбери картинку</span>}
    </div>
  </section>;
}
