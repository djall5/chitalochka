import { syllabifyRussian } from './syllabifyRussian';

const VOWELS = new Set([...'АЕЁИОУЫЭЮЯ']);
const softeningLetters = new Set([...'ЕЁИЮЯЬ']);
const ALWAYS_SOFT_CONSONANTS = new Set([...'ЙЧЩ']);
const ALWAYS_HARD_CONSONANTS = new Set([...'ЖШЦ']);

const emojiByWord: Array<[RegExp, string]> = [
  [/кот|кошка/i, '🐱'], [/собак|щен/i, '🐶'], [/мыш/i, '🐭'], [/рыб/i, '🐟'],
  [/ёж/i, '🦔'], [/зай|крол/i, '🐰'], [/лис/i, '🦊'], [/медвед/i, '🐻'], [/волк/i, '🐺'],
  [/птиц|вороб|попуга/i, '🐦'], [/утк/i, '🦆'], [/куриц|петух/i, '🐔'], [/коров/i, '🐮'], [/лошад/i, '🐴'], [/свин/i, '🐷'], [/коз/i, '🐐'],
  [/лев/i, '🦁'], [/тигр/i, '🐯'], [/слон/i, '🐘'], [/жираф/i, '🦒'], [/обезьян/i, '🐵'], [/черепах/i, '🐢'], [/лягуш/i, '🐸'], [/бабоч/i, '🦋'], [/пчел/i, '🐝'],
  [/дом/i, '🏠'], [/мяч/i, '⚽'], [/солн/i, '☀️'], [/цвет/i, '🌸'],
  [/дерев|ель/i, '🌳'], [/лист/i, '🍃'], [/гриб/i, '🍄'], [/дожд/i, '🌧️'], [/снег/i, '❄️'], [/облак/i, '☁️'], [/звезд/i, '⭐'], [/луна/i, '🌙'],
  [/машин|трактор/i, '🚗'], [/поезд/i, '🚆'], [/автобус/i, '🚌'], [/велосипед/i, '🚲'], [/ракет/i, '🚀'], [/самол/i, '✈️'], [/лодк|кораб/i, '🚢'], [/шар/i, '🎈'],
  [/книг/i, '📖'], [/кукл/i, '🪆'], [/робот/i, '🤖'], [/кубик/i, '🧊'], [/карандаш/i, '✏️'], [/кист/i, '🖌️'],
  [/яблок|груш|арбуз/i, '🍎'], [/банан/i, '🍌'], [/лимон/i, '🍋'], [/клубник/i, '🍓'], [/виноград/i, '🍇'], [/морков/i, '🥕'], [/хлеб/i, '🍞'], [/сыр/i, '🧀'], [/молок/i, '🥛'],
  [/чашк/i, '☕'], [/ложк/i, '🥄'], [/тарелк/i, '🍽️'],
];

const mascots: Record<string, string> = {
  'А': '🦈', 'Б': '🦋', 'В': '🐺', 'Г': '🍄', 'Д': '🏠', 'Ё': '🦔', 'Ж': '🦒', 'З': '🐰', 'И': '🪡', 'Й': '🧘', 'К': '🐱', 'Л': '🦊', 'М': '⚽', 'Н': '👃', 'О': '🐝', 'П': '🐦', 'Р': '🐟', 'С': '☀️', 'Т': '🐯', 'У': '🦆', 'Ф': '🌈', 'Х': '🍞', 'Ц': '🐥', 'Ч': '🐢', 'Ш': '🎈', 'Щ': '🛡️', 'Ю': '🪀', 'Я': '🍎',
};

const preschoolTextByLetter: Record<string, string> = {
  'А': 'Аня и Алла гуляли в парке. Аня нашла алый шар, а мама сказала: «Ура!»',
  'Б': 'Боря взял барабан и белый бубен. Бабушка была рада весёлой музыке.',
  'В': 'Вова увидел в лесу ворону. Ворона взяла ветку и полетела ввысь.',
  'Г': 'Галя гуляла у горки. Там гном нашёл гриб и подарил его Гале.',
  'Д': 'Дима делал домик для друзей. Дедушка дал Диме доски и дверцу.',
  'Е': 'Елена несёт печенье в лес. Белка ест орехи на ветке и встречает Елену.',
  'Ё': 'Ёжик нёс ёлочную игрушку. У ёлки его ждала весёлая пчёлка.',
  'Ж': 'Женя увидел жука на жёлтом листе. Жук жужжал и бежал к журавлю.',
  'З': 'Зоя и зайчик нашли зелёный зонт. За окном зазвенели капли дождя.',
  'И': 'Ира и Игорь играли в мяч. Ирисы и ивы качались у реки.',
  'Й': 'Йод нужен маленькой Лейле. Йогурт и чай стоят на её столе.',
  'К': 'Котик Кузя катал клубок. Коля кормил котика кусочком колбаски.',
  'Л': 'Лена ловила лёгкий лист. Лист летел над лужей и лёг на ладонь.',
  'М': 'Маша и мама мыли малину. Малыш Миша мечтал о маленьком медвежонке.',
  'Н': 'Нина нашла на поляне незабудки. Над ними летела нарядная бабочка.',
  'О': 'Оля отнесла овощи в огород. Около озера она увидела огромную утку.',
  'П': 'Петя принёс папе подарок. Папа поставил подарок на полку и поблагодарил Петю.',
  'Р': 'Рома рисовал радугу у реки. Рядом росли ромашки и рябина.',
  'С': 'Соня собрала сладкие сливы в саду. Серая синица села на старую сосну.',
  'Т': 'Таня читала тёплую сказку. Тигр Тоша тихо топал по тропинке.',
  'У': 'Уля увидела утят у утиного домика. Утята учили Улю улыбаться.',
  'Ф': 'Федя фотографировал фиалки. На фото получился фиолетовый фонтан.',
  'Х': 'Хома ходил по хвойному холму. Хомяк хранил хлеб в своей хатке.',
  'Ц': 'Цыплёнок Цыпа нашёл цветок. Целый день он цыплячьим голосом пел песенку.',
  'Ч': 'Чебурашка читал чудесную книжку. Чайка часто прилетала к чердаку.',
  'Ш': 'Шура шёл по широкой дорожке к школе. Шары шуршали в шкафу.',
  'Щ': 'Щенок нашёл щётку. Щётка щекотала щёки, а щенок щурился и смеялся.',
  'Ю': 'Юля увидела юлу у Юры. Юра крутил юлу на ярком ковре.',
  'Я': 'Яна нашла яблоко у ясеня. Яркая ягодка лежала рядом с яблоком.',
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

/** Colour one visible character without changing the way the teacher wrote it. */
export function phonemeCharacterColor(value: string, index: number) {
  const characters = [...value];
  const letter = (characters[index] || '').toLocaleUpperCase('ru-RU');
  if (VOWELS.has(letter)) return 'text-red-600';
  if (letter === 'Ь' || letter === 'Ъ') return 'text-slate-400';
  if (!/[А-ЯЁ]/u.test(letter)) return 'text-slate-700';
  const next = (characters[index + 1] || '').toLocaleUpperCase('ru-RU');
  if (ALWAYS_SOFT_CONSONANTS.has(letter)) return 'text-emerald-600';
  if (ALWAYS_HARD_CONSONANTS.has(letter)) return 'text-sky-600';
  if (softeningLetters.has(next)) return 'text-emerald-600';
  return 'text-sky-600';
}

export function generateSyllables(value: string) {
  const letters = [...value.toLocaleUpperCase('ru-RU')].filter(letter => /[А-ЯЁ]/u.test(letter));
  const vowels = ['А', 'О', 'У', 'И'];
  const consonants = letters.filter(letter => !VOWELS.has(letter));
  const result = consonants.flatMap(letter => vowels.map(vowel => `${letter}${vowel}`));
  return [...new Set(result.length ? result : letters.map(letter => `${letter}А`))].slice(0, 16);
}

/**
 * Make simple syllables for the timed syllable game without rewriting the
 * teacher's text.  In particular, lowercase input stays lowercase in the
 * result — normalisation is only used to recognise vowels and consonants.
 */
export function generateSyllablesPreservingCase(value: string, count = 16) {
  const letters = [...value].filter(letter => /[А-Яа-яЁё]/u.test(letter));
  const uniqueLetters = [...new Map(letters.map(letter => [letter, letter])).values()];
  const uppercase = (letter: string) => letter.toLocaleUpperCase('ru-RU');
  const vowels = uniqueLetters.filter(letter => VOWELS.has(uppercase(letter)));
  const consonants = uniqueLetters.filter(letter => {
    const normalized = uppercase(letter);
    return !VOWELS.has(normalized) && normalized !== 'Ь' && normalized !== 'Ъ';
  });
  const isLowercase = (letter: string) => letter === letter.toLocaleLowerCase('ru-RU');
  const fallbackVowels = (isLowercase(consonants[0] || letters[0] || 'А') ? ['а', 'о', 'у', 'ы', 'э', 'е', 'ё', 'ю', 'я', 'и'] : ['А', 'О', 'У', 'Ы', 'Э', 'Е', 'Ё', 'Ю', 'Я', 'И']);
  const usedVowels = vowels.length ? vowels : fallbackVowels;
  const usedConsonants = consonants.length
    ? consonants
    : [isLowercase(vowels[0] || letters[0] || 'А') ? 'м' : 'М'];
  const desiredCount = Math.max(2, Math.min(16, Number.isFinite(count) ? Math.floor(count) : 16));
  const vowelPool = [...new Map([...usedVowels, ...fallbackVowels].map(vowel => [vowel, vowel])).values()];
  return [...new Set(usedConsonants.flatMap(consonant => vowelPool.map(vowel => `${consonant}${vowel}`)))].slice(0, desiredCount);
}

export function mascotForLetters(value: string) {
  const letter = [...value.toLocaleUpperCase('ru-RU')].find(item => /[А-ЯЁ]/u.test(item)) || '';
  return mascots[letter] || '🌟';
}

export function makePreschoolText(value: string) {
  const letters = [...new Set([...value.toLocaleUpperCase('ru-RU')].filter(letter => /[А-ЯЁ]/u.test(letter)))];
  const selectedLetters = letters.length ? letters : ['А'];
  const targetedParts = selectedLetters.slice(0, 2).map(letter => preschoolTextByLetter[letter] || `Мы ищем букву ${letter} в знакомых словах.`);
  const plainText = targetedParts.join(' ');
  return { plainText, syllabifiedText: syllabifyRussian(plainText) };
}
