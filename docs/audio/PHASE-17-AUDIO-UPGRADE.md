# Phase 17 — Premium audio completion

Audio inventory: nine existing remastered Mirelo main-TV effects, eight former procedural mobile effects, existing original command-bridge theme. The plugin generated **12 new Mirelo 2.0 effects**: eight phone cues and four mechanics (lane toll, backup order, mission completion, order failure). **Daydream** generated one new, instrumental, loopable 120-second exploration theme.

## Provider delivery boundary

The audio models completed and gave real permanent media URLs, but this runtime cannot download files from plugin-hosted domains. Therefore the new audio **is not physically included** in the ZIP. Existing audio remains as fallbacks. After extracting the game on an internet-connected Windows machine, run `INSTALL-NEW-AUDIO-WINDOWS.cmd`, or `python tools/install_plugin_audio.py` (requires ffprobe in PATH). The downloader individually validates audio and backs up replaced files. Verify the output before deployment. There are no runtime external audio dependencies; all playback uses local files.

The new Daydream theme is available in Sound Lab once downloaded. The existing Command Bridge Theme remains the default to prevent changing users' settings or a surprise mix shift. Promote the exploration theme after device QA.

Quality gate: listen on TV, iPhone Safari and Android Chrome; check clipping, perceived loudness, and simultaneous 8-player notification frequency. No human listening claims made.

Creative Claw: Mirelo SFX v2 (12 completed generated jobs). Daydream: 1 complete 120-second instrumental. Sonilo: free text credits exhausted. Direct Mirelo connection unavailable in this session.
