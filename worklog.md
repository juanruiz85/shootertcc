# Doodle Shooter Multiplayer — Worklog

## Project Overview
Converting 4 standalone Doodle Shooter HTML files (Three.js + PointerLockControls FPS games)
into a **real multiplayer** Next.js application, and **fixing the inverted-controls bug**
present in 2 of the 4 source files.

### Analysis of source files (in `/home/z/my-project/upload/`)
All 4 are Three.js first-person doodle shooters.

| File | Title | Bug? | Multiplayer? |
|------|-------|------|--------------|
| `bqin83m69.html` | Doodle Shooter: Ultimate Edition | YES — uses `camera.rotation.y` (XYZ Euler order) while PointerLockControls writes YXZ quaternion → WASD diverges after pitching | No |
| `0d4ca12ms.html` | Doodle Shooter: Ultimate Edition | YES — applies velocity directly to `camera.position.x/z` in world space, never rotates by yaw → keys inverted after turning | No |
| `b08d1cklm.html` | Doodle Shooter: Architect Edition | No (correct, uses `controls.moveForward/moveRight`) | Simulated bots only |
| `z3z7jp71n.html` | Doodle Shooter Clone | No (correct) | No |

### Root cause of the inverted-controls bug
Files 1 & 2 reinvent movement incorrectly instead of using the canonical
`PointerLockControls.moveForward(d)` / `moveRight(d)` helpers (which project the local
move onto the camera's true world forward/right vectors via the quaternion). The fix is
to use those helpers.

### Architecture of the new build
- **Frontend**: Next.js `/` route. Lobby (name + skin + room list) → Game (Three.js canvas + HUD).
  Uses `socket.io-client` connecting via `io("/?XTransformPort=3003")`.
  Movement uses `controls.moveForward/moveRight` → **bug fixed**.
- **Backend mini-service** (`mini-services/game-server`, port 3003): socket.io server with
  rooms, player state sync (20 Hz), mob (PvE doodle enemy) sync, hit reporting, kills,
  respawns, kill feed, scoreboard.
- **Shared**: doodle aesthetic (paper background, black wireframe edges, hand-drawn fonts).

## Tasks
1. ✅ Review project, deps, examples
2. ✅ Install three, socket.io, socket.io-client, @types/three
3. ⏳ Build socket.io game server (port 3003)
4. ⏳ Build lobby UI
5. ⏳ Build 3D game with FIXED controls
6. ⏳ Multiplayer sync (players, mobs, shots, kills, respawn)
7. ⏳ HUD (health, ammo, scoreboard, kill feed, minimap)
8. ⏳ Polish doodle aesthetic
9. ⏳ Verify with agent-browser
10. ⏳ Cron job webDevReview every 15 min

---
Task ID: 1
Agent: main
Task: Review project state, install deps, start dev server, write worklog

Work Log:
- Read all 4 uploaded HTML files via Explore subagent (full analysis recorded above)
- Confirmed two files have the inverted-controls bug, two are correct
- Confirmed none have real networking
- Checked Next.js project structure: shadcn/ui present, examples/websocket demo present
- Installed `three@0.186.0`, `socket.io@4.8.3`, `socket.io-client@4.8.3`, `@types/three@0.186.0`
- Started dev server on port 3000 (Ready in 787ms)
- Caddyfile confirms `XTransformPort` gateway pattern; websocket path must be `/`

Stage Summary:
- Project ready. Deps installed. Dev server running.
- Next: build the socket.io game server mini-service on port 3003.
