# Task ID: z-server — Game Server Vertical `y` Offset + Tower Sync

## Agent
game-server-updater

## Task Summary
Mirrored the client `constants.ts` vertical-offset changes into the multiplayer game server (`mini-services/game-server/index.ts`). Without this, the authoritative spawn logic on port 3003 was treating floating roofs, cabin tops, foliage, and tower floor platforms as ground-level blockers — causing spawn validation to fail and players to be shoved to fallback positions.

## Files Modified
- `mini-services/game-server/index.ts` (1185 → 1293 lines, +108)

## Key Changes

### 1. `MapObstacle` type
Added `y?: number` field — vertical offset from ground (default 0).

### 2. `ob` helper
Signature extended with `y = 0` as the last positional parameter:
```typescript
const ob = (x, z, w, h, d, climbable = true, color = 0xe8d5b7, kind = 'box', rotation = 0, noCollide = false, y = 0): MapObstacle => ({ x, z, w, h, d, climbable, color, kind, rotation, noCollide, y })
```

### 3. `buildHouse` fix
- Replaced `winH/winY` with `doorH = 2.2`.
- Window above door (N + S sides): `ob(cx, cz ± d/2, doorW, h - doorH, wallT, false, color, 'wall', 0, true, doorH)` — floats at y = doorH.
- Roof: `ob(cx, cz, w + 0.6, 0.3, d + 0.6, true, roofColor, 'roof', 0, false, h)` — sits at y = h.

### 4. `buildStairs` fix
- `stepH = 0.6, stepD = 0.7, stepW = 2.5` (bumped up).
- Each step: `ob(x, z, stepW, stepH, stepD, true, color, 'stair', 0, false, i * stepH)` — stacks upward.

### 5. `buildTree` fix
- `trunkH = 3 * scale`, `foliageH = 2.5 * scale`.
- Trunk at y=0; foliage at `y = trunkH` (on top, not embedded).

### 6. `buildCar` fix
- Body at y=0; cabin at `y = 0.8` (on top of body, not inside).

### 7. New `buildTower` function
Multi-floor enterable tower with internal stairs:
```typescript
function buildTower(cx, cz, w, d, floors, color, roofColor): MapObstacle[] {
  const result: MapObstacle[] = []
  const floorH = 3.0, wallT = 0.3, doorW = 1.5, totalH = floors * floorH
  result.push(ob(cx, cz - d/2, w, totalH, wallT, false, color, 'wall'))         // N wall (full)
  result.push(ob(cx + w/2, cz, wallT, totalH, d, false, color, 'wall'))         // E wall (full)
  result.push(ob(cx - w/2, cz, wallT, totalH, d, false, color, 'wall'))         // W wall (full)
  for (let f = 0; f < floors; f++) {
    const fy = f * floorH
    // S wall segments flanking door, at floor height
    result.push(ob(cx - w/4 - doorW/4, cz + d/2, w/2 - doorW/2, floorH - 0.1, wallT, false, color, 'wall', 0, false, fy))
    result.push(ob(cx + w/4 + doorW/4, cz + d/2, w/2 - doorW/2, floorH - 0.1, wallT, false, color, 'wall', 0, false, fy))
    // window above door
    result.push(ob(cx, cz + d/2, doorW, 0.8, wallT, false, color, 'wall', 0, true, fy + 2.0))
    if (f > 0) {
      // floor platform + internal stairs for upper floors
      result.push(ob(cx, cz, w - wallT * 2, 0.2, d - wallT * 2, true, color, 'roof', 0, false, fy))
      result.push(...buildStairs(cx - w/4, cz, 4, 'N', 0x8a7a5a).map(s => ({ ...s, y: (s.y || 0) + fy })))
    }
  }
  // top roof
  result.push(ob(cx, cz, w + 0.6, 0.3, d + 0.6, true, roofColor, 'roof', 0, false, totalH))
  return result
}
```

### 8. `barrio` map rebuilt
- 8 houses (4 S-facing at z=-16, 4 N-facing at z=16) along x = -20, -8, 8, 20.
- 5-floor tower at center: `buildTower(0, 0, 8, 8, 5, 0xa0a8b0, 0x2c3e50)`.
- 8 trash cans, 4 cars (2 rotated 90°), 2 street lamps (cyl), 2 crates, 4 low fences, 1 central water fountain.
- 6 spawns.

### 9. `oficinas` map rebuilt
- 8 office buildings (4 S + 4 N) along x = -18, -6, 6, 18.
- 5-floor tower at center: `buildTower(0, 0, 7, 7, 5, 0x9098a0, 0x2c3e50)`.
- 2 glass partitions, 4 trash cans, 2 office desks, 2 ramps, 2 elevated bridges at y=4.
- 4 spawns.

### 10. `spawnBlocked` updated
Skips obstacles where `(o.y ?? 0) > 1.0` — they're elevated and don't block ground spawns. Threshold chosen because player spawn y is 1.7.

## Verification
- `bun run lint`: clean ✅
- `bun build index.ts`: 61 modules bundled successfully ✅
- Pre-existing `downlevelIteration` tsc errors are unrelated (server runs via Bun, which handles TS natively) — same as previous agent noted.
- Server's `escuela`, `bosque`, `paisaje` maps unchanged — already match client definitions.

## Sync Check (server ↔ client)
| Item | Client | Server | Match |
|------|--------|--------|-------|
| `MapObstacle.y` | `y?: number` | `y?: number` | ✅ |
| `ob` signature | `(..., y = 0)` | `(..., y = 0)` | ✅ |
| `buildHouse` doorH/roof y | `doorH=2.2`, roof `y=h` | same | ✅ |
| `buildStairs` dims + y | `0.6/0.7/2.5`, `y=i*stepH` | same | ✅ |
| `buildTree` foliage y | `y=trunkH` | same | ✅ |
| `buildCar` cabin y | `y=0.8` | same | ✅ |
| `buildTower` | present | identical | ✅ |
| `barrio` map | 8 houses + tower | same | ✅ |
| `oficinas` map | 8 houses + tower | same | ✅ |

## Notes for Future Agents
- The `y` field is purely positional metadata — the server doesn't simulate vertical physics, it only uses `y` to filter ground-blocking obstacles in `spawnBlocked`. Actual collision/z-fighting resolution happens client-side in `GameCanvas.tsx`.
- If you add more elevated obstacles (roofs, bridges, floating platforms) to any map, they will now correctly *not* block ground spawns as long as `y > 1.0`.
- The tower's internal stairs are offset by adding to their existing `y` (`s.y + fy`) — this works because `buildStairs` now always sets `y = i * stepH`, so the per-floor shift correctly stacks each floor's staircase.
