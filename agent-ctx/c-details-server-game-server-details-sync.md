# Task: c-details-server — Verify server's `escuela` and `barrio` maps match client

**Agent:** game-server-details-sync
**Task ID:** c-details-server
**Date:** 2026-09-13
**Status:** ✅ Completed — no code changes required (already in sync)

## Summary
The user reported that the client's `escuela` and `barrio` maps in
`/home/z/my-project/src/lib/game/constants.ts` had been completely
redesigned with extensive details (classrooms, desks, lockers, basketball
court, houses with furniture, cars, trees, park, etc.) and asked for the
server's copies of these 2 maps to be updated to match the client EXACTLY.

## Investigation
1. Read the client's `escuela` (lines 436–463) and `barrio` (lines 402–433)
   map definitions from `/home/z/my-project/src/lib/game/constants.ts`.
2. Read the server's `escuela` (lines 298–313) and `barrio` (lines 274–297)
   map definitions from
   `/home/z/my-project/mini-services/game-server/index.ts`.
3. Verified that the server's helper functions
   (`ob`, `buildHouse`, `buildStairs`, `buildTree`, `buildCar`, `buildTower`)
   at lines 54–127 are byte-identical to the client's helpers at
   lines 96–215 (modulo the cosmetic difference that the client names its
   default wood color `C_WOOD = 0xe8d5b7` while the server inlines the hex
   literal `0xe8d5b7`).
4. Wrote a one-off comparison script that re-declares the helpers, expands
   both `CLIENT_*` and `SERVER_*` obstacle arrays verbatim from the two
   source files, then serializes every obstacle (`x, z, w, h, d, climbable,
   color, kind, rotation, noCollide, y`) to JSON and compares element-by-
   element.

## Comparison result
```
=== BARRIO comparison ===
client count: 115, server count: 115
OK barrio: identical

=== ESCUELA comparison ===
client count: 46, server count: 46
OK escuela: identical
```

Both maps already produce **identical** flattened obstacle arrays on the
client and the server — every coordinate, dimension, color, kind, rotation,
noCollide flag, and y-offset matches.

## Why no changes were needed
Looking at the prior agent record
`/home/z/my-project/agent-ctx/b-rescale-server-game-server.md`, the
`b-rescale-server` task already mirrored the client's MAPS array (including
the detailed `escuela` and `barrio` maps) verbatim into the server on the
same day. File modification times confirm this:

| File | mtime |
|---|---|
| `src/lib/game/constants.ts` (client) | 2026-09-13 15:24:32 |
| `mini-services/game-server/index.ts` (server) | 2026-09-13 15:36:11 |
| `agent-ctx/b-rescale-server-game-server.md` | 2026-09-13 15:38:07 |

The server was last updated *after* the client, so it already incorporates
all of the client's detailed redesign changes (16 desks in 4 classrooms,
8 lockers on east/west walls, 3 blackboards, basketball hoops at z=±45,
trash cans off the door path, interior stairs; 8 enterable houses with
doors + windows + roofs, 5-floor tower with internal stairs, 4 cars,
street lamps, crates, low fences, central water fountain).

## Files changed
None. The server file `/home/z/my-project/mini-services/game-server/index.ts`
was already in sync with the client file
`/home/z/my-project/src/lib/game/constants.ts` for both the `escuela` and
`barrio` maps.

## Verification
- `bun run lint`: clean ✅ (exit 0, no errors, no warnings)
- Programmatic obstacle-by-obstacle comparison: 0 mismatches across
  115 (barrio) + 46 (escuela) = 161 obstacles ✅

## Conclusion
Task `c-details-server` is complete. The server's `escuela` and `barrio`
maps are already byte-equivalent (after helper expansion) to the client's,
so no edits were required. The verification was done programmatically to
eliminate the possibility of human eye-skip error.
