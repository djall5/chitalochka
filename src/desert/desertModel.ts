export const DESERT_COLS = 12;
export const DESERT_ROWS = 8;
export const DESERT_GROUND_TOP = 0.28;
export const DESERT_CELL_COUNT = DESERT_COLS * DESERT_ROWS;

export const DESERT_CATALOG = [
  { id: 'water', name: 'Вода', icon: '💧', price: 20, amount: 4, category: 'water' },
  { id: 'flower', name: 'Цветы', icon: '🌼', price: 20, category: 'plants' },
  { id: 'bush', name: 'Кустарник', icon: '🌿', price: 35, category: 'plants' },
  { id: 'tree', name: 'Дерево', icon: '🌳', price: 70, category: 'plants' },
  { id: 'mushroom', name: 'Грибы', icon: '🍄', price: 25, category: 'life' },
  { id: 'butterfly', name: 'Бабочка', icon: '🦋', price: 35, category: 'life' },
  { id: 'bee', name: 'Пчела', icon: '🐝', price: 35, category: 'life' },
  { id: 'rabbit', name: 'Кролик', icon: '🐇', price: 60, category: 'life' },
  { id: 'bird', name: 'Птица', icon: '🐦', price: 50, category: 'life' },
] as const;

export type DesertItemId = typeof DESERT_CATALOG[number]['id'];
export type DesertAction =
  | { type: 'buy'; itemId: DesertItemId }
  | { type: 'water'; cells: number[] }
  | { type: 'place'; itemId: DesertItemId; x: number; y: number; id: string };

export interface DesertObject { id: string; itemId: DesertItemId; x: number; y: number }
export interface DesertState {
  spent: number;
  water: number;
  cells: number[];
  inventory: Partial<Record<DesertItemId, number>>;
  objects: DesertObject[];
}

export function blankDesert(): DesertState {
  return { spent: 0, water: 0, cells: Array(DESERT_CELL_COUNT).fill(0), inventory: {}, objects: [] };
}

export function normalizeDesert(value: unknown): DesertState {
  const empty = blankDesert();
  if (!value || typeof value !== 'object') return empty;
  const input = value as Partial<DesertState>;
  const cells = Array.isArray(input.cells) && input.cells.length === DESERT_CELL_COUNT
    ? input.cells.map(stage => Number.isInteger(stage) ? Math.max(0, Math.min(3, stage)) : 0)
    : empty.cells;
  const inventory: DesertState['inventory'] = {};
  for (const item of DESERT_CATALOG) {
    const count = input.inventory?.[item.id];
    if (Number.isSafeInteger(count) && count! > 0) inventory[item.id] = Math.min(count!, 1000);
  }
  const objects = Array.isArray(input.objects) ? input.objects.filter((object): object is DesertObject =>
    Boolean(object && typeof object.id === 'string' && DESERT_CATALOG.some(item => item.id === object.itemId && item.id !== 'water')
      && Number.isFinite(object.x) && object.x >= 0 && object.x <= 1 && Number.isFinite(object.y) && object.y >= DESERT_GROUND_TOP && object.y <= 1)).slice(0, 500) : [];
  return { spent: Number.isSafeInteger(input.spent) && input.spent! >= 0 ? input.spent! : 0,
    water: Number.isSafeInteger(input.water) && input.water! >= 0 ? input.water! : 0,
    cells, inventory, objects };
}

export function desertBalance(earned: number, desert: DesertState): number {
  return Math.max(0, earned - desert.spent);
}

export function desertCellAt(x: number, y: number): number | null {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x >= 1 || y < DESERT_GROUND_TOP || y >= 1) return null;
  const col = Math.floor(x * DESERT_COLS);
  const row = Math.floor((y - DESERT_GROUND_TOP) / (1 - DESERT_GROUND_TOP) * DESERT_ROWS);
  return Math.min(DESERT_ROWS - 1, row) * DESERT_COLS + col;
}

export function applyDesertAction(current: DesertState, earned: number, action: DesertAction): DesertState {
  const desert = normalizeDesert(current);
  if (action.type === 'buy') {
    const item = DESERT_CATALOG.find(entry => entry.id === action.itemId);
    if (!item || desertBalance(earned, desert) < item.price) throw new Error('Недостаточно баллов для покупки.');
    if (item.id === 'water') return { ...desert, spent: desert.spent + item.price, water: desert.water + item.amount };
    return { ...desert, spent: desert.spent + item.price, inventory: { ...desert.inventory, [item.id]: (desert.inventory[item.id] || 0) + 1 } };
  }
  if (action.type === 'water') {
    const cells = [...desert.cells];
    let water = desert.water;
    for (const index of new Set(action.cells)) {
      if (!Number.isInteger(index) || index < 0 || index >= DESERT_CELL_COUNT || cells[index] >= 3 || water <= 0) continue;
      cells[index] += 1;
      water -= 1;
    }
    if (water === desert.water) throw new Error(water <= 0 ? 'Купи воду в магазине.' : 'Этот участок уже зелёный.');
    return { ...desert, cells, water };
  }
  const item = DESERT_CATALOG.find(entry => entry.id === action.itemId);
  const index = desertCellAt(action.x, action.y);
  if (!item || item.id === 'water' || index === null || desert.cells[index] !== 3) throw new Error('Разместить покупку можно только на зелёном участке.');
  if (!desert.inventory[item.id]) throw new Error('Сначала купи предмет в магазине.');
  if (!action.id || desert.objects.some(object => object.id === action.id)) throw new Error('Не удалось разместить предмет.');
  return { ...desert,
    inventory: { ...desert.inventory, [item.id]: desert.inventory[item.id]! - 1 },
    objects: [...desert.objects, { id: action.id, itemId: item.id, x: action.x, y: action.y }] };
}
