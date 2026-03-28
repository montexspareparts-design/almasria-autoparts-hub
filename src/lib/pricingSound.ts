/** Plays a short pleasant "cha-ching" confirmation sound when a product is priced */
export const playPricingSound = () => {
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
