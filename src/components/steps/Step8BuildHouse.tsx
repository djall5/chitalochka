import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, House, Mic, Square } from 'lucide-react';
import { Step8Config } from '../../types';

type Props = { config: Step8Config; onPrev: () => void; onNext: () => void; isLastGame: boolean; onCorrectAnswer?: (answerId: string) => void };
type SpeechAlternative = { transcript: string; confidence: number };
type SpeechResult = ArrayLike<SpeechAlternative>;
type SpeechResultEvent = Event & { results: ArrayLike<SpeechResult> };
type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: new () => BrowserSpeechRecognition;
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
};

export function Step8BuildHouse({ config, onPrev, onNext, isLastGame, onCorrectAnswer }: Props) {
  const words = useMemo(() => config.words.filter(word => word.trim()), [config.words]);
  const [placedIndexes, setPlacedIndexes] = useState<number[]>([]);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [feedback, setFeedback] = useState('');
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const currentIndex = placedIndexes.length;
  const currentWord = words[currentIndex];
  const columns = Math.min(3, Math.max(1, words.length));
  const rows = Math.max(1, Math.ceil(words.length / columns));
  const roofRatio = `${Math.min(98, (340 / Math.max(1, Math.min(340, window.innerWidth - 56))) * 100)}%`;

  const stopListening = () => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    recognition?.abort();
    setListening(false);
  };

  useEffect(() => () => { recognitionRef.current?.abort(); }, []);

  const placeCurrentWord = (message?: string) => {
    if (!currentWord) return;
    stopListening();
    setPlacedIndexes(previous => previous.includes(currentIndex) ? previous : [...previous, currentIndex]);
    onCorrectAnswer?.(`house-brick-${currentIndex}`);
    setVoiceError('');
    setFeedback(message || `Кирпич «${currentWord}» встал на место!`);
  };

  const startVoiceCheck = () => {
    setVoiceError('');
    setFeedback('');
    const SpeechRecognitionConstructor = (window as WindowWithSpeechRecognition).SpeechRecognition || (window as WindowWithSpeechRecognition).webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) {
      setVoiceError('Голосовая проверка не поддерживается этим браузером. Нажми на слово, чтобы поставить кирпич.');
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognitionRef.current = recognition;
    recognition.lang = 'ru-RU';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 3;
    recognition.onresult = event => {
      if (recognitionRef.current !== recognition) return;
      const result = event.results[event.results.length - 1];
      const alternatives = Array.from({ length: result?.length || 0 }, (_, index) => result[index].transcript.trim());
      const normalize = (text: string) => text.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').replace(/[^а-яa-z0-9]+/gi, ' ').trim().replace(/\s+/g, ' ');
      const expected = normalize(currentWord || '');
      const match = alternatives.find(item => normalize(item) === expected);
      recognitionRef.current = null;
      setListening(false);
      recognition.stop();
      if (match) placeCurrentWord(`🎙 Распознано: «${match}». Кирпич поставлен!`);
      else setVoiceError(`Не удалось точно распознать слово «${currentWord}». Услышано: «${alternatives.join(' / ') || 'ничего'}». Попробуй ещё раз или нажми на слово.`);
    };
    recognition.onerror = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      setListening(false);
      setVoiceError('Не удалось распознать речь. Проверь разрешение на микрофон или нажми на слово.');
    };
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      setListening(false);
      setVoiceError('Речь не распознана. Попробуй ещё раз или нажми на слово.');
    };
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setVoiceError('Не удалось запустить распознавание. Нажми на слово, чтобы поставить кирпич.');
    }
  };

  const brickForSlot = (slot: number) => {
    const buildOrder = Array.from({ length: words.length }, (_, index) => (rows - 1 - Math.floor(index / columns)) * columns + index % columns);
    const position = buildOrder.indexOf(slot);
    return position >= 0 ? words[placedIndexes[position]] : undefined;
  };

  return <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
    <h2 className="text-xl font-black text-pink-600 md:text-2xl">{config.title}</h2>
    <p className="mb-4 mt-1 max-w-xl text-sm font-semibold text-slate-600">{config.instruction}</p>

    <div className="w-full rounded-3xl border-2 border-dashed border-amber-200 bg-gradient-to-b from-sky-50 to-amber-50 p-4 md:p-6">
      <div className="mx-auto flex w-full flex-col items-center">
        <div className="w-full max-w-[340px]" style={{ width: roofRatio }}><div className="aspect-[2.7/1] w-full bg-rose-400 drop-shadow-sm" style={{ clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }} /></div>
        <div className="-mt-px w-full max-w-[340px] border-4 border-amber-800 bg-amber-200 p-1.5 shadow-inner" style={{ width: roofRatio }}>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(42px, 1fr))` }}>
            {Array.from({ length: words.length }, (_, slot) => {
              const word = brickForSlot(slot);
              return <div key={slot} className={`flex min-h-11 min-w-0 items-center justify-center rounded-md border-2 px-1 text-[10px] font-black sm:text-xs ${word ? 'border-orange-800 bg-gradient-to-b from-orange-400 to-orange-600 text-white shadow' : 'border-dashed border-amber-500/50 bg-amber-100/60'}`}>{word || ''}</div>;
            })}
          </div>
          <div className="mx-auto mt-1 h-12 w-14 rounded-t-lg border-2 border-amber-900 bg-sky-100 sm:h-14 sm:w-16" />
        </div>
        <div className="h-3 w-full max-w-[340px] rounded-b bg-emerald-500" style={{ width: roofRatio }} />
      </div>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-black text-amber-800"><House className="h-4 w-4" />Построено кирпичей: {placedIndexes.length} из {words.length}</div>
    </div>

    {currentWord ? <div className="mt-4 flex w-full flex-col items-center">
      <p className="text-xs font-black text-slate-600">Кирпичик {currentIndex + 1} из {words.length} · прочитай слово вслух</p>
      <button onClick={() => placeCurrentWord()} disabled={listening} className="mt-2 min-w-48 rounded-xl border-2 border-orange-200 bg-orange-50 px-6 py-3 text-xl font-black text-orange-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60" aria-label={`Прочитал слово ${currentWord}, поставить кирпич`}>{currentWord}</button>
      <p className="mt-1 text-[10px] font-semibold text-slate-400">Нажми на слово, когда прочитаешь, — кирпич сразу встанет в дом.</p>
      <button onClick={listening ? stopListening : startVoiceCheck} className={`mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black ${listening ? 'bg-rose-500 text-white' : 'bg-violet-100 text-violet-700 hover:bg-violet-200'}`}>{listening ? <><Square className="h-3.5 w-3.5 fill-current" />Остановить проверку</> : <><Mic className="h-4 w-4" />Проверить слово голосом</>}</button>
      <p className="mt-1 max-w-sm text-[10px] font-semibold text-slate-400">В некоторых браузерах распознавание речи может выполняться онлайн.</p>
      {voiceError && <p role="status" className="mt-2 text-xs font-bold text-rose-600">{voiceError}</p>}
      {feedback && <p role="status" className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">{feedback}</p>}
    </div> : <div className="mt-4 rounded-2xl bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-700">🎉 Дом построен! Отличная работа!</div>}

    <div className="mt-5 grid w-full grid-cols-[1fr_auto_1fr] items-center gap-1"><button onClick={onPrev} className="justify-self-start inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 sm:px-4"><ArrowLeft className="h-4 w-4" />Назад к игре</button>{!currentWord && !isLastGame && <button onClick={onNext} className="col-start-3 justify-self-end inline-flex items-center gap-1 rounded-xl bg-pink-500 px-3 py-2 text-xs font-black text-white sm:px-4">Дальше по уроку<ArrowRight className="h-4 w-4" /></button>}</div>
  </div>;
}
