# Starfall Lanes — Phase 14: Audio readiness

## Completed and integrated

- Improved original `command-bridge-theme.mp3`: 90.3-second instrumental, 48 kHz stereo, 192 kbps MP3; stays local with the game. This is synthesised by the project, not a Sonilo-generated or professionally mastered score.
- Added adaptive music ducking when Solar Storms, fleet clashes, spire construction, era changes or victory cues play.
- Removed a duplicate Command Bridge Theme entry from Sound Lab.
- Added support for showing the premium-installed status after a verified installer receipt is present.
- Preserved all eight existing leaders, 72 era/expression portraits, game mechanics, phone and TV interactions, and nine working offline fallback sound effects.

## Provider-generated effects — transfer required

Eight individual event SFX and one 26-second ambient recording have been generated successfully with Mirelo SFX 2.0. They have **not been downloaded or installed** in this build. The signed provider URLs expire **29 October 2026**.

From an extracted project on a Windows PC with internet access, double-click **`Run-Premium-Audio-Install.cmd`**. PowerShell stages all nine files and confirms MP3 headers and sizes before replacing any sound. Copies of the existing fallback MP3s are saved in `public/audio/backup-procedural`; the installation produces `public/audio/premium-audio-receipt.json`. The original tracks are left unchanged if even one download fails.

On macOS, Linux or Windows with Python 3, `python tools/download_mirelo_audio.py` offers the same all-or-nothing behaviour plus ffprobe duration checks when ffprobe is available. It also accepts `--source-dir PATH` for manually saved files after the URLs expire. The Python script was tested with nine valid local MP3s and with a damaged file to check rollback. PowerShell downloads cannot be tested within this offline runtime, and physical TV/phone audio mixing is outstanding.

Once the Windows installer succeeds, **the updated project must still be committed and deployed to GitHub/Render**. Local installation alone does not update the live game.

## Verification and limits

- `npm run test:offline` — passed.
- `node test-phase14-audio.js` — passes MP3 decoding, soundtrack quality metadata, music-ducking hooks and Sound Lab checks.
- `docs/phase14-audio-audit.json` records codec, duration, sample rate, bitrate and checksum for each bundled track.
- Real-world loudness, 3D positioning, hearing safety and physical multi-device playback have not received human review.
- Sonilo could not produce a new song: text-to-music trial usage was exhausted and the account has no available cash balance.

## What this build actually ships

10 locally playable MP3s (one original upgraded music track + nine older synthesised event/ambience cues), plus scripts to fetch and replace the nine cues with already-generated Mirelo premium effects. Do not call the premium effects installed until the receipt exists.
