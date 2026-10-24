# STARFALL LANES — Mirelo sound-design upgrade

## What has actually been delivered

The **nine existing Mirelo-generated recordings** have been re-mastered, with their untouched source MP3s preserved in `art-source/mirelo-originals/`. These sounds were generated in an earlier game-development session. **No new generation occurred in this session:** the Mirelo connection returned `link_id must identify an eligible linked account` on 24 October 2026.

The master pipeline in `tools/master_mirelo_audio.py` uses a restrained bass/treble tidy-up, anti-click fades, more consistent loudness and lower true peaks. Existing single-channel effects are kept mono to avoid destructive artificial-stereo phase problems. The orbit ambience has a crossfaded loop seam. The score `command-bridge-theme.mp3` remains the existing 90-second original, not a Mirelo composition.

Eight **short, mobile-specific derivatives** of those effects were prepared using `tools/build_phone_cues.py`. They are not newly generated Mirelo audio. The phone now plays the short cues while the TV keeps full cinematic effects. Background score and ambience stay TV-only.

The game mixer now limits concurrent effects and uses per-cue gain values and effect-duration-aware music ducking, reducing layered noise during an eight-player Reveal. Audio remains user opt-in on TV and phone, with local volume controls and no external requests from the game pages.

## Current inventory

| Game cue | Source | Intended use |
|---|---|---|
| ambient-orbit | Existing Mirelo | Low-level loop under music |
| solar-storm | Existing Mirelo | Predictable Solar Storm event |
| hyperlane-open | Existing Mirelo | Route / hyperlane action |
| spire-build | Existing Mirelo | Construction |
| fleet-move | Existing Mirelo | Fleet movement |
| fleet-clash | Existing Mirelo | Battle / Strike |
| era-transition | Existing Mirelo | Era progression |
| victory | Existing Mirelo | Game end |
| credits | Existing Mirelo | Resource reward |
| command-bridge-theme | Original local composition, not Mirelo | Background music |
| phone-* (eight cues) | Shortened derivatives of above Mirelo clips | Quiet private-controller feedback |

## Mirelo prompt brief — pending service reconnection

These new sounds would improve *gameplay communication* rather than add more spectacle. They have **not** been generated:

| Cue | Length | Mirelo text-to-SFX brief |
|---|---:|---|
| lane-toll | 1.1 s | A warm futuristic bank-transfer chime: a soft credit coin flick, tiny electronic register ticks and a satisfying confirmation glint, intimate and precise, no voice or music, clean tail |
| lane-score | 1.7 s | Three delicate pulses ripple along a holographic trade route and converge into one glowing harmonic impact; triumphant but understated, no speech or music |
| backup-order | 1.0 s | A route plan reroutes around a blockage: brief muted negative blip immediately resolving to bright agile servo ping, no speech or music |
| order-failed | 0.7 s | Soft spaceship console refusal: subdued two-tone descending glassy alert, gentle, non-alarming, no speech or music |
| map-ping | 0.45 s | Crisp minimal sci-fi navigational ping, distinct soft transient and clean airy tail, no music or speech |
| host-ready | 0.85 s | A premium futuristic control panel activation click and light positive shimmer, no music or speech |
| trade-accepted | 1.1 s | Two spacecraft consoles exchange credits, two soft digitally resonant chimes answering one another, rounded tail, no speech or music |
| storm-warning | 2.0 s | Interstellar ion-storm warning: low airy magnetic swell with distant electrical crackle and restrained short alert tone, no music or speech |
| mission-complete | 1.6 s | An optimistic electronic celestial objective-complete fanfare, intricate glass harmonics and subdued resonant finish, no vocals |
| countdown-last-5s | 1.0 s | Urgent but gentle starship bridge readiness tick sequence with clean low pulses, no siren, no speech or music |

Do not replace any existing track without checking its license, audio content, loudness, clicks, peak levels, media decode, phones, and TV speakers. Retain local fallback effects.

## Rebuild and quality checks

```bash
python3 tools/master_mirelo_audio.py
python3 tools/build_phone_cues.py
npm run build
npm run test:release
```

The mastering script requires FFmpeg and NumPy; the game's only runtime dependency remains `ws`. A `--check` mode re-audits already mastered assets without changing them. The checks and full baseline game regression passed locally, but **physical iOS/Android and TV listening has not been performed**.

## Provenance and technical evidence

- `docs/audio/mirelo-mastering-report.json` contains SHA-256 checksums and LUFS/peak measurements before and after mastering.
- `docs/audio/phone-cue-map.json` lists the derivative phone clips and source timings.
- `tests/test-audio-mirelo-mix.js` asserts checksums, the 18 files' key parameters, Sound Lab and TV/phone wiring.
- `art-source/mirelo-originals/` contains the nine previous Mirelo MP3s for reprocessing.

This release contains no server-rule or gameplay protocol modifications and has **not** been committed or deployed to GitHub/Render.
