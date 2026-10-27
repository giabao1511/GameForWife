'use client';

/**
 * Zero-dependency Web Audio ASMR engine.
 * Lazy-initializes the AudioContext on the first user gesture and keeps it
 * muted via the UI store so any action can be silenced in one place.
 */
import { useUiStore } from '@/store/useUiStore';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

const SILENCE_GAIN = 0;
const NORMAL_GAIN = 0.5;

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = useUiStore.getState().muted ? SILENCE_GAIN : NORMAL_GAIN;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Call on first pointerdown so the browser unlocks the AudioContext. */
export function unlockAudio(): void {
  const c = ensure();
  if (c && master) {
    master.gain.value = useUiStore.getState().muted ? SILENCE_GAIN : NORMAL_GAIN;
  }
}

/** Mute toggle is applied live from the UI store. */
export function setMuted(muted: boolean): void {
  if (master) {
    master.gain.value = muted ? SILENCE_GAIN : NORMAL_GAIN;
  }
}

// ── Primitives ────────────────────────────────────────────────

function tone(freq: number, start: number, duration: number, type: OscillatorType, volume = 0.5, slideTo?: number) {
  const c = ensure();
  if (!c || !master) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  if (slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + start + duration);
  }
  gain.gain.setValueAtTime(0.0001, c.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(volume, c.currentTime + start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + duration + 0.05);
}

function noiseSweep(start: number, duration: number, volume = 0.15) {
  const c = ensure();
  if (!c || !master) return;
  const frames = Math.max(1, Math.floor(c.sampleRate * duration));
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

  const source = c.createBufferSource();
  source.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(400, c.currentTime + start);
  filter.frequency.exponentialRampToValueAtTime(3000, c.currentTime + start + duration);
  filter.Q.value = 0.8;

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, c.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(volume, c.currentTime + start + duration * 0.4);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start(c.currentTime + start);
  source.stop(c.currentTime + start + duration + 0.05);
}

// ── Public SFX ────────────────────────────────────────────────

/** Card slides across — quick filtered whoosh. */
export function playSwipeWhoosh(): void {
  noiseSweep(0, 0.22, 0.12);
}

/** Stat delta lands. Positive = bright rising ping, negative = soft low tingle. */
export function playStatTingle(isPositive: boolean): void {
  if (isPositive) {
    tone(660, 0, 0.12, 'sine', 0.25, 880);
    tone(880, 0.08, 0.14, 'sine', 0.2, 1100);
  } else {
    tone(440, 0, 0.16, 'sine', 0.2, 300);
  }
}

/** Cheerful bubbly double-tone when an item is used. */
export function playItemPop(): void {
  tone(520, 0, 0.09, 'triangle', 0.35);
  tone(780, 0.08, 0.12, 'triangle', 0.35);
}

/** Low, soft, comical descending slide on death. */
export function playGameOverBuzz(): void {
  tone(220, 0, 0.5, 'sawtooth', 0.18, 110);
  tone(180, 0.1, 0.5, 'square', 0.1, 90);
}

// ── Real voice-note snippets (public/audio/voice-*.mp3) ───────
//
// Short "voice" clips layered on top of the synthesized ASMR engine.
// Files live in /public/audio/; when a clip is missing (404 on a local
// fetch) the playback silently degrades to the synthesized sfx fallback,
// so a voiceless install still feels alive. Mute state comes from the
// UI store, so toggling sound silences voice clips too.
const VOICE_CLIP_CACHE = new Map<string, Promise<HTMLAudioElement | null>>();

/**
 * Load + play a voice-note MP3 by public URL. Resolves (possibly to null
 * when the file is absent) — callers need not await, but may, to sync
 * custom UI with the clip's end.
 */
export function playVoiceNote(url: string, fallback?: () => void): Promise<HTMLAudioElement | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  const muted = useUiStore.getState().muted;
  // Mute the whole session: a silent AudioElement would still count as
  // "playing"; run the fallback instead so gameplay sfx remain honest.
  if (muted && fallback) fallback();

  let cached = VOICE_CLIP_CACHE.get(url);
  if (!cached) {
    cached = fetch(url, { cache: 'force-cache' })
      .then((res) => {
        if (!res.ok) {
          VOICE_CLIP_CACHE.delete(url);
          return null;
        }
        return res.blob().then(
          (blob) => new Promise<HTMLAudioElement | null>((resolve) => {
            const audio = new Audio(URL.createObjectURL(blob));
            audio.volume = 1.0;
            audio.addEventListener('error', () => resolve(null), { once: true });
            resolve(audio);
          }),
        );
      })
      .catch(() => {
        VOICE_CLIP_CACHE.delete(url);
        return null;
      });
    VOICE_CLIP_CACHE.set(url, cached);
  }

  return cached.then((element) => {
    if (!element) {
      if (!muted && fallback) fallback();
      return null;
    }
    element.currentTime = 0;
    element.muted = muted;
    void element.play().catch(() => {
      // Autoplay-policy edge cases — never crash the game over a skipped clip.
    });
    return element;
  });
}

/** Playful reaction clip for the Up ("Kệ anh") swipe. Falls back to the item pop. */
export function playVoiceSwipeUp(): Promise<HTMLAudioElement | null> {
  return playVoiceNote('/audio/voice-swipe-up.mp3', () => playItemPop());
}

/** Special anniversary message on Day-14 victory. Falls back to the fanfare. */
export function playVoiceVictory(): Promise<HTMLAudioElement | null> {
  return playVoiceNote('/audio/voice-victory.mp3', () => playVictoryFanfare());
}

/** Gentle, sweet celebratory tingle when a memory photo unlocks. */
export function playMemoryTingle(): void {
  tone(523, 0, 0.16, 'sine', 0.25, 784);
  tone(784, 0.12, 0.16, 'sine', 0.2, 1047);
  tone(1047, 0.24, 0.22, 'sine', 0.15);
}

/** Warm celebratory brass-like victory arpeggio. */
export function playVictoryFanfare(): void {  // C5 G5 E5 G5 C6 G5 C6 — playful rising brass
  const notes: Array<[number, number, OscillatorType]> = [
    [523, 0.0, 'triangle'],
    [784, 0.12, 'triangle'],
    [659, 0.24, 'triangle'],
    [784, 0.36, 'triangle'],
    [1047, 0.48, 'sawtooth'],
    [784, 0.64, 'triangle'],
    [1047, 0.76, 'triangle'],
  ];
  notes.forEach(([freq, start, type]) => tone(freq, start, 0.22, type, 0.28));
  // Warm pad underneath
  tone(262, 0.0, 1.2, 'sine', 0.15);
  tone(392, 0.15, 1.2, 'sine', 0.12);
}
