const audioCtx = () => new (window.AudioContext || (window as any).webkitAudioContext)();

export const playHeartbeat = () => {
  const ctx = audioCtx();

  const playBeat = (time: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 60;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    osc.start(time);
    osc.stop(time + 0.2);
  };

  // Double-beat pattern: lub-dub
  playBeat(ctx.currentTime);
  playBeat(ctx.currentTime + 0.15);
};

export const playCompletion = () => {
  const ctx = audioCtx();
  const now = ctx.currentTime;

  // Rising two-tone chime
  [520, 780].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = now + i * 0.12;
    gain.gain.setValueAtTime(0.3, start);
    gain.gain.exponentialRampToValueAtTime(0.01, start + 0.3);
    osc.start(start);
    osc.stop(start + 0.35);
  });
};
