import { Step17Config, WordSearchDirection, WordSearchWord } from '../types';

const LETTERS = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';

export const normalizedWord = (text: string) => text.replace(/[^А-Яа-яЁё]/g, '').toLocaleUpperCase('ru-RU');
export const lettersForWord = (text: string) => [...text].filter(letter => /[А-Яа-яЁё]/.test(letter));

export function createWordSearchWord(text = ''): WordSearchWord {
  return { id: `word-search-${crypto.randomUUID()}`, text, row: 0, column: 0, direction: 'horizontal' };
}

export function defaultWordSearch(): Step17Config {
  return { title: '🔎 Найди слова', instruction: 'Найди слова среди букв: проведи пальцем или мышью от первой буквы до последней.', rows: 8, columns: 8, showWordList: true, words: [createWordSearchWord('КОТ'), createWordSearchWord('СОК')], grid: [] };
}

const randomLetter = () => LETTERS[Math.floor(Math.random() * LETTERS.length)];
const emptyGrid = (rows: number, columns: number) => Array.from({ length: rows }, () => Array.from({ length: columns }, () => ''));

export function wordCells(word: WordSearchWord) {
  const letters = lettersForWord(word.text);
  const rowStep = word.direction === 'vertical' ? 1 : 0;
  const columnStep = word.direction === 'horizontal' ? 1 : 0;
  return letters.map((letter, index) => ({ row: word.row + rowStep * index, column: word.column + columnStep * index, letter }));
}

export function validateWordSearch(config: Pick<Step17Config, 'rows' | 'columns' | 'words' | 'grid'>) {
  if (config.words.length < 2 || config.words.length > 8) return 'Добавьте от 2 до 8 слов.';
  const occupied = new Map<string, string>();
  for (const word of config.words) {
    const letters = normalizedWord(word.text);
    if (letters.length < 2) return 'Каждое слово должно содержать минимум две русские буквы.';
    for (const cell of wordCells(word)) {
      if (cell.row < 0 || cell.row >= config.rows || cell.column < 0 || cell.column >= config.columns) return `Слово «${word.text}» не помещается в сетку.`;
      const key = `${cell.row}:${cell.column}`;
      if (occupied.has(key) && occupied.get(key) !== normalizedWord(cell.letter)) return 'Слова могут пересекаться только одинаковыми буквами.';
      occupied.set(key, normalizedWord(cell.letter));
      const gridLetter = config.grid[cell.row]?.[cell.column];
      if (gridLetter && normalizedWord(gridLetter) !== normalizedWord(cell.letter)) return `В сетке неверная буква для слова «${word.text}».`;
    }
  }
  return '';
}

export function placeWordsOnGrid(config: Step17Config) {
  const grid = Array.from({ length: config.rows }, (_, row) => Array.from({ length: config.columns }, (_, column) => config.grid[row]?.[column] || randomLetter()));
  for (const word of config.words) for (const cell of wordCells(word)) grid[cell.row][cell.column] = cell.letter;
  return grid;
}

export function generateWordSearch(config: Step17Config): { grid?: string[][]; words?: WordSearchWord[]; error?: string } {
  const words = config.words.map(word => ({ ...word, text: word.text.trim() }));
  if (words.length < 2 || words.length > 8) return { error: 'Добавьте от 2 до 8 слов.' };
  if (words.some(word => normalizedWord(word.text).length < 2)) return { error: 'Каждое слово должно содержать минимум две русские буквы.' };
  const grid = emptyGrid(config.rows, config.columns);
  const ordered = [...words].sort((a, b) => normalizedWord(b.text).length - normalizedWord(a.text).length);
  for (const word of ordered) {
    const letters = lettersForWord(word.text);
    const candidates: Array<{ row: number; column: number; direction: WordSearchDirection }> = [];
    for (const direction of ['horizontal', 'vertical'] as WordSearchDirection[]) {
      for (let row = 0; row < config.rows; row += 1) for (let column = 0; column < config.columns; column += 1) {
        const endRow = row + (direction === 'vertical' ? letters.length - 1 : 0);
        const endColumn = column + (direction === 'horizontal' ? letters.length - 1 : 0);
        if (endRow >= config.rows || endColumn >= config.columns) continue;
        if (letters.every((letter, index) => {
          const target = grid[row + (direction === 'vertical' ? index : 0)][column + (direction === 'horizontal' ? index : 0)];
          return !target || normalizedWord(target) === normalizedWord(letter);
        })) candidates.push({ row, column, direction });
      }
    }
    if (!candidates.length) return { error: `Не удалось разместить слово «${word.text}». Увеличьте поле или измените слова.` };
    const position = candidates[Math.floor(Math.random() * candidates.length)];
    word.row = position.row; word.column = position.column; word.direction = position.direction;
    letters.forEach((letter, index) => { grid[position.row + (position.direction === 'vertical' ? index : 0)][position.column + (position.direction === 'horizontal' ? index : 0)] = letter; });
  }
  return { words, grid: grid.map(row => row.map(letter => letter || randomLetter())) };
}
