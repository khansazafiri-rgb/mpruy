// Web Audio playback of the synthesised auscultation mix with a look-ahead scheduler.
// While audio is on, the simulation clock is driven by AudioContext.currentTime (speed 1x),
// so heart sounds stay locked to the cardiac phase that moves the heart and the images.
import { heartCycle, breathCycle, bowelGurgle } from '../sim/auscultation.js';

export class AudioEngine {
  constructor() { this.ctx = null; this.on = false; this.lastBeat = -1; this.lastBreath = -1; this.nextBowel = 0; this.seed = 1; }
  get supported() { return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext); }

  async start() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.7;
      this.hp = this.ctx.createBiquadFilter(); this.hp.type = 'highpass';
      this.lp = this.ctx.createBiquadFilter(); this.lp.type = 'lowpass';
      this.hp.connect(this.lp); this.lp.connect(this.master); this.master.connect(this.ctx.destination);
      this.setFilter('diaphragm');
    }
    await this.ctx.resume();
    this.on = true; this.lastBeat = -1; this.lastBreath = -1;
    return this.ctx.currentTime;
  }
  stop() { this.on = false; if (this.ctx) this.ctx.suspend(); }
  now() { return this.ctx ? this.ctx.currentTime : 0; }
  setVolume(v) { if (this.master) this.master.gain.value = v; }
  /** Bell: low frequencies (S3/S4, low-pitched murmurs); diaphragm: higher frequencies (S1/S2, breath). */
  setFilter(kind) {
    this.filter = kind;
    if (!this.hp) return;
    if (kind === 'bell') { this.hp.frequency.value = 20; this.lp.frequency.value = 220; }
    else { this.hp.frequency.value = 70; this.lp.frequency.value = 1200; }
  }
  _play(samples, sr, when, gain) {
    if (gain <= 0.001 || when < this.ctx.currentTime - 0.02) return;
    const b = this.ctx.createBuffer(1, samples.length, sr); b.copyToChannel(samples, 0);
    const src = this.ctx.createBufferSource(); src.buffer = b;
    const g = this.ctx.createGain(); g.gain.value = gain;
    src.connect(g); g.connect(this.hp); src.start(Math.max(when, this.ctx.currentTime));
  }
  /**
   * Schedule sounds that start within the look-ahead window.
   * @param s {simTime, audioOffset, beatPhase, breathPhase, heartRate, respRate, breathHold, mix, s3, r, bowelRate}
   */
  schedule(s) {
    if (!this.on || !this.ctx || !s.mix) return;
    const sr = this.ctx.sampleRate >= 44100 ? 22050 : this.ctx.sampleRate, look = 0.35;
    const T = 60 / s.heartRate;
    const beatIdx = Math.floor(s.beatPhase);
    for (let k = 0; k < 2; k++) {
      const idx = beatIdx + k;
      if (idx <= this.lastBeat) continue;
      const startSim = s.simTime + (idx - s.beatPhase) * T;
      if (startSim > s.simTime + look) break;
      const cyc = heartCycle({ T, r: s.r, s3: s.s3, weights: s.mix.weights, sampleRate: sr });
      this._play(cyc.samples, sr, startSim + s.audioOffset, 0.9);
      this.lastBeat = idx;
    }
    if (!s.breathHold && s.mix.breath > 0.02) {
      const P = 60 / s.respRate, bIdx = Math.floor(s.breathPhase);
      for (let k = 0; k < 2; k++) {
        const idx = bIdx + k;
        if (idx <= this.lastBreath) continue;
        const startSim = s.simTime + (idx - s.breathPhase) * P;
        if (startSim > s.simTime + look) break;
        this._play(breathCycle({ period: P, amplitude: 1, sampleRate: sr, seed: idx + 7 }), sr, startSim + s.audioOffset, 0.16 * s.mix.breath);
        this.lastBreath = idx;
      }
    }
    if (s.mix.bowel > 0.05 && s.bowelRate > 0) {
      if (this.nextBowel < s.simTime) this.nextBowel = s.simTime + 0.2;
      while (this.nextBowel < s.simTime + look) {
        this._play(bowelGurgle({ sampleRate: sr, seed: this.seed++, amplitude: 1 }), sr, this.nextBowel + s.audioOffset, 0.35 * s.mix.bowel);
        const rnd = (Math.sin(this.seed * 12.9898) * 43758.5453) % 1;
        this.nextBowel += (60 / s.bowelRate) * (0.3 + 1.4 * Math.abs(rnd));
      }
    }
  }
}
