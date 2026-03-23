/** Procedural audio — all sounds generated via Web Audio API, no asset files needed */

import { EventBridge } from '../../shared/EventBridge.ts';
import { StateManager } from '../../shared/StateManager.ts';
import { TIMER_RED_THRESHOLD } from '../../shared/constants.ts';

export class AudioManager {
  private ctx: AudioContext;
  private masterGain: GainNode;

  // Ambient hum nodes — kept alive for the session, gain faded in/out
  private humOsc: OscillatorNode | null = null;
  private humNoise: AudioBufferSourceNode | null = null;
  private humGain: GainNode | null = null;

  // Timer warning state
  private timerTickInterval: ReturnType<typeof setInterval> | null = null;
  private lastWarningPhase: 'none' | 'amber' | 'red' = 'none';

  private unsubscribeState!: () => void;

  constructor() {
    this.ctx = new AudioContext();
    // Browser may suspend AudioContext even after user interaction — resume explicitly
    void this.ctx.resume();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.4;
    this.masterGain.connect(this.ctx.destination);

    this.startAmbientHum();

    EventBridge.on('tool:activated',    this.onToolOpen);
    EventBridge.on('tool:deactivated',  this.onToolClose);
    EventBridge.on('radar:pulse',       this.onRadarPulse);
    EventBridge.on('radio:signalActive', this.onSignalActive);
    EventBridge.on('radio:signalLost',   this.onSignalLost);
    EventBridge.on('day:ended',         this.onDayEnded);
    EventBridge.on('day:start',         this.onDayStart);
    EventBridge.on('settings:volume',   this.onSetVolume);
    EventBridge.on('settings:mute',     this.onSetMute);

    // Watch timer for warning ticks
    this.unsubscribeState = StateManager.subscribe((state) => {
      this.updateTimerWarning(state.timeRemaining);
    });
  }

  // ─── Ambient Hum ────────────────────────────────────────────────────────

  private startAmbientHum(): void {
    const ctx = this.ctx;

    // Shared gain envelope for the whole hum layer
    this.humGain = ctx.createGain();
    this.humGain.gain.value = 0;
    this.humGain.connect(this.masterGain);

    // 80Hz fundamental — audible on laptop speakers unlike 58Hz
    this.humOsc = ctx.createOscillator();
    this.humOsc.type = 'sawtooth'; // richer harmonics than sine
    this.humOsc.frequency.value = 80;

    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.08; // sawtooth is bright — keep it lower than sine would need

    // Low-pass to knock out harshness above 300Hz, keep the body
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 300;
    lpf.Q.value = 0.5;

    this.humOsc.connect(oscGain);
    oscGain.connect(lpf);
    lpf.connect(this.humGain);
    this.humOsc.start();

    // Noise layer — broadens the hum into a room presence
    const bufferSize = ctx.sampleRate * 3;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    this.humNoise = ctx.createBufferSource();
    this.humNoise.buffer = noiseBuffer;
    this.humNoise.loop = true;

    const noiseLpf = ctx.createBiquadFilter();
    noiseLpf.type = 'lowpass';
    noiseLpf.frequency.value = 400;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.04;

    this.humNoise.connect(noiseLpf);
    noiseLpf.connect(noiseGain);
    noiseGain.connect(this.humGain);
    this.humNoise.start();

    // Fade in over 2s
    this.humGain.gain.setTargetAtTime(1, ctx.currentTime, 0.8);
  }

  private fadeHum(targetGain: number, timeConstant = 0.4): void {
    if (!this.humGain) return;
    this.humGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, timeConstant);
  }

  private onToolOpen = (): void => {
    this.fadeHum(0, 0.3);
  };

  private onToolClose = (): void => {
    this.fadeHum(1, 0.5);
  };

  // ─── Radar Ping ─────────────────────────────────────────────────────────

  private onRadarPulse = (): void => {
    const ctx = this.ctx;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Pitch starts high and drops — classic sonar
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.8);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 1.0);
  };

  // ─── Radio ──────────────────────────────────────────────────────────────

  private onSignalActive = (): void => {
    const ctx = this.ctx;
    const t = ctx.currentTime;

    // Two-tone chord — signal found
    [440, 554].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.05 + i * 0.04);
      gain.gain.setTargetAtTime(0, t + 0.3, 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.9);
    });
  };

  private onSignalLost = (): void => {
    // Short static burst — signal dropped
    this.playNoiseBurst(0.08, 0.15, 800);
  };

  private playNoiseBurst(gainPeak: number, duration: number, lpfFreq: number): void {
    const ctx = this.ctx;
    const t = ctx.currentTime;

    const bufferSize = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const lpf = ctx.createBiquadFilter();
    lpf.type = 'bandpass';
    lpf.frequency.value = lpfFreq;
    lpf.Q.value = 0.8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainPeak, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    source.connect(lpf);
    lpf.connect(gain);
    gain.connect(this.masterGain);
    source.start(t);
    source.stop(t + duration);
  }

  // ─── Day Transition ─────────────────────────────────────────────────────

  private onDayEnded = (): void => {
    const ctx = this.ctx;
    const t = ctx.currentTime;

    // Power-down: pitch sweep from 120Hz to near silence over 2s
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 2.0);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 2.2);

    // Hum fades out with the transition
    this.fadeHum(0, 0.8);
    this.stopTimerTicks();
  };

  private onDayStart = (): void => {
    // Power-up: quick pitch sweep up
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(40, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.8);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.9);

    // Hum comes back
    this.fadeHum(1, 0.8);
    this.lastWarningPhase = 'none';
  };

  // ─── Timer Warning Ticks ────────────────────────────────────────────────

  private updateTimerWarning(timeRemaining: number): void {
    if (timeRemaining <= TIMER_RED_THRESHOLD && this.lastWarningPhase !== 'red') {
      this.lastWarningPhase = 'red';
      this.stopTimerTicks();
      // Fast ticks — every 3s
      this.timerTickInterval = setInterval(() => this.playTick(0.18), 3000);
    } else if (timeRemaining <= 300 && timeRemaining > TIMER_RED_THRESHOLD && this.lastWarningPhase === 'none') {
      this.lastWarningPhase = 'amber';
      // Slow ticks — every 8s
      this.timerTickInterval = setInterval(() => this.playTick(0.1), 8000);
    }
  }

  private playTick(gain: number): void {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1100;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // ─── Settings ───────────────────────────────────────────────────────────

  private onSetVolume = (val: unknown): void => {
    const pct = typeof val === 'number' ? val : 70;
    this.masterGain.gain.setTargetAtTime(pct / 100, this.ctx.currentTime, 0.05);
  };

  private onSetMute = (muted: unknown): void => {
    const target = muted ? 0 : 1;
    this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
  };

  private stopTimerTicks(): void {
    if (this.timerTickInterval !== null) {
      clearInterval(this.timerTickInterval);
      this.timerTickInterval = null;
    }
  }

  // ─── Cleanup ────────────────────────────────────────────────────────────

  destroy(): void {
    EventBridge.off('tool:activated',    this.onToolOpen);
    EventBridge.off('tool:deactivated',  this.onToolClose);
    EventBridge.off('radar:pulse',       this.onRadarPulse);
    EventBridge.off('radio:signalActive', this.onSignalActive);
    EventBridge.off('radio:signalLost',   this.onSignalLost);
    EventBridge.off('day:ended',         this.onDayEnded);
    EventBridge.off('day:start',         this.onDayStart);
    EventBridge.off('settings:volume',   this.onSetVolume);
    EventBridge.off('settings:mute',     this.onSetMute);
    this.unsubscribeState();
    this.stopTimerTicks();

    this.humOsc?.stop();
    this.humNoise?.stop();
    this.ctx.close();
  }
}
