# Voice-note snippets

Drop short MP3 clips here and they'll be picked up automatically:

| File | Plays when |
|------|-----------|
| `bgm-cozy.mp3` | Loops softly under every screen (0.2 volume, starts on first tap, honors the 🔊/🔇 mute) |
| `voice-pat.mp3` | Head pat — 20% chance of the sweet "Ngoan, thương em nhất!" voice + bubble |
| `voice-swipe-up.mp3` | Swipe Up ("Kệ anh") — playful reaction under the whoosh |
| `voice-victory.mp3` | Day-14 victory — special anniversary message |

Missing files are handled gracefully: the app silently falls back to the
synthesized SFX (soft chime for the pat, item pop for swipe-up, victory
fanfare for the win) and the BGM simply stays silent.

Clips should be ≤ ~8s, ~128kbps mono is plenty. The BGM should be a soft
acoustic-guitar / lofi loop (~1–3 min, loopable, no harsh fades).

## Placeholder files

The shipped `*.mp3` files are generated silent placeholders
(`node scripts/generate-placeholder-audio.mjs`) so the build never hits a
broken asset path. Replace them with real recordings in place — no code
changes needed.
