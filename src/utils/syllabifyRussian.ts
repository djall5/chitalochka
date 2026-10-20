const VOWELS = new Set('аеёиоуыэюя');
const LIQUIDS = new Set('лр');
const STOPS = new Set('бпвфгкдтзс');

function syllabifyWord(source: string) {
  const word = source.replace(/-/g, '');
  const vowelPositions = [...word].flatMap((letter, index) => VOWELS.has(letter.toLocaleLowerCase('ru-RU')) ? [index] : []);
  if (vowelPositions.length < 2) return word;

  const boundaries: number[] = [];
  for (let index = 1; index < vowelPositions.length; index++) {
    const previousVowel = vowelPositions[index - 1];
    const nextVowel = vowelPositions[index];
    const cluster = word.slice(previousVowel + 1, nextVowel).toLocaleLowerCase('ru-RU');
    let onsetLength = cluster.length ? 1 : 0;
    if (cluster.length === 2 && STOPS.has(cluster[0]) && LIQUIDS.has(cluster[1])) onsetLength = 2;
    boundaries.push(nextVowel - onsetLength);
  }

  let result = '';
  for (let index = 0; index < word.length; index++) {
    if (boundaries.includes(index)) result += '-';
    result += word[index];
  }
  return result;
}

/** Heuristic Russian syllable division: keeps punctuation and moves common consonant onsets together. */
export function syllabifyRussian(text: string) {
  return text.replace(/[А-Яа-яЁё-]+/gu, syllabifyWord);
}
