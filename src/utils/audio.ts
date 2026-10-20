// Audio effects system using the Web Audio API

let isAudioMuted = false;

// Check localStorage for saved sound preference
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('literacy_sound_enabled');
    if (saved !== null) {
      isAudioMuted = saved === 'false';
    }
  } catch {
    // ignore
  }
}

export function isSoundMuted(): boolean {
  return isAudioMuted;
}

export function setSoundMuted(muted: boolean): void {
  isAudioMuted = muted;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('literacy_sound_enabled', muted ? 'false' : 'true');
    } catch {
      // ignore
    }
  }
}

export function toggleSound(): boolean {
  setSoundMuted(!isAudioMuted);
  if (!isAudioMuted) {
    playTransitionSound();
  }
  return !isAudioMuted;
}

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Sound of a correct answer (приятный звонкий мажорный перезвон)
 */
export function playCorrectSound() {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Notes: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
  const notes = [523.25, 659.25, 783.99, 1046.5];

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);

    gain.gain.setValueAtTime(0, now + idx * 0.08);
    gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + 0.38);
  });
}

/**
 * Sound of transitioning between levels/steps (плавный свистящий перелив вверх)
 */
export function playTransitionSound() {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Dual oscillator whoosh / transition sweep
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc2.type = 'triangle';

  // Smooth pitch slide from 380Hz up to 880Hz
  osc1.frequency.setValueAtTime(380, now);
  osc1.frequency.exponentialRampToValueAtTime(880, now + 0.22);

  osc2.frequency.setValueAtTime(570, now);
  osc2.frequency.exponentialRampToValueAtTime(1320, now + 0.22);

  gain.gain.setValueAtTime(0.05, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.3);
  osc2.stop(now + 0.3);
}

/**
 * Sound for incorrect answer or trying again (мягкий не пугающий тон)
 */
export function playWrongSound() {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.25);
}

/**
 * Bubble pop / catching a falling syllable
 */
export function playPopSound() {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.12);
}

/**
 * Gentle click sound
 */
export function playClickSound() {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.05);
}

/**
 * Celebratory fanfare melody on completing a lesson
 */
export function playFanfareSound() {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // C5, E5, G5, C6 arpeggio with celebratory finish
  const melody = [
    { freq: 523.25, time: 0.0, dur: 0.12 },
    { freq: 659.25, time: 0.1, dur: 0.12 },
    { freq: 783.99, time: 0.2, dur: 0.15 },
    { freq: 1046.5, time: 0.35, dur: 0.4 },
  ];

  melody.forEach(note => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(note.freq, now + note.time);

    gain.gain.setValueAtTime(0, now + note.time);
    gain.gain.linearRampToValueAtTime(0.25, now + note.time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + note.time);
    osc.stop(now + note.time + note.dur);
  });
}
