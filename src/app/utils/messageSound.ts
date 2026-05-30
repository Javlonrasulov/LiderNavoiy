/** Telegram uslubidagi qisqa xabar ovozi (Web Audio) */
export function playMessageSound() {
  try {
    const ctx = new AudioContext();
    const playTone = (freq: number, start: number, dur: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.start(start);
      osc.stop(start + dur);
    };
    const t = ctx.currentTime;
    playTone(660, t, 0.12, 0.18);
    playTone(880, t + 0.1, 0.14, 0.15);
    setTimeout(() => ctx.close(), 400);
  } catch {
    /* brauzer bloklagan bo'lishi mumkin */
  }
}
