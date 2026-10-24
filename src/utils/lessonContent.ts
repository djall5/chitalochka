import { syllabifyRussian } from './syllabifyRussian';

const VOWELS = new Set([...'АЕЁИОУЫЭЮЯ']);
const softeningLetters = new Set([...'ЕЁИЮЯЬ']);

const emojiByWord: Array<[RegExp, string]> = [
  [/кот|кошка/i, '🐱'], [/собак|щен/i, '🐶'], [/мыш/i, '🐭'], [/рыб/i, '🐟'],
  [/ёж/i, '🦔'], [/зай|крол/i, '🐰'], [/лис/i, '🦊'], [/медвед/i, '🐻'],
  [/дом/i, '🏠'], [/мяч/i, '⚽'], [/солн/i, '☀️'], [/цвет/i, '🌸'],
  [/дерев|ель/i, '🌳'], [/машин|трактор/i, '🚗'], [/книг/i, '📖'], [/яблок|груш|арбуз/i, '🍎'],
  [/самол/i, '✈️'], [/лодк|кораб/i, '🚢'], [/шар/i, '🎈'], [/луна/i, '🌙'],
];

const mascots: Record<string, string> = {
  'А': '🦈', 'Б': '🦋', 'В': '🐺', 'Г': '🍄', 'Д': '🏠', 'Ё': '🦔', 'Ж': '🦒', 'З': '🐰', 'И': '🪡', 'Й': '🧘', 'К': '🐱', 'Л': '🦊', 'М': '⚽', 'Н': '👃', 'О': '🐝', 'П': '🐦', 'Р': '🐟', 'С': '☀️', 'Т': '🐯', 'У': '🦆', 'Ф': '🌈', 'Х': '🍞', 'Ц': '🐥', 'Ч': '🐢', 'Ш': '🎈', 'Щ': '🛡️', 'Ю': '🪀', 'Я': '🍎',
};

export function emojiForWord(value: string) {
  const word = value.toLocaleLowerCase('ru-RU');
  return emojiByWord.find(([pattern]) => pattern.test(word))?.[1] || '🌟';
}

export function phonemeColor(value: string) {
  const letters = [...value.toLocaleUpperCase('ru-RU')].filter(letter => /[А-ЯЁ]/u.test(letter));
  if (letters.length && letters.every(letter => VOWELS.has(letter))) return 'text-red-600';
  const first = letters[0] || '';
  const next = letters[1] || '';
  if (first && !VOWELS.has(first) && softeningLetters.has(next)) return 'text-emerald-600';
  return 'text-sky-600';
}

export function generateSyllables(value: string) {
  const letters = [...value.toLocaleUpperCase('ru-RU')].filter(letter => /[А-ЯЁ]/u.test(letter));
  const vowels = ['А', 'О', 'У', 'И'];
  const consonants = letters.filter(letter => !VOWELS.has(letter));
  const result = consonants.flatMap(letter => vowels.map(vowel => `${letter}${vowel}`));
  return [...new Set(result.length ? result : letters.map(letter => `${letter}А`))].slice(0, 16);
}

export function mascotForLetters(value: string) {
  const letter = [...value.toLocaleUpperCase('ru-RU')].find(item => /[А-ЯЁ]/u.test(item)) || '';
  return mascots[letter] || '🌟';
}

export function makePreschoolText(value: string) {
  const letters = [...value.toLocaleUpperCase('ru-RU')].filter(letter => /[А-ЯЁ]/u.test(letter));
  const joined = letters.join(' и ');
  const examples = letters.includes('Щ') || letters.includes('Ч') ? 'Щенок и черепаха играют в саду.' : 'Мама и малыш играют в саду.';
  const plainText = `Сегодня мы играем с буквами ${joined || 'А'}. ${examples}`;
  return { plainText, syllabifiedText: syllabifyRussian(plainText) };
}
