import { SentencePicturePair, Step16Config } from '../types';

export function createSentencePicturePair(): SentencePicturePair {
  return {
    id: `sentence-picture-${crypto.randomUUID()}`,
    plainText: '',
    syllabifiedText: '',
    imageDataUrl: '',
  };
}

export function defaultSentencePictureMatch(): Step16Config {
  return {
    title: '🔗 Соедини картинку с предложением',
    instruction: 'Прочитай предложение и соедини его с подходящей картинкой.',
    displayMode: 'whole',
    pairs: [],
  };
}
