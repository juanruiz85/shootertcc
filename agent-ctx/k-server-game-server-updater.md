# Task k-server — Sync oficinas map furniture (PISO 1-6) to client

**Task ID:** `k-server`
**Agent:** game-server-updater
**Target file:** `/home/z/my-project/mini-services/game-server/index.ts`
**Source file (read-only):** `/home/z/my-project/src/lib/game/constants.ts`
**Date:** 2025

## Goal

The client's `oficinas` map furniture was rewritten (piso 1-5) so that
stair corners are no longer blocked by furniture. The server keeps its
own copy of the oficinas obstacles (for server-side collision/line-of-
sight), so the same rewrite had to be mirrored on the server.

The task was to copy the client's `// ════════ PISO 1` through
`// ════════ ROOF` block EXACTLY into the server, replacing the server's
current piso 1-6 furniture sections. The `ob()` helper and other helpers
are unchanged.

## Steps performed

1. Read the client's oficinas map section in
   `src/lib/game/constants.ts` (lines 731-838) — covering PISO 1 LOBBY,
   PISO 2 OFICINAS, PISO 3 SALAS DE REUNIONES, PISO 4 CUBÍCULOS,
   PISO 5 SERVIDORES, and PISO 6 TERRAZA.

2. Read the server's oficinas map section in
   `mini-services/game-server/index.ts` (lines 598-695) for the
   corresponding piso 1-6 block.

3. Confirmed both `ob()` function signatures are identical:
   `(x, z, w, h, d, climbable=true, color=0xe8d5b7, kind='box',
   rotation=0, noCollide=false, y=0)` — server uses `0xe8d5b7` default
   color, client uses `C_WOOD` constant (same value). No further
   differences that affect the copy.

4. Used a single Edit operation to replace the server's piso 1-6 block
   with the client's exact text (including comments).

5. Verified:
   - `bun run lint` → exit 0, no errors, no warnings.
   - `bun build mini-services/game-server/index.ts --target bun` →
     bundles successfully, all helpers resolve, no syntax errors.
   - Next.js dev server log (`dev.log`) continues showing clean
     `GET / 200` responses.

6. Appended a summary entry to `/home/z/my-project/worklog.md`.

## Specific changes mirrored (server side)

### PISO 1 (LOBBY) — explicit `y=0`
Every piso 1 `ob(...)` call now ends with explicit `, 0, false, 0`
arguments so the y-position is explicit at `y=0` (was previously
relying on the default). Comment header added: "All furniture at y=0
(ground floor)". Furniture positions themselves are unchanged.

### PISO 2 (OFICINAS) — moved away from stair corners
- Desk loop rewritten from index-based `for (i = 0..3)` to explicit
  list `[[-12,-10],[12,-10],[-12,10],[12,10]]` (desks were previously
  hitting the stair corner at x=±14 because the formula
  `dx = -12 + i*8` produced positions at x=-12, -4, 4, 12, but
  `dz = -10 + (i%2)*16` gave only z=-10 or z=6, missing the [12,10]
  corner. The new layout puts one desk in each of the four "safe"
  corners.)
- Filing cabinets moved from a 4-unit horizontal loop at x=4..16,
  z=0 (mid-floor) to **three explicit cabinets at x=-18** along the
  west wall (z=0, z=5, z=-5). The west-wall placement avoids the
  stairs at x=-14.
- Water cooler moved from (16, -8) to (18, -8) — flush against the
  east wall.
- Printer moved from (16, 8) to (18, 8) — flush against the east
  wall.

### PISO 3 (SALAS DE REUNIONES) — partition walls split, tables moved
- Partition walls rewritten from a single long cross shape (4 long
  walls spanning almost the whole floor with door gaps in the middle
  of each arm) to **4 short pieces** centered around (0,0):
  - Horizontal divider at z=0: left piece `ob(-8, 0, 12, ...)` spans
    x=-14..-2; right piece `ob(8, 0, 12, ...)` spans x=2..14. Gap of
    4 units at center (x=-2..2) plus the walls stop at x=±14 so the
    stair corners at x=±14 remain clear.
  - Vertical divider at x=0: top half `ob(0, -8, wallT, ..., 12)`
    spans z=-14..-2; bottom half `ob(0, 8, wallT, ..., 12)` spans
    z=2..14. Same idea — clear of z=±14 stair positions.
- Meeting tables moved from `[[-12,-12],[12,-12],[-12,12],[12,12]]`
  to `[[-10,-10],[10,-10],[-10,10],[10,10]]` (2 units closer to
  center) so the surrounding chairs (at ±2.5 from the table center)
  don't bump into the partition walls.
- Projector height adjusted from `f3 + 3` to `f3 + 2.8` (still
  ceiling-hanging, just slightly lower). Comment clarified.

### PISO 4 (CUBÍCULOS) — grid range tightened
- Cubicle grid changed from `cx ∈ [-12..12]` and `cz ∈ [-12..12]`
  (4×4 = 16 cubicles, hitting stair corners at ±14) to
  `cx ∈ [-8..8]` and `cz ∈ [-8..8]` (3×3 = 9 cubicles, center area
  only).
- Same furniture per cubicle: N partition, W partition, desk,
  monitor on desk, chair.

### PISO 5 (SERVIDORES) — racks explicit, cooling/UPS to walls
- Server rack loop rewritten from index-based `for (i = 0..5)` with
  formula `sx = -12 + (i%3)*8, sz = -8 + floor(i/3)*16` to an
  explicit list `[[-10,-8],[0,-8],[10,-8],[-10,8],[0,8],[10,8]]`.
  Net effect: racks moved 2 units closer to center on the x-axis
  (from x=±12,0 to x=±10,0), keeping them clear of stairs at x=±14.
- Cooling units moved from `(±15, 15)` to `(±18, 14)` — flush
  against east/west walls, away from stairs at x=±14.
- UPS batteries moved from `(±15, -15)` to `(±18, -14)` — same
  reason.

### PISO 6 (TERRAZA) — comments synced, code unchanged
The piso 6 code itself is identical to before (railings, jacuzzi, bar
counter, bottles, lounge chairs, plants, table with umbrella, BBQ).
Only the comments were brought in sync with the client ("Railings
around perimeter", "Jacuzzi (water)", "Bar counter", "bottle on bar",
"BBQ grill", "hot coals").

## What was NOT changed

- `ob()` function definition (server line 61)
- All other helper functions: `buildCar`, `buildTree`, `buildStaircase`,
  `buildFloor`, `getHolePos`
- Exterior walls, floor platforms, staircase construction (lines 577-596)
- ROOF section (line 707-708)
- EXTERIOR section (cars, trees, light poles, trash bins)
- Bosque map, Plaza map, and any other game-server code

## Verification

- `cd /home/z/my-project && bun run lint` → exit 0, no errors / no
  warnings (ESLint output: `$ eslint .` with no diagnostics).
- `bun build mini-services/game-server/index.ts --target bun` → bundles
  successfully (no syntax errors, all helpers resolve correctly).
- Next.js dev server (`dev.log`) continues serving `GET / 200` cleanly
  after the edit; no compile errors.

## Cross-references to previous agent work

- Previous oficinas-related server updates: see `agent-ctx/`
  - `b-rescale-server-game-server.md` (rescaling)
  - `c-details-server-game-server-details-sync.md` (details sync)
  - `d-maps-server-game-server-updater.md` (map redesign)
  - `e-server-game-server.md`, `f-server-game-server.md`,
    `x-server-game-server-updater.md`, `z-server-game-server-updater.md`
    (subsequent updates)
- Client-side oficinas rewrite that this task mirrors: documented in
  the most recent client work record.
