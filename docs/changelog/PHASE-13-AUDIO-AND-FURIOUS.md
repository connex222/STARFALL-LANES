# Starfall Lanes — Batch 4 portraits and audio upgrade

## Integrated and ready
- Eight canonical leaders × three eras × three moods = **72 locally bundled portraits**. The 24 Furious variants are treated versions of eight new Furious paintings, not 24 separate paintings.
- No new character names, abilities or game rules.
- Original **Command Bridge Theme** (90 seconds, stereo MP3, fully synthesised from original note sequences without external sound samples) bundled as `public/audio/command-bridge-theme.mp3`. Plays at modest volume on the TV/PC game, loops once sound is enabled. Users can toggle music separately and control overall volume. Phone audio remains event effects only to prevent competing music from multiple players.
- The existing nine locally bundled event effects remain usable offline, through the same established filenames. Sound Lab now includes the backing-music preview.

## Premium audio generated, but awaiting transfer
Nine *Mirelo SFX 2.0* jobs have completed: orbital ambient bed, storm, hyperlane, spire construction, fleet movement, fleet clash, era transition, victory and resource reward. **None is bundled in this ZIP**: the current workspace could not access the signed audio download endpoints. Their provider links expire on 29 October 2026. From a computer with internet access, run `python tools/download_mirelo_audio.py` to replace all nine bundled placeholder clips in `public/audio/` after backing them up. Re-package or push the updated folder only when that script succeeds. Otherwise the existing sounds continue to work.

Music generation through Sonilo was attempted, but account's two free text-to-music uses were already consumed and paid balance is zero. The original instrumental was therefore produced locally; it is **not** Sonilo-generated or mastered by a music producer.

## Verification limits
Source and generated TV/phone HTML preserve the WebSocket protocol and server code. Automated asset checks can confirm dimensions, presence, path selection, syntax and audio decoding; they do not substitute for physical TV/phone listening, human mixing QA or live multiplayer.

## Running
`npm install` then `npm start`; use the Sound button on the TV, then Music on/off. Sound Lab is linked from the front page. For future editable source builds: `npm run build` requires the documented npm fonts and QR library.
