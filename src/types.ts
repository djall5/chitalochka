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
  practiceLetters?: string;
}

export interface Step3Config {
  title: string;
  instruction: string;
  mascot: string;
  targetLetter: string;
  targetLetters?: string[];
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
  /** The original word as entered by the teacher. */
  displayWord: string;
  /** Kept separately for older lessons and assistive technologies. */
  speakWord: string;
}

export type ReadingCardsDisplayMode = 'whole' | 'syllables';

export interface Step6Config {
  title: string;
  instruction: string;
  cards: ReadingCardItem[];
  /** One display choice applies to every card in the exercise. */
  displayMode?: ReadingCardsDisplayMode;
}

export interface Step7Config {
  title: string;
  instruction: string;
  pages: ReadingTextPage[];
  practiceLetters?: string;
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
  word?: string;
  emoji?: string;
  imageDataUrl?: string;
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
  targetLetters?: string[];
}

export interface ReadingTextPage {
  id: string;
  imageDataUrl: string;
  plainText: string;
  syllabifiedText: string;
}

/** A deliberately repeated game keeps its own configuration inside the lesson. */
export interface LessonGameInstance {
  sourceGameId: string;
  config: Record<string, unknown>;
}

export interface LessonData {
  id: string;
  title: string;
  subtitle: string;
  /** Lesson assembled quietly from the game library before the teacher names it. */
  isDraft?: boolean;
  /** A teacher-selected status. Missing means the status is calculated from attempts. */
  manualStatus?: LessonStatus;
  themeColor: string; // e.g. "#ec4899"
  bgGradient: string;
  targetLetter?: string;
  /** Ordered game-library ids included in this lesson. Missing means the original six-step lesson. */
  gameOrder?: string[];
  /** Per-instance settings used when the same game is deliberately added more than once. */
  gameInstances?: Record<string, LessonGameInstance>;
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

export type LessonStatus = 'in-progress' | 'completed' | 'repeat';
