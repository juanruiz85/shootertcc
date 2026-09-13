# Task ID: f-server — Sync oficinas map (game-server)

**Agent:** game-server updater
**Date:** 2025-09-13
**File modified:** `/home/z/my-project/mini-services/game-server/index.ts`

## Objective
The client's `oficinas` map (`/home/z/my-project/src/lib/game/constants.ts`) was rewritten with new `buildFloor` / `buildStaircase` helpers, per-floor alternating stair corners, and redesigned 6 floors. The server's authoritative copy of the same map needed to be updated to match EXACTLY so client-rendered obstacles and server-side collision/hit detection agree.

## What was done
Replaced the entire `obstacles: ((): MapObstacle[] => { ... })()` IIFE of the `oficinas` entry in the server's `MAPS` array with the client's IIFE verbatim. The map declaration line and `spawns` array were left untouched (kept server's single-line style).

### New helpers copied in (local to the IIFE)
- `buildFloor(y, hx, hz)` — emits 4 `roof` pieces (N/S/W/E) around a 4×4 hole at `(hx, hz)` so a staircase can pass through.
- `buildStaircase(sx, sz, dir, baseY)` — emits 7 steps (stepH 0.57, stepD 0.7, stepW 3.5) going N/S/E/W; rotates π/2 for E/W.
- `stairs[]` — per-floor stair positions/directions:
  | Floor | Stair corner | Direction |
  |-------|--------------|-----------|
  | 0→1   | NW (-14,-14) | N         |
  | 1→2   | NE (14,-14)  | N         |
  | 2→3   | SE (14,14)   | S         |
  | 3→4   | SW (-14,14)  | S         |
  | 4→5   | NW (-14,-14) | N         |
- `getHolePos(s)` — computes hole center on the floor above based on stair direction (N→+4.2 z, S→-4.2 z, E→-4.2 x, W→+4.2 x).

### Floor content (matches client)
- **PISO 1 (lobby):** reception desk+PC, 2 chairs, sofa, coffee table, 2 plants, security desk, 2 trash cans.
- **PISO 2 (open offices):** 4 desk+PC+chair clusters in zigzag, 4 filing cabinets, water cooler, printer.
- **PISO 3 (meeting rooms):** cross-shaped partition walls (4 segments with door gaps), 4 meeting tables each with 4 chairs + projector.
- **PISO 4 (cubicles):** 9 cubicles (3×3 grid at cx,cz ∈ {-12,-4,4,12}) with L-shaped partitions, desk, monitor, chair.
- **PISO 5 (servers):** 6 server racks (3×2 grid) with LED lights, 2 cooling units, 2 UPS batteries.
- **PISO 6 (terrace):** railings, jacuzzi (water only, no rim box), bar + 2 bottles, 3 lounge chairs, 2 plants, umbrella table, BBQ.
- **Roof** + **exterior** (6 cars, 2 street lamps, 4 trees, 2 entrance trash cans).

## Server helpers reused (unchanged)
`ob`, `buildCar`, `buildTree`, `buildHouse`, `buildStairs`, `buildTower` — all defined earlier in the server file and compatible with the client's calls.

## Verification
- `cd /home/z/my-project && bun run lint` → PASS (no errors, no warnings).
- No TypeScript errors introduced (all `ob(...)` signatures match the server's `MapObstacle` type).

## Notes for downstream agents
- The `oficinas` map is the only map that needed updating in this task. Other maps (`ciudad`, `escuela`, `bosque`, `paisaje`) were not touched.
- If the client's `oficinas` IIFE changes again in the future, the same verbatim-copy procedure applies. The two files MUST stay byte-identical for the IIFE body (modulo the leading `{ id: 'oficinas', ...` line which the server keeps on one line).
- Obstacle indices/counts will differ from the previous server version, so any code that hardcodes obstacle indices for `oficinas` should be re-checked. A quick grep shows no such hardcoding in the server.
