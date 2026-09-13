# Task ID: e-server — Sync server `oficinas` map to redesigned 6-floor client version

**Agent:** main (server map syncer)
**Date:** 2026-09-14
**Status:** ✅ Completed
**Depends on:** client `oficinas` redesign (already in `src/lib/game/constants.ts`)

## Summary

The client's `oficinas` map in `src/lib/game/constants.ts` was completely
redesigned as a 6-floor corporate office building (~308 obstacles after helper
expansion) using an IIFE pattern `((): MapObstacle[] => { ... })()`. The server
at `mini-services/game-server/index.ts` still had the old small version
(~18 obstacles: 8 houses, 1 tower, 2 glass walls, 2 ramps, 2 trash cans, 2
desks, 2 roofs). Replaced the server-side `oficinas` obstacle definition with
the EXACT same code as the client — including the IIFE pattern, all local
variables (`W`, `D`, `FH`, `FLOORS`, `TOT`, `wallT`, `doorW`, `cWall`,
`cFloor`, `cGlass`, `cDesk`, `cChair`, `cPC`, `cDark`, `r`), all loops, all
`r.push(...)` calls, and all `buildCar` / `buildTree` helper invocations.

## Files changed

- `mini-services/game-server/index.ts`
  - `oficinas` map (was 19 lines inline with `buildHouse`/`buildTower`/`ob`
    calls, ~18 obstacles) → replaced with 207-line IIFE that produces 308
    obstacles (identical to client).
  - Theme updated from `'Edificio corporativo'` → `'Edificio corporativo 6 pisos'`
    (matches client).
  - Spawns extended from 4 → 6 (`[-55,-55]` and `[55,55]` added) to match
    client.
  - Server's helper functions (`ob`, `buildHouse`, `buildStairs`, `buildTree`,
    `buildCar`, `buildTower`) were already identical to the client's, so no
    helper changes were needed.

## What the new oficinas contains (mirrors client exactly)

### Exterior shell (6 floors × 4m = 24m tall, 40×40 footprint)
- North wall (solid, full 24m height)
- East + West walls (glass, full height)
- South wall with door gap on ground floor only (3.9m tall segments on either
  side of a 2-wide door), solid above on floors 2–6
- 5 floor platforms (y=4,8,12,16,20) with stairwell gap at x∈[8,18]
- Roof at y=24 (40.6×40.6)

### Central stairwell (x=12)
- 5 flights × 7 stairs each = 35 stairs going north (upward), 0.55 high × 0.7
  deep each
- 5 landing platforms connecting top of each flight to next floor

### Floor 1 (y=0..4) — Lobby / Recepción
- Reception desk + PC
- 4 reception chairs
- Sofa + coffee table
- 4 potted plants
- Security desk + PC
- 2 trash cans

### Floor 2 (y=4..8) — Oficinas Abiertas
- 6 desks with monitors + chairs (3 north row, 3 south row)
- 3 filing cabinets along west wall
- Water cooler + printer on east wall

### Floor 3 (y=8..12) — Salas de Reuniones
- 2 partition walls (horizontal + vertical) dividing into 4 quadrants
- 4 meeting rooms, each with: large table, 4 chairs, projector, whiteboard

### Floor 4 (y=12..16) — Cubículos
- 9 cubicles in a 3×3 grid (cx,cz ∈ {-12,0,12})
- Each cubicle: L-shaped partition walls, desk, monitor, chair, phone

### Floor 5 (y=16..20) — Sala de Servidores
- 6 server racks (2 rows × 3 cols) with body, interior, 2 LED lights each
- 2 cable trays (one NS, one EW)
- 2 cooling units, 2 UPS batteries in corners

### Floor 6 / Azotea (y=20..24) — Terraza
- 4 railing segments around perimeter
- Jacuzzi (water + rim, no collide)
- Bar counter + bar stool + 2 bottles
- 3 lounge chairs
- 3 large potted plants
- Umbrella table (table + pole + no-collide top)
- BBQ grill + hot coals

### Exterior details
- 6 parking lot cars (`buildCar` at ±30,±40)
- 4 street lamps (at ±40,0 and 0,±50)
- 4 landscaping trees (`buildTree` at ±50,±50)
- 2 trash cans at entrance

## Verification

- `bun run lint`: clean ✅ (exit 0, no errors, no warnings)
- Programmatic obstacle-by-obstacle comparison: wrote a sandbox script that
  extracted the server's oficinas IIFE body verbatim, transpiled it via
  `Bun.Transpiler` (TS→JS) to strip type annotations, evaluated it with the
  same `ob` / `buildTree` / `buildCar` helper implementations, then compared
  every obstacle's serialized JSON (`{x,z,w,h,d,climbable,color,kind,rotation,noCollide,y}`)
  against a verbatim copy of the client's oficinas IIFE body:
  - **client oficinas**: 308 obstacles
  - **server oficinas**: 308 obstacles
  - **result**: ✅ all 308 match exactly (0 mismatches)
- Dev server (`dev.log`) shows continued clean `GET /` 200 responses ✅

## Approach notes

- The IIFE pattern `((): MapObstacle[] => { ... })()` is valid TypeScript on
  Bun — both the client (browser bundle) and server (Bun runtime) evaluate it
  identically.
- The server's `ob` helper has a different default color (`0xe8d5b7` literal)
  vs the client's (`C_WOOD = 0xe8d5b7` constant), but the resolved value is
  identical so all `ob(...)` calls produce the same obstacle data.
- The server's `MapObstacle` type uses a union string literal for `kind`
  (`'box'|'cyl'|'ramp'|'wall'|'stair'|'water'|'roof'`) and so does the
  client's — the IIFE body's `r: MapObstacle[] = []` annotation type-checks
  cleanly in both files.
- Kept the server's compact single-line header format
  (`{ id: 'oficinas', name: 'Oficinas', theme: ..., ground: ..., fog: ..., accent: ...,`)
  matching the style of the other server maps; only the `obstacles` field
  switched to the IIFE pattern.

## Related agent records

- This task's full record: `/home/z/my-project/agent-ctx/e-server-game-server.md`
- Prior similar tasks:
  - `/home/z/my-project/agent-ctx/c-details-server-game-server-details-sync.md`
    (escuela + barrio sync — same approach, used inline `ob(...)` arrays)
  - `/home/z/my-project/agent-ctx/d-maps-server-game-server-updater.md`
    (escuela + bosque sync — same approach)
  - `/home/z/my-project/agent-ctx/b-rescale-server-game-server.md`
    (original server↔client map sync)
