import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, Droplets, ShoppingBag, Sprout, X } from 'lucide-react';
import { applyDesertAction, DESERT_CATALOG, DESERT_CELL_COUNT, DESERT_COLS, DESERT_GROUND_TOP, DESERT_ROWS, DesertAction, DesertItemId, DesertState, desertBalance, desertCellAt } from '../desert/desertModel';

export type CharacterImages = Partial<Record<'front' | 'back' | 'side' | 'threeQuarter', string>>;

type Props = {
  studentName: string;
  earned: number;
  desert: DesertState;
  character?: CharacterImages;
  onAction: (action: DesertAction) => Promise<DesertState>;
  onClose: () => void;
};

const assets = { sand: 'desert/sand.png', soil: 'desert/soil.png', sprouts: 'desert/sprouts.png', green: 'desert/green.png' };
const sampleCharacter = `${import.meta.env.BASE_URL}characters/sample-boy/`;

export function DesertGame({ studentName, earned, desert, character, onAction, onClose }: Props) {
  const [world, setWorld] = useState(desert);
  const [selected, setSelected] = useState<DesertItemId>('water');
  const [shopOpen, setShopOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Купи воду, затем проведи пальцем или мышью по песку.');
  const [hero, setHero] = useState({ x: 0.5, y: 0.73, direction: 'front' as keyof Required<CharacterImages>, facesLeft: false });
  const sceneRef = useRef<HTMLDivElement>(null);
  const strokeRef = useRef<{ base: DesertState; cells: Set<number> } | null>(null);
  const maskId = useId().replaceAll(':', '');
  useEffect(() => setWorld(desert), [desert]);
  const balance = desertBalance(earned, world);
  const greenCount = world.cells.filter(stage => stage === 3).length;
  const selectedItem = DESERT_CATALOG.find(item => item.id === selected)!;
  const inventoryCount = world.inventory[selected] || 0;

  function scenePoint(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = sceneRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return { x: Math.max(0, Math.min(0.9999, (event.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(0.9999, (event.clientY - bounds.top) / bounds.height)) };
  }

  function moveHero(x: number, y: number) {
    setHero(previous => ({ x, y: Math.max(DESERT_GROUND_TOP + 0.08, y), facesLeft: x < previous.x,
      direction: Math.abs(x - previous.x) > Math.abs(y - previous.y) * 0.8
        ? (Math.abs(x - previous.x) > 0.18 ? 'side' : 'threeQuarter')
        : y < previous.y ? 'back' : 'front' }));
  }

  async function commit(action: DesertAction, base = world) {
    if (busy) return;
    let preview: DesertState;
    try { preview = applyDesertAction(base, earned, action); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Не удалось выполнить действие.'); return; }
    setWorld(preview);
    setBusy(true);
    try {
      const saved = await onAction(action);
      setWorld(saved);
      if (action.type === 'buy') setMessage(action.itemId === 'water' ? 'Вода в лейке! Проведи по песку.' : 'Покупка в рюкзаке. Выбери зелёное место на карте.');
      else if (action.type === 'water') setMessage('Земля оживает! Продолжай поливать.');
      else setMessage('Новый житель появился в твоём мире!');
    } catch (error) {
      setWorld(base);
      setMessage(error instanceof Error ? error.message : 'Не удалось сохранить действие. Попробуй ещё раз.');
    } finally { setBusy(false); }
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (busy) return;
    const point = scenePoint(event);
    if (!point || desertCellAt(point.x, point.y) === null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    moveHero(point.x, point.y);
    if (selected === 'water') {
      strokeRef.current = { base: world, cells: new Set() };
      addWaterPoint(point.x, point.y);
    } else {
      void commit({ type: 'place', itemId: selected, id: crypto.randomUUID(), ...point });
    }
  }

  function addWaterPoint(x: number, y: number) {
    const stroke = strokeRef.current;
    const index = desertCellAt(x, y);
    if (!stroke || index === null || stroke.cells.has(index) || stroke.base.cells[index] >= 3 || stroke.cells.size >= stroke.base.water) return;
    stroke.cells.add(index);
    try { setWorld(applyDesertAction(stroke.base, earned, { type: 'water', cells: [...stroke.cells] })); }
    catch { /* the message appears when the stroke finishes */ }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!strokeRef.current) return;
    const point = scenePoint(event);
    if (point) { addWaterPoint(point.x, point.y); moveHero(point.x, point.y); }
  }

  function finishStroke() {
    const stroke = strokeRef.current;
    strokeRef.current = null;
    if (!stroke) return;
    if (!stroke.cells.size) { setWorld(stroke.base); setMessage(stroke.base.water ? 'Выбери песчаный участок.' : 'В лейке пусто. Купи воду в магазине.'); return; }
    void commit({ type: 'water', cells: [...stroke.cells] }, stroke.base);
  }

  const imageForDirection = character?.[hero.direction] || `${sampleCharacter}${hero.direction === 'threeQuarter' ? 'three-quarter' : hero.direction}.png`;

  return <div className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-[#173246] font-sans text-white" role="dialog" aria-modal="true" aria-label={`Пустыня ученика ${studentName}`}>
    <header className="z-10 flex flex-wrap items-center justify-between gap-2 bg-[#153b3b]/95 px-3 py-2 shadow-lg sm:px-5">
      <button onClick={onClose} className="flex items-center gap-1 rounded-xl bg-white/15 px-3 py-2 text-sm font-black hover:bg-white/25"><ArrowLeft size={18} /> Назад</button>
      <div className="min-w-0 text-center"><h1 className="truncate text-base font-black sm:text-xl">🌍 Мир {studentName}</h1><p className="text-[11px] font-semibold text-emerald-200">Зелёных участков: {greenCount} из {DESERT_CELL_COUNT}</p></div>
      <div className="flex items-center gap-2"><span className="rounded-xl bg-amber-400 px-3 py-2 text-sm font-black text-amber-950">⭐ {balance}</span><span className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-black">💧 {world.water}</span></div>
    </header>

    <div ref={sceneRef} className="relative min-h-0 flex-1 select-none overflow-hidden touch-none" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finishStroke} onPointerCancel={finishStroke}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 675" preserveAspectRatio="none" aria-hidden="true">
        <defs><filter id={`${maskId}-soft`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7" /></filter>{[1, 2, 3].map(stage => <mask id={`${maskId}-${stage}`} key={stage} maskUnits="userSpaceOnUse" x="0" y="0" width="1200" height="675"><rect width="1200" height="675" fill="black" /><g filter={`url(#${maskId}-soft)`}>{world.cells.map((level, index) => level >= stage && <rect key={index} x={(index % DESERT_COLS) * 100 - 1} y={DESERT_GROUND_TOP * 675 + Math.floor(index / DESERT_COLS) * ((1 - DESERT_GROUND_TOP) * 675 / DESERT_ROWS) - 1} width="102" height={(1 - DESERT_GROUND_TOP) * 675 / DESERT_ROWS + 2} rx="18" fill="white" />)}</g></mask>)}</defs>
        <image href={`${import.meta.env.BASE_URL}${assets.sand}`} width="1200" height="675" preserveAspectRatio="none" />
        <image href={`${import.meta.env.BASE_URL}${assets.soil}`} width="1200" height="675" preserveAspectRatio="none" mask={`url(#${maskId}-1)`} />
        <image href={`${import.meta.env.BASE_URL}${assets.sprouts}`} width="1200" height="675" preserveAspectRatio="none" mask={`url(#${maskId}-2)`} />
        <image href={`${import.meta.env.BASE_URL}${assets.green}`} width="1200" height="675" preserveAspectRatio="none" mask={`url(#${maskId}-3)`} />
      </svg>
      {world.objects.map(object => {
        const item = DESERT_CATALOG.find(entry => entry.id === object.itemId);
        return item && <span key={object.id} className="pointer-events-none absolute -translate-x-1/2 -translate-y-full text-3xl drop-shadow-lg sm:text-5xl" style={{ left: `${object.x * 100}%`, top: `${object.y * 100}%` }} title={item.name} aria-label={item.name}>{item.icon}</span>;
      })}
      <img src={imageForDirection} alt="Герой озеленяет пустыню" draggable={false} className="pointer-events-none absolute z-10 h-[min(26vh,180px)] w-auto object-contain drop-shadow-xl transition-[left,top] duration-700 ease-out" style={{ left: `${hero.x * 100}%`, top: `${hero.y * 100}%`, transform: `translate(-50%, -100%) ${hero.direction === 'side' && hero.facesLeft ? 'scaleX(-1)' : ''}` }} />
      <div className="pointer-events-none absolute bottom-2 left-1/2 max-w-[90%] -translate-x-1/2 rounded-2xl bg-slate-950/70 px-4 py-2 text-center text-xs font-bold text-white sm:text-sm" role="status">{message}</div>
    </div>

    <footer className="z-10 flex items-center justify-between gap-2 bg-[#153b3b] px-3 py-2 sm:px-5"><div className="min-w-0 text-xs font-bold sm:text-sm">{selectedItem.icon} {selectedItem.name} {selected === 'water' ? `· в лейке ${world.water}` : `· в рюкзаке ${inventoryCount}`}</div><div className="flex gap-2"><button onClick={() => setSelected('water')} className={`rounded-xl px-3 py-2 text-xs font-black ${selected === 'water' ? 'bg-sky-500' : 'bg-white/15'}`}><Droplets size={16} className="inline" /> Поливать</button><button onClick={() => setShopOpen(true)} className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-amber-950"><ShoppingBag size={16} className="inline" /> Магазин</button></div></footer>

    {shopOpen && <div className="absolute inset-0 z-20 flex items-end justify-center bg-slate-950/60 p-2 sm:items-center" onPointerDown={event => event.stopPropagation()}><section className="max-h-[86dvh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-4 text-slate-800 shadow-2xl sm:p-6" aria-label="Магазин пустыни"><div className="flex items-center justify-between"><div><h2 className="text-xl font-black">Магазин оазиса</h2><p className="text-xs font-bold text-slate-500">Доступно ⭐ {balance}</p></div><button onClick={() => setShopOpen(false)} aria-label="Закрыть магазин" className="rounded-xl bg-slate-100 p-2"><X size={20} /></button></div><p className="mt-2 text-xs font-semibold text-slate-500">Воду используй на песке. Растения и жителей можно разместить только на зелёной земле.</p><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{DESERT_CATALOG.map(item => <div key={item.id} className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 p-3 text-center"><div className="text-4xl" aria-hidden="true">{item.icon}</div><div className="mt-1 text-sm font-black">{item.name}</div><div className="text-xs font-bold text-amber-700">⭐ {item.price}{item.id === 'water' ? ` · ${item.amount} полива` : ''}</div><button disabled={busy || balance < item.price} onClick={() => { setSelected(item.id); void commit({ type: 'buy', itemId: item.id }); }} className="mt-2 w-full rounded-xl bg-emerald-600 px-2 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">Купить</button>{item.id !== 'water' && (world.inventory[item.id] || 0) > 0 && <button onClick={() => { setSelected(item.id); setShopOpen(false); setMessage('Нажми на зелёный участок, чтобы разместить покупку.'); }} className="mt-1 w-full rounded-xl bg-white px-2 py-2 text-xs font-black text-emerald-700">Разместить · {world.inventory[item.id]}</button>}</div>)}</div><div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-800"><Sprout size={16} /> Мир и покупки сохраняются для этого ученика.</div></section></div>}
  </div>;
}
