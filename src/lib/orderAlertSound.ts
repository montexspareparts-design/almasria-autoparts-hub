/** Plays a "car horn / klaxon" alert sound for new order notifications */
export const playNewOrderSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    // Two-tone car horn: low + slightly higher
    const horn = (startTime: number, duration: number) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.type = "sawtooth";
      osc2.type = "square";
      osc1.frequency.value = 440;
      osc2.frequency.value = 554;
      gain.gain.setValueAtTime(0, now + startTime);
      gain.gain.linearRampToValueAtTime(0.18, now + startTime + 0.02);
      gain.gain.setValueAtTime(0.18, now + startTime + duration - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startTime + duration);
      osc1.start(now + startTime);
      osc2.start(now + startTime);
      osc1.stop(now + startTime + duration);
      osc2.stop(now + startTime + duration);
    };

    horn(0, 0.35);
    horn(0.45, 0.5);
  } catch {
    // ignore
  }
};
