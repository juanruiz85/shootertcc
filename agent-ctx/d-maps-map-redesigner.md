# Task ID: d-maps — Escuela & Bosque Map Redesign

**Agent:** main (map redesigner)
**Task ID:** d-maps
**Date:** 2026-09-13
**Status:** ✅ Completed

## Summary
Completely redesigned the `escuela` (school) and `bosque` (forest) maps
in `/home/z/my-project/src/lib/game/constants.ts` with much more detail
per the task specification.

## Files changed
- `/home/z/my-project/src/lib/game/constants.ts` — replaced the `escuela`
  map definition (was ~28 lines / 46 obstacles) and `bosque` map definition
  (was ~24 lines / ~20 obstacles) with much larger detailed versions.

## Escuela redesign — 197 obstacles (was 46)

### Building shell (70×70, 2 stories, h=8)
- South wall with 2-wide door gap at center + decorative door lintel
  (noCollide) above entrance
- North, East, West walls — full height h=8
- Red accent stripe band near top of all 4 exterior walls (noCollide)
- Roof parapet (low 0.6-high walls around roof edge)

### Ground floor (y=0 to y=4) — 4 classrooms + hallways + bathrooms
- 4 classrooms in corners (NW, NE, SW, SE), each 30×30
- Cross-shaped hallway: NS (x∈[-5,5]) + EW (z∈[-5,5])
- Each classroom has 2 door gaps (2 wide) facing the hallways
- South entrance path fully clear: (0,35) → (0,-35) unobstructed
- Each classroom furniture:
  - 1 pizarrón (blackboard, 5×2×0.2) on exterior wall
  - 1 escritorio del maestro (teacher desk, 2×1×1, brown 0x8b4513)
  - 1 teacher chair
  - 6 pupitres (student desks, 1.5×0.8×1) in 2 rows of 3
  - 6 sillas (chairs, 0.6×0.5×0.6) next to desks
- 8 colored lockers along NS hallway walls (blue/red/green/yellow/
  purple/orange/teal/blue) at x=±4.5, z=±28/±32
- 2 bathrooms (east + west ends of EW hallway): partition walls +
  2 sinks each + door gaps

### Stairs to 2nd floor
- 7 steps going N at (x=-3, z=11), top at z=6.8, y=4.2

### 2nd floor (y=4.2 to y=8) — open plan
- Walkable platform (kind='roof') at y=4.2, 3 segments:
  - East half (x∈[0,35], full z)
  - West-north (x∈[-35,0], z∈[-35,7])
  - West-south (x∈[-35,0], z∈[12,35])
  - Stairwell gap at x∈[-5,0], z∈[7,12]
- Open plan (no interior walls — avoids blocking movement)
- Biblioteca (NE): 4 bookshelves, 2 reading tables, 2 chairs, blackboard
- Laboratorio (SE): 4 lab tables, 2 microscopes, 2 beakers, equipment shelf
- NW study area: 4 tables
- SW study area: 4 tables

### Stairs to roof
- 7 steps going N at (x=3, z=11), starting y=4.2, top y=8.4

### Roof (y=8)
- Red roof (0xc0392b, kind='roof') with stairwell gap at x∈[0,6], z∈[7,12]
- 4 roof segments + parapet walls

### Outside
- Basketball court (z∈[40,58]): 2 hoops (red+blue) with poles,
  backboards, orange rims; yellow boundary lines (noCollide); center
  line + circle
- Courtyard: 8 trees, 6 benches, decorative fountain (cyl + water)
- 4 trash cans at corners (climbing to roof)
- Flagpole with red flag in front of entrance

## Bosque redesign — 163 obstacles (was ~20)

### Water (3 features)
- Large lake (20×30) NW corner at (-40,-40), color 0x2980b9
- River N-S (6×80) at x=0, z∈[-40,40] — does NOT reach spawns at z=±60
- Small pond (10×10) SE corner at (45,45)

### Bridges (3 wooden + 6 railings)
- Bridges at z=0, z=20, z=-20 (8×0.5×3, climbable wood)
- 6 railing segments at bridge edges (noCollide)

### Trees (27 total, was 8) — buildTree at scales 1.2–2.2
- NE cluster (5), SE cluster (4), SW cluster (5), NW cluster (3),
  10 scattered at edges

### Terrain
- 8 large boulders (3×2.5×3, gray, climbable)
- 12 small climbing rocks (1.5³)
- 5 fallen logs (5×1×1, wood, climbable)
- 10 bushes (2×0.8×2, two greens, non-climbable)
- 5 tree stumps (1.5×1×1.5, wood, climbable)

### Structures
- Wooden cabin buildHouse(30,-30, 8,8,4, 0x8b4513, 0xc0392b, 'S') +
  bed + table inside
- 3-floor watchtower buildTower(-30,30, 6,6,3, 0x8b4513, 0x2c3e50)
- 2 rope bridges (kind='roof' at y=5) between trees + 4 anchor posts

### Details
- Campfire at (15,-15): orange fire + yellow flame + 4 rocks + log
- 8 red mushroom props (small cyls)
- 3 wooden signposts (post + sign board)
- 1 fallen tree near river (climbable)

## Verification
- `bun run lint`: clean ✅ (exit 0)
- Dev server compiles ✅ (✓ Compiled in 277ms)
- Obstacle counts: escuela 197 (was 46), bosque 163 (was ~20)
- South entrance clear ✅
- Spawns unobstructed ✅
- Stairwell gaps aligned ✅

## Notes for future agents
- The server's copy at `mini-services/game-server/index.ts` needs
  syncing separately (like prior task `c-details-server`).
- Escuela 2nd floor is open-plan (no interior walls) to avoid blocking.
- Bosque river at x=0 (z∈[-40,40]) doesn't reach spawns at z=±60.
- All water uses 0x2980b9 per task spec (was 0x3498db before).
