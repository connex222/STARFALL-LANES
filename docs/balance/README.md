# Balance study files

- `latest.json` / `latest.md`: **Phase 6 released rules**, 300 games per each of 21 configurations (2–8 seats, Quick/Standard/Advanced).
- `before.json` / `before.md`: original **untuned rules**, 300 games per each of 21 configurations.
- `comparison.json` / `comparison.md`: before/after table for every configuration.
- `parts/`: 35 single-configuration raw JSON summary files. This preserves evidence without duplicating an extra 35 Markdown reports. `baseline-*` are the 21 initial cohorts; `quickRoutes2-*` and `standard16-*` are the six initial flagged reruns; `after-*` are the eight remaining Quick/Standard reruns.

Advanced mode's 2,100 baseline matches were reused in the final report because Advanced game rules and target were not changed. The remaining 4,200 final-state Quick and Standard games were independently rerun. All 10,500 runs used seed 61803 and the production rules, accelerated only for time spent waiting on visual animations and bot-only readiness gates.

To regenerate the current release report from scratch: `npm run test:sim`. To regenerate the release comparison from the archived cohorts: `npm run test:balance:merge`.
