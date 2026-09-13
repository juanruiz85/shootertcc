# Task ID: d-maps-server — Sync server escuela & bosque to client redesign

**Agent:** main (server map syncer)
**Task ID:** d-maps-server
**Date:** 2026-09-13
**Status:** ✅ Completed

## What was done
Replaced the `escuela` and `bosque` obstacle arrays in
`/home/z/my-project/mini-services/game-server/index.ts` with the exact
same data as the redesigned client maps in
`/home/z/my-project/src/lib/game/constants.ts` (task `d-maps`).

## Files modified
- `/home/z/my-project/mini-services/game-server/index.ts`
  - `escuela` map: ~16 inline entries → 197 obstacles (2-story building
    with classrooms, library, lab, basketball court, courtyard, roof)
  - `bosque` map: ~16 inline entries → 163 obstacles (27 trees, lake,
    river, 3 bridges, cabin, watchtower, campfire, mushrooms, etc.)
  - Updated `theme` strings to match client: `'Escuela 2 pisos'`,
    `'Bosque denso con río y lago'`.
  - Updated `escuela` spawns to 6 entries (added `[-55,-55]`,`[55,55]`).

## Verification
- `bun run lint`: clean (exit 0)
- `bun build mini-services/game-server/index.ts`: bundled OK
- Sandbox obstacle-by-obstacle signature comparison:
  - escuela: client=197, server=197, ✅ all 197 match
  - bosque: client=163, server=163, ✅ all 163 match
- Dev server continues serving `/` with 200 responses

## Notes for future agents
- Server helpers (`ob`, `buildHouse`, `buildStairs`, `buildTree`,
  `buildCar`, `buildTower`) already matched client signatures, so only
  the obstacle arrays needed replacing.
- The server's `escuela` and `bosque` now produce IDENTICAL obstacle
  arrays to the client — server-side collision/visibility will match
  the client's rendering exactly.
