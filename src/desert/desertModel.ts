export const DESERT_COLS = 12;
export const DESERT_ROWS = 4;
export const DESERT_GROUND_TOP = 0.28;
export const DESERT_CELL_COUNT = DESERT_COLS * DESERT_ROWS;

export const DESERT_CATALOG = [
  { id: 'water', name: 'Вода', price: 20, amount: 4, category: 'water' },
  { id: 'flower', name: 'Цветы', price: 20, category: 'plants' },
  { id: 'purpleFlower', name: 'Сиреневые цветы', price: 25, category: 'plants' },
  { id: 'bush', name: 'Кустарник', price: 35, category: 'plants' },
  { id: 'tree', name: 'Дерево', price: 70, category: 'plants' },
  { id: 'willow', name: 'Ива', price: 85, category: 'plants' },
  { id: 'mushroom', name: 'Грибы', price: 25, category: 'life' },
  { id: 'butterfly', name: 'Бабочка', price: 35, category: 'life' },
  { id: 'bee', name: 'Пчела', price: 35, category: 'life' },
  { id: 'rabbit', name: 'Кролик', price: 60, category: 'life' },
  { id: 'hedgehog', name: 'Ёжик', price: 45, category: 'life' },
  { id: 'bird', name: 'Птица', price: 50, category: 'life' },
  { id: 'ladybug', name: 'Божья коровка', price: 25, category: 'life' },
  { id: 'fence', name: 'Секция забора', price: 35, category: 'fences' },
  { id: 'woodenCottage', name: 'Деревянный домик', price: 120, category: 'buildings' },
  { id: 'treehouse', name: 'Домик на дереве', price: 160, category: 'buildings' },
  { id: 'stoneCottage', name: 'Каменный домик', price: 180, category: 'buildings' },
  { id: 'squirrel', name: 'Белка', price: 45, category: 'life' },
  { id: 'fox', name: 'Лиса', price: 80, category: 'life' },
  { id: 'wolf', name: 'Волк', price: 100, category: 'life' },
  { id: 'deer', name: 'Олень', price: 110, category: 'life' },
] as const;

export const DESERT_FENCE_LENGTH = 160;

export type DesertItemId = typeof DESERT_CATALOG[number]['id'];
export type DesertAction =
  | { type: 'buy'; itemId: DesertItemId; quantity?: number }
  | { type: 'water'; cells: number[] }
  | { type: 'place'; itemId: DesertItemId; x: number; y: number; id: string; rotation?: number };

export interface DesertObject { id: string; itemId: DesertItemId; x: number; y: number; rotation?: number }
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
  const stage = (value: unknown) => typeof value === 'number' && Number.isInteger(value) ? Math.max(0, Math.min(3, value)) : 0;
  const cells = Array.isArray(input.cells) && input.cells.length === DESERT_CELL_COUNT
    ? input.cells.map(stage)
    : Array.isArray(input.cells) && input.cells.length === DESERT_CELL_COUNT * 2
      ? Array.from({ length: DESERT_CELL_COUNT }, (_, index) => {
        const row = Math.floor(index / DESERT_COLS);
        const col = index % DESERT_COLS;
        return Math.min(3, stage(input.cells![(row * 2) * DESERT_COLS + col]) + stage(input.cells![(row * 2 + 1) * DESERT_COLS + col]));
      })
      : empty.cells;
  const inventory: DesertState['inventory'] = {};
  for (const item of DESERT_CATALOG) {
    const count = input.inventory?.[item.id];
    if (Number.isSafeInteger(count) && count! > 0) inventory[item.id] = Math.min(count!, 1000);
  }
  const objects = Array.isArray(input.objects) ? input.objects.filter((object): object is DesertObject =>
    Boolean(object && typeof object.id === 'string' && DESERT_CATALOG.some(item => item.id === object.itemId && item.id !== 'water')
      && Number.isFinite(object.x) && object.x >= 0 && object.x <= 1 && Number.isFinite(object.y) && object.y >= DESERT_GROUND_TOP && object.y <= 1))
      .slice(0, 500).map(object => ({ id: object.id, itemId: object.itemId, x: object.x, y: object.y,
        ...(object.itemId === 'fence' && Number.isInteger(object.rotation) && object.rotation! >= 0 && object.rotation! < 360 && object.rotation! % 15 === 0 ? { rotation: object.rotation } : {}) })) : [];
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

export function canPlaceDesertItem(desert: DesertState, itemId: DesertItemId, x: number, y: number, rotation = 0): boolean {
  if (itemId === 'water') return false;
  const center = desertCellAt(x, y);
  if (center === null || desert.cells[center] !== 3) return false;
  if (itemId !== 'fence') return true;
  if (!Number.isInteger(rotation) || rotation < 0 || rotation >= 360 || rotation % 15 !== 0) return false;
  const angle = rotation * Math.PI / 180;
  for (let sample = -4; sample <= 4; sample++) {
    const distance = sample / 4 * DESERT_FENCE_LENGTH / 2;
    const index = desertCellAt(x + Math.cos(angle) * distance / 1200, y + Math.sin(angle) * distance / 675);
    if (index === null || desert.cells[index] !== 3) return false;
  }
  return true;
}

export function applyDesertAction(current: DesertState, earned: number, action: DesertAction): DesertState {
  const desert = normalizeDesert(current);
  if (action.type === 'buy') {
    const item = DESERT_CATALOG.find(entry => entry.id === action.itemId);
    const quantity = action.quantity ?? 1;
    if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new Error('Выбери от 1 до 20 предметов.');
    const totalPrice = item.price * quantity;
    if (desertBalance(earned, desert) < totalPrice) throw new Error('Недостаточно баллов для покупки.');
    if (item.id === 'water') return { ...desert, spent: desert.spent + totalPrice, water: desert.water + item.amount * quantity };
    return { ...desert, spent: desert.spent + totalPrice, inventory: { ...desert.inventory, [item.id]: (desert.inventory[item.id] || 0) + quantity } };
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
  if (!item || item.id === 'water' || index === null || !canPlaceDesertItem(desert, item.id, action.x, action.y, action.rotation ?? 0)) throw new Error(item?.id === 'fence' ? 'Вся секция забора должна стоять на зелёной земле.' : 'Разместить покупку можно только на зелёном участке.');
  if (!desert.inventory[item.id]) throw new Error('Сначала купи предмет в магазине.');
  if (!action.id || desert.objects.some(object => object.id === action.id)) throw new Error('Не удалось разместить предмет.');
  if (desert.objects.length >= 500) throw new Error('Мир уже заполнен.');
  return { ...desert,
    inventory: { ...desert.inventory, [item.id]: desert.inventory[item.id]! - 1 },
    objects: [...desert.objects, { id: action.id, itemId: item.id, x: action.x, y: action.y, ...(item.id === 'fence' ? { rotation: action.rotation ?? 0 } : {}) }] };
}
