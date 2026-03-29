/**
 * Sound Engine — Web Audio API synthesized sound effects
 * No audio files needed — pure programmatic sounds
 */

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Silently fail if audio context is blocked
  }
}

export const SoundEngine = {
  /** Soft chime for XP gain */
  xpGain: () => {
    playTone(880, 0.15, 'sine', 0.1);
    setTimeout(() => playTone(1100, 0.1, 'sine', 0.08), 80);
  },

  /** Pop for meal completion */
  mealComplete: () => {
    playTone(600, 0.12, 'sine', 0.12);
    setTimeout(() => playTone(900, 0.15, 'sine', 0.1), 60);
  },

  /** Fanfare for badge unlock */
  badgeUnlock: () => {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.3, 'triangle', 0.1), i * 150);
    });
  },

  /** Ascending chime for level up */
  levelUp: () => {
    [440, 554, 659, 880, 1047, 1319].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.25, 'sine', 0.08), i * 120);
    });
  },

  /** Fire crackle for streak milestone */
  streakMilestone: () => {
    playTone(200, 0.3, 'sawtooth', 0.05);
    setTimeout(() => playTone(400, 0.2, 'triangle', 0.1), 150);
    setTimeout(() => playTone(800, 0.15, 'sine', 0.08), 300);
  },

  /** Water splash */
  waterLog: () => {
    playTone(400, 0.1, 'sine', 0.08);
    setTimeout(() => playTone(600, 0.08, 'sine', 0.06), 50);
    setTimeout(() => playTone(500, 0.12, 'sine', 0.05), 100);
  },
};
