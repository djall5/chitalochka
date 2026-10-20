// Russian phonetic color formatting and speech helpers

export function formatTextWithColors(text: string): string {
  const vowels = ['А', 'О', 'У', 'Ы', 'Э', 'Я', 'Ё', 'Ю', 'И', 'Е'];
  const alwaysSoft = ['Ч', 'Щ', 'Й'];
  const alwaysHard = ['Ж', 'Ш', 'Ц'];

  const chars = text.split('');
  let html = '';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === ' ' || ch === '.' || ch === ',' || ch === '-' || ch === '!') {
      html += ch;
      continue;
    }

    const upperCh = ch.toUpperCase();
    if (vowels.includes(upperCh)) {
      html += `<span class="text-[#e11d48] font-bold">${ch}</span>`;
    } else {
      let isSoft = false;
      if (alwaysSoft.includes(upperCh)) {
        isSoft = true;
      } else if (!alwaysHard.includes(upperCh) && i + 1 < chars.length) {
        const nextCh = chars[i + 1].toUpperCase();
        if (['И', 'Е', 'Ё', 'Ю', 'Я', 'Ь'].includes(nextCh)) {
          isSoft = true;
        }
      }

      if (isSoft) {
        html += `<span class="text-[#16a34a] font-bold">${ch}</span>`;
      } else {
        html += `<span class="text-[#2563eb] font-bold">${ch}</span>`;
      }
    }
  }
  return html;
}

export function speakRussianText(_text?: string) {
  // Voice synthesis removed as requested
}

import {
  playCorrectSound,
  playPopSound,
  playClickSound,
  playFanfareSound,
  playWrongSound,
  playTransitionSound,
} from './audio';

export {
  playCorrectSound,
  playPopSound,
  playClickSound,
  playFanfareSound,
  playWrongSound,
  playTransitionSound,
};

// Gentle audio chimes with Web Audio API
export function playChime(type: 'success' | 'catch' | 'click' | 'celebrate' | 'wrong' | 'transition' = 'success') {
  switch (type) {
    case 'success':
      playCorrectSound();
      break;
    case 'catch':
      playPopSound();
      break;
    case 'click':
      playClickSound();
      break;
    case 'celebrate':
      playFanfareSound();
      break;
    case 'wrong':
      playWrongSound();
      break;
    case 'transition':
      playTransitionSound();
      break;
    default:
      playCorrectSound();
  }
}

