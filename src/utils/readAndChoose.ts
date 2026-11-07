import { ReadAndChooseAnswer, ReadAndChooseTask, Step14Config } from '../types';

export function createReadAndChooseAnswer(isCorrect = false): ReadAndChooseAnswer {
  return { id: `read-choose-answer-${crypto.randomUUID()}`, imageDataUrl: '', isCorrect };
}

export function createReadAndChooseTask(): ReadAndChooseTask {
  return {
    id: `read-choose-task-${crypto.randomUUID()}`,
    plainText: '',
    syllabifiedText: '',
    displayMode: 'whole',
    answers: [createReadAndChooseAnswer(true), createReadAndChooseAnswer(false)],
  };
}

export function defaultReadAndChooseStep(): Step14Config {
  return {
    title: '🖼️ Прочитай и выбери',
    instruction: 'Прочитай предложение и выбери подходящую картинку.',
    tasks: [],
  };
}
