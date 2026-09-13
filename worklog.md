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

---
Task ID: 2
Agent: main
Task: Implement 2 game modes (PvP 1v1 + PvE levels), human player models with visible weapons, item drops, killstreaks, 16 maps, climbable structures, fix exit-button-under-pause, empty room cleanup

Work Log:
- Added 16 themed maps (Arena, Patios, Bunkers, Torres, Crucero, Espinas, Fortaleza, Laberinto, Puentes, Cráter, Zigzag, Diamante, Colmena, Ruinas, Estadio, Núcleo) with obstacles + spawn points, mirrored in both client constants.ts and server index.ts
- Added GameMode (pvp/pve), Team (blue/red/none), ItemType (ammo/heal/shield), KillstreakDef types
- Server: room now has mode/mapId/level; PvP assigns blue/red teams + round-based map rotation; PvE has level-based difficulty scaling (mob count/hp/speed/damage) + map rotation per level + round-end detection
- Server: item drops spawn on mob/player kills + periodic spawns; pickup applies ammo(weapon swap)/heal(+35hp)/shield(+30); distance-checked
- Server: killstreak tracking (drone@3, bomb@5, aura@7) with rewards — drone auto-attacks mobs, bomb AoE damage, aura heal+reload; streak toast emitted to player
- Server: empty rooms deleted after 8s TTL (EMPTY_ROOM_TTL_MS); keeps 1 default PvE room
- Server: round transitions (PvE level up, PvP round end) with 4s banner pause then fresh spawn + map change broadcast
- Lobby: mode selector (Vs Mobs / 1v1 PvP), room cards show mode badge + map name + level, map gallery (16 thumbnails), items reference card
- GameCanvas: human avatar (head+torso+arms+legs+hair+eyes) with team ring under feet, per-weapon visible held mesh (pistol/smg/rifle/shotgun each distinct), walk-cycle leg/arm animation
- GameCanvas: viewmodel redesigned per weapon type (different geometry)
- GameCanvas: climbable boxes — horizontal collision only blocks when feet below box top; landing detection on box tops so player can jump onto and stand on structures
- GameCanvas: item drop 3D models (ammo=yellow cartucho with bullets, heal=white box with red cross, shield=teal drink can); spin + bob animation; auto-pickup by proximity
- GameCanvas: 16 maps render with themed ground/fog/accent colors; arena rebuilt on map change
- GameCanvas: map rotation via room:mapChange event → buildArena + entity clear; server sends fresh room:joined after round transition
- Hud: fixed exit button — removed from TopBar, added "Salir de la sala" button INSIDE the pause overlay (z-50) so it's accessible above everything; TopBar z lowered
- Hud: added shield bar (teal) under health bar, team indicator on avatar, streak counter with flame icon, streak reward toast (🛸/💣/⚡), pickup toast, scoreboard with streak column, items on minimap
- Socket layer: dual connection — production uses /?XTransformPort=3003 (Caddy gateway), dev/localhost connects directly to host:3003 with path /; server path set to /

Verification (agent-browser):
- Lobby renders fully: mode selector, 16 maps gallery, items reference, controls ✅
- Badge shows "Conectado" (socket connects) ✅
- Created PvE room → entered 3D game, mobs present, combat active (health dropped to 46 then 55), level 1, Arena Doodle map ✅
- Created PvP room → entered with team Azul assigned, Laberinto map (random rotation), no mobs ✅
- ESC → pause overlay with "Reanudar" + "Salir de la sala" both visible & clickable ✅
- "Salir de la sala" → returns to lobby, room appears in list ✅
- Empty room cleanup: rooms empty >8s are deleted ✅
- Lint: clean ✅

Stage Summary:
- Both game modes fully functional. 16 maps rotate per level (PvE) / per round (PvP).
- Human player models with distinct per-weapon meshes. Items drop & pickup working.
- Killstreaks (drone/bomb/aura) implemented. Exit button fixed (in pause overlay).
- Climbable structures: player can jump onto boxes and stand on them.
- Servers running stable via dev.sh (next:3000 + game-server:3003).
