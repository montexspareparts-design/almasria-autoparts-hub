const SOUND_KEY = "dealer_sound_enabled";

/** Check if pricing sounds are enabled (default: true) */
export const isSoundEnabled = (): boolean => {
  return localStorage.getItem(SOUND_KEY) !== "false";
};

/** Toggle pricing sound on/off */
export const setSoundEnabled = (enabled: boolean) => {
  localStorage.setItem(SOUND_KEY, String(enabled));
};

/** Plays a short pleasant "cha-ching" confirmation sound when a product is priced */
export const playPricingSound = () => {
  if (!isSoundEnabled()) return;
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Two quick ascending tones — soft cash-register feel
    [0, 0.1].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = i === 0 ? 1200 : 1600;
      gain.gain.setValueAtTime(0.12, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);
      osc.start(now + offset);
      osc.stop(now + offset + 0.15);
    });
  } catch {
    // Silently ignore if audio not available
  }
};

/** Plays a short "pop" sound when an item is added to cart */
export const playCartAddSound = () => {
  if (!isSoundEnabled()) return;
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch {
    // Silently ignore
  }
};

/** Plays a celebratory "success chime" — ascending triple tone with harmonics */
export const playPaymentSuccessSound = () => {
  if (!isSoundEnabled()) return;
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Three ascending chime notes with rich harmonics
    const notes = [
      { freq: 523, time: 0, dur: 0.25 },      // C5
      { freq: 659, time: 0.15, dur: 0.25 },    // E5
      { freq: 784, time: 0.30, dur: 0.45 },    // G5 (longer, resonant)
    ];

    notes.forEach(({ freq, time, dur }) => {
      // Main tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, now + time);
      gain.gain.setValueAtTime(0.2, now + time + dur * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);
      osc.start(now + time);
      osc.stop(now + time + dur);

      // Soft harmonic overtone for richness
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "triangle";
      osc2.frequency.value = freq * 2;
      gain2.gain.setValueAtTime(0.06, now + time);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + time + dur * 0.8);
      osc2.start(now + time);
      osc2.stop(now + time + dur);
    });

    // Final sparkle
    const sparkle = ctx.createOscillator();
    const sparkleGain = ctx.createGain();
    sparkle.connect(sparkleGain);
    sparkleGain.connect(ctx.destination);
    sparkle.type = "sine";
    sparkle.frequency.value = 1568; // G6
    sparkleGain.gain.setValueAtTime(0.08, now + 0.55);
    sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    sparkle.start(now + 0.55);
    sparkle.stop(now + 0.9);
  } catch {
    // Silently ignore
  }
};
