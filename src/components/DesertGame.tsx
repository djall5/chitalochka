import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Droplets, ShoppingBag, Sprout, X } from 'lucide-react';
import { applyDesertAction, canPlaceDesertItem, DESERT_ANIMALS, DESERT_CATALOG, DESERT_CELL_COUNT, DESERT_COLS, DESERT_GROUND_TOP, DESERT_ROWS, DesertAction, DesertItemId, DesertState, desertBalance, desertCellAt } from '../desert/desertModel';

type CharacterDirection = 'front' | 'back' | 'side' | 'threeQuarter';
export type CharacterImages = Partial<Record<CharacterDirection | 'watering', string>>;

type Props = {
  studentName: string;
  earned: number;
  desert: DesertState;
  character?: CharacterImages;
  onAction: (action: DesertAction) => Promise<DesertState>;
  onClose: () => void;
};

const assets = { sand: 'desert/sand.png', soil: 'desert/soil.png', sprouts: 'desert/sprouts.png', green: 'desert/green.png' };
const itemSprites: Partial<Record<DesertItemId, { file: string; width: number; tall?: boolean; height?: number }>> = {
  flower: { file: 'flower.png', width: 68 },
  purpleFlower: { file: 'purple-flower.png', width: 68 },
  bush: { file: 'bush.png', width: 88 },
  tree: { file: 'tree.png', width: 128, tall: true },
  willow: { file: 'willow.png', width: 128, tall: true },
  mushroom: { file: 'mushroom.png', width: 64 },
  butterfly: { file: 'butterfly.png', width: 56 },
  bee: { file: 'bee.png', width: 50 },
  rabbit: { file: 'rabbit.png', width: 72 },
  hedgehog: { file: 'hedgehog.png', width: 70 },
  bird: { file: 'bird.png', width: 60 },
  ladybug: { file: 'ladybug.png', width: 48 },
  fence: { file: 'fence.png', width: 160 },
  woodenCottage: { file: 'wooden-cottage.png', width: 220, tall: true, height: 235 },
  treehouse: { file: 'treehouse.png', width: 230, tall: true, height: 285 },
  stoneCottage: { file: 'stone-cottage.png', width: 225, tall: true, height: 245 },
  squirrel: { file: 'squirrel.png', width: 62 },
  fox: { file: 'fox.png', width: 105 },
  wolf: { file: 'wolf.png', width: 120 },
  deer: { file: 'deer.png', width: 115 },
};
const itemSpriteUrl = (file: string) => `${import.meta.env.BASE_URL}desert/items/${file}`;
const animals = new Set<DesertItemId>(DESERT_ANIMALS);
const shopSections = [
  { id: 'all', label: 'Все' }, { id: 'water', label: 'Вода' }, { id: 'plants', label: 'Растения' },
  { id: 'life', label: 'Жители' }, { id: 'buildings', label: 'Домики' }, { id: 'fences', label: 'Заборы' },
] as const;
function itemSpriteStyle(sprite: { width: number; tall?: boolean; height?: number }, x: number, y: number, rotation = 0, flipped = false, scale = 1, fence = false): React.CSSProperties {
  return { left: `${x * 100}%`, top: `${y * 100}%`,
    width: sprite.tall ? 'auto' : `clamp(38px, ${(sprite.width / sceneWidth * 100).toFixed(1)}vw, ${sprite.width}px)`,
    height: sprite.tall ? `min(38vh, ${sprite.height || 270}px)` : undefined,
    transform: `translate(-50%, -100%) scale(${scale}) ${fence ? `perspective(800px) rotateY(${rotation}deg)` : ''} ${flipped ? 'scaleX(-1)' : ''}`,
    transformOrigin: '50% 100%' };
}
const sampleCharacter = `${import.meta.env.BASE_URL}characters/sample-boy/`;
const sceneWidth = 1200;
const sceneHeight = 675;
const cellWidth = sceneWidth / DESERT_COLS;
const cellHeight = sceneHeight * (1 - DESERT_GROUND_TOP) / DESERT_ROWS;

function countWord(count: number, one: string, few: string, many: string) {
  if (count % 100 >= 11 && count % 100 <= 14) return many;
  return count % 10 === 1 ? one : count % 10 >= 2 && count % 10 <= 4 ? few : many;
}

// A stable, slightly uneven brush dab for each plot. Neighbouring dabs overlap into one painted area.
function makeBrushPaths(width: number, height: number) {
  const cellPixelWidth = width / DESERT_COLS;
  // Keep the physical brush radius from the 96-plot world after halving the plot count.
  const cellPixelHeight = height * (1 - DESERT_GROUND_TOP) / 8;
  const radius = Math.hypot(cellPixelWidth / 2, cellPixelHeight / 2) * 2.3;
  const radiusX = radius * sceneWidth / width;
  const radiusY = radius * sceneHeight / height;
  return Array.from({ length: DESERT_CELL_COUNT }, (_, index) => {
    const cx = (index % DESERT_COLS + 0.5) * cellWidth;
    const cy = sceneHeight * DESERT_GROUND_TOP + (Math.floor(index / DESERT_COLS) + 0.5) * cellHeight;
    const phase = index * 2.39996;
    const points = Array.from({ length: 32 }, (_, step) => {
      const angle = step * Math.PI * 2 / 32;
      const wobble = 1 + 0.045 * Math.sin(angle * 3 + phase) + 0.03 * Math.sin(angle * 5 - phase * 0.7) + 0.02 * Math.sin(angle * 9 + phase * 1.3);
      return `${(cx + Math.cos(angle) * radiusX * wobble).toFixed(1)} ${(cy + Math.sin(angle) * radiusY * wobble).toFixed(1)}`;
    });
    return `M ${points.join(' L ')} Z`;
  });
}

export function DesertGame({ studentName, earned, desert, character, onAction, onClose }: Props) {
  const [world, setWorld] = useState(desert);
  const [selected, setSelected] = useState<DesertItemId>('water');
  const [shopOpen, setShopOpen] = useState(false);
  const [shopSection, setShopSection] = useState<(typeof shopSections)[number]['id']>('all');
  const [fenceRotation, setFenceRotation] = useState(0);
  const [animalFacing, setAnimalFacing] = useState<'left' | 'right'>('right');
  const [mirrored, setMirrored] = useState(false);
  const [objectScale, setObjectScale] = useState(1);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null);
  const [placementPoint, setPlacementPoint] = useState<{ x: number; y: number } | null>(null);
  const [waterQuantity, setWaterQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Купи воду, затем проведи пальцем или мышью по песку.');
  const [hero, setHero] = useState({ x: 0.5, y: 0.73, direction: 'front' as CharacterDirection, facesLeft: false });
  const [wateringPose, setWateringPose] = useState(false);
  const wateringPoseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sceneSize, setSceneSize] = useState({ width: sceneWidth, height: sceneHeight });
  const [reveals, setReveals] = useState<Set<string>>(() => new Set());
  const sceneRef = useRef<HTMLDivElement>(null);
  const strokeRef = useRef<{ base: DesertState; cells: Set<number>; last: { x: number; y: number } } | null>(null);
  const previousDesertCells = useRef(desert.cells);
  const maskId = useId().replaceAll(':', '');
  const brushPaths = useMemo(() => makeBrushPaths(sceneSize.width, sceneSize.height), [sceneSize.width, sceneSize.height]);
  useEffect(() => {
    const previous = previousDesertCells.current;
    const newReveals: string[] = [];
    desert.cells.forEach((level, index) => {
      for (let stage = previous[index] + 1; stage <= level; stage += 1) newReveals.push(`${index}:${stage}`);
    });
    if (newReveals.length) setReveals(current => new Set([...current, ...newReveals]));
    previousDesertCells.current = desert.cells;
    setWorld(desert);
  }, [desert]);
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSceneSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
    });
    observer.observe(scene);
    return () => observer.disconnect();
  }, []);
  useEffect(() => () => { if (wateringPoseTimer.current) clearTimeout(wateringPoseTimer.current); }, []);
  const balance = desertBalance(earned, world);
  const greenCount = world.cells.filter(stage => stage === 3).length;
  const selectedItem = DESERT_CATALOG.find(item => item.id === selected)!;
  const inventoryCount = world.inventory[selected] || 0;
  const previewPoint = selected !== 'water' && inventoryCount > 0 && !shopOpen ? placementPoint ?? hoverPoint : null;
  const previewValid = previewPoint !== null && canPlaceDesertItem(world, selected, previewPoint.x, previewPoint.y, selected === 'fence' ? fenceRotation : 0);
  const previewFlipped = animals.has(selected) ? animalFacing === 'left' : mirrored;

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
      if (action.type === 'buy') setMessage(action.itemId === 'water' ? `В лейке ${saved.water} ${countWord(saved.water, 'полив', 'полива', 'поливов')}. Проведи по песку.` : 'Покупка в рюкзаке. Выбери место и посмотри, как она будет выглядеть.');
      else if (action.type === 'water') setMessage('Земля оживает! Продолжай поливать.');
      else setMessage('Предмет появился в твоём зелёном мире!');
    } catch (error) {
      setWorld(base);
      setMessage(error instanceof Error ? error.message : 'Не удалось сохранить действие. Попробуй ещё раз.');
    } finally { setBusy(false); }
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (busy) return;
    const point = scenePoint(event);
    if (!point) return;
    moveHero(point.x, point.y);
    if (desertCellAt(point.x, point.y) === null) return;
    if (selected === 'water') {
      event.currentTarget.setPointerCapture(event.pointerId);
      strokeRef.current = { base: world, cells: new Set(), last: point };
      addWaterPoint(point.x, point.y);
    } else {
      if (!inventoryCount) { setMessage('Сначала купи предмет в магазине.'); return; }
      setPlacementPoint(point);
      setMessage(canPlaceDesertItem(world, selected, point.x, point.y, selected === 'fence' ? fenceRotation : 0) ? 'Посмотри на предмет и нажми «Разместить здесь».' : selected === 'fence' ? 'Вся секция забора должна стоять на зелёной земле.' : 'Здесь пока нельзя разместить предмет. Выбери зелёный участок.');
    }
  }

  function addWaterPoint(x: number, y: number) {
    const stroke = strokeRef.current;
    const index = desertCellAt(x, y);
    if (!stroke || index === null || stroke.cells.has(index) || stroke.base.cells[index] >= 3 || stroke.cells.size >= stroke.base.water) return;
    stroke.cells.add(index);
    if (wateringPoseTimer.current) clearTimeout(wateringPoseTimer.current);
    setWateringPose(true);
    setReveals(current => new Set(current).add(`${index}:${stroke.base.cells[index] + 1}`));
    try { setWorld(applyDesertAction(stroke.base, earned, { type: 'water', cells: [...stroke.cells] })); }
    catch { /* the message appears when the stroke finishes */ }
  }

  function extendStroke(x: number, y: number) {
    const stroke = strokeRef.current;
    if (!stroke) return;
    const from = stroke.last;
    const distance = Math.max(Math.abs(x - from.x) * DESERT_COLS, Math.abs(y - from.y) * DESERT_ROWS / (1 - DESERT_GROUND_TOP));
    const steps = Math.min(80, Math.max(1, Math.ceil(distance * 3)));
    for (let step = 1; step <= steps; step += 1) {
      const portion = step / steps;
      addWaterPoint(from.x + (x - from.x) * portion, from.y + (y - from.y) * portion);
    }
    stroke.last = { x, y };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (selected !== 'water') {
      if (!placementPoint && inventoryCount > 0) setHoverPoint(scenePoint(event));
      return;
    }
    if (!strokeRef.current) return;
    const point = scenePoint(event);
    if (point) { extendStroke(point.x, point.y); moveHero(point.x, point.y); }
  }

  function finishStroke(event: React.PointerEvent<HTMLDivElement>) {
    const point = scenePoint(event);
    if (point) extendStroke(point.x, point.y);
    const stroke = strokeRef.current;
    strokeRef.current = null;
    if (!stroke) return;
    if (stroke.cells.size) wateringPoseTimer.current = setTimeout(() => setWateringPose(false), 1000);
    if (!stroke.cells.size) { setWorld(stroke.base); setMessage(stroke.base.water ? 'Выбери песчаный участок.' : 'В лейке пусто. Купи воду в магазине.'); return; }
    void commit({ type: 'water', cells: [...stroke.cells] }, stroke.base);
  }

  function confirmPlacement() {
    if (!placementPoint || !previewValid || selected === 'water' || !inventoryCount || busy) return;
    moveHero(placementPoint.x, placementPoint.y);
    void commit({ type: 'place', itemId: selected, id: crypto.randomUUID(), ...placementPoint, ...(selected === 'fence' ? { rotation: fenceRotation } : {}), ...(animals.has(selected) ? { facing: animalFacing } : { mirrored }), scale: objectScale });
    setPlacementPoint(null);
    setHoverPoint(null);
  }

  const direction = hero.direction;
  const showWateringImage = wateringPose && (Boolean(character?.watering) || !character || Object.keys(character).length === 0);
  const imageForDirection = showWateringImage
    ? character?.watering || `${sampleCharacter}watering.png`
    : character?.[direction] || `${sampleCharacter}${direction === 'threeQuarter' ? 'three-quarter' : direction}.png`;

  return <div className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-[#173246] font-sans text-white" role="dialog" aria-modal="true" aria-label={`Пустыня ученика ${studentName}`}>
    <header className="z-10 flex flex-wrap items-center justify-between gap-2 bg-[#153b3b]/95 px-3 py-2 shadow-lg sm:px-5">
      <button onClick={onClose} className="flex items-center gap-1 rounded-xl bg-white/15 px-3 py-2 text-sm font-black hover:bg-white/25"><ArrowLeft size={18} /> Назад</button>
      <div className="min-w-0 text-center"><h1 className="truncate text-base font-black sm:text-xl">🌍 Мир {studentName}</h1><p className="text-[11px] font-semibold text-emerald-200">Зелёных участков: {greenCount} из {DESERT_CELL_COUNT}</p></div>
      <div className="flex items-center gap-2"><span className="rounded-xl bg-amber-400 px-3 py-2 text-sm font-black text-amber-950">⭐ {balance}</span><span className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-black">💧 {world.water}</span></div>
    </header>

    <div ref={sceneRef} className="relative z-0 min-h-0 flex-1 select-none overflow-hidden touch-none" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerLeave={() => setHoverPoint(null)} onPointerUp={finishStroke} onPointerCancel={finishStroke}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 675" preserveAspectRatio="none" aria-hidden="true">
        <defs><filter id={`${maskId}-soft`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7" /></filter>{[1, 2, 3].map(stage => <mask id={`${maskId}-${stage}`} key={stage} maskUnits="userSpaceOnUse" x="0" y="0" width="1200" height="675"><rect width="1200" height="675" fill="black" /><g filter={`url(#${maskId}-soft)`}>{world.cells.map((level, index) => level >= stage && <path key={index} d={brushPaths[index]} fill="white" className={reveals.has(`${index}:${stage}`) ? 'desert-wet-reveal' : undefined} />)}</g></mask>)}</defs>
        <image href={`${import.meta.env.BASE_URL}${assets.sand}`} width="1200" height="675" preserveAspectRatio="none" />
        <image href={`${import.meta.env.BASE_URL}${assets.soil}`} width="1200" height="675" preserveAspectRatio="none" mask={`url(#${maskId}-1)`} />
        <image href={`${import.meta.env.BASE_URL}${assets.sprouts}`} width="1200" height="675" preserveAspectRatio="none" mask={`url(#${maskId}-2)`} />
        <image href={`${import.meta.env.BASE_URL}${assets.green}`} width="1200" height="675" preserveAspectRatio="none" mask={`url(#${maskId}-3)`} />
      </svg>
      {[...world.objects].sort((a, b) => a.y - b.y || a.x - b.x).map(object => {
        const item = DESERT_CATALOG.find(entry => entry.id === object.itemId);
        const sprite = itemSprites[object.itemId];
        return item && sprite && <img key={object.id} src={itemSpriteUrl(sprite.file)} alt={item.name} draggable={false} className="pointer-events-none absolute object-contain drop-shadow-lg" style={{ ...itemSpriteStyle(sprite, object.x, object.y, object.rotation || 0, object.mirrored === true || (animals.has(object.itemId) && object.facing === 'left'), object.scale ?? 1, object.itemId === 'fence'), zIndex: Math.round(object.y * 1000) }} />;
      })}
      {previewPoint && <img src={itemSpriteUrl(itemSprites[selected]!.file)} alt={`Предпросмотр: ${selectedItem.name}`} draggable={false} className={`pointer-events-none absolute object-contain drop-shadow-xl ${previewValid ? 'opacity-75' : 'opacity-35 grayscale'}`} style={{ ...itemSpriteStyle(itemSprites[selected]!, previewPoint.x, previewPoint.y, selected === 'fence' ? fenceRotation : 0, previewFlipped, objectScale, selected === 'fence'), zIndex: Math.round(previewPoint.y * 1000) + 1 }} />}
      <img src={imageForDirection} alt={showWateringImage ? 'Герой поливает пустыню' : 'Герой озеленяет пустыню'} draggable={false} className="pointer-events-none absolute h-[min(26vh,180px)] w-auto object-contain drop-shadow-xl transition-[left,top] duration-700 ease-out" style={{ left: `${hero.x * 100}%`, top: `${hero.y * 100}%`, zIndex: Math.round(hero.y * 1000), transform: `translate(-50%, -100%) ${hero.facesLeft && (showWateringImage || direction === 'side') ? 'scaleX(-1)' : ''}` }} />
      <div className="pointer-events-none absolute bottom-2 left-1/2 z-[1100] max-w-[90%] -translate-x-1/2 rounded-2xl bg-slate-950/70 px-4 py-2 text-center text-xs font-bold text-white sm:text-sm" role="status">{message}</div>
    </div>

    {selected !== 'water' && placementPoint && <div className="absolute right-3 top-16 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-2 text-xs font-bold text-slate-800 shadow-xl sm:right-5 sm:top-20 sm:text-sm"><span className={previewValid ? 'text-emerald-700' : 'text-rose-600'}>{previewValid ? '✓ Можно разместить' : selected === 'fence' ? 'Весь забор должен быть на зелени' : 'Выбери зелёный участок'}</span>{selected === 'fence' && <div className="flex items-center gap-1" aria-label="Поворот забора"><button aria-label="Повернуть забор влево на 15 градусов" onClick={() => setFenceRotation(value => (value + 345) % 360)} className="rounded-xl bg-amber-100 px-2 py-2 text-lg">↶</button><span className="min-w-9 text-center">{fenceRotation}°</span><button aria-label="Повернуть забор вправо на 15 градусов" onClick={() => setFenceRotation(value => (value + 15) % 360)} className="rounded-xl bg-amber-100 px-2 py-2 text-lg">↷</button></div>}{animals.has(selected) && <div className="flex items-center gap-1" aria-label="Направление животного"><button aria-label="Животное смотрит влево" aria-pressed={animalFacing === 'left'} onClick={() => setAnimalFacing('left')} className={`rounded-xl px-3 py-2 text-lg ${animalFacing === 'left' ? 'bg-amber-300' : 'bg-amber-100'}`}>←</button><button aria-label="Животное смотрит вправо" aria-pressed={animalFacing === 'right'} onClick={() => setAnimalFacing('right')} className={`rounded-xl px-3 py-2 text-lg ${animalFacing === 'right' ? 'bg-amber-300' : 'bg-amber-100'}`}>→</button></div>}<button disabled={!previewValid || busy} onClick={confirmPlacement} className="rounded-xl bg-emerald-600 px-3 py-2 font-black text-white disabled:bg-slate-300">Разместить здесь</button><button onClick={() => { setPlacementPoint(null); setHoverPoint(null); }} className="rounded-xl bg-slate-100 px-3 py-2">Отмена</button></div>}

    {selected !== 'water' && placementPoint && <div className="absolute left-3 top-32 z-20 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-2 text-xs font-bold text-slate-800 shadow-xl sm:left-5 sm:text-sm"><button aria-label="Зеркально отразить предмет" aria-pressed={previewFlipped} onClick={() => animals.has(selected) ? setAnimalFacing(value => value === 'left' ? 'right' : 'left') : setMirrored(value => !value)} className={`rounded-xl px-3 py-2 ${previewFlipped ? 'bg-amber-300' : 'bg-amber-100'}`}>↔ Зеркально</button><div className="flex items-center gap-1" aria-label="Размер предмета"><button aria-label="Уменьшить предмет" disabled={objectScale <= 0.5} onClick={() => setObjectScale(value => Math.max(0.5, Math.round((value - 0.1) * 10) / 10))} className="rounded-xl bg-emerald-100 px-3 py-2 text-lg disabled:opacity-40">−</button><span className="min-w-10 text-center">{Math.round(objectScale * 100)}%</span><button aria-label="Увеличить предмет" disabled={objectScale >= 2} onClick={() => setObjectScale(value => Math.min(2, Math.round((value + 0.1) * 10) / 10))} className="rounded-xl bg-emerald-100 px-3 py-2 text-lg disabled:opacity-40">+</button></div></div>}

    <footer className="z-10 flex items-center justify-between gap-2 bg-[#153b3b] px-3 py-2 sm:px-5"><div className="flex min-w-0 items-center gap-1 text-xs font-bold sm:text-sm">{selected === 'water' ? <Droplets size={18} className="shrink-0 text-sky-300" /> : <img src={itemSpriteUrl(itemSprites[selected]!.file)} alt="" className="h-7 w-7 shrink-0 object-contain" />}<span>{selectedItem.name} {selected === 'water' ? `· в лейке ${world.water}` : `· в рюкзаке ${inventoryCount}`}</span></div><div className="flex gap-2"><button onClick={() => setSelected('water')} className={`rounded-xl px-3 py-2 text-xs font-black ${selected === 'water' ? 'bg-sky-500' : 'bg-white/15'}`}><Droplets size={16} className="inline" /> Поливать</button><button onClick={() => setShopOpen(true)} className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-amber-950"><ShoppingBag size={16} className="inline" /> Магазин</button></div></footer>

    {shopOpen && <div className="absolute inset-0 z-20 flex items-end justify-center bg-slate-950/60 p-2 sm:items-center" onPointerDown={event => event.stopPropagation()}>
      <section className="max-h-[86dvh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-4 text-slate-800 shadow-2xl sm:p-6" aria-label="Магазин пустыни">
        <div className="flex items-center justify-between"><div><h2 className="text-xl font-black">Магазин оазиса</h2><p className="text-xs font-bold text-slate-500">Доступно ⭐ {balance}</p></div><button onClick={() => setShopOpen(false)} aria-label="Закрыть магазин" className="rounded-xl bg-slate-100 p-2"><X size={20} /></button></div>
        <p className="mt-2 text-xs font-semibold text-slate-500">Воду используй на песке. Предметы можно разместить на зелёной земле.</p>
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Разделы магазина">{shopSections.map(section => <button key={section.id} onClick={() => setShopSection(section.id)} className={`rounded-full px-3 py-1.5 text-xs font-black ${shopSection === section.id ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800'}`}>{section.label}</button>)}</div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{DESERT_CATALOG.filter(item => shopSection === 'all' || item.category === shopSection).map(item => <div key={item.id} className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 p-3 text-center">
          <div className="flex h-20 items-center justify-center" aria-hidden="true">{item.id === 'water' ? <Droplets size={42} className="text-sky-500" /> : <img src={itemSpriteUrl(itemSprites[item.id]!.file)} alt="" loading="lazy" className="h-full w-full object-contain" />}</div><div className="mt-1 text-sm font-black">{item.name}</div>
          <div className="text-xs font-bold text-amber-700">⭐ {item.id === 'water' ? item.price * waterQuantity : item.price}{item.id === 'water' ? ` · ${item.amount * waterQuantity} ${countWord(item.amount * waterQuantity, 'полив', 'полива', 'поливов')}` : ''}</div>
          {item.id === 'water' ? <div className="mt-2 flex items-center gap-1"><button aria-label="Уменьшить количество воды" disabled={waterQuantity <= 1} onClick={() => setWaterQuantity(value => value - 1)} className="h-9 w-8 shrink-0 rounded-xl bg-white text-xl font-black text-sky-800 disabled:opacity-40">−</button><span className="min-w-5 text-center text-sm font-black text-sky-900" aria-label={`${waterQuantity} ${countWord(waterQuantity, 'набор', 'набора', 'наборов')} воды`}>{waterQuantity}</span><button aria-label="Увеличить количество воды" disabled={waterQuantity >= 20 || (waterQuantity + 1) * 20 > balance} onClick={() => setWaterQuantity(value => value + 1)} className="h-9 w-8 shrink-0 rounded-xl bg-white text-xl font-black text-sky-800 disabled:opacity-40">+</button><button disabled={busy || balance < item.price * waterQuantity} onClick={() => { setSelected('water'); setPlacementPoint(null); setHoverPoint(null); void commit({ type: 'buy', itemId: 'water', quantity: waterQuantity }); }} className="h-9 min-w-0 flex-1 rounded-xl bg-emerald-600 px-1 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">Купить</button></div> : <button disabled={busy || balance < item.price} onClick={() => { setSelected(item.id); setPlacementPoint(null); setHoverPoint(null); void commit({ type: 'buy', itemId: item.id }); }} className="mt-2 w-full rounded-xl bg-emerald-600 px-2 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">Купить</button>}
          {item.id !== 'water' && (world.inventory[item.id] || 0) > 0 && <button onClick={() => { setSelected(item.id); setPlacementPoint(null); setHoverPoint(null); setShopOpen(false); setMessage('Наведи на землю, выбери место и посмотри на предмет перед размещением.'); }} className="mt-1 w-full rounded-xl bg-white px-2 py-2 text-xs font-black text-emerald-700">Разместить · {world.inventory[item.id]}</button>}
        </div>)}</div>
        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-800"><Sprout size={16} /> Мир и покупки сохраняются для этого ученика.</div>
      </section>
    </div>}
  </div>;
}
