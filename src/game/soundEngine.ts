/**
 * Procedural Web Audio Engine for Tesla Roadster Game
 * Zero external audio files - 100% synthesized sound effects
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private motorOsc: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;
  private thrusterNoiseNode: AudioNode | null = null;
  private thrusterGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private initialized: boolean = false;

  public init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.initialized = true;
      this.setupContinuousNodes();
    } catch (e) {
      console.warn('Web Audio not supported', e);
    }
  }

  private resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private setupContinuousNodes() {
    if (!this.ctx) return;

    // 1. Dual Electric Motor Whine
    this.motorOsc = this.ctx.createOscillator();
    this.motorOsc.type = 'sawtooth';
    this.motorGain = this.ctx.createGain();
    this.motorGain.gain.setValueAtTime(0, this.ctx.currentTime);

    // Motor filter to shape high-frequency electric whine
    const motorFilter = this.ctx.createBiquadFilter();
    motorFilter.type = 'bandpass';
    motorFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
    motorFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.motorOsc.connect(motorFilter);
    motorFilter.connect(this.motorGain);
    this.motorGain.connect(this.ctx.destination);
    this.motorOsc.start();

    // 2. Wind Rush
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const windNoise = this.ctx.createBufferSource();
    windNoise.buffer = noiseBuffer;
    windNoise.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.setValueAtTime(400, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);

    windNoise.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windGain.connect(this.ctx.destination);
    windNoise.start();

    // 3. SpaceX Thruster continuous noise
    const thrusterNoise = this.ctx.createBufferSource();
    thrusterNoise.buffer = noiseBuffer;
    thrusterNoise.loop = true;

    const thrusterFilter = this.ctx.createBiquadFilter();
    thrusterFilter.type = 'bandpass';
    thrusterFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    thrusterFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.thrusterGain = this.ctx.createGain();
    this.thrusterGain.gain.setValueAtTime(0, this.ctx.currentTime);

    thrusterNoise.connect(thrusterFilter);
    thrusterFilter.connect(this.thrusterGain);
    this.thrusterGain.connect(this.ctx.destination);
    thrusterNoise.start();
    this.thrusterNoiseNode = thrusterNoise;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.ctx) {
      if (this.motorGain) this.motorGain.gain.setValueAtTime(0, this.ctx.currentTime);
      if (this.thrusterGain) this.thrusterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      if (this.windGain) this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  public getMuted() {
    return this.isMuted;
  }

  public updateMotorSound(speedMph: number, throttle: number, onGround: boolean) {
    if (this.isMuted || !this.ctx || !this.motorOsc || !this.motorGain || !this.windGain) return;
    this.resume();

    const t = this.ctx.currentTime;
    // Speed: 0 - 300 mph
    const speedNorm = Math.min(speedMph / 250, 1.2);
    const targetFreq = 120 + speedNorm * 1800 + (throttle > 0 ? 150 : 0);
    this.motorOsc.frequency.setTargetAtTime(targetFreq, t, 0.05);

    const targetGain = onGround ? (throttle > 0 ? 0.08 + speedNorm * 0.12 : speedNorm * 0.06) : speedNorm * 0.03;
    this.motorGain.gain.setTargetAtTime(targetGain, t, 0.05);

    // Wind volume proportional to speed
    const windTarget = speedNorm > 0.2 ? Math.min((speedNorm - 0.2) * 0.15, 0.18) : 0;
    this.windGain.gain.setTargetAtTime(windTarget, t, 0.08);
  }

  public setThrusterActive(active: boolean) {
    if (this.isMuted || !this.ctx || !this.thrusterGain) return;
    this.resume();
    const t = this.ctx.currentTime;
    const target = active ? 0.22 : 0;
    this.thrusterGain.gain.setTargetAtTime(target, t, 0.04);
  }

  public playCountdownBeep(isFinal: boolean = false) {
    if (this.isMuted || !this.ctx) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = isFinal ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isFinal ? 880 : 440, t);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isFinal ? 0.6 : 0.2));

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + (isFinal ? 0.6 : 0.2));
  }

  public playLaunchRampWhoosh() {
    if (this.isMuted || !this.ctx) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.5);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.6);
  }

  public playTouchdown(quality: 'smooth' | 'rough' | 'crash') {
    if (this.isMuted || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Tire squeal
    const squealOsc = this.ctx.createOscillator();
    const squealGain = this.ctx.createGain();
    squealOsc.type = 'sawtooth';
    squealOsc.frequency.setValueAtTime(quality === 'crash' ? 300 : 900, t);
    squealOsc.frequency.exponentialRampToValueAtTime(150, t + (quality === 'crash' ? 0.6 : 0.3));

    const gainVol = quality === 'crash' ? 0.35 : (quality === 'smooth' ? 0.12 : 0.22);
    squealGain.gain.setValueAtTime(gainVol, t);
    squealGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    squealOsc.connect(squealGain);
    squealGain.connect(this.ctx.destination);
    squealOsc.start(t);
    squealOsc.stop(t + 0.4);

    // Impact thud
    const thudOsc = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(120, t);
    thudOsc.frequency.exponentialRampToValueAtTime(30, t + 0.25);

    thudGain.gain.setValueAtTime(quality === 'crash' ? 0.5 : 0.25, t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    thudOsc.connect(thudGain);
    thudGain.connect(this.ctx.destination);
    thudOsc.start(t);
    thudOsc.stop(t + 0.3);
  }

  public playRecordCheer() {
    if (this.isMuted || !this.ctx) return;
    this.resume();
    const chords = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    chords.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = this.ctx!.currentTime + idx * 0.1;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.8);
    });
  }
}

export const soundEngine = new SoundEngine();
