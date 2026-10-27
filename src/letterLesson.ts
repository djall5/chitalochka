import { LessonData } from './types';
import { GameStepKey } from './gameLibrary';
import { autoGenerateMazeGrid, autoGenerateSyllableGrid } from './utils/generators';
import { syllabifyRussian } from './utils/syllabifyRussian';

const vowels = ['А', 'О', 'У', 'Ы', 'Э', 'И', 'Е', 'Ё', 'Ю', 'Я'];
const paletteColors = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981'];

const wordsByLetter: Record<string, string[]> = {
  'А': ['АРБУЗ', 'АИСТ', 'АКУЛА', 'АПЕЛЬСИН'], 'Б': ['БАНАН', 'БЕЛКА', 'БАРАН', 'БАБОЧКА'],
  'В': ['ВОЛК', 'ВАЗА', 'ВИШНЯ', 'ВЕТЕР'], 'Г': ['ГРИБ', 'ГУСЬ', 'ГРУША', 'ГИТАРА'],
  'Д': ['ДОМ', 'ДЫНЯ', 'ДЕРЕВО', 'ДРАКОН'], 'Е': ['ЕЛЬ', 'ЕДА', 'ЕНОТ', 'ЕДИНОРОГ'],
  'Ё': ['ЁЖ', 'ЁЛКА', 'ЁРШ', 'ЁЛОЧКА'], 'Ж': ['ЖУК', 'ЖИРАФ', 'ЖАБА', 'ЖЕЛУДЬ'],
  'З': ['ЗОНТ', 'ЗАЯЦ', 'ЗЕБРА', 'ЗВЕЗДА'], 'И': ['ИГЛА', 'ИНДЮК', 'ИВА', 'ИГРУШКА'],
  'Й': ['ЙОД', 'ЙОГУРТ', 'ЙОГА', 'ЧАЙ'], 'К': ['КОТ', 'КИТ', 'КУКЛА', 'КНИГА'],
  'Л': ['ЛИСА', 'ЛУНА', 'ЛАМПА', 'ЛОДКА'], 'М': ['МЯЧ', 'МАМА', 'МОРЕ', 'МАШИНА'],
  'Н': ['НОС', 'НОТА', 'НЕБО', 'НОЖНИЦЫ'], 'О': ['ОСА', 'ОКНО', 'ОБЛАКО', 'ОСТРОВ'],
  'П': ['ПАПА', 'ПОЛЕ', 'ПТИЦА', 'ПАРОВОЗ'], 'Р': ['РАК', 'РОЗА', 'РЫБА', 'РАДУГА'],
  'С': ['САД', 'СОК', 'СЫР', 'САМОЛЁТ'], 'Т': ['ТОРТ', 'ТИГР', 'ТУЧА', 'ТРАКТОР'],
  'У': ['УТКА', 'УЛЕЙ', 'УЛИЦА', 'УДОЧКА'], 'Ф': ['ФОНАРЬ', 'ФЛАГ', 'ФРУКТ', 'ФИЛИН'],
  'Х': ['ХЛЕБ', 'ХОМЯК', 'ХВОСТ', 'ХОБОТ'], 'Ц': ['ЦАПЛЯ', 'ЦВЕТОК', 'ЦИРК', 'ЦЫПЛЁНОК'],
  'Ч': ['ЧАСЫ', 'ЧАЙ', 'ЧЕРЕПАХА', 'ЧЕМОДАН'], 'Ш': ['ШАР', 'ШУБА', 'ШАПКА', 'ШКОЛА'],
  'Щ': ['ЩУКА', 'ЩЁТКА', 'ЩЕНОК', 'ОВОЩИ'], 'Ъ': ['ПОДЪЁМ', 'ОБЪЯВЛЕНИЕ', 'СЪЁМКА', 'ОБЪЕКТ'],
  'Ы': ['МЫШЬ', 'РЫБА', 'СЫР', 'ТЫКВА'], 'Ь': ['КОНЬ', 'ДЕНЬ', 'СЕМЬЯ', 'ПАЛЬТО'],
  'Э': ['ЭКРАН', 'ЭТАЖ', 'ЭСКИМО', 'ЭКСКАВАТОР'], 'Ю': ['ЮЛА', 'ЮБКА', 'ЮНГА', 'ЮМОР'],
  'Я': ['ЯБЛОКО', 'ЯКОРЬ', 'ЯМА', 'ЯЩИК'],
};

function normalizeLetter(value: string) {
  const letter = value.toLocaleUpperCase('ru-RU').trim().slice(-1);
  return /^[А-ЯЁ]$/u.test(letter) ? letter : '';
}

function letterSyllables(letter: string) {
  if (letter === 'Ь' || letter === 'Ъ') return wordsByLetter[letter].map(word => word.slice(0, Math.min(3, word.length)));
  if (vowels.includes(letter)) return ['М', 'Н', 'Л', 'Р'].map(consonant => `${letter}${consonant}`);
  return ['А', 'О', 'У', 'И'].map(vowel => `${letter}${vowel}`);
}

function wordParts(word: string, letter: string, index: number) {
  const letterIndex = word.indexOf(letter);
  const missingIndex = letterIndex >= 0 ? letterIndex : 0;
  return {
    id: `letter-word-${letter}-${index + 1}`,
    before: word.slice(0, missingIndex),
    missing: letter,
    after: word.slice(missingIndex + 1),
    fullWord: word,
  };
}

export function applyLetterToSelectedGames(lesson: LessonData, gameKeys: GameStepKey[], value: string): LessonData {
  const letter = normalizeLetter(value);
  if (!letter) return lesson;

  const words = wordsByLetter[letter] || [];
  const syllables = letterSyllables(letter);
  const next = JSON.parse(JSON.stringify(lesson)) as LessonData;
  next.targetLetter = letter;
  if (!next.title || next.title === 'Новый урок') next.title = `Урок: буква ${letter}`;
  if (!next.subtitle) next.subtitle = `Изучаем букву ${letter} через игры, слоги и чтение.`;

  if (gameKeys.includes('step1')) {
    const palette = syllables.map((syllable, index) => ({ id: `palette-${letter}-${index + 1}`, syllable, color: paletteColors[index] }));
    next.step1 = {
      ...next.step1,
      title: '🎨 Раскрась слоги по образцу',
      instruction: `Выберите слог с буквой ${letter} и раскрасьте все такие же карточки.`,
      palette,
      cells: autoGenerateSyllableGrid(next.step1.gridRows * next.step1.gridCols, syllables),
    };
  }
  if (gameKeys.includes('step2')) next.step2 = { ...next.step2, title: `🎯 Поймай слоги с буквой ${letter}!`, instruction: `Читайте и ловите слоги с буквой ${letter}.`, syllables: [...syllables, ...syllables.map(syllable => `${syllable}${letter}`).slice(0, 2)] };
  if (gameKeys.includes('step3')) next.step3 = { ...next.step3, title: `🧭 Дорожка из буквы ${letter}`, instruction: `Проведите дорожку из буквы ${letter} от старта до финиша.`, targetLetter: letter, cells: autoGenerateMazeGrid(next.step3.gridRows, next.step3.gridCols, letter), goal: { ...next.step3.goal, label: `ФИНИШ · ${letter}` } };
  if (gameKeys.includes('step4')) next.step4 = { ...next.step4, title: `🖍️ Нарисуй предмет на букву ${letter}`, instruction: `Нарисуйте предмет на букву ${letter}.`, promptWord: words.slice(0, 2).join(' / ') };
  if (gameKeys.includes('step5')) next.step5 = { ...next.step5, title: `✍️ Впиши букву ${letter}`, instruction: `Впишите букву ${letter} в пропуски и прочитайте слова.`, targetLetter: letter, words: words.map((word, index) => wordParts(word, letter, index)) };
  if (gameKeys.includes('step6')) next.step6 = { ...next.step6, title: `📖 Читаем слова с буквой ${letter}`, instruction: `Читайте слова с буквой ${letter} по слогам и целиком.`, cards: words.map((word, index) => ({ id: `letter-card-${letter}-${index + 1}`, icon: ['⭐', '🌈', '🧩', '🎈'][index], displayWord: syllabifyRussian(word), speakWord: word.toLocaleLowerCase('ru-RU') })) };
  if (gameKeys.includes('step7')) {
    const plainText = `Сегодня мы изучаем букву ${letter}. Прочитаем слова: ${words.slice(0, 2).join(' и ').toLocaleLowerCase('ru-RU')}.`;
    next.step7 = { ...next.step7, title: `📚 Читаем про букву ${letter}`, instruction: `Прочитайте текст и найдите в нём букву ${letter}.`, pages: [{ id: `letter-text-${letter}`, imageDataUrl: '', plainText, syllabifiedText: syllabifyRussian(plainText) }] };
  }
  if (gameKeys.includes('step8')) next.step8 = { ...next.step8, title: `🏠 Построй дом из слов с буквой ${letter}`, instruction: `Прочитайте слова с буквой ${letter} и стройте дом.`, words };
  if (gameKeys.includes('step9')) next.step9 = { ...next.step9, title: `🃏 Мемори: буква ${letter}`, instruction: `Открывайте пары с буквой ${letter} и её слогами.`, mode: 'symbols', pairs: [letter, ...syllables.slice(0, 3)].map((symbol, index) => ({ id: `letter-memory-${letter}-${index + 1}`, first: symbol, second: symbol })) };
  if (gameKeys.includes('step10')) next.step10 = { ...next.step10, title: `🫙 Найди букву ${letter}`, instruction: `Найди букву ${letter} или ${letter.toLocaleLowerCase('ru-RU')} среди остальных и перетащи её в банку.`, targetLetter: letter };
  if (gameKeys.includes('step11')) next.step11 = { ...next.step11, title: `⚡ Найди слог с буквой ${letter}`, instruction: `Смотри на большой слог с буквой ${letter} и найди его среди карточек.`, syllables };
  return next;
}

export function isRussianLetter(value: string) {
  return Boolean(normalizeLetter(value));
}
