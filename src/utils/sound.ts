let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playHookClimbSound(level: number, enabled: boolean) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Metallic hook latch click
  const clickOsc = ctx.createOscillator();
  const clickGain = ctx.createGain();
  clickOsc.type = 'triangle';
  clickOsc.frequency.setValueAtTime(680 + level * 70, now);
  clickOsc.frequency.exponentialRampToValueAtTime(1120 + level * 95, now + 0.08);
  clickGain.gain.setValueAtTime(0.08, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
  clickOsc.connect(clickGain);
  clickGain.connect(ctx.destination);
  clickOsc.start(now);
  clickOsc.stop(now + 0.12);

  // Warm ascending note as stickman pulls up
  const chimeOsc = ctx.createOscillator();
  const chimeGain = ctx.createGain();
  const baseFreq = 392 * Math.pow(1.122, level);
  chimeOsc.type = 'sine';
  chimeOsc.frequency.setValueAtTime(baseFreq, now + 0.12);
  chimeOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, now + 0.34);
  chimeGain.gain.setValueAtTime(0.001, now + 0.11);
  chimeGain.gain.linearRampToValueAtTime(0.09, now + 0.15);
  chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
  chimeOsc.connect(chimeGain);
  chimeGain.connect(ctx.destination);
  chimeOsc.start(now + 0.11);
  chimeOsc.stop(now + 0.44);
}

export function playVictorySound(enabled: boolean) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.5];
  const now = ctx.currentTime;
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = now + idx * 0.09;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.38);
  });
}

export function playWrongAnswerSound(enabled: boolean) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.linearRampToValueAtTime(175, now + 0.18);
  gain.gain.setValueAtTime(0.07, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.24);
}
