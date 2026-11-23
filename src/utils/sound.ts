class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    try {
      const saved = localStorage.getItem('pytrail_muted');
      if (saved === 'true') this.muted = true;
    } catch {
      // ignore storage errors
    }
  }

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('pytrail_muted', String(this.muted));
    } catch {
      // ignore
    }
    return this.muted;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.08,
    delay = 0,
    endFreq?: number
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playMove() {
    this.tone(190, 0.09, 'triangle', 0.06, 0, 240);
  }

  public playTurn() {
    this.tone(330, 0.055, 'sine', 0.045, 0, 410);
  }

  public playCollect() {
    this.tone(587.33, 0.11, 'sine', 0.08, 0); // D5
    this.tone(880, 0.16, 'triangle', 0.08, 0.06); // A5
  }

  public playSwitch() {
    this.tone(440, 0.08, 'square', 0.035, 0);
    this.tone(659.25, 0.14, 'sine', 0.06, 0.05);
  }

  public playStepTick() {
    this.tone(520, 0.03, 'sine', 0.025, 0);
  }

  public playBump() {
    this.tone(120, 0.16, 'sawtooth', 0.09, 0, 55);
  }

  public playError() {
    this.tone(210, 0.12, 'sawtooth', 0.06, 0);
    this.tone(155, 0.2, 'sawtooth', 0.06, 0.11);
  }

  public playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.tone(n, 0.22, 'triangle', 0.08, idx * 0.08);
    });
  }
}

export const sound = new SoundEngine();
