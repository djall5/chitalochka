export interface PaletteItem {
  id: string;
  syllable: string;
  color: string;
  textColor?: string;
}

export interface Step1Config {
  title: string;
  instruction: string;
  palette: PaletteItem[];
  gridRows: number;
  gridCols: number;
  cells: string[]; // Length = gridRows * gridCols, matches syllable in palette
}

export interface Step2Config {
  title: string;
  instruction: string;
  syllables: string[];
  targetCatchCount: number;
  speed: 'slow' | 'medium' | 'fast';
}

export interface Step3Config {
  title: string;
  instruction: string;
  mascot: string;
  targetLetter: string;
  gridRows: number;
  gridCols: number;
  cells: string[][]; // gridRows x gridCols
  start: { row: number; col: number; label: string };
  goal: { row: number; col: number; label: string; span: number };
}

export interface Step4Config {
  title: string;
  instruction: string;
  canvasBg: string;
  promptWord?: string;
  paletteColors: string[];
}

export interface WordFillItem {
  id: string;
  before: string;
  missing: string;
  after: string;
  fullWord: string;
}

export interface Step5Config {
  title: string;
  instruction: string;
  targetLetter: string;
  words: WordFillItem[];
}

export interface ReadingCardItem {
  id: string;
  icon: string;
  displayWord: string; // e.g. "РУ-ЧЕЙ"
  speakWord: string;   // e.g. "ручей"
}

export interface Step6Config {
  title: string;
  instruction: string;
  cards: ReadingCardItem[];
}

export interface Step7Config {
  title: string;
  instruction: string;
  pages: ReadingTextPage[];
}

export interface Step8Config {
  title: string;
  instruction: string;
  words: string[];
}

export interface MemoryPair {
  id: string;
  first: string;
  second: string;
}

export interface Step9Config {
  title: string;
  instruction: string;
  mode: 'symbols' | 'word-picture';
  pairs: MemoryPair[];
}

export interface Step10Config {
  title: string;
  instruction: string;
  targetLetter: string;
  targetCount: number;
}

export interface ReadingTextPage {
  id: string;
  imageDataUrl: string;
  plainText: string;
  syllabifiedText: string;
}

export interface LessonData {
  id: string;
  title: string;
  subtitle: string;
  themeColor: string; // e.g. "#ec4899"
  bgGradient: string;
  targetLetter?: string;
  /** Ordered game-library ids included in this lesson. Missing means the original six-step lesson. */
  gameOrder?: string[];
  step1: Step1Config;
  step2: Step2Config;
  step3: Step3Config;
  step4: Step4Config;
  step5: Step5Config;
  step6: Step6Config;
  step7: Step7Config;
  step8: Step8Config;
  step9: Step9Config;
  step10: Step10Config;
}
