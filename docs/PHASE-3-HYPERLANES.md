# Review Phase 3 — Make the lanes the game

Source: STARFALL-LANES-REVIEW.md improvement plan, Phase 3.

## Route and toll design
The authoritative server connects adjacent owned sectors for free, traverses owned hyperlanes for free, and traverses rival-owned hyperlanes for one Credit per route. Unowned hyperlanes cannot be traversed. The server chooses a lowest-cost path and only charges tolls on successful resolution. This prevents remote lanes with no connection to your network from becoming unrestricted build portals. Free owned-sector adjacency and owned hyperlane access still work as before. Link/Beacon Missions can score using toll roads only while enough Credits are available; tolls are paid at the scoring moment and credited to the actual lane owner.

## Route scoring
Each claimed lane whose length reaches `longLaneMin` adds Influence. Trade Routes count unordered pairs of owned Trade Station endpoints in the same connected component of owned hyperlanes. These are separate from the Longest Network trophy, which keeps its existing logic and two-point value. Every new modifier is included in the game-end breakdown and bot planning.

## Map scaling
The generator preserves the map radius, number of hexes, lane intersection checks, clustering checks and station spacing. Extra stations replace Void sectors in 5–8-player maps. Generator tests sample each of 2–8 players and validate exact station counts.

## Limitations
Balance needs representative human playtests: the new Influence sources will materially change the time to target. Tactical gameplay and visual audio latency on real devices have not been verified. These changes are not uploaded to GitHub or deployed to Render.
