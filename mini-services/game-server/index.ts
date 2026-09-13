import { createServer } from 'http'
import { Server } from 'socket.io'

// ====================================================================
// Doodle Shooter — Multiplayer Game Server (socket.io)
// Port: 3003 (exposed via Caddy gateway using ?XTransformPort=3003)
// ====================================================================

// ----------------------- Constants -----------------------
const PORT = 3003
const ARENA = 64 // total side length
const HALF = ARENA / 2
const WALL = 2 // wall thickness/height region
const PLAYER_MAX_HP = 100
const RESPAWN_MS = 3000
const TICK_MS = 50 // 20 Hz world tick (mobs + roster)
const STATE_BROADCAST_THROTTLE = 45 // ms — min gap between re-broadcasting same player's state
const MOB_COUNT = 7
const MOB_MAX_HP = 60
const MOB_SPEED = 3.4
const MOB_DAMAGE = 9
const MOB_ATTACK_CD = 650
const MOB_RESPAWN_MS = 4000
const MAX_PLAYERS_PER_ROOM = 12
const MAX_ROOMS = 30

// ----------------------- Shared data (mirrors client) -----------------------
export const SKINS = [
  { id: 'red',    name: 'Rojo',    color: '#e74c3c', accent: '#a93226' },
  { id: 'green',  name: 'Verde',   color: '#27ae60', accent: '#196f3d' },
  { id: 'orange', name: 'Naranja', color: '#e67e22', accent: '#b9770e' },
  { id: 'purple', name: 'Morado',  color: '#9b59b6', accent: '#6c3483' },
  { id: 'teal',   name: 'Cian',    color: '#1abc9c', accent: '#117864' },
  { id: 'pink',   name: 'Rosa',    color: '#e84393', accent: '#a72165' },
  { id: 'yellow', name: 'Amarillo',color: '#f1c40f', accent: '#b7950b' },
  { id: 'slate',  name: 'Grafito', color: '#5d6d7e', accent: '#2c3e50' },
] as const

export const WEAPONS: Record<string, {
  id: string; name: string; damage: number; fireRate: number; magazine: number
  reload: number; spread: number; auto: boolean; range: number; pellets: number
}> = {
  pistol:  { id: 'pistol',  name: 'Pistola',  damage: 18, fireRate: 330, magazine: 12, reload: 1200, spread: 0.012, auto: false, range: 80, pellets: 1 },
  smg:     { id: 'smg',     name: 'SMG',      damage: 12, fireRate: 90,  magazine: 30, reload: 1500, spread: 0.035, auto: true,  range: 60, pellets: 1 },
  rifle:   { id: 'rifle',   name: 'Rifle',    damage: 26, fireRate: 170, magazine: 20, reload: 1800, spread: 0.018, auto: true,  range: 95, pellets: 1 },
  shotgun: { id: 'shotgun', name: 'Escopeta', damage: 11, fireRate: 720, magazine: 6,  reload: 2100, spread: 0.13,  auto: false, range: 32, pellets: 7 },
}

const SPAWN_POINTS: [number, number, number][] = (() => {
  const pts: [number, number, number][] = []
  const n = 10
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const r = HALF - 6
    pts.push([Math.cos(a) * r, 1.7, Math.sin(a) * r])
  }
  return pts
})()

function randomSpawn(): [number, number, number] {
  // pick a spawn away from existing players if possible
  return SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)].slice() as [number, number, number]
}

function dist2D(a: [number, number, number], b: [number, number, number]) {
  const dx = a[0] - b[0], dz = a[2] - b[2]
  return Math.sqrt(dx * dx + dz * dz)
}

function clampToArena(p: [number, number, number]) {
  const lim = HALF - WALL - 0.5
  p[0] = Math.max(-lim, Math.min(lim, p[0]))
  p[2] = Math.max(-lim, Math.min(lim, p[2]))
}

// ----------------------- Types -----------------------
interface Player {
  id: string
  name: string
  skin: string
  pos: [number, number, number]
  yaw: number
  pitch: number
  health: number
  state: 'alive' | 'dead'
  weapon: string
  ammo: number
  reloading: boolean
  reloadEnd: number
  score: number
  kills: number
  deaths: number
  lastShot: number
  lastMobHit: number
  respawnAt: number
  lastStateSent: number
  connected: boolean
}

interface Mob {
  id: string
  pos: [number, number, number]
  vel: [number, number]
  health: number
  state: 'alive' | 'dead'
  wanderTarget: [number, number, number]
  respawnAt: number
  lastAttack: number
  hitFlash: number
}

interface Room {
  id: string
  name: string
  players: Map<string, Player>
  mobs: Mob[]
  createdAt: number
}

// ----------------------- State -----------------------
const rooms = new Map<string, Room>()
const socketToRoom = new Map<string, string>()
const socketToLobby = new Map<string, { name: string; skin: string }>()

function genId(prefix: string) {
  return prefix + Math.random().toString(36).slice(2, 8)
}

function getSkin(id: string) {
  return SKINS.find(s => s.id === id) ?? SKINS[0]
}

function makePlayer(socketId: string, name: string, skin: string): Player {
  return {
    id: socketId,
    name: (name || 'Jugador').slice(0, 16),
    skin: getSkin(skin).id,
    pos: randomSpawn(),
    yaw: 0,
    pitch: 0,
    health: PLAYER_MAX_HP,
    state: 'alive',
    weapon: 'pistol',
    ammo: WEAPONS.pistol.magazine,
    reloading: false,
    reloadEnd: 0,
    score: 0,
    kills: 0,
    deaths: 0,
    lastShot: 0,
    lastMobHit: 0,
    respawnAt: 0,
    lastStateSent: 0,
    connected: true,
  }
}

function makeMob(i: number): Mob {
  const a = Math.random() * Math.PI * 2
  const r = Math.random() * (HALF - 8)
  return {
    id: 'mob_' + i + '_' + Math.random().toString(36).slice(2, 6),
    pos: [Math.cos(a) * r, 1, Math.sin(a) * r],
    vel: [0, 0],
    health: MOB_MAX_HP,
    state: 'alive',
    wanderTarget: [0, 1, 0],
    respawnAt: 0,
    lastAttack: 0,
    hitFlash: 0,
  }
}

function createRoom(name: string): Room {
  const id = genId('room_')
  const mobs = Array.from({ length: MOB_COUNT }, (_, i) => makeMob(i))
  const room: Room = { id, name: (name || 'Sala de Doodle').slice(0, 28), players: new Map(), mobs, createdAt: Date.now() }
  rooms.set(id, room)
  return room
}

// Ensure a default room exists so lobby isn't empty
;(() => {
  const d = createRoom('Arena Doodle #1')
  d.name = 'Arena Doodle #1'
})()

function roomSummary(r: Room) {
  return {
    id: r.id,
    name: r.name,
    players: r.players.size,
    max: MAX_PLAYERS_PER_ROOM,
    mobs: r.mobs.filter(m => m.state === 'alive').length,
  }
}

function lobbyState() {
  return { rooms: Array.from(rooms.values()).map(roomSummary) }
}

function broadcastLobbyState() {
  io.emit('lobby:state', lobbyState())
}

function playerPublic(p: Player) {
  return {
    id: p.id, name: p.name, skin: p.skin,
    pos: p.pos, yaw: p.yaw, pitch: p.pitch,
    health: p.health, state: p.state, weapon: p.weapon,
    ammo: p.ammo, reloading: p.reloading,
    score: p.score, kills: p.kills, deaths: p.deaths,
  }
}

function roomRoster(r: Room) {
  return Array.from(r.players.values()).map(playerPublic)
}

function emitRoomState(r: Room) {
  // periodic roster to everyone in the room (scoreboard + initial sync)
  const roster = roomRoster(r)
  for (const pid of r.players.keys()) {
    io.to(pid).emit('room:players', { players: roster })
  }
}

function killFeed(r: Room, victim: string, killer: string | null, weapon: string, headshot: boolean, kind: 'player' | 'mob') {
  const entry = {
    id: genId('kf_'),
    victim, killer, weapon, headshot, kind,
    ts: Date.now(),
  }
  io.to(r.id).emit('killfeed', entry)
}

// ----------------------- socket.io setup -----------------------
const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`)

  // --- Lobby handshake ---
  socket.on('lobby:hello', (data: { name?: string; skin?: string }) => {
    socketToLobby.set(socket.id, { name: (data?.name || 'Jugador').slice(0, 16), skin: data?.skin || 'red' })
    socket.emit('lobby:state', lobbyState())
    socket.emit('lobby:ready', { skins: SKINS, weapons: Object.values(WEAPONS) })
  })

  socket.on('lobby:refresh', () => {
    socket.emit('lobby:state', lobbyState())
  })

  // --- Room create / join ---
  socket.on('room:create', (data: { roomName?: string }) => {
    if (rooms.size >= MAX_ROOMS) {
      // recycle oldest empty room
      for (const [rid, r] of rooms) {
        if (r.players.size === 0) { rooms.delete(rid); break }
      }
    }
    const meta = socketToLobby.get(socket.id) ?? { name: 'Jugador', skin: 'red' }
    const room = createRoom(data?.roomName || 'Nueva Sala')
    joinRoom(socket, room, meta.name, meta.skin)
  })

  socket.on('room:join', (data: { roomId: string }) => {
    const meta = socketToLobby.get(socket.id) ?? { name: 'Jugador', skin: 'red' }
    const room = rooms.get(data.roomId)
    if (!room) { socket.emit('room:error', { message: 'La sala no existe' }); return }
    if (room.players.size >= MAX_PLAYERS_PER_ROOM) { socket.emit('room:error', { message: 'La sala está llena' }); return }
    joinRoom(socket, room, meta.name, meta.skin)
  })

  // --- In-game events ---
  socket.on('player:state', (data: { pos: [number,number,number]; yaw: number; pitch: number; weapon: string; ammo: number; state: 'alive'|'dead' }) => {
    const rid = socketToRoom.get(socket.id); if (!rid) return
    const room = rooms.get(rid); if (!room) return
    const p = room.players.get(socket.id); if (!p) return
    const now = Date.now()
    // authoritatively trust client pos, but clamp to arena
    p.pos = data.pos; clampToArena(p.pos)
    p.yaw = data.yaw; p.pitch = data.pitch
    p.weapon = data.weapon; p.ammo = data.ammo; p.state = data.state
    if (now - p.lastStateSent < STATE_BROADCAST_THROTTLE) return
    p.lastStateSent = now
    // broadcast to others in room
    socket.to(room.id).emit('player:state', {
      id: p.id, pos: p.pos, yaw: p.yaw, pitch: p.pitch,
      weapon: p.weapon, ammo: p.ammo, state: p.state,
    })
  })

  socket.on('player:shoot', (data: { origin: [number,number,number]; dir: [number,number,number]; weapon: string }) => {
    const rid = socketToRoom.get(socket.id); if (!rid) return
    const room = rooms.get(rid); if (!room) return
    const p = room.players.get(socket.id); if (!p || p.state !== 'alive') return
    const w = WEAPONS[data.weapon]; if (!w) return
    const now = Date.now()
    if (now - p.lastShot < w.fireRate - 15) return // reject too-fast shots
    p.lastShot = now
    // consume ammo authoritatively
    if (p.weapon !== data.weapon) p.weapon = data.weapon
    if (p.ammo > 0) p.ammo -= 1
    socket.to(room.id).emit('player:shot', {
      shooterId: p.id, origin: data.origin, dir: data.dir, weapon: data.weapon,
    })
    // echo ammo back to shooter for sync
    socket.emit('player:ammo', { weapon: data.weapon, ammo: p.ammo })
  })

  socket.on('player:reload', (data: { weapon: string }) => {
    const rid = socketToRoom.get(socket.id); if (!rid) return
    const room = rooms.get(rid); if (!room) return
    const p = room.players.get(socket.id); if (!p) return
    const w = WEAPONS[data.weapon]; if (!w) return
    if (p.ammo >= w.magazine) return
    p.reloading = true
    p.reloadEnd = Date.now() + w.reload
    socket.to(room.id).emit('player:reloading', { id: p.id, weapon: data.weapon })
    setTimeout(() => {
      if (!p.connected) return
      if (p.weapon !== data.weapon) { p.reloading = false; return }
      p.ammo = w.magazine
      p.reloading = false
      socket.emit('player:reloadDone', { weapon: data.weapon, ammo: p.ammo })
      socket.to(room.id).emit('player:state', { id: p.id, pos: p.pos, yaw: p.yaw, pitch: p.pitch, weapon: p.weapon, ammo: p.ammo, state: p.state })
    }, w.reload)
  })

  socket.on('player:hit', (data: { targetId: string; damage: number; headshot: boolean; dist: number; kind: 'player' | 'mob' }) => {
    const rid = socketToRoom.get(socket.id); if (!rid) return
    const room = rooms.get(rid); if (!room) return
    const shooter = room.players.get(socket.id); if (!shooter || shooter.state !== 'alive') return
    const w = WEAPONS[shooter.weapon]; if (!w) return
    // sanity validation
    if (data.dist > w.range + 6) return
    if (data.damage > w.damage * w.pellets * 2.2 + 5) return

    if (data.kind === 'player') {
      const target = room.players.get(data.targetId)
      if (!target || target.state !== 'alive' || target.id === shooter.id) return
      const dmg = Math.min(data.damage, w.damage * (data.headshot ? 2 : 1) * w.pellets + 4)
      target.health -= dmg
      const now = Date.now()
      io.to(room.id).emit('player:damaged', { id: target.id, health: Math.max(0, target.health), by: shooter.id, headshot: data.headshot })
      if (target.health <= 0) {
        killPlayer(room, target, shooter.id, shooter.weapon, data.headshot)
      }
    } else {
      const mob = room.mobs.find(m => m.id === data.targetId && m.state === 'alive')
      if (!mob) return
      const dmg = Math.min(data.damage, w.damage * (data.headshot ? 1.6 : 1) * w.pellets + 4)
      mob.health -= dmg
      mob.hitFlash = Date.now()
      io.to(room.id).emit('mob:damaged', { id: mob.id, health: Math.max(0, mob.health), by: shooter.id })
      if (mob.health <= 0) {
        killMob(room, mob, shooter.id, shooter.weapon, data.headshot)
      }
    }
  })

  socket.on('room:leave', () => {
    leaveRoom(socket)
    socket.emit('lobby:state', lobbyState())
  })

  // Re-send current room state to the requesting socket (used when the game
  // view mounts after the initial room:joined has already been consumed).
  socket.on('room:sync', () => {
    const rid = socketToRoom.get(socket.id); if (!rid) return
    const room = rooms.get(rid); if (!room) return
    const me = room.players.get(socket.id); if (!me) return
    socket.emit('room:joined', {
      room: { id: room.id, name: room.name },
      me: playerPublic(me),
      players: roomRoster(room),
      mobs: room.mobs.map(m => ({ id: m.id, pos: m.pos, state: m.state, health: m.health })),
    })
  })

  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`)
    leaveRoom(socket)
    socketToLobby.delete(socket.id)
  })

  socket.on('error', (err) => console.error(`[socket error] ${socket.id}`, err))
})

function joinRoom(socket: any, room: Room, name: string, skin: string) {
  // leave previous room if any
  leaveRoom(socket)
  const player = makePlayer(socket.id, name, skin)
  room.players.set(socket.id, player)
  socketToRoom.set(socket.id, room.id)
  socket.join(room.id)
  // send joined ack with full room state
  socket.emit('room:joined', {
    room: { id: room.id, name: room.name },
    me: playerPublic(player),
    players: roomRoster(room),
    mobs: room.mobs.map(m => ({ id: m.id, pos: m.pos, state: m.state, health: m.health })),
  })
  // tell others
  socket.to(room.id).emit('room:playerJoined', playerPublic(player))
  broadcastLobbyState()
  console.log(`[join] ${player.name} -> ${room.name} (${room.players.size} players)`)
}

function leaveRoom(socket: any) {
  const rid = socketToRoom.get(socket.id)
  if (!rid) return
  const room = rooms.get(rid)
  socketToRoom.delete(socket.id)
  socket.leave(rid)
  if (room) {
    const p = room.players.get(socket.id)
    room.players.delete(socket.id)
    if (p) {
      p.connected = false
      socket.to(room.id).emit('room:playerLeft', { id: socket.id })
    }
    // delete empty rooms (except keep at least the default)
    if (room.players.size === 0 && rooms.size > 1) {
      rooms.delete(rid)
    }
  }
  broadcastLobbyState()
}

function killPlayer(room: Room, victim: Player, killerId: string, weapon: string, headshot: boolean) {
  victim.state = 'dead'
  victim.health = 0
  victim.deaths += 1
  victim.respawnAt = Date.now() + RESPAWN_MS
  const killer = room.players.get(killerId)
  if (killer) {
    killer.kills += 1
    killer.score += headshot ? 150 : 100
  }
  io.to(room.id).emit('player:killed', { victimId: victim.id, killerId, weapon, headshot })
  killFeed(room, victim.name, killer?.name ?? null, weapon, headshot, 'player')
  // schedule respawn
  setTimeout(() => {
    if (!victim.connected) return
    if (!room.players.has(victim.id)) return
    victim.state = 'alive'
    victim.health = PLAYER_MAX_HP
    victim.pos = randomSpawn()
    victim.weapon = 'pistol'
    victim.ammo = WEAPONS.pistol.magazine
    victim.reloading = false
    io.to(room.id).emit('player:respawned', { id: victim.id, pos: victim.pos })
  }, RESPAWN_MS)
}

function killMob(room: Room, mob: Mob, killerId: string, weapon: string, headshot: boolean) {
  mob.state = 'dead'
  mob.health = 0
  mob.respawnAt = Date.now() + MOB_RESPAWN_MS
  const killer = room.players.get(killerId)
  if (killer) {
    killer.score += headshot ? 60 : 40
  }
  io.to(room.id).emit('mob:killed', { id: mob.id, killerId, weapon, headshot })
  killFeed(room, 'Doodle Mob', killer?.name ?? null, weapon, headshot, 'mob')
  setTimeout(() => {
    if (!room.players.has(killerId) && room.players.size === 0) return
    if (!rooms.has(room.id)) return
    mob.state = 'alive'
    mob.health = MOB_MAX_HP
    const a = Math.random() * Math.PI * 2
    const r = Math.random() * (HALF - 8)
    mob.pos = [Math.cos(a) * r, 1, Math.sin(a) * r]
    mob.wanderTarget = mob.pos.slice() as [number, number, number]
    io.to(room.id).emit('mob:respawned', { id: mob.id, pos: mob.pos })
  }, MOB_RESPAWN_MS)
}

// ----------------------- World tick (mobs + roster) -----------------------
setInterval(() => {
  const now = Date.now()
  for (const room of rooms.values()) {
    if (room.players.size === 0) continue
    // update mobs
    for (const mob of room.mobs) {
      if (mob.state === 'dead') continue
      // find nearest alive player
      let nearest: Player | null = null
      let nd = Infinity
      for (const p of room.players.values()) {
        if (p.state !== 'alive') continue
        const d = dist2D(mob.pos, p.pos)
        if (d < nd) { nd = d; nearest = p }
      }
      let tx: number, tz: number
      if (nearest && nd < 14) {
        // chase
        tx = nearest.pos[0]; tz = nearest.pos[2]
        // attack
        if (nd < 1.8 && now - mob.lastAttack > MOB_ATTACK_CD) {
          mob.lastAttack = now
          nearest.health -= MOB_DAMAGE
          io.to(room.id).emit('player:damaged', { id: nearest.id, health: Math.max(0, nearest.health), by: mob.id, headshot: false, mob: true })
          if (nearest.health <= 0) {
            killPlayer(room, nearest, mob.id, 'mob', false)
          }
        }
      } else {
        // wander: pick new target occasionally
        if (dist2D(mob.pos, mob.wanderTarget) < 1.5 || (Math.abs(mob.vel[0]) < 0.01 && Math.abs(mob.vel[1]) < 0.01)) {
          const a = Math.random() * Math.PI * 2
          const r = Math.random() * (HALF - 6)
          mob.wanderTarget = [Math.cos(a) * r, 1, Math.sin(a) * r]
        }
        tx = mob.wanderTarget[0]; tz = mob.wanderTarget[2]
      }
      const dx = tx - mob.pos[0], dz = tz - mob.pos[2]
      const len = Math.hypot(dx, dz) || 1
      const vx = (dx / len) * MOB_SPEED, vz = (dz / len) * MOB_SPEED
      mob.vel[0] = vx; mob.vel[1] = vz
      // step in TICK_MS seconds
      const step = TICK_MS / 1000
      mob.pos[0] += vx * step
      mob.pos[2] += vz * step
      clampToArena(mob.pos)
      mob.pos[1] = 1
    }
    // broadcast mob state (compact)
    io.to(room.id).emit('mob:state', {
      mobs: room.mobs.map(m => ({ id: m.id, pos: m.pos, state: m.state, flash: m.hitFlash })),
    })
    // periodic roster (scoreboard) every ~1s (every 20 ticks)
    if (now % 1000 < TICK_MS) {
      emitRoomState(room)
    }
  }
}, TICK_MS)

// lobby state heartbeat (so lobby stays fresh)
setInterval(() => {
  broadcastLobbyState()
}, 4000)

httpServer.listen(PORT, () => {
  console.log(`[doodle-shooter] socket.io server listening on port ${PORT}`)
})

process.on('SIGTERM', () => { httpServer.close(() => process.exit(0)) })
process.on('SIGINT', () => { httpServer.close(() => process.exit(0)) })
