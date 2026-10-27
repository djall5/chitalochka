import { LessonData, MemoryPair, ReadingCardItem, ReadingTextPage, Step7Config } from './types';

export type GameStepKey = 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6' | 'step7' | 'step8' | 'step9' | 'step10' | 'step11';

export interface GameLibraryItem {
  id: string;
  title: string;
  emoji: string;
  category: string;
  description: string;
  stepKey: GameStepKey;
  custom?: boolean;
}

export const DEFAULT_GAME_LIBRARY: GameLibraryItem[] = [
  { id: 'coloring', title: 'Раскрась слоги', emoji: '🎨', category: 'Слоги', description: 'Выбирай слог-образец и раскрашивай карточки с таким же слогом.', stepKey: 'step1' },
  { id: 'catch-syllables', title: 'Поймай слоги', emoji: '🎯', category: 'Слоги', description: 'Лови нужные слоги, пока они не упали.', stepKey: 'step2' },
  { id: 'letter-maze', title: 'Дорожка в лабиринте', emoji: '🧭', category: 'Буквы', description: 'Проведи героя по дорожке из изучаемой буквы.', stepKey: 'step3' },
  { id: 'free-drawing', title: 'Поле для рисования', emoji: '🖍️', category: 'Творчество', description: 'Нарисуй предмет или героя по теме урока.', stepKey: 'step4' },
  { id: 'missing-letter', title: 'Впиши пропущенную букву', emoji: '✍️', category: 'Слова', description: 'Вставь изучаемую букву и прочитай получившиеся слова.', stepKey: 'step5' },
  { id: 'reading-cards', title: 'Карточки для чтения', emoji: '📖', category: 'Чтение', description: 'Читай слова по слогам и слушай озвучку.', stepKey: 'step6' },
  { id: 'reading-text', title: 'Читаем текст', emoji: '📚', category: 'Чтение', description: 'Рассмотри иллюстрацию и прочитай текст обычным способом или по слогам.', stepKey: 'step7' },
  { id: 'build-house', title: 'Построй дом!', emoji: '🏠', category: 'Чтение', description: 'Читайте слова на кирпичиках и стройте из них дом.', stepKey: 'step8' },
  { id: 'memory', title: 'Мемори', emoji: '🃏', category: 'Память и чтение', description: 'Открывай карточки и находи пары букв, слогов или коротких слов с картинками.', stepKey: 'step9' },
  { id: 'fill-jar', title: 'Заполни банку', emoji: '🫙', category: 'Буквы и слова', description: 'Перетаскивай перемешанные буквы в банку, чтобы собрать слово.', stepKey: 'step10' },
  { id: 'speed-syllables', title: 'Найди слог на время', emoji: '⚡', category: 'Слоги', description: 'Смотри на слог вверху и быстро находи его среди карточек.', stepKey: 'step11' },
];

export const gameStepIndex = (key: GameStepKey) => Number(key.slice(4)) - 1;

export const lessonGameOrder = (lesson: LessonData) =>
  lesson.gameOrder?.length ? lesson.gameOrder : DEFAULT_GAME_LIBRARY.filter(game => !['step7', 'step8', 'step9', 'step10', 'step11'].includes(game.stepKey)).map(game => game.id);

export const cloneLesson = (lesson: LessonData): LessonData => {
  const copy = JSON.parse(JSON.stringify(lesson)) as LessonData;
  if (!copy.step7) copy.step7 = { title: '📖 Прочитай предложение!', instruction: 'Внимательно посмотрите на картинку и прочитайте текст вслух:', pages: [] };
  if (!copy.step8) copy.step8 = { title: '🏠 Построй дом!', instruction: 'Прочитай слово вслух и нажми на кирпичик, чтобы поставить его в дом. Можно проверить чтение через микрофон.', words: ['ДОМ', 'ОКНО', 'КРЫША', 'СТЕНА', 'ДВЕРЬ', 'ТРУБА'] };
  if (!copy.step9) copy.step9 = { title: '🃏 Мемори', instruction: 'Открывай карточки по две и ищи одинаковые буквы или слоги.', mode: 'symbols', pairs: [{ id: 'memory-default-1', first: 'МА', second: 'МА' }, { id: 'memory-default-2', first: 'МО', second: 'МО' }, { id: 'memory-default-3', first: 'МУ', second: 'МУ' }, { id: 'memory-default-4', first: 'МЫ', second: 'МЫ' }] };
  if (!copy.step10) copy.step10 = { title: '🫙 Заполни банку', instruction: 'Найди нужную букву среди остальных и перетащи её в банку.', targetLetter: 'А', targetCount: 16 };
  if (!copy.step11) copy.step11 = { title: '⚡ Найди слог на время!', instruction: 'Смотри на большой слог и быстро найди его среди карточек.', practiceLetters: 'М, А, О, У, И', syllables: ['МА', 'МО', 'МУ', 'МИ'], timeLimit: 30, optionsPerRound: 4 };
  if (!copy.step6) copy.step6 = { title: '📖 Читаем слова!', instruction: 'Нажимайте на карточки со словами и читайте их вслух!', cards: [] };
  if (!Number.isFinite(copy.step10.targetCount)) copy.step10.targetCount = 16;
  if (!Array.isArray(copy.step11.syllables)) copy.step11.syllables = [];
  if (typeof copy.step11.practiceLetters !== 'string') copy.step11.practiceLetters = '';
  if (!Number.isFinite(copy.step11.timeLimit)) copy.step11.timeLimit = 30;
  if (!Number.isFinite(copy.step11.optionsPerRound)) copy.step11.optionsPerRound = 4;
  if (!Array.isArray(copy.step9.pairs)) copy.step9.pairs = [];
  const legacyCards = copy.step6.cards as Array<ReadingCardItem & { showSyllables?: boolean }>;
  if (!copy.step6.displayMode) {
    copy.step6.displayMode = legacyCards.some(card => card.showSyllables || /[-‑]/.test(card.displayWord || '')) ? 'syllables' : 'whole';
  }
  copy.step6.cards = legacyCards.map(({ showSyllables: _legacyDisplayChoice, ...card }, index) => ({
    ...card,
    id: card.id || `reading-card-${index + 1}`,
    displayWord: card.displayWord || card.speakWord || '',
    speakWord: card.speakWord || card.displayWord || '',
  }));
  copy.step9.pairs = copy.step9.pairs.map((pair: MemoryPair, index: number) => ({ ...pair, id: pair.id || `memory-pair-${index + 1}`, first: pair.first || '', second: pair.second || '' }));
  const oldTextConfig = copy.step7 as Step7Config & Partial<ReadingTextPage>;
  if (!Array.isArray(oldTextConfig.pages)) {
    copy.step7.pages = [{ id: 'reading-page-legacy', imageDataUrl: oldTextConfig.imageDataUrl || '', plainText: oldTextConfig.plainText || '', syllabifiedText: oldTextConfig.syllabifiedText || '' }];
  }
  if (copy.step7.pages.length === 0) copy.step7.pages = [{ id: 'reading-page-1', imageDataUrl: '', plainText: '', syllabifiedText: '' }];
  return copy;
};
