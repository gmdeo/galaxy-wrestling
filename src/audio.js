// Web Audio: the song clock that drives note timing, a synthesised chiptune beat,
// and one-shot SFX. The AudioContext is created on the first user gesture only.

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.music = null;
    this.sfx = null;
    this.muted = false;
    this.songStart = 0;
    this.bpm = 100;
    this.nextBeat = 0; // index of the next beat to schedule
    this.scheduleAhead = 0.2;
    this.predator = false;
    this.intensity = 0; // 0 = intro, 1 = fight, 2 = predator
    this.running = false;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'interactive' });
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(this.ctx.destination);
    this.music = this.ctx.createGain();
    this.music.gain.value = 0.55;
    this.music.connect(this.master);
    this.sfx = this.ctx.createGain();
    this.sfx.gain.value = 0.9;
    this.sfx.connect(this.master);
    // Shared noise buffer for drums, crowd and impacts.
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  resume() {
    if (this.ctx && this.ctx.state !== 'running') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.02);
  }

  /** Output latency the player hears on top of the scheduling clock. */
  get outputLatency() {
    if (!this.ctx) return 0;
    return (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0);
  }

  /** Start the song clock. Song time 0 = now + a small lead. */
  start(bpm) {
    this.init();
    this.resume();
    this.bpm = bpm;
    this.songStart = this.ctx.currentTime + 0.1;
    this.nextBeat = 0;
    this.intensity = 0;
    this.running = true;
  }

  stop() {
    this.running = false;
  }

  /** Current song time in seconds (what the player is hearing, before calibration). */
  songTime() {
    if (!this.ctx) return 0;
    return this.ctx.currentTime - this.songStart - this.outputLatency;
  }

  /** Call every frame: schedules the music a little ahead of the clock. */
  pump() {
    if (!this.running || !this.ctx) return;
    const spb = 60 / this.bpm;
    const horizon = this.ctx.currentTime + this.scheduleAhead;
    while (this.songStart + this.nextBeat * spb < horizon) {
      this.scheduleBeat(this.nextBeat, this.songStart + this.nextBeat * spb, spb);
      this.nextBeat++;
    }
  }

  scheduleBeat(i, t, spb) {
    const bar = Math.floor(i / 4);
    const b = i % 4;
    const lvl = this.intensity;
    // Calibration: a plain click on every beat.
    if (lvl < 0) { this.osc('square', b === 0 ? 1760 : 1320, t, 0.04, 0.25); return; }
    // Kick on 1 and 3, snare on 2 and 4, hats on eighths once the fight starts.
    if (b === 0 || b === 2) this.kick(t);
    if (lvl >= 1 && (b === 1 || b === 3)) this.snare(t);
    if (lvl >= 1) { this.hat(t, 0.05); this.hat(t + spb / 2, 0.035); }
    if (lvl >= 2) { this.hat(t + spb / 4, 0.025); this.hat(t + (3 * spb) / 4, 0.025); }
    // Bass line: a minor riff, one note per beat.
    const riff = [0, 0, 3, 5, 0, 0, 7, 5, 0, 0, 3, 5, 10, 7, 5, 3];
    const root = 55 * Math.pow(2, (lvl >= 2 ? 2 : 0) / 12); // A1, up a tone in predator mode
    const semi = riff[(bar * 4 + b) % riff.length];
    this.bass(t, root * Math.pow(2, semi / 12), spb * 0.8);
    // Lead arpeggio in predator mode.
    if (lvl >= 2) {
      const arp = [12, 15, 19, 24];
      for (let k = 0; k < 2; k++) this.lead(t + (k * spb) / 2, root * 4 * Math.pow(2, arp[(i * 2 + k) % 4] / 12), spb * 0.4);
    }
  }

  env(g, t, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  osc(type, freq, t, dur, peak, dest = this.music) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    this.env(g, t, peak, dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
    return o;
  }

  noiseHit(t, dur, peak, filterType, freq, dest = this.music) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    this.env(g, t, peak, dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  kick(t) {
    const o = this.osc('sine', 150, t, 0.18, 0.9);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
  }
  snare(t) { this.noiseHit(t, 0.12, 0.4, 'highpass', 1800); this.osc('triangle', 190, t, 0.06, 0.25); }
  hat(t, peak) { this.noiseHit(t, 0.03, peak, 'highpass', 7000); }
  bass(t, f, d) { this.osc('square', f, t, d, 0.12); }
  lead(t, f, d) { this.osc('square', f, t, d, 0.05); }

  // ---- SFX (played now) ----
  now() { return this.ctx ? this.ctx.currentTime : 0; }

  sfxHit(grade) {
    if (!this.ctx) return;
    const t = this.now();
    const f = grade === 'perfect' ? 880 : grade === 'great' ? 660 : 440;
    this.osc('square', f, t, 0.06, 0.12, this.sfx);
  }
  sfxMiss() {
    if (!this.ctx) return;
    const t = this.now();
    const o = this.osc('sawtooth', 160, t, 0.15, 0.12, this.sfx);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.14);
  }
  sfxChop() { if (this.ctx) this.noiseHit(this.now(), 0.08, 0.5, 'bandpass', 2500, this.sfx); }
  sfxSlam() {
    if (!this.ctx) return;
    const t = this.now();
    const o = this.osc('sine', 110, t, 0.45, 1, this.sfx);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.4);
    this.noiseHit(t, 0.35, 0.6, 'lowpass', 900, this.sfx);
  }
  sfxBell() {
    if (!this.ctx) return;
    const t = this.now();
    for (const [f, p] of [[523, 0.3], [1310, 0.12], [2100, 0.06]]) this.osc('sine', f, t, 1.4, p, this.sfx);
  }
  sfxCount(n) {
    if (!this.ctx) return;
    this.noiseHit(this.now(), 0.1, 0.8, 'lowpass', 500, this.sfx);
    this.osc('square', 220 + n * 60, this.now(), 0.1, 0.1, this.sfx);
  }
  sfxCrowd(dur = 1.2, peak = 0.35) { if (this.ctx) this.noiseHit(this.now(), dur, peak, 'bandpass', 1200, this.sfx); }
  sfxWhoosh() { if (this.ctx) this.noiseHit(this.now(), 0.25, 0.3, 'bandpass', 900, this.sfx); }
  sfxReversal() {
    if (!this.ctx) return;
    const t = this.now();
    const o = this.osc('square', 300, t, 0.25, 0.15, this.sfx);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.2);
  }
  sfxPyro() {
    if (!this.ctx) return;
    const t = this.now();
    for (let i = 0; i < 6; i++) this.noiseHit(t + i * 0.07, 0.2, 0.3, 'highpass', 3000 + i * 400, this.sfx);
    this.sfxCrowd(1.8, 0.4);
  }
  sfxTick() { if (this.ctx) this.osc('square', 1760, this.now(), 0.03, 0.08, this.sfx); }
}
