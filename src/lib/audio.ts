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
  // A looping BGM element is muted in place (keeps looping, resumes when unmuted).
  if (bgm) bgm.muted = muted;
  // The active theme bed is muted in place too.
  if (themeBed) themeBed.muted = muted;
}

// ── Ambient BGM (public/audio/bgm-cozy.mp3) ────────────────────
//
// A gentle looping track that runs underneath the whole session. It is a
// module-level HTMLAudioElement (kept out of the synth graph on purpose —
// one persistent source that loops cleanly) started only on a real user
// gesture, and driven by the same global mute as the rest of the audio.
// Missing file / blocked autoplay degrade to silence, never to an error.
const BGM_SRC = '/audio/bgm-cozy.mp3';
const BGM_VOLUME = 0.2;

let bgm: HTMLAudioElement | null = null;
let bgmReady: Promise<HTMLAudioElement | null> | null = null;

/**
 * Load + start the looping background track at a gentle volume. Idempotent:
 * a second call just resumes the already-loading element. Safe under
 * browser autoplay policies and in test/SSR environments.
 */
export function startBgm(): void {
  if (typeof window === 'undefined') return;
  if (bgm && !bgm.paused) return;

  if (!bgmReady) {
    bgmReady = fetch(BGM_SRC, { cache: 'force-cache' })
      .then((res) => {
        if (!res.ok) {
          bgmReady = null;
          return null;
        }
        return res.blob();
      })
      .then(
        (blob) => {
          // jsdom and other minimal environments lack a real media engine —
          // skip gracefully instead of throwing.
          if (!blob || (!blob.type && blob.size === 0)) return null;
          const element = new Audio(URL.createObjectURL(blob));
          element.loop = true;
          element.volume = BGM_VOLUME;
          element.muted = useUiStore.getState().muted;
          bgm = element;
          return element;
        },
        () => {
          bgmReady = null;
          return null;
        },
      );
  }

  // If the element already exists, resume it now — otherwise arm it on load.
  if (bgm) {
    bgm.muted = useUiStore.getState().muted;
    void bgm.play().catch(() => {}); // autoplay-policy edge case: stay silent.
  } else {
    void bgmReady.then((element) => {
      if (element && !element.paused) return;
      element?.play().catch(() => {});
    });
  }
}

/** Stop (and release) the background track. Safe to call any number of times. */
export function stopBgm(): void {
  if (bgm) {
    bgm.pause();
    bgm = null;
  }
}

// ── Theme ambient bed (per-theme looping loop: rain / crickets) ───────
//
// A second, theme-scoped looping source kept strictly separate from bgm-cozy
// so the active theme's ambience REPLACES the default cozy loop instead of
// stacking two beds. Reuses the same fetch-based loader contract as startBgm
// (missing file / blocked autoplay / jsdom degrade to silence, never error)
// and honors the global mute exactly like the BGM.
const THEME_BED_VOLUME = 0.25;
let themeBed: HTMLAudioElement | null = null;
let themeBedSrc: string | null = null;

async function fetchAudioElement(url: string, volume: number): Promise<HTMLAudioElement | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return null;
    const blob = await res.blob();
    // jsdom and other minimal environments lack a real media engine — skip
    // gracefully instead of throwing (mirrors the BGM loader).
    if (!blob || (!blob.type && blob.size === 0)) return null;
    const element = new Audio(URL.createObjectURL(blob));
    element.loop = true;
    element.volume = volume;
    element.muted = useUiStore.getState().muted;
    return element;
  } catch {
    return null;
  }
}

/**
 * Start the active theme's ambient bed, or — when the theme has none — fall
 * back to the default cozy loop. Idempotent for a repeated call with the same
 * source; crossfades are not needed (beds are short soft loops, a hard swap
 * at low volume is inaudible).
 */
export function startThemeBed(src: string | null): void {
  // Already on this bed — just re-assert playback + mute state and return.
  if (themeBedSrc === src && themeBed) {
    themeBed.muted = useUiStore.getState().muted;
    void themeBed.play().catch(() => {});
    return;
  }
  themeBedSrc = src;

  // Release whatever bed was playing.
  if (themeBed) {
    themeBed.pause();
    themeBed = null;
  }

  if (src) {
    // A themed ambience owns the bed — stop the default cozy loop so two beds
    // never play on top of each other.
    stopBgm();
    void fetchAudioElement(src, THEME_BED_VOLUME).then((element) => {
      // Guard: the caller may have moved to a different bed while we fetched.
      if (themeBedSrc !== src) return;
      themeBed = element;
      if (element) void element.play().catch(() => {}); // autoplay edge: stay silent.
    });
  } else {
    // No themed bed (pastel / sunset) — resume the default cozy loop.
    startBgm();
  }
}

/** Release the theme bed (used on teardown / screen unmount). */
export function stopThemeBed(): void {
  if (themeBed) {
    themeBed.pause();
    themeBed = null;
  }
  themeBedSrc = null;
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

/**
 * Sweet head-pat reaction clip. Called by AvatarReaction on the head-pat
 * gesture (~20% of pats, decided by the caller) — the chime still plays in
 * every case, so a voiceless install (or a skipped clip) stays complete.
 */
export function playVoicePat(): Promise<HTMLAudioElement | null> {
  return playVoiceNote('/audio/voice-pat.mp3', () => playHeadPatChime());
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

/**
 * Soft two-note chime when a Time Capsule letter is opened (the envelope
 * "wax-seal" breaking). Warmer and slower than the memory tingle — a
 * keepsake, not a game reward.
 */
export function playLetterChime(): void {
  tone(659, 0, 0.22, 'sine', 0.22, 784);
  tone(784, 0.16, 0.3, 'sine', 0.16, 988);
}

/**
 * Soft, tender two-note "lub-dub" chime that matches the heartbeat haptic
 * when a miss-signal hug is sent. Softer and slower than any reward — it is
 * comfort, not gameplay.
 */
export function playHeartbeatChime(): void {
  tone(523, 0, 0.18, 'sine', 0.18, 659);
  tone(659, 0.2, 0.28, 'sine', 0.14, 880);
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

// ── Real-time ambience chimes (per period) ───────────────────
import type { RealTimePeriod } from '@/data/types';

/**
 * A short ambient flourish on session start, matched to the real period.
 * Morning = soft bright "bird-chirp" ascending pings; latenight = a slow,
 * low, soothing lullaby chime; afternoon/evening stay silent (clean,
 * neutral ambience — the function is total over the union, not selective).
 * No-ops safely when the AudioContext is unavailable (jsdom, SSR).
 */
// ── Avatar interaction SFX (poke / dizzy / head-pat) ──────────

/** Cute high "ting" boing on a cheek poke. */
export function playPokeTing(): void {
  tone(1320, 0, 0.08, 'sine', 0.25, 1980);
  tone(1980, 0.05, 0.09, 'sine', 0.18);
}

/** Comical descending wobble for the dizzy eyes. */
export function playDizzyWobble(): void {
  tone(660, 0, 0.18, 'triangle', 0.2, 220);
  tone(440, 0.16, 0.2, 'triangle', 0.16, 110);
}

/** Soft warm purr-chord for a head pat. */
export function playHeadPatChime(): void {
  tone(523, 0, 0.18, 'sine', 0.22, 587);
  tone(659, 0.08, 0.2, 'sine', 0.18, 784);
  tone(784, 0.16, 0.26, 'sine', 0.14, 880);
}

export function playPeriodAmbience(period: RealTimePeriod): void {
  switch (period) {
    case 'morning':
      // Two soft, bright ascending chirps — like morning birds.
      tone(1318, 0.0, 0.09, 'triangle', 0.12, 1760);
      tone(1568, 0.14, 0.09, 'triangle', 0.12, 2093);
      break;
    case 'latenight':
      // A slow, low, descending lullaby chime — soothing, sleepy.
      tone(523, 0.0, 0.35, 'sine', 0.15, 494);
      tone(392, 0.4, 0.35, 'sine', 0.13, 370);
      tone(262, 0.8, 0.5, 'sine', 0.12, 220);
      break;
    case 'afternoon':
    case 'evening':
      // Clean, neutral ambience — nothing to play.
      break;
  }
}

// ── Emergency Revival (Defibrillator CPR) SFX + loops ─────────

/** Sharp defibrillator discharge: crackle of noise + fast downward power slide. */
export function playDefibZap(): void {
  noiseSweep(0, 0.14, 0.4);
  tone(1900, 0, 0.22, 'sawtooth', 0.3, 140);
  tone(320, 0.05, 0.2, 'square', 0.12, 80);
}

/** Harsh error buzz when a shock lands outside the sweet spot. */
export function playErrorBuzz(): void {
  tone(150, 0, 0.24, 'square', 0.25);
  tone(110, 0.04, 0.26, 'square', 0.16);
}

/** Tragic continuous flatline tone (≈3s) — the monitor giving up. */
export function playFlatline(): void {
  tone(880, 0, 2.9, 'sine', 0.22);
}

/** Dramatic gasp / sigh of life: a quick low-to-high whoosh on two layers. */
export function playReviveGasp(): void {
  noiseSweep(0, 0.5, 0.28);
  tone(240, 0, 0.45, 'sine', 0.16, 720);
}

/** Two-note emergency siren wail (880/660) on a repeating loop. */
export function startSirenLoop(): number {
  if (typeof window === 'undefined') return 0;
  const interval = window.setInterval(() => {
    tone(880, 0, 0.35, 'triangle', 0.16, 660);
    tone(660, 0.4, 0.35, 'triangle', 0.12, 880);
  }, 1000);
  return interval;
}

/** Fast beeping ECG-monitor tone (1.2kHz) on a 550ms loop — the monitor in panic. */
export function startEcgBeepLoop(): number {
  if (typeof window === 'undefined') return 0;
  const interval = window.setInterval(() => {
    tone(1200, 0, 0.07, 'square', 0.12);
  }, 550);
  return interval;
}
