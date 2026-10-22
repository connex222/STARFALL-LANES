# Starfall Lanes — Phase 7: Epic Front Door, Academy & Lore

## Implemented

- Reworked the TV lobby into a cinematic cosmic command centre with the selected galactic logo, eight-player commander muster, room code / QR entry and prominent actions for **How to Play**, **Discover the Lore** and **Sound Lab**.
- Improved TV/laptop viewports through responsive layout and reduced-motion handling. Game HUD help/lore links remain available after the match begins and open in a separate tab.
- Reworked phone join branding and made **How to Play** / **Lore** links persist throughout the controller. Removed the mobile maximum zoom restriction and strengthened legibility on light-mode devices.
- Added local `public/how-to-play.html` and `public/lore.html` with a shared responsive `public/info.css`. Both pages are readable without joining a room. Rules follow Design Doc v2; new fictional embellishments are labelled in the archive.
- Kept nine bundled MP3 clips, TV opt-in sound, mute control, sound lab and TV volume slider. Added **optional phone sound effects** triggered by button gesture, trade/ready cues, era transitions, Solar Storm alerts and victory. No phone sound or autoplay before the player enables it.
- Added an optimised 800px mobile logo variant through responsive `<picture>` loading, preserving the higher-resolution image for large displays.
- Preserved the authoritative gameplay server and all eight existing houses, resources, rules, TV/phone roles, sound assets, room codes and rejoin logic.

## Verification

- `npm run test:ui`: 6 baseline, 7 Phase 4 and 7 Phase 5 checks passed.
- `npm run test:phase6`: 12 rules/network validation subtests and one nine-game simulation passed (in-process stand-in, not physical network devices).
- `npm run test:phase7`: six new dedicated onboarding checks passed.
- Chromium static/rendered smoke tests, using mocked WebSocket state: 14 combinations including TV 1920×1080, 1280×720 and 900×700, smaller 390px and 320px TV layouts, phone 320/390/1280, guide and lore at 320/390/1440. No reported page exceptions or horizontal overflow; phone join, sound button, joined lobby controls and help links checked.
- JavaScript syntax checked for the generated TV and phone HTML scripts.

## Run and deployment

```sh
npm install --omit=dev
npm start
```

Open `/tv.html` (or `/`, which still redirects there), then use the QR to open `/phone.html`. Guides are `/how-to-play.html` and `/lore.html`. Sound Lab is `/sound-lab.html`.

The generated `public/tv.html` and `public/phone.html` are included and run without a build step. If editing source, install dev dependencies and run `npm run build` to regenerate them.

## Still not signed off

- Physical multi-device Wi-Fi and Render multiplayer acceptance and reconnection after sleep / network loss.
- Audio volume/panning across a range of actual TVs and phones; audio starts off until manually enabled.
- Expansion and Ascension portrait / mood artwork (72 total variants, eight master portraits currently bundled).
- Zib-Zob perk ambiguity and other Design Doc v2 rule editorial decisions to be resolved before final release.
- Accessibility testing with real assistive technology beyond static/browser smoke checks.

**This build is packaged locally, not pushed to GitHub or deployed to Render.**
