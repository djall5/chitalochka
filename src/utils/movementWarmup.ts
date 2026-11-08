import { Step15Config } from '../types';

export function defaultMovementWarmup(): Step15Config {
  return {
    title: '🤸 Активная разминка',
    instruction: 'Повторяй движения из видео. Когда закончишь — нажми «Я готов!»',
    videoDataUrl: '',
    videoName: '',
  };
}
