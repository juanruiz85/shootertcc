# Task `l-server` — Sync server `bosque` map to client IIFE rewrite

**Agent:** game-server-updater
**Task ID:** `l-server`
**Date:** 2024 (session)
**Status:** ✅ Complete

## Objective

The client's `bosque` map at `/home/z/my-project/src/lib/game/constants.ts`
was completely rewritten as an IIFE with new features:

- River crossing the map diagonally (NE→SW) built from 11 water segments
  rotated `Math.PI/4`.
- 3 wooden bridges (center / NE / SW) over the river, each with a railing.
- 8 large climbable trees via `buildBigTree()` — thick trunk (cylinder) +
  3 branches at different heights (boxes offset on y) + 2 foliage crowns.
- 12 small decorative trees via `buildSmallTree()` (thin trunk + 1 crown).
- 8 large rocks via `buildRock()` — flat cylinder + secondary smaller rock
  on top.
- 12 small rocks (jumping / cover) emitted by a `for…of` loop over an
  `as const` tuple array.
- 6 bush clusters via `buildBushCluster()` — 4 perimeter bushes + 1 taller
  center bush.
- 6 fallen logs (climbable, rotated boxes).
- Wooden cabin (enterable, NE) + watchtower (3 floors, SW) via the existing
  `buildHouse` / `buildTower` helpers.
- Campfire (4 rocks + fire + flame) and 6 red mushrooms.

The server at `/home/z/my-project/mini-services/game-server/index.ts`
still had the old flat `obstacles: [ ... ]` array (theme `'Bosque denso
con río y lago'`, ground `0x4a7a3a`) with completely different obstacle
layout (large lake, N–S river, 27 trees, rope bridges, signposts, stumps…).

The server must serve the same map data the client renders, otherwise
collision, line-of-sight, and spawn validation will diverge. This task
copies the client's IIFE verbatim into the server.

## Files touched

- `mini-services/game-server/index.ts` — replaced the `bosque` map entry
  (old flat array version) with the client's IIFE version verbatim.

## How it was done

1. Read `/home/z/my-project/src/lib/game/constants.ts` lines 863–992 to
   capture the exact IIFE code including the map header
   (`id`, `name`, `theme`, `ground`, `fog`, `accent`, `waterLevel`) and
   `spawns`.
2. Read the server's current bosque entry (lines 730–878) to know exactly
   what to replace.
3. Verified the server already has matching helpers:
   - `ob()` at line 61 (same signature as client).
   - `buildHouse()` at line 63 (same signature).
   - `buildTower()` at line 103 (same signature).
   - `buildTree()` at line 87 (same signature).
   - `MapObstacle` / `GameMap` types at lines 58–59 (identical to client).
4. Performed a single `Edit` call: old_string = server's entire bosque
   entry (header + `obstacles: [ ... ]` + `spawns`); new_string = the
   client's IIFE version copied character-for-character (including
   Spanish comments, `as const` tuple loops, `Math.PI/4` rotations,
   color constants).
5. Ran `cd /home/z/my-project && bun run lint` → exit 0, no errors and
   no warnings. The IIFE pattern is already used by other server maps
   (e.g. `pueblo` just above), so TypeScript / ESLint accepts it cleanly.

## What was NOT changed

- `ob()` / `buildHouse()` / `buildTower()` / `buildTree()` /
  `buildStairs()` helper definitions — already correct on the server.
- All other maps (`pueblo`, `arena`, `ciudad`, `paisaje`, …) — untouched.
- All gameplay code — movement, shooting, mob AI, scoring, killstreaks,
  hit detection — untouched.
- Any client-side files — `src/lib/game/constants.ts` etc. were only read.

## Verification

- `cd /home/z/my-project && bun run lint` → exit 0 (no errors / warnings).
- Diff confirms the bosque entry in the server now matches the client
  byte-for-byte (same IIFE, same obstacle list, same spawns).
- The IIFE pattern + local `const buildBigTree` / `buildSmallTree` /
  `buildRock` / `buildBushCluster` helpers resolve cleanly because the
  server already defines `ob()` and `MapObstacle` with the exact shapes
  used by these calls (12-arg `ob` with `rotation` / `noCollide` / `y`
  trailing params).

## Outcome

The server and client now share the same `bosque` map data — same river
shape, same bridges, same tree positions, same rocks, same cabin /
watchtower placement. Server-side collision and spawn validation will
agree with what the player sees rendered on the client.
