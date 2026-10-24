# Phase 18 — audio installation and QA

The full 13-asset generated pack has been accepted by Creative Claw (Mirelo 2.0) and Daydream, but this working container cannot download external audio files from their hosting domains. The existing working 18 audio files remain bundled; the 13 replacements must be installed before claiming full delivery.

Extract the ZIP onto an internet-connected Windows PC. Install Python 3 and FFmpeg (including ffprobe on PATH), then double-click `INSTALL-NEW-AUDIO-WINDOWS.cmd`. The installer downloads all 13 files to temporary storage, checks MP3 decoding, expected duration, sample rate and size, then updates the game only if *all* succeed. Failed downloads leave the original sound files unchanged. This is intentionally separate from live gameplay so the game never needs an external CDN.

Verify with `python tools/install_plugin_audio.py --verify`, then `npm test` and `npm run test:live`. Test the game on TV, iPhone Safari and Android Chrome with audio explicitly enabled. Trial the new optional exploration theme via Sound Lab before selecting it as the default.

The standalone original music and nine premium TV cues are already locally bundled. This package is **not** a completed installation of the 13 new plugin files.

Production sound review: never autoplay phone audio; prevent notification overlap; compare loudness on typical TV speakers and small phone speakers; check that missing optional recordings report unavailable rather than pretending to play.
