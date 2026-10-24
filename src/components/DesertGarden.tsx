import React, { useState } from 'react';

const plants = [
  { name: 'Трава', icon: '🌱', price: 10 },
  { name: 'Цветы', icon: '🌻', price: 20 },
  { name: 'Куст', icon: '🌿', price: 30 },
  { name: 'Пальма', icon: '🌴', price: 50 },
];
interface Garden { balance: number; cells: (number | null)[]; rewards: string[] }

export function DesertGarden({ studentId, runId, points, onExit }: { studentId: string; runId: string; points: number; onExit: () => void }) {
  const storageKey = `literacy_desert_v1:${studentId}`;
  const [garden, setGarden] = useState<Garden>(() => {
    let saved: Garden = { balance: 0, cells: Array(24).fill(null), rewards: [] };
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (value && Number.isSafeInteger(value.balance) && value.balance >= 0 && Array.isArray(value.cells) && value.cells.length === 24 && value.cells.every((cell: unknown) => cell === null || (Number.isInteger(cell) && Number(cell) >= 0 && Number(cell) < plants.length)) && Array.isArray(value.rewards) && value.rewards.every((id: unknown) => typeof id === 'string')) saved = value;
    } catch { /* start with an empty desert */ }
    return saved.rewards.includes(runId) ? saved : { ...saved, balance: saved.balance + Math.max(0, Math.floor(points)), rewards: [...saved.rewards, runId] };
  });
  const [selected, setSelected] = useState(0);
  const [message, setMessage] = useState('Выбери растение, затем нажми на свободный участок песка.');
  const [saveError, setSaveError] = useState(false);
  React.useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(garden)); setSaveError(false); }
    catch { setSaveError(true); }
  }, [garden, storageKey]);
  const count = garden.cells.filter(cell => cell !== null).length;
  const plant = plants[selected];
  const full = count === garden.cells.length;

  function plantAt(index: number) {
    if (garden.cells[index] !== null) return;
    if (garden.balance < plant.price) { setMessage('Пока не хватает баллов. Выбери растение дешевле или заработай ещё на следующем уроке!'); return; }
    setGarden(previous => {
      if (previous.cells[index] !== null || previous.balance < plant.price) return previous;
      return { ...previous, balance: previous.balance - plant.price, cells: previous.cells.map((cell, i) => i === index ? selected : cell) };
    });
    setMessage(`${plant.name} посажена! Пустыня становится зеленее.`);
  }

  return <section className="w-full max-w-3xl rounded-3xl border-4 border-amber-200 bg-white p-4 shadow-2xl sm:p-7" aria-label="Оживи пустыню">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-emerald-600">Урок завершён · +{points} баллов</p><h2 className="mt-1 text-2xl font-black text-emerald-900">Оживи пустыню 🌴</h2></div><div className="rounded-2xl bg-amber-100 px-4 py-3 text-lg font-black text-amber-800" aria-live="polite">⭐ {garden.balance}</div></div>
    <p className="mt-2 text-sm font-semibold text-slate-600">Твои знания помогают природе! Преврати пески в цветущий оазис.</p>
    <div className="mt-4 flex justify-between text-xs font-bold text-emerald-800"><span>{full ? 'Оазис расцвёл! Ты помог природе 💚' : `Озеленено ${count} из 24 участков`}</span><span>{Math.round(count / 24 * 100)}%</span></div>
    <progress className="mt-1 h-3 w-full accent-emerald-500" value={count} max={24} aria-label="Озеленение пустыни" />
    <div className="mt-3 overflow-hidden rounded-3xl border-2 border-amber-200 p-3 sm:p-5" style={{ background: `linear-gradient(160deg, #fef3c7, ${count > 12 ? '#bbf7d0' : '#f6d692'})` }}>
      <div className="mb-3 flex justify-between text-3xl" aria-hidden="true"><span>☀️</span><span>{count >= 12 ? '🦋 🐦' : '🏜️'}</span></div>
      <div className="grid grid-cols-6 gap-1.5 sm:gap-2">{garden.cells.map((cell, index) => <button key={index} onClick={() => plantAt(index)} disabled={cell !== null || garden.balance < plant.price} aria-label={cell === null ? `Посадить: ${plant.name}, участок ${index + 1}, ${plant.price} баллов` : `${plants[cell].name}, участок ${index + 1}`} className={`flex aspect-square min-h-9 items-center justify-center rounded-xl border-2 text-2xl transition sm:text-4xl ${cell === null ? 'border-amber-600/20 bg-amber-100/50 enabled:hover:scale-105 enabled:hover:bg-emerald-100 focus-visible:outline-emerald-700' : 'border-emerald-400/50 bg-emerald-200/80'}`}><span aria-hidden="true">{cell === null ? '·' : plants[cell].icon}</span></button>)}</div>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Растения">{plants.map((item, index) => <button key={item.name} aria-pressed={selected === index} onClick={() => setSelected(index)} className={`rounded-2xl border-2 p-3 text-sm font-black ${selected === index ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-600'}`}><span className="block text-3xl" aria-hidden="true">{item.icon}</span>{item.name}<span className="block text-xs">⭐ {item.price}</span></button>)}</div>
    <p className="mt-3 min-h-10 text-center text-sm font-bold text-emerald-800" role="status">{full ? 'Все участки озеленены! Оставшиеся баллы сохранены.' : garden.balance < 10 ? 'Баллы закончились. Приходи после следующего урока — оазис будет ждать!' : message}</p>
    <p className="text-center text-xs text-slate-500">{saveError ? 'Не удалось сохранить оазис. Не закрывай страницу, чтобы не потерять посадки.' : 'Оазис и оставшиеся баллы сохраняются в этом браузере.'}</p>
    <button onClick={onExit} className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700">Готово · вернуться к занятиям</button>
  </section>;
}
