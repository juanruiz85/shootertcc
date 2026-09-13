# Task: b-rescale-server — Mirror rescaled MAPS array to game server

**Agent:** game-server-rescaler
**Date:** 2025
**Status:** ✅ Completed

## Summary
The client's `src/lib/game/constants.ts` MAPS array was rescaled by 2.5× in
task `b-rescale`, but the server's own copy in
`/home/z/my-project/mini-services/game-server/index.ts` still used the
original small coordinates. This caused server/client disagreement on
obstacle positions, breaking spawn checks and collision detection.

This task mirrored the client's rescaled MAPS array verbatim into the
server, substituting the client's named color constants (`C_WOOD`,
`C_STONE`, etc.) with their hex values (which the server already used
directly).

## Files changed
- `/home/z/my-project/mini-services/game-server/index.ts`
  - MAPS array (lines 129–366): all 21 maps updated to match client.

## Color constant mapping (verified against client constants.ts lines 81–93)
| Client constant | Hex value |
|---|---|
| `G_PAPER` | `0xf5f1e8` |
| `G_SAND` | `0xf0e6d2` |
| `G_GRASS` | `0xeaf3e0` |
| `G_STONE` | `0xe8e4df` |
| `G_SNOW` | `0xf7fafc` |
| `G_LAVA` | `0xf6e3d8` |
| `C_WOOD` | `0xe8d5b7` |
| `C_STONE` | `0xd5c4a0` |
| `C_DARK` | `0xcdb98a` |
| `C_PILLAR` | `0xb8a47a` |
| `C_RED` | `0xe0a3a0` |
| `C_BLUE` | `0xa3c8e0` |

## Key changes mirrored

### 1. First 16 simple maps (arena → nucleo)
All obstacle `x` and `z` coordinates multiplied by 2.5× (rounded to
integers). `w`, `h`, `d`, `kind` unchanged. Spawns also updated to match
client (e.g. patios `[[-20,-20],...]` → `[[-50,-50],...]`, several maps
with ±24 spawns → ±60).

### 2. Escuela map (fully restructured)
- Building: `buildHouse(0,0,30,30,5,...)` → `buildHouse(0,0,60,60,6,...)`
- Removed interior dividers (horizontal + vertical walls)
- Removed south blackboard (was blocking south door); kept 3 blackboards
  at ±28 (west, east, north)
- Lockers moved from `x=±14` to `x=±28` (east/west walls, 8 lockers)
- Desks: 12 (3 groups of 4) → 16 (single 4×4 grid at ±22, ±15)
- Basketball hoops at `z=±45` (outside 60×60 building)
- Trash cans at `(±20,-10)`
- Stairs moved from `(-13,0)` to `(-25,5)`

### 3. Four detailed maps (barrio, oficinas, bosque, paisaje)
All `buildHouse/buildTower/buildTree/buildCar/buildStairs` `cx,cz`
positions and all `ob()` x,z positions multiplied by 2.5× (rounded).
Structure sizes (`w`, `h`, `d`) unchanged.

Examples:
- barrio houses: `(-20,-16)` → `(-50,-40)`
- bosque trees: `(-12,-12)` → `(-30,-30)`
- paisaje tower: `(-20,0)` → `(-50,0)`; stairs `(-17,0)` → `(-43,0)`

## What was NOT changed
- Helper function definitions (`ob`, `buildHouse`, `buildTower`,
  `buildStairs`, `buildTree`, `buildCar`) — already identical to client.
- Ground/fog/accent colors — already used same hex values.
- `waterLevel: 0.3` on bosque/paisaje — already present.
- All other server logic (game state, networking, combat, mob AI).

## Verification
- `bun run lint`: clean ✅ (no errors, no warnings)
- Dev server logs: normal compilation, no runtime errors ✅
- Spot-checked arena, escuela, barrio, bosque, paisaje — all coordinates
  now match the client's MAPS array exactly (with named color constants
  substituted for their hex values).

## Result
Server and client now agree on every obstacle position, size, kind,
color, and climbability across all 21 maps. This fixes:
- Players spawning inside obstacles that appear elsewhere on their screen.
- Players being pushed out of obstacles that don't visually exist.
- The arena now properly filled with cover on both sides (160×160).

## Related tasks
- `b-rescale` (map-rescaler): The client-side task that performed the
  original 2.5× rescaling. See worklog.md and
  `/home/z/my-project/agent-ctx/b-rescale-map-rescaler.md`.
