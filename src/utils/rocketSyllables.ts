import { Step12Config } from '../types';

export const DEFAULT_ROCKET_VOWELS = ['А', 'О', 'У', 'Ы', 'Э', 'Е', 'Ё', 'Ю', 'Я', 'И'];
const vowelLetters = new Set(DEFAULT_ROCKET_VOWELS);

function isRussianLetter(value: string) {
  return /^[А-Яа-яЁё]$/u.test(value);
}

/** Keeps the spelling and case entered by the teacher while removing repeats. */
export function parseRocketLetters(value: string, limit: number) {
  return [...new Map([...value].filter(isRussianLetter).map(letter => [letter, letter])).values()].slice(0, limit);
}

export function parseRocketVowels(value: string) {
  return parseRocketLetters(value, 10).filter(letter => vowelLetters.has(letter.toLocaleUpperCase('ru-RU')));
}

export function parseRocketConsonants(value: string) {
  return parseRocketLetters(value, 4).filter(letter => !vowelLetters.has(letter.toLocaleUpperCase('ru-RU')) && !['Ь', 'Ъ'].includes(letter.toLocaleUpperCase('ru-RU')));
}

/** Each new consonant is placed to the left of the existing cluster. */
export function generateRocketStages(vowels: string[], consonants: string[]) {
  const cleanVowels = vowels.filter(letter => isRussianLetter(letter) && vowelLetters.has(letter.toLocaleUpperCase('ru-RU')));
  const cleanConsonants = consonants.filter(letter => isRussianLetter(letter) && !vowelLetters.has(letter.toLocaleUpperCase('ru-RU')) && !['Ь', 'Ъ'].includes(letter.toLocaleUpperCase('ru-RU'))).slice(0, 4);
  const stages = [cleanVowels];
  let cluster = '';
  cleanConsonants.forEach(letter => {
    cluster = `${letter}${cluster}`;
    stages.push(cleanVowels.map(vowel => `${cluster}${vowel}`));
  });
  return stages;
}

export function defaultRocketSyllables(): Step12Config {
  const vowels = [...DEFAULT_ROCKET_VOWELS];
  const consonants = ['Т', 'С'];
  return {
    title: '🚀 Ракета слогов',
    instruction: 'Прочитай столбик и нажми кнопку, чтобы ракета полетела дальше.',
    vowels,
    consonants,
    stages: generateRocketStages(vowels, consonants),
  };
}
