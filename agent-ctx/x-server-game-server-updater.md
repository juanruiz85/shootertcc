# Task ID: x-server — Game Server Mode & Map Update

## Agent
game-server-updater

## Task Summary
Updated `mini-services/game-server/index.ts` to support the new `GameMode` type (`'1v1' | '2v2' | 'team' | 'ffa' | 'coop' | 'mixed'`) and 5 new maps, replacing the old `'pvp' | 'pve'` mode system.

## Files Modified
- `mini-services/game-server/index.ts` (1071 → 1185 lines)

## Key Changes

### 1. GameMode Type & Helpers
- Changed `type GameMode = 'pvp' | 'pve'` → `type GameMode = '1v1' | '2v2' | 'team' | 'ffa' | 'coop' | 'mixed'`
- Added 6 helper functions: `isPvPMode`, `isPvEMode`, `hasMobs`, `hasFriendlyFire`, `maxPlayersForMode`, `defaultRoomName`

### 2. 5 New Maps Added
- `barrio` — Conjunto residencial (6 spawns)
- `escuela` — Aulas y pizarrones (4 spawns)
- `oficinas` — Edificio corporativo (4 spawns, has ramps)
- `bosque` — Densa vegetación (6 spawns, tree cylinders)
- `paisaje` — Río y montañas (4 spawns, river + bridge)
- Total: 21 maps (was 16)

### 3. Mode Logic Updates (15 locations)
All `room.mode === 'pvp'` → `isPvPMode(room.mode)`
All `room.mode === 'pve'` → `isPvEMode(room.mode)`

### 4. Mode-Specific Behavior
| Mode | Teams | Mobs | Friendly Fire | Max | Round End |
|------|-------|------|---------------|-----|-----------|
| 1v1 | blue/red | no | no | 2 | team eliminated |
| 2v2 | blue/red | no | no | 4 | team eliminated |
| team | blue/red | no | no | 12 | team eliminated |
| ffa | none | no | yes | 8 | last man standing |
| coop | none | yes | no | 12 | all mobs killed |
| mixed | none | yes | yes | 12 | all mobs killed |

### 5. API Changes
- `createRoom(name, mode, mapId?)` — now accepts optional mapId
- `room:create` event — accepts `{ roomName?, mode?, mapId? }`
- `roomSummary` — `max` field now uses `maxPlayersForMode(mode)` instead of constant 12
- `room:join` — max players check uses `maxPlayersForMode(room.mode)`

### 6. Friendly Fire Logic
- **coop**: ALL player vs player damage blocked
- **ffa/mixed**: friendly fire ON (all player damage allowed)
- **team modes (1v1/2v2/team)**: same-team damage blocked

### 7. FFA Round End
- `checkPvPRoundEnd` now branches: FFA ends when ≤1 alive; team modes end when one team has 0 alive

## Verification
- `bun run lint`: clean ✅
- No remaining `'pvp'`/`'pve'` string literals in mode logic ✅
- GameMode type matches client `src/lib/game/constants.ts` ✅
- All 5 new maps match client definitions ✅

## Notes for Future Agents
- `hasMobs` helper is defined but currently unused (mob AI uses `isPvEMode` which is equivalent). Kept for API completeness.
- `pveLevelConfig` already uses `MAPS[(level-1) % MAPS.length]` — auto-rotates through all 21 maps, no change needed.
- Pre-existing `tsc` config errors (downlevelIteration) are unrelated — server runs via Bun which handles TS natively.
- The default room is now `'coop'` mode (was `'pve'`).
