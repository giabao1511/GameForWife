/**
 * Generate tiny, valid, silent MP3 placeholder files in public/audio/ so the
 * app can ship with zero broken asset paths (the build stays clean even when
 * real voice recordings haven't been dropped in yet).
 *
 * Each file is a loop of one minimal MPEG-1 Layer III "silence" frame
 * (48kHz / 320kbps / mono / frame header + zero payload). The player's
 * fetch-based loader accepts any 200 response, so these never 404 and never
 * throw on decode. Replace the files with real recordings when available —
 * the loader picks them up automatically (see public/audio/README.md).
 *
 * Run: node scripts/generate-placeholder-audio.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// MPEG-1 Layer III frame: 48kHz (b011 00), 320kbps (b1110 0000), mono +
// padding off (01), no CRC (10), header value 0xFF 0xFB 0x90 0x00.
// Frame length = 144 samples @ 320kbps = 26.25ms each; 192 frames ≈ 5s.
const SILENT_FRAME = Buffer.from([0xff, 0xfb, 0x90, 0x00, 0x00, 0x00]);

function silentMp3(seconds) {
  const frames = Math.max(8, Math.round((seconds * 1000) / 26.25));
  return Buffer.concat(Array.from({ length: frames }, () => SILENT_FRAME));
}

const OUT = join(root, 'public', 'audio');
mkdirSync(OUT, { recursive: true });

const files = {
  'bgm-cozy.mp3': 60, // ambient loop placeholder — longer so a real track can be dropped in later
  'voice-pat.mp3': 3,
  'voice-swipe-up.mp3': 3,
  'voice-victory.mp3': 3,
  // Theme & room-customization ambient beds (replace with real loops in place —
  // the loader picks them up automatically, no code changes needed).
  'rain-ambient.mp3': 60,
  'crickets-ambient.mp3': 60,
};

for (const [name, seconds] of Object.entries(files)) {
  const target = join(OUT, name);
  writeFileSync(target, silentMp3(seconds));
  console.log(`✓ ${name} (${seconds}s silent placeholder)`);
}
