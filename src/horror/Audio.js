export class HorrorAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.humGain = null;
    this.droneGain = null;
    this._started = false;
    this._lastStep = 0;
    this._scareGain = null;
  }

  start() {
    if (this._started) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(this.ctx.destination);

    this._buildHum();
    this._buildDrone();

    this._started = true;
  }

  _buildHum() {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = 0.0;
    g.connect(this.master);

    const o1 = ctx.createOscillator();
    o1.type = "sawtooth";
    o1.frequency.value = 60;
    const f1 = ctx.createBiquadFilter();
    f1.type = "lowpass";
    f1.frequency.value = 380;
    f1.Q.value = 1.2;
    o1.connect(f1).connect(g);
    o1.start();

    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = 120;
    const o2g = ctx.createGain();
    o2g.gain.value = 0.35;
    o2.connect(o2g).connect(g);
    o2.start();

    const noiseBuf = this._noiseBuffer(2.0);
    const n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    n.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = "bandpass";
    nf.frequency.value = 3200;
    nf.Q.value = 0.6;
    const ng = ctx.createGain();
    ng.gain.value = 0.08;
    n.connect(nf).connect(ng).connect(g);
    n.start();

    this.humGain = g;
    this.humGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 1.2);
  }

  _buildDrone() {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(this.master);

    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = 38;
    o.connect(g);
    o.start();

    const o2 = ctx.createOscillator();
    o2.type = "triangle";
    o2.frequency.value = 53;
    const o2g = ctx.createGain();
    o2g.gain.value = 0.4;
    o2.connect(o2g).connect(g);
    o2.start();

    this.droneGain = g;
  }

  _noiseBuffer(seconds) {
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr * seconds, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.7;
    return buf;
  }

  setTension(v) {
    if (!this.droneGain) return;
    const t = Math.max(0, Math.min(1, v));
    this.droneGain.gain.linearRampToValueAtTime(t * 0.32, this.ctx.currentTime + 0.4);
  }

  flickerBlip() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(this.master);
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.value = 1800 + Math.random() * 1200;
    o.connect(g);
    g.gain.linearRampToValueAtTime(0.08, t0 + 0.005);
    g.gain.linearRampToValueAtTime(0, t0 + 0.04 + Math.random() * 0.05);
    o.start(t0);
    o.stop(t0 + 0.2);
  }

  footstep() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this._lastStep < 0.36) return;
    this._lastStep = now;

    const ctx = this.ctx;
    const buf = this._noiseBuffer(0.18);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 320;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.18, now + 0.008);
    g.gain.linearRampToValueAtTime(0, now + 0.16);
    src.connect(f).connect(g).connect(this.master);
    src.start(now);
    src.stop(now + 0.2);
  }

  distantStep(volume = 0.06) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const ctx = this.ctx;
    const buf = this._noiseBuffer(0.3);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 180;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(volume, now + 0.01);
    g.gain.linearRampToValueAtTime(0, now + 0.25);
    src.connect(f).connect(g).connect(this.master);
    src.start(now);
    src.stop(now + 0.3);
  }

  scareSting() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;

    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(this.master);

    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(140, t0);
    o.frequency.exponentialRampToValueAtTime(38, t0 + 1.2);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 600;
    o.connect(f).connect(g);
    o.start(t0);
    o.stop(t0 + 2.0);

    const nbuf = this._noiseBuffer(1.5);
    const n = ctx.createBufferSource();
    n.buffer = nbuf;
    const nf = ctx.createBiquadFilter();
    nf.type = "highpass";
    nf.frequency.value = 1800;
    const ng = ctx.createGain();
    ng.gain.value = 0;
    n.connect(nf).connect(ng).connect(this.master);
    n.start(t0);
    n.stop(t0 + 1.5);

    g.gain.linearRampToValueAtTime(0.55, t0 + 0.04);
    g.gain.linearRampToValueAtTime(0, t0 + 1.4);
    ng.gain.linearRampToValueAtTime(0.45, t0 + 0.02);
    ng.gain.linearRampToValueAtTime(0, t0 + 1.1);

    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(60, t0);
    sub.frequency.exponentialRampToValueAtTime(28, t0 + 1.6);
    const sg = ctx.createGain();
    sg.gain.value = 0;
    sub.connect(sg).connect(this.master);
    sub.start(t0);
    sub.stop(t0 + 2.0);
    sg.gain.linearRampToValueAtTime(0.7, t0 + 0.08);
    sg.gain.linearRampToValueAtTime(0, t0 + 1.8);
  }

  win() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;

    if (this.humGain) this.humGain.gain.linearRampToValueAtTime(0, t0 + 1.5);
    if (this.droneGain) this.droneGain.gain.linearRampToValueAtTime(0, t0 + 1.5);

    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(this.master);
    [261.63, 329.63, 392.00].forEach((freq, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = freq;
      o.connect(g);
      o.start(t0 + i * 0.18);
      o.stop(t0 + 2.4);
    });
    g.gain.linearRampToValueAtTime(0.12, t0 + 0.4);
    g.gain.linearRampToValueAtTime(0, t0 + 2.4);
  }

  death() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    if (this.humGain) this.humGain.gain.linearRampToValueAtTime(0, t0 + 0.5);
    if (this.droneGain) this.droneGain.gain.linearRampToValueAtTime(0, t0 + 0.5);
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(80, t0);
    o.frequency.exponentialRampToValueAtTime(28, t0 + 1.6);
    const g = ctx.createGain();
    g.gain.value = 0;
    o.connect(g).connect(this.master);
    o.start(t0); o.stop(t0 + 1.7);
    g.gain.linearRampToValueAtTime(0.5, t0 + 0.05);
    g.gain.linearRampToValueAtTime(0, t0 + 1.6);
  }
}
