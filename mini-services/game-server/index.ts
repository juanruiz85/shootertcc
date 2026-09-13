import { createServer } from 'http'
import { Server } from 'socket.io'

// ====================================================================
// Doodle Shooter — Multiplayer Game Server (socket.io)
// Port: 3003 (exposed via Caddy gateway using ?XTransformPort=3003)
// Modes: 1v1, 2v2, team (blue vs red), ffa (free-for-all), coop (players vs mobs), mixed (mobs + PvP)
// ====================================================================

// ----------------------- Constants -----------------------
const PORT = 3003
const HALF = 32 // arena half-size
const WALL = 2
const PLAYER_MAX_HP = 100
const PLAYER_MAX_SHIELD = 50
const RESPAWN_MS = 3000
const TICK_MS = 50
const STATE_BROADCAST_THROTTLE = 45
const MOB_ATTACK_CD = 1000
const MOB_RESPAWN_MS = 4000
const MAX_PLAYERS_PER_ROOM = 12
const MAX_ROOMS = 40
const ITEM_LIFETIME_MS = 18000
const ITEM_RESPAWN_INTERVAL_MS = 12000
const EMPTY_ROOM_TTL_MS = 8000 // rooms empty for this long are deleted
const ROUND_END_MS = 4000 // pause between PvP rounds / PvE levels

// ----------------------- Shared data (mirrors client constants) -----------------------
const SKINS = [
  { id: 'red', name: 'Rojo', color: '#e74c3c', accent: '#a93226' },
  { id: 'blue', name: 'Azul', color: '#3498db', accent: '#21618c' },
  { id: 'green', name: 'Verde', color: '#27ae60', accent: '#196f3d' },
  { id: 'orange', name: 'Naranja', color: '#e67e22', accent: '#b9770e' },
  { id: 'purple', name: 'Morado', color: '#9b59b6', accent: '#6c3483' },
  { id: 'teal', name: 'Cian', color: '#1abc9c', accent: '#117864' },
  { id: 'pink', name: 'Rosa', color: '#e84393', accent: '#a72165' },
  { id: 'yellow', name: 'Amarillo', color: '#f1c40f', accent: '#b7950b' },
]

const WEAPONS: Record<string, {
  id: string; name: string; damage: number; fireRate: number; magazine: number
  reload: number; spread: number; auto: boolean; range: number; pellets: number
}> = {
  pistol:  { id: 'pistol',  name: 'Pistola',  damage: 18, fireRate: 330, magazine: 12, reload: 1200, spread: 0.012, auto: false, range: 80, pellets: 1 },
  smg:     { id: 'smg',     name: 'SMG',      damage: 12, fireRate: 90,  magazine: 30, reload: 1500, spread: 0.035, auto: true,  range: 60, pellets: 1 },
  rifle:   { id: 'rifle',   name: 'Rifle',    damage: 26, fireRate: 170, magazine: 20, reload: 1800, spread: 0.018, auto: true,  range: 95, pellets: 1 },
  shotgun: { id: 'shotgun', name: 'Escopeta', damage: 11, fireRate: 720, magazine: 6,  reload: 2100, spread: 0.13,  auto: false, range: 32, pellets: 7 },
}

// ----------------------- Maps (mirror of client constants) -----------------------
type MapObstacle = { x: number; z: number; w: number; h: number; d: number; climbable: boolean; color: number; kind: 'box'|'cyl'|'ramp'|'wall'|'stair'|'water'|'roof'; rotation?: number; noCollide?: boolean; y?: number }
type GameMap = { id: string; name: string; theme: string; ground: number; fog: number; accent: number; obstacles: MapObstacle[]; spawns: [number,number][]; waterLevel?: number }

const ob = (x: number, z: number, w: number, h: number, d: number, climbable = true, color = 0xe8d5b7, kind: 'box'|'cyl'|'ramp'|'wall'|'stair'|'water'|'roof' = 'box', rotation = 0, noCollide = false, y = 0): MapObstacle => ({ x, z, w, h, d, climbable, color, kind, rotation, noCollide, y })

function buildHouse(cx: number, cz: number, w: number, d: number, h: number, color: number, roofColor: number, doorSide: 'N'|'S'|'E'|'W' = 'S'): MapObstacle[] {
  const walls: MapObstacle[] = []
  const wallT = 0.3
  const doorW = 1.5
  const doorH = 2.2  // door height
  if (doorSide !== 'N') { walls.push(ob(cx, cz - d/2, w, h, wallT, false, color, 'wall')) }
  else { walls.push(ob(cx - w/4 - doorW/4, cz - d/2, w/2 - doorW/2, h, wallT, false, color, 'wall')); walls.push(ob(cx + w/4 + doorW/4, cz - d/2, w/2 - doorW/2, h, wallT, false, color, 'wall')); walls.push(ob(cx, cz - d/2, doorW, h - doorH, wallT, false, color, 'wall', 0, true, doorH)) }
  if (doorSide !== 'S') { walls.push(ob(cx, cz + d/2, w, h, wallT, false, color, 'wall')) }
  else { walls.push(ob(cx - w/4 - doorW/4, cz + d/2, w/2 - doorW/2, h, wallT, false, color, 'wall')); walls.push(ob(cx + w/4 + doorW/4, cz + d/2, w/2 - doorW/2, h, wallT, false, color, 'wall')); walls.push(ob(cx, cz + d/2, doorW, h - doorH, wallT, false, color, 'wall', 0, true, doorH)) }
  if (doorSide !== 'E') { walls.push(ob(cx + w/2, cz, wallT, h, d, false, color, 'wall')) }
  else { walls.push(ob(cx + w/2, cz - d/4 - doorW/4, wallT, h, d/2 - doorW/2, false, color, 'wall')); walls.push(ob(cx + w/2, cz + d/4 + doorW/4, wallT, h, d/2 - doorW/2, false, color, 'wall')) }
  if (doorSide !== 'W') { walls.push(ob(cx - w/2, cz, wallT, h, d, false, color, 'wall')) }
  else { walls.push(ob(cx - w/2, cz - d/4 - doorW/4, wallT, h, d/2 - doorW/2, false, color, 'wall')); walls.push(ob(cx - w/2, cz + d/4 + doorW/4, wallT, h, d/2 - doorW/2, false, color, 'wall')) }
  walls.push(ob(cx, cz, w + 0.6, 0.3, d + 0.6, true, roofColor, 'roof', 0, false, h))
  return walls
}

function buildStairs(cx: number, cz: number, steps: number, dir: 'N'|'S'|'E'|'W', color: number): MapObstacle[] {
  const result: MapObstacle[] = []
  const stepH = 0.6, stepD = 0.7, stepW = 2.5
  for (let i = 0; i < steps; i++) { let x = cx, z = cz; if (dir === 'N') z = cz - i * stepD; if (dir === 'S') z = cz + i * stepD; if (dir === 'E') x = cx + i * stepD; if (dir === 'W') x = cx - i * stepD; result.push(ob(x, z, stepW, stepH, stepD, true, color, 'stair', 0, false, i * stepH)) }
  return result
}

function buildTree(cx: number, cz: number, scale: number = 1): MapObstacle[] {
  const trunkH = 3 * scale
  const foliageH = 2.5 * scale
  return [
    ob(cx, cz, 0.4 * scale, trunkH, 0.4 * scale, false, 0x7a5230, 'cyl'),
    ob(cx, cz, 2.5 * scale, foliageH, 2.5 * scale, true, 0x27ae60, 'box', 0, false, trunkH),
  ]
}

function buildCar(cx: number, cz: number, color: number, rotation: number = 0): MapObstacle[] {
  return [
    ob(cx, cz, 2, 0.8, 4, true, color, 'box', rotation),
    ob(cx, cz, 1.8, 0.6, 2, false, 0x2c3e50, 'box', rotation, false, 0.8),
  ]
}

function buildTower(cx: number, cz: number, w: number, d: number, floors: number, color: number, roofColor: number): MapObstacle[] {
  const result: MapObstacle[] = []
  const floorH = 3.0, wallT = 0.3, doorW = 1.5, totalH = floors * floorH
  result.push(ob(cx, cz - d/2, w, totalH, wallT, false, color, 'wall'))
  result.push(ob(cx + w/2, cz, wallT, totalH, d, false, color, 'wall'))
  result.push(ob(cx - w/2, cz, wallT, totalH, d, false, color, 'wall'))
  for (let f = 0; f < floors; f++) {
    const fy = f * floorH
    result.push(ob(cx - w/4 - doorW/4, cz + d/2, w/2 - doorW/2, floorH - 0.1, wallT, false, color, 'wall', 0, false, fy))
    result.push(ob(cx + w/4 + doorW/4, cz + d/2, w/2 - doorW/2, floorH - 0.1, wallT, false, color, 'wall', 0, false, fy))
    result.push(ob(cx, cz + d/2, doorW, 0.8, wallT, false, color, 'wall', 0, true, fy + 2.0))
    if (f > 0) {
      result.push(ob(cx, cz, w - wallT * 2, 0.2, d - wallT * 2, true, color, 'roof', 0, false, fy))
      result.push(...buildStairs(cx - w/4, cz, 4, 'N', 0x8a7a5a).map(s => ({ ...s, y: (s.y || 0) + fy })))
    }
  }
  result.push(ob(cx, cz, w + 0.6, 0.3, d + 0.6, true, roofColor, 'roof', 0, false, totalH))
  return result
}

const MAPS: GameMap[] = [
  { id: 'arena', name: 'Arena Doodle', theme: 'Clásica', ground: 0xf5f1e8, fog: 0xfdfbf7, accent: 0xe8e4df,
    obstacles: [
      ob(0,0,3,4,3,true,0xd5c4a0), ob(-14,-10,4,3,4,true,0xe8d5b7), ob(12,8,5,2.5,3,true,0xe8d5b7),
      ob(-18,14,2.5,3.5,2.5,true,0xb8a47a,'cyl'), ob(18,-16,4,3,4,true,0xe8d5b7),
      ob(8,-6,1.6,3.2,1.6,false,0xb8a47a,'cyl'), ob(-8,6,1.6,3.2,1.6,false,0xb8a47a,'cyl'),
      ob(-4,-20,6,2,2,true,0xd5c4a0), ob(16,18,2,2,6,true,0xd5c4a0),
    ],
    spawns: [[0,-22],[0,22],[22,0],[-22,0],[16,-16],[-16,16]] },
  { id: 'patios', name: 'Patios', theme: 'Cuadrantes', ground: 0xf0e6d2, fog: 0xf6efde, accent: 0xe0d5b8,
    obstacles: [
      ob(-10,-10,3,3,3,true,0xe8d5b7), ob(10,-10,3,3,3,true,0xe8d5b7),
      ob(-10,10,3,3,3,true,0xe8d5b7), ob(10,10,3,3,3,true,0xe8d5b7),
      ob(0,-18,8,2,2,true,0xd5c4a0), ob(0,18,8,2,2,true,0xd5c4a0),
      ob(-18,0,2,2,8,true,0xd5c4a0), ob(18,0,2,2,8,true,0xd5c4a0),
      ob(0,0,2,4,2,true,0xb8a47a),
    ],
    spawns: [[-20,-20],[20,20],[20,-20],[-20,20],[0,-24],[0,24]] },
  { id: 'bunkers', name: 'Bunkers', theme: 'Trincheras', ground: 0xe8e4df, fog: 0xeae6e0, accent: 0xcfc8bc,
    obstacles: [
      ob(-16,-8,12,2,2,true,0xd5c4a0), ob(16,8,12,2,2,true,0xd5c4a0),
      ob(-8,8,2,2,12,true,0xd5c4a0), ob(8,-8,2,2,12,true,0xd5c4a0),
      ob(0,-20,18,3,2,true,0xcdb98a), ob(0,20,18,3,2,true,0xcdb98a),
      ob(-22,0,2,3,10,true,0xcdb98a), ob(22,0,2,3,10,true,0xcdb98a),
      ob(0,0,4,3.5,4,true,0xe8d5b7),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0]] },
  { id: 'torres', name: 'Torres', theme: 'Pilares', ground: 0xe8e4df, fog: 0xeae6e0, accent: 0xcfc8bc,
    obstacles: [
      ob(-14,-14,3,5,3,true,0xb8a47a,'cyl'), ob(14,-14,3,5,3,true,0xb8a47a,'cyl'),
      ob(-14,14,3,5,3,true,0xb8a47a,'cyl'), ob(14,14,3,5,3,true,0xb8a47a,'cyl'),
      ob(0,0,4,6,4,true,0xb8a47a),
      ob(-22,0,2,3,2,true,0xe8d5b7), ob(22,0,2,3,2,true,0xe8d5b7),
      ob(0,-22,2,3,2,true,0xe8d5b7), ob(0,22,2,3,2,true,0xe8d5b7),
    ],
    spawns: [[0,-24],[0,24],[24,0],[-24,0],[-20,-20],[20,20]] },
  { id: 'crucero', name: 'Crucero', theme: 'Cruz', ground: 0xf5f1e8, fog: 0xfdfbf7, accent: 0xe8e4df,
    obstacles: [
      ob(0,-12,4,3,16,true,0xe8d5b7), ob(0,12,4,3,16,true,0xe8d5b7),
      ob(-12,0,16,3,4,true,0xe8d5b7), ob(12,0,16,3,4,true,0xe8d5b7),
      ob(0,0,3,5,3,true,0xd5c4a0),
      ob(-20,-20,3,2,3,true,0xcdb98a), ob(20,-20,3,2,3,true,0xcdb98a),
      ob(-20,20,3,2,3,true,0xcdb98a), ob(20,20,3,2,3,true,0xcdb98a),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0]] },
  { id: 'espinas', name: 'Espinas', theme: 'Zig-zag', ground: 0xf0e6d2, fog: 0xf6efde, accent: 0xe0d5b8,
    obstacles: [
      ob(-18,-16,2,3,8,true,0xd5c4a0), ob(-9,-8,8,3,2,true,0xd5c4a0),
      ob(0,0,2,3,8,true,0xd5c4a0), ob(9,8,8,3,2,true,0xd5c4a0),
      ob(18,16,2,3,8,true,0xd5c4a0),
      ob(-9,8,2,3,8,true,0xe8d5b7), ob(9,-8,2,3,8,true,0xe8d5b7),
      ob(0,-20,6,2,2,true,0xcdb98a), ob(0,20,6,2,2,true,0xcdb98a),
    ],
    spawns: [[-24,-24],[24,24],[-24,24],[24,-24]] },
  { id: 'fortaleza', name: 'Fortaleza', theme: 'Murallas', ground: 0xe8e4df, fog: 0xeae6e0, accent: 0xcfc8bc,
    obstacles: [
      ob(0,-20,30,3,2,true,0xcdb98a), ob(0,20,30,3,2,true,0xcdb98a),
      ob(-20,0,2,3,30,true,0xcdb98a), ob(20,0,2,3,30,true,0xcdb98a),
      ob(-10,-10,3,4,3,true,0xd5c4a0), ob(10,-10,3,4,3,true,0xd5c4a0),
      ob(-10,10,3,4,3,true,0xd5c4a0), ob(10,10,3,4,3,true,0xd5c4a0),
      ob(0,0,5,3,5,true,0xe8d5b7),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0]] },
  { id: 'laberinto', name: 'Laberinto', theme: 'Maze', ground: 0xeaf3e0, fog: 0xeef5e6, accent: 0xcfdcc0,
    obstacles: [
      ob(-12,-12,2,3,12,true,0xe8d5b7), ob(0,-6,12,3,2,true,0xe8d5b7),
      ob(12,0,2,3,12,true,0xe8d5b7), ob(-6,12,12,3,2,true,0xe8d5b7),
      ob(-18,6,6,3,2,true,0xd5c4a0), ob(6,-18,2,3,6,true,0xd5c4a0),
      ob(18,-6,6,3,2,true,0xd5c4a0), ob(-6,18,2,3,6,true,0xd5c4a0),
      ob(0,0,2,2,2,false,0xcdb98a),
    ],
    spawns: [[-24,-24],[24,24],[24,-24],[-24,24],[0,-24],[0,24]] },
  { id: 'puentes', name: 'Puentes', theme: 'Rampas', ground: 0xf0e6d2, fog: 0xf6efde, accent: 0xe0d5b8,
    obstacles: [
      ob(0,-10,4,2,12,true,0xe8d5b7), ob(0,10,4,2,12,true,0xe8d5b7),
      ob(-12,0,12,2,4,true,0xe8d5b7), ob(12,0,12,2,4,true,0xe8d5b7),
      ob(-18,-18,4,4,4,true,0xd5c4a0,'ramp'), ob(18,18,4,4,4,true,0xd5c4a0,'ramp'),
      ob(18,-18,4,4,4,true,0xd5c4a0,'ramp'), ob(-18,18,4,4,4,true,0xd5c4a0,'ramp'),
      ob(0,0,3,5,3,true,0xb8a47a),
    ],
    spawns: [[0,-24],[0,24],[24,0],[-24,0]] },
  { id: 'crater', name: 'Cráter', theme: 'Anillo', ground: 0xf6e3d8, fog: 0xf6e3d8, accent: 0xe0c8bc,
    obstacles: [
      ob(0,0,6,1.5,6,true,0xe0a3a0),
      ob(-12,0,2,3,2,true,0xd5c4a0), ob(12,0,2,3,2,true,0xd5c4a0),
      ob(0,-12,2,3,2,true,0xd5c4a0), ob(0,12,2,3,2,true,0xd5c4a0),
      ob(-18,-18,3,3,3,true,0xcdb98a), ob(18,-18,3,3,3,true,0xcdb98a),
      ob(-18,18,3,3,3,true,0xcdb98a), ob(18,18,3,3,3,true,0xcdb98a),
      ob(0,-22,8,2,2,true,0xd5c4a0), ob(0,22,8,2,2,true,0xd5c4a0),
    ],
    spawns: [[0,-24],[0,24],[24,0],[-24,0],[-22,-22],[22,22]] },
  { id: 'zigzag', name: 'Zigzag', theme: 'Dientes', ground: 0xf5f1e8, fog: 0xfdfbf7, accent: 0xe8e4df,
    obstacles: [
      ob(-16,-12,3,3,3,true,0xe8d5b7), ob(-8,12,3,3,3,true,0xe8d5b7),
      ob(0,-12,3,3,3,true,0xe8d5b7), ob(8,12,3,3,3,true,0xe8d5b7),
      ob(16,-12,3,3,3,true,0xe8d5b7),
      ob(-12,0,2,4,2,true,0xb8a47a,'cyl'), ob(12,0,2,4,2,true,0xb8a47a,'cyl'),
      ob(0,0,4,5,4,true,0xd5c4a0),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0]] },
  { id: 'diamante', name: 'Diamante', theme: 'Rombo', ground: 0xf7fafc, fog: 0xf7fafc, accent: 0xdfe7ec,
    obstacles: [
      ob(0,-14,4,3,4,true,0xa3c8e0), ob(14,0,4,3,4,true,0xa3c8e0),
      ob(0,14,4,3,4,true,0xa3c8e0), ob(-14,0,4,3,4,true,0xa3c8e0),
      ob(0,0,5,5,5,true,0xd5c4a0),
      ob(-20,-20,3,2,3,true,0xe8d5b7), ob(20,-20,3,2,3,true,0xe8d5b7),
      ob(-20,20,3,2,3,true,0xe8d5b7), ob(20,20,3,2,3,true,0xe8d5b7),
    ],
    spawns: [[0,-24],[0,24],[24,0],[-24,0]] },
  { id: 'colmena', name: 'Colmena', theme: 'Celdas', ground: 0xeaf3e0, fog: 0xeef5e6, accent: 0xcfdcc0,
    obstacles: [
      ob(-12,-12,4,3,4,true,0xe8d5b7), ob(0,-12,4,3,4,true,0xe8d5b7), ob(12,-12,4,3,4,true,0xe8d5b7),
      ob(-12,0,4,3,4,true,0xe8d5b7), ob(12,0,4,3,4,true,0xe8d5b7),
      ob(-12,12,4,3,4,true,0xe8d5b7), ob(0,12,4,3,4,true,0xe8d5b7), ob(12,12,4,3,4,true,0xe8d5b7),
      ob(0,0,4,2,4,true,0xd5c4a0),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0],[-24,-24],[24,24]] },
  { id: 'ruinas', name: 'Ruinas', theme: 'Escombros', ground: 0xe8e4df, fog: 0xeae6e0, accent: 0xcfc8bc,
    obstacles: [
      ob(-16,-14,6,2,3,true,0xcdb98a), ob(-14,12,4,3,4,true,0xd5c4a0),
      ob(12,-16,5,2.5,4,true,0xe8d5b7), ob(16,12,3,3,5,true,0xcdb98a),
      ob(0,-6,2,4,2,true,0xb8a47a,'cyl'), ob(0,8,2,4,2,true,0xb8a47a,'cyl'),
      ob(-6,0,3,1.5,3,true,0xd5c4a0), ob(6,0,3,1.5,3,true,0xd5c4a0),
      ob(0,0,8,1,8,true,0xe0a3a0),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0],[-22,-22],[22,22]] },
  { id: 'estadio', name: 'Estadio', theme: 'Graderías', ground: 0xeaf3e0, fog: 0xeef5e6, accent: 0xcfdcc0,
    obstacles: [
      ob(0,-22,44,4,2,true,0xd5c4a0), ob(0,22,44,4,2,true,0xd5c4a0),
      ob(-22,0,2,4,44,true,0xd5c4a0), ob(22,0,2,4,44,true,0xd5c4a0),
      ob(0,-16,30,2,2,true,0xe8d5b7), ob(0,16,30,2,2,true,0xe8d5b7),
      ob(-16,0,2,2,16,true,0xe8d5b7), ob(16,0,2,2,16,true,0xe8d5b7),
      ob(0,0,4,3,4,true,0xcdb98a),
    ],
    spawns: [[0,-18],[0,18],[-18,0],[18,0]] },
  { id: 'nucleo', name: 'Núcleo', theme: 'Anillo central', ground: 0xf6e3d8, fog: 0xf6e3d8, accent: 0xe0c8bc,
    obstacles: [
      ob(0,0,8,1.5,8,true,0xe0a3a0),
      ob(-10,0,2,4,2,true,0xb8a47a,'cyl'), ob(10,0,2,4,2,true,0xb8a47a,'cyl'),
      ob(0,-10,2,4,2,true,0xb8a47a,'cyl'), ob(0,10,2,4,2,true,0xb8a47a,'cyl'),
      ob(-16,-16,4,3,4,true,0xd5c4a0), ob(16,-16,4,3,4,true,0xd5c4a0),
      ob(-16,16,4,3,4,true,0xd5c4a0), ob(16,16,4,3,4,true,0xd5c4a0),
      ob(0,-22,10,2,2,true,0xe8d5b7), ob(0,22,10,2,2,true,0xe8d5b7),
    ],
    spawns: [[0,-24],[0,24],[24,0],[-24,0]] },
  { id: 'barrio', name: 'Barrio', theme: 'Conjunto residencial', ground: 0xb0b8c0, fog: 0xc8d0d8, accent: 0x8a92a0,
    obstacles: [
      ...buildHouse(-20, -16, 6, 6, 3.5, 0xe8d5b7, 0xc0392b, 'S'),
      ...buildHouse(-8, -16, 6, 6, 3.5, 0xd5c4a0, 0x2980b9, 'S'),
      ...buildHouse(8, -16, 6, 6, 3.5, 0xcdb98a, 0x27ae60, 'S'),
      ...buildHouse(20, -16, 6, 6, 3.5, 0xe8d5b7, 0xf1c40f, 'S'),
      ...buildHouse(-20, 16, 6, 6, 3.5, 0xd5c4a0, 0x8e44ad, 'N'),
      ...buildHouse(-8, 16, 6, 6, 3.5, 0xe8d5b7, 0xe67e22, 'N'),
      ...buildHouse(8, 16, 6, 6, 3.5, 0xcdb98a, 0x1abc9c, 'N'),
      ...buildHouse(20, 16, 6, 6, 3.5, 0xe8d5b7, 0xe74c3c, 'N'),
      ...buildTower(0, 0, 8, 8, 5, 0xa0a8b0, 0x2c3e50),
      ob(-17, -12, 1, 1.2, 1, true, 0x555555), ob(-5, -12, 1, 1.2, 1, true, 0x555555),
      ob(11, -12, 1, 1.2, 1, true, 0x555555), ob(23, -12, 1, 1.2, 1, true, 0x555555),
      ob(-17, 12, 1, 1.2, 1, true, 0x555555), ob(-5, 12, 1, 1.2, 1, true, 0x555555),
      ob(11, 12, 1, 1.2, 1, true, 0x555555), ob(23, 12, 1, 1.2, 1, true, 0x555555),
      ...buildCar(-14, 0, 0xe74c3c, 0), ...buildCar(14, 0, 0x3498db, 0),
      ...buildCar(0, -8, 0x27ae60, Math.PI/2), ...buildCar(0, 8, 0xf1c40f, Math.PI/2),
      ob(-12, -4, 0.2, 3, 0.2, false, 0x2c3e50, 'cyl'), ob(12, 4, 0.2, 3, 0.2, false, 0x2c3e50, 'cyl'),
      ob(-6, -4, 1.5, 1.5, 1.5, true, 0xe8d5b7), ob(6, 4, 1.5, 1.5, 1.5, true, 0xe8d5b7),
      ob(-14, -16, 0.3, 1.5, 4, false, 0x8a92a0, 'wall'), ob(14, -16, 0.3, 1.5, 4, false, 0x8a92a0, 'wall'),
      ob(-14, 16, 0.3, 1.5, 4, false, 0x8a92a0, 'wall'), ob(14, 16, 0.3, 1.5, 4, false, 0x8a92a0, 'wall'),
      ob(0, -4, 2, 0.4, 2, true, 0x3498db, 'water', 0, true),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0],[-24,-24],[24,24]] },
  { id: 'escuela', name: 'Escuela', theme: 'Escuela con salones', ground: 0xd5d8de, fog: 0xe0e3e8, accent: 0xa0a8b0,
    obstacles: [
      ...buildHouse(0, 0, 30, 30, 5, 0xe8e0d0, 0xc0392b, 'S'),
      ob(0, 0, 30, 4, 0.3, false, 0xd5c4a0, 'wall'),
      ob(0, 0, 0.3, 4, 30, false, 0xd5c4a0, 'wall'),
      ...[-9, 9].flatMap(x => [-9, 9].map(z => ob(x, z, 1.5, 0.8, 1, true, 0xe8d5b7, 'box'))),
      ...[-6, 6].flatMap(x => [-9, 9].map(z => ob(x, z, 1.5, 0.8, 1, true, 0xe8d5b7, 'box'))),
      ...[-9, 9].flatMap(x => [-6, 6].map(z => ob(x, z, 1.5, 0.8, 1, true, 0xe8d5b7, 'box'))),
      ob(-14, 0, 0.3, 2, 4, false, 0x1a1a1a, 'wall'),
      ob(14, 0, 0.3, 2, 4, false, 0x1a1a1a, 'wall'),
      ob(0, -14, 4, 2, 0.3, false, 0x1a1a1a, 'wall'),
      ob(0, 14, 4, 2, 0.3, false, 0x1a1a1a, 'wall'),
      ob(-14, -10, 0.8, 2.5, 1, true, 0x3498db, 'box'), ob(-14, -7, 0.8, 2.5, 1, true, 0xe74c3c, 'box'),
      ob(14, 10, 0.8, 2.5, 1, true, 0x27ae60, 'box'), ob(14, 7, 0.8, 2.5, 1, true, 0xf1c40f, 'box'),
      ob(0, -20, 0.3, 3, 0.3, false, 0xe74c3c, 'box'),
      ob(0, -20, 1.5, 0.1, 0.8, false, 0xe74c3c, 'box'),
      ob(0, 20, 0.3, 3, 0.3, false, 0x3498db, 'box'),
      ob(0, 20, 1.5, 0.1, 0.8, false, 0x3498db, 'box'),
      ob(-10, 0, 1, 1.2, 1, true, 0x555555, 'box'), ob(10, 0, 1, 1.2, 1, true, 0x555555, 'box'),
      ...buildStairs(-13, 0, 6, 'E', 0xd5c4a0),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0]] },
  { id: 'oficinas', name: 'Oficinas', theme: 'Edificio corporativo', ground: 0xc8ccd0, fog: 0xd0d4d8, accent: 0x9098a0,
    obstacles: [
      ...buildHouse(-18, -12, 6, 6, 4, 0xa3c8e0, 0x2c3e50, 'S'),
      ...buildHouse(-6, -12, 6, 6, 4, 0xa3c8e0, 0x2c3e50, 'S'),
      ...buildHouse(6, -12, 6, 6, 4, 0xa3c8e0, 0x2c3e50, 'S'),
      ...buildHouse(18, -12, 6, 6, 4, 0xa3c8e0, 0x2c3e50, 'S'),
      ...buildHouse(-18, 12, 6, 6, 4, 0xd5c4a0, 0x2c3e50, 'N'),
      ...buildHouse(-6, 12, 6, 6, 4, 0xd5c4a0, 0x2c3e50, 'N'),
      ...buildHouse(6, 12, 6, 6, 4, 0xd5c4a0, 0x2c3e50, 'N'),
      ...buildHouse(18, 12, 6, 6, 4, 0xd5c4a0, 0x2c3e50, 'N'),
      ...buildTower(0, 0, 7, 7, 5, 0x9098a0, 0x2c3e50),
      ob(-10, 0, 0.3, 2, 8, true, 0xb8d4e3, 'wall'), ob(10, 0, 0.3, 2, 8, true, 0xb8d4e3, 'wall'),
      ob(-14, -8, 1, 1.2, 1, true, 0x555555), ob(-2, -8, 1, 1.2, 1, true, 0x555555),
      ob(10, -8, 1, 1.2, 1, true, 0x555555), ob(14, 8, 1, 1.2, 1, true, 0x555555),
      ob(-14, 0, 3, 0.8, 1.5, true, 0xe8d5b7, 'box'), ob(14, 0, 3, 0.8, 1.5, true, 0xe8d5b7, 'box'),
      ob(-4, -6, 2, 1, 4, true, 0xd5c4a0, 'ramp'), ob(4, 6, 2, 1, 4, true, 0xd5c4a0, 'ramp'),
      ob(0, -12, 12, 0.3, 2, true, 0x8a92a0, 'roof', 0, false, 4),
      ob(0, 12, 12, 0.3, 2, true, 0x8a92a0, 'roof', 0, false, 4),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0]] },
  { id: 'bosque', name: 'Bosque', theme: 'Bosque con río', ground: 0x4a7a3a, fog: 0x6a9a5a, accent: 0x3a5a2a, waterLevel: 0.3,
    obstacles: [
      ...buildTree(-12, -12, 1.5), ...buildTree(12, -12, 1.5),
      ...buildTree(-12, 12, 1.5), ...buildTree(12, 12, 1.5),
      ...buildTree(0, -18, 2), ...buildTree(0, 18, 2),
      ...buildTree(-18, 0, 1.2), ...buildTree(18, 0, 1.2),
      ob(0, 0, 8, 0.3, 24, false, 0x3498db, 'water', 0, true),
      ob(-9, -9, 2, 2, 2, true, 0x95a5a6, 'box'), ob(9, -9, 2, 2, 2, true, 0x95a5a6, 'box'),
      ob(-9, 9, 2, 2, 2, true, 0x7f8c8d, 'box'), ob(9, 9, 2, 2, 2, true, 0x7f8c8d, 'box'),
      ob(-5, -5, 5, 1, 1, true, 0x7a5230, 'box'), ob(5, 5, 5, 1, 1, true, 0x7a5230, 'box'),
      ob(-18, -4, 3, 2.5, 3, true, 0x95a5a6, 'box'), ob(18, 4, 3, 2.5, 3, true, 0x7f8c8d, 'box'),
      ob(0, 0, 3, 0.5, 6, true, 0x7a5230, 'box'),
      ob(-8, 0, 3, 0.8, 2, false, 0x27ae60, 'box'), ob(8, 0, 3, 0.8, 2, false, 0x27ae60, 'box'),
      ob(-15, 6, 1.5, 1, 1.5, true, 0x7a5230, 'box'), ob(15, -6, 1.5, 1, 1.5, true, 0x7a5230, 'box'),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0],[-22,-22],[22,22]] },
  { id: 'paisaje', name: 'Paisaje', theme: 'Río y montañas', ground: 0x5a8a4a, fog: 0x7aa85a, accent: 0x4a6a3a, waterLevel: 0.3,
    obstacles: [
      ob(-14, -10, 4, 4, 4, true, 0x95a5a6, 'box'), ob(14, 10, 4, 4, 4, true, 0x7f8c8d, 'box'),
      ob(14, -10, 4, 4, 4, true, 0x95a5a6, 'box'), ob(-14, 10, 4, 4, 4, true, 0x7f8c8d, 'box'),
      ob(-10, -7, 1.5, 1.5, 1.5, true, 0x95a5a6, 'box'), ob(10, 7, 1.5, 1.5, 1.5, true, 0x7f8c8d, 'box'),
      ob(10, -7, 1.5, 1.5, 1.5, true, 0x95a5a6, 'box'), ob(-10, 7, 1.5, 1.5, 1.5, true, 0x7f8c8d, 'box'),
      ob(0, 0, 6, 0.3, 24, false, 0x3498db, 'water', 0, true),
      ob(-3.5, 0, 0.5, 1, 24, false, 0x8a7a5a, 'wall'), ob(3.5, 0, 0.5, 1, 24, false, 0x8a7a5a, 'wall'),
      ...buildTree(-18, -14, 1.3), ...buildTree(18, 14, 1.3),
      ...buildTree(-18, 14, 1.3), ...buildTree(18, -14, 1.3),
      ob(0, 0, 3, 0.5, 8, true, 0x7a5230, 'box'),
      ob(0, -20, 6, 2, 4, true, 0x6a9a5a, 'box'), ob(0, 20, 6, 2, 4, true, 0x6a9a5a, 'box'),
      ob(-20, 0, 3, 6, 3, true, 0x95a5a6, 'box'),
      ...buildStairs(-17, 0, 6, 'W', 0x7f8c8d),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0]] },
]

function getMap(id: string): GameMap { return MAPS.find(m => m.id === id) ?? MAPS[0] }

function pveLevelConfig(level: number) {
  const baseHp = 50
  return {
    mobCount: Math.min(14, 3 + Math.floor(level * 1.2)),
    mobHp: baseHp + (level - 1) * 15,
    mobSpeed: Math.min(6.0, 2.8 + (level - 1) * 0.25),
    mobDamage: 6 + (level - 1) * 1.5,
    mapId: MAPS[(level - 1) % MAPS.length].id,
  }
}

const KILLSTREAKS = [
  { id: 'drone', name: 'Dron', streak: 3, desc: 'Dron aliado que ataca enemigos', icon: 'drone' },
  { id: 'bomb',  name: 'Bomba', streak: 5, desc: 'Bombardeo de zona', icon: 'bomb' },
  { id: 'aura',  name: 'Ráfaga', streak: 7, desc: 'Velocidad + recarga instantánea', icon: 'aura' },
]
function streakAt(streak: number) {
  let best: typeof KILLSTREAKS[0] | null = null
  for (const k of KILLSTREAKS) if (streak >= k.streak && (!best || k.streak > best.streak)) best = k
  return best
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
function genId(prefix: string) { return prefix + Math.random().toString(36).slice(2, 8) }
function getSkin(id: string) { return SKINS.find(s => s.id === id) ?? SKINS[0] }

// ----------------------- Types -----------------------
type GameMode = '1v1' | '2v2' | 'team' | 'ffa' | 'coop' | 'mixed'
type Team = 'blue' | 'red' | 'none'

// ----------------------- Mode helpers -----------------------
// PvP modes: teams, no mobs, round-based (1v1, 2v2, team, ffa)
// PvE modes: have mobs (coop, mixed)
function isPvPMode(mode: GameMode): boolean { return mode === '1v1' || mode === '2v2' || mode === 'team' || mode === 'ffa' }
function isPvEMode(mode: GameMode): boolean { return mode === 'coop' || mode === 'mixed' }
function hasMobs(mode: GameMode): boolean { return mode === 'coop' || mode === 'mixed' }
function hasFriendlyFire(mode: GameMode): boolean { return mode === 'mixed' || mode === 'ffa' }
function maxPlayersForMode(mode: GameMode): number {
  if (mode === '1v1') return 2
  if (mode === '2v2') return 4
  if (mode === 'team') return 12
  if (mode === 'ffa') return 8
  return MAX_PLAYERS_PER_ROOM // coop, mixed (12)
}
function defaultRoomName(mode: GameMode): string {
  switch (mode) {
    case '1v1': return 'Duelo 1v1'
    case '2v2': return 'Duelo 2v2'
    case 'team': return 'Batalla en Equipo'
    case 'ffa': return 'Todos vs Todos'
    case 'coop': return 'Cooperativo'
    case 'mixed': return 'Caos Mixto'
  }
}

interface Player {
  id: string
  name: string
  skin: string
  team: Team
  pos: [number, number, number]
  yaw: number; pitch: number
  health: number; shield: number
  state: 'alive' | 'dead'
  weapon: string; ammo: number
  reloading: boolean; reloadEnd: number
  score: number; kills: number; deaths: number
  streak: number; bestStreak: number
  lastShot: number
  respawnAt: number
  lastStateSent: number
  connected: boolean
  lastDamagedAt: number
}

interface Mob {
  id: string
  pos: [number, number, number]
  vel: [number, number]
  health: number; maxHealth: number
  state: 'alive' | 'dead'
  wanderTarget: [number, number, number]
  respawnAt: number
  lastAttack: number
  hitFlash: number
}

interface Item {
  id: string
  type: 'ammo' | 'heal' | 'shield'
  pos: [number, number, number]
  born: number
}

interface Room {
  id: string
  name: string
  mode: GameMode
  mapId: string
  level: number
  players: Map<string, Player>
  mobs: Mob[]
  items: Item[]
  createdAt: number
  emptySince: number | null
  roundActive: boolean
  roundEndsAt: number
  nextMapId: string
  nextLevel: number
  itemSpawnTimer: number
  droneOwner: string | null
  droneEnd: number
}

// ----------------------- State -----------------------
const rooms = new Map<string, Room>()
const socketToRoom = new Map<string, string>()
const socketToLobby = new Map<string, { name: string; skin: string }>()

function spawnBlocked(map: GameMap, x: number, z: number): boolean {
  // check if a position is inside any obstacle (with margin)
  // skip water and noCollide obstacles (they don't block spawning)
  // skip elevated obstacles (y > 1.0): they float above ground and don't block ground spawns
  const margin = 1.5
  for (const o of map.obstacles) {
    if (o.kind === 'water' || o.noCollide) continue
    if ((o.y ?? 0) > 1.0) continue
    const hw = o.w / 2, hd = o.d / 2
    if (o.rotation && o.rotation !== 0) {
      // rotated: use slightly larger margin (bounding-circle approximation)
      const reach = Math.max(hw, hd) + margin
      const dx = x - o.x, dz = z - o.z
      if (dx * dx + dz * dz < reach * reach) return true
    } else {
      // axis-aligned box check (original behavior)
      if (Math.abs(x - o.x) < hw + margin && Math.abs(z - o.z) < hd + margin) return true
    }
  }
  return false
}

function pickSpawn(room: Room, preferTeam: Team = 'none'): [number, number, number] {
  const map = getMap(room.mapId)
  const spawns = map.spawns
  // try each spawn with random offset, validate not inside obstacle
  const trySpawn = (s: [number, number]): [number, number, number] => {
    for (let attempt = 0; attempt < 8; attempt++) {
      const x = s[0] + (Math.random() - 0.5) * 4
      const z = s[1] + (Math.random() - 0.5) * 4
      if (!spawnBlocked(map, x, z)) return [x, 1.7, z]
    }
    // fallback: use exact spawn point
    return [s[0], 1.7, s[1]]
  }
  // PvP: bias by team (blue near spawn[0], red near spawn[1])
  if (preferTeam !== 'none' && spawns.length >= 2) {
    const idx = preferTeam === 'blue' ? 0 : 1
    return trySpawn(spawns[idx])
  }
  // pick spawn farthest from any alive player
  let best = spawns[0], bestD = -1
  for (const s of spawns) {
    let minD = Infinity
    for (const p of room.players.values()) {
      if (p.state !== 'alive') continue
      minD = Math.min(minD, dist2D([s[0], 0, s[1]], p.pos))
    }
    if (minD > bestD) { bestD = minD; best = s }
  }
  return trySpawn(best)
}

function makePlayer(socketId: string, name: string, skin: string, room: Room): Player {
  // team assignment: only team modes (1v1, 2v2, team) get blue/red; ffa/coop/mixed = 'none'
  let team: Team = 'none'
  if (room.mode === '1v1' || room.mode === '2v2' || room.mode === 'team') {
    const counts = { blue: 0, red: 0 }
    for (const p of room.players.values()) counts[p.team]++
    team = counts.blue <= counts.red ? 'blue' : 'red'
  }
  // ffa, coop, mixed → team stays 'none'
  return {
    id: socketId,
    name: (name || 'Jugador').slice(0, 16),
    skin: getSkin(skin).id,
    team,
    pos: pickSpawn(room, team),
    yaw: 0, pitch: 0,
    health: PLAYER_MAX_HP, shield: 0,
    state: 'alive',
    weapon: 'pistol', ammo: WEAPONS.pistol.magazine,
    reloading: false, reloadEnd: 0,
    score: 0, kills: 0, deaths: 0,
    streak: 0, bestStreak: 0,
    lastShot: 0, respawnAt: 0, lastStateSent: 0,
    connected: true,
    lastDamagedAt: 0,
  }
}

function makeMob(i: number, level: number): Mob {
  const cfg = pveLevelConfig(level)
  const a = Math.random() * Math.PI * 2
  const r = Math.random() * (HALF - 8)
  return {
    id: 'mob_' + i + '_' + Math.random().toString(36).slice(2, 6),
    pos: [Math.cos(a) * r, 1, Math.sin(a) * r],
    vel: [0, 0],
    health: cfg.mobHp, maxHealth: cfg.mobHp,
    state: 'alive',
    wanderTarget: [0, 1, 0],
    respawnAt: 0,
    lastAttack: 0,
    hitFlash: 0,
  }
}

function createRoom(name: string, mode: GameMode, mapId?: string): Room {
  const id = genId('room_')
  let startMap: string
  if (mapId) {
    startMap = MAPS.find(m => m.id === mapId)?.id ?? MAPS[0].id
  } else if (isPvEMode(mode)) {
    startMap = pveLevelConfig(1).mapId
  } else {
    startMap = MAPS[Math.floor(Math.random() * MAPS.length)].id
  }
  const room: Room = {
    id, name: (name || 'Sala de Doodle').slice(0, 28),
    mode, mapId: startMap, level: 1,
    players: new Map(), mobs: [], items: [],
    createdAt: Date.now(), emptySince: null,
    roundActive: true, roundEndsAt: 0,
    nextMapId: startMap, nextLevel: 1,
    itemSpawnTimer: 0,
    droneOwner: null, droneEnd: 0,
  }
  if (isPvEMode(mode)) {
    const cfg = pveLevelConfig(1)
    room.mobs = Array.from({ length: cfg.mobCount }, (_, i) => makeMob(i, 1))
  }
  rooms.set(id, room)
  return room
}

// default coop room so the lobby isn't empty
createRoom('Arena Doodle #1', 'coop')

function roomSummary(r: Room) {
  return {
    id: r.id, name: r.name,
    mode: r.mode, mapId: r.mapId, level: r.level,
    players: r.players.size, max: maxPlayersForMode(r.mode),
    mobs: r.mobs.filter(m => m.state === 'alive').length,
  }
}
function lobbyState() { return { rooms: Array.from(rooms.values()).map(roomSummary) } }
function broadcastLobbyState() { io.emit('lobby:state', lobbyState()) }

function playerPublic(p: Player) {
  return {
    id: p.id, name: p.name, skin: p.skin, team: p.team,
    pos: p.pos, yaw: p.yaw, pitch: p.pitch,
    health: p.health, shield: p.shield, state: p.state,
    weapon: p.weapon, ammo: p.ammo, reloading: p.reloading,
    score: p.score, kills: p.kills, deaths: p.deaths,
    streak: p.streak, bestStreak: p.bestStreak,
  }
}
function roomRoster(r: Room) { return Array.from(r.players.values()).map(playerPublic) }
function emitRoomState(r: Room) {
  const roster = roomRoster(r)
  for (const pid of r.players.keys()) io.to(pid).emit('room:players', { players: roster })
}

function killFeed(r: Room, victim: string, killer: string | null, weapon: string, headshot: boolean, kind: 'player' | 'mob') {
  io.to(r.id).emit('killfeed', { id: genId('kf_'), victim, killer, weapon, headshot, kind, ts: Date.now() })
}

// ----- map / level transitions -----
function broadcastMapChange(r: Room) {
  io.to(r.id).emit('room:mapChange', { mapId: r.mapId, level: r.level, mode: r.mode })
}

function startPvERound(r: Room, level: number) {
  r.level = level
  const cfg = pveLevelConfig(level)
  r.mapId = cfg.mapId
  r.nextMapId = cfg.mapId
  r.nextLevel = level
  r.mobs = Array.from({ length: cfg.mobCount }, (_, i) => makeMob(i, level))
  r.items = []
  r.roundActive = true
  r.roundEndsAt = 0
  // reposition players to spawns
  for (const p of r.players.values()) {
    p.pos = pickSpawn(r)
    p.health = PLAYER_MAX_HP
    p.state = 'alive'
    p.ammo = WEAPONS[p.weapon].magazine
    p.reloading = false
  }
  broadcastMapChange(r)
  // send fresh room:joined-like state
  for (const pid of r.players.keys()) {
    const p = r.players.get(pid)!
    io.to(pid).emit('room:joined', {
      room: { id: r.id, name: r.name, mode: r.mode, mapId: r.mapId, level: r.level },
      me: playerPublic(p),
      players: roomRoster(r),
      mobs: r.mobs.map(m => ({ id: m.id, pos: m.pos, state: m.state, health: m.health })),
      items: r.items.map(it => ({ id: it.id, type: it.type, pos: it.pos })),
    })
  }
}

function startPvPRound(r: Room, rotateMap: boolean) {
  if (rotateMap) {
    r.mapId = MAPS[Math.floor(Math.random() * MAPS.length)].id
  }
  r.roundActive = true
  r.roundEndsAt = 0
  for (const p of r.players.values()) {
    p.pos = pickSpawn(r, p.team)
    p.health = PLAYER_MAX_HP
    p.shield = 0
    p.state = 'alive'
    p.weapon = 'pistol'
    p.ammo = WEAPONS.pistol.magazine
    p.reloading = false
    p.streak = 0
  }
  broadcastMapChange(r)
  for (const pid of r.players.keys()) {
    const p = r.players.get(pid)!
    io.to(pid).emit('room:joined', {
      room: { id: r.id, name: r.name, mode: r.mode, mapId: r.mapId, level: r.level },
      me: playerPublic(p),
      players: roomRoster(r),
      mobs: [],
      items: [],
    })
  }
}

function checkPvERoundEnd(r: Room) {
  if (!r.roundActive) return
  const aliveMobs = r.mobs.filter(m => m.state === 'alive').length
  if (aliveMobs === 0) {
    r.roundActive = false
    r.roundEndsAt = Date.now() + ROUND_END_MS
    r.nextLevel = r.level + 1
    io.to(r.id).emit('room:mapChange', { mapId: r.mapId, level: r.level, mode: r.mode, banner: `¡Nivel ${r.level} superado!` })
  }
}

function checkPvPRoundEnd(r: Room) {
  if (!r.roundActive || r.players.size < 2) return
  const alivePlayers = Array.from(r.players.values()).filter(p => p.state === 'alive')
  if (r.mode === 'ffa') {
    // FFA: last man standing — round ends when ≤1 player is alive
    if (alivePlayers.length <= 1) {
      r.roundActive = false
      r.roundEndsAt = Date.now() + ROUND_END_MS
      const winnerName = alivePlayers[0]?.name ?? '—'
      io.to(r.id).emit('room:mapChange', { mapId: r.mapId, level: r.level, mode: r.mode, banner: `¡${winnerName} gana la ronda!` })
    }
  } else {
    // Team modes (1v1, 2v2, team): round ends when one team has no alive players
    const teams = { blue: 0, red: 0 }
    for (const p of alivePlayers) {
      if (p.team === 'blue' || p.team === 'red') teams[p.team]++
    }
    if (teams.blue === 0 || teams.red === 0) {
      r.roundActive = false
      r.roundEndsAt = Date.now() + ROUND_END_MS
      const winner = teams.blue > 0 ? 'Azul' : 'Rojo'
      io.to(r.id).emit('room:mapChange', { mapId: r.mapId, level: r.level, mode: r.mode, banner: `¡Equipo ${winner} gana la ronda!` })
    }
  }
}

// ----------------------- Items -----------------------
function spawnItem(r: Room, type: 'ammo'|'heal'|'shield', pos?: [number,number,number]) {
  const map = getMap(r.mapId)
  const p: [number, number, number] = pos ?? (() => {
    const s = map.spawns[Math.floor(Math.random() * map.spawns.length)]
    return [s[0] + (Math.random()-0.5)*10, 1, s[1] + (Math.random()-0.5)*10]
  })()
  const it: Item = { id: genId('item_'), type, pos: p, born: Date.now() }
  r.items.push(it)
  io.to(r.id).emit('items:state', { items: r.items.map(i => ({ id: i.id, type: i.type, pos: i.pos })) })
}

function dropItemOnMobKill(r: Room, pos: [number,number,number]) {
  const roll = Math.random()
  let type: 'ammo'|'heal'|'shield'
  if (roll < 0.5) type = 'ammo'
  else if (roll < 0.8) type = 'heal'
  else type = 'shield'
  spawnItem(r, type, [pos[0], 1, pos[2]])
}

// ----------------------- socket.io -----------------------
const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`)

  socket.on('lobby:hello', (data: { name?: string; skin?: string }) => {
    socketToLobby.set(socket.id, { name: (data?.name || 'Jugador').slice(0, 16), skin: data?.skin || 'red' })
    socket.emit('lobby:state', lobbyState())
    socket.emit('lobby:ready', { skins: SKINS, weapons: Object.values(WEAPONS) })
  })
  socket.on('lobby:refresh', () => { socket.emit('lobby:state', lobbyState()) })

  socket.on('room:create', (data: { roomName?: string; mode?: GameMode; mapId?: string }) => {
    if (rooms.size >= MAX_ROOMS) {
      for (const [rid, r] of rooms) if (r.players.size === 0) { rooms.delete(rid); break }
    }
    const meta = socketToLobby.get(socket.id) ?? { name: 'Jugador', skin: 'red' }
    const VALID_MODES: GameMode[] = ['1v1', '2v2', 'team', 'ffa', 'coop', 'mixed']
    const mode: GameMode = data?.mode && VALID_MODES.includes(data.mode) ? data.mode : 'coop'
    const room = createRoom(data?.roomName || defaultRoomName(mode), mode, data?.mapId)
    joinRoom(socket, room, meta.name, meta.skin)
  })
  socket.on('room:join', (data: { roomId: string }) => {
    const meta = socketToLobby.get(socket.id) ?? { name: 'Jugador', skin: 'red' }
    const room = rooms.get(data.roomId)
    if (!room) { socket.emit('room:error', { message: 'La sala no existe' }); return }
    if (room.players.size >= maxPlayersForMode(room.mode)) { socket.emit('room:error', { message: 'La sala está llena' }); return }
    joinRoom(socket, room, meta.name, meta.skin)
  })

  socket.on('player:state', (data: { pos: [number,number,number]; yaw: number; pitch: number; weapon: string; ammo: number; state: 'alive'|'dead'; shield: number }) => {
    const rid = socketToRoom.get(socket.id); if (!rid) return
    const room = rooms.get(rid); if (!room) return
    const p = room.players.get(socket.id); if (!p) return
    const now = Date.now()
    p.pos = data.pos; clampToArena(p.pos)
    p.yaw = data.yaw; p.pitch = data.pitch
    p.weapon = data.weapon; p.ammo = data.ammo; p.state = data.state; p.shield = data.shield
    if (now - p.lastStateSent < STATE_BROADCAST_THROTTLE) return
    p.lastStateSent = now
    socket.to(room.id).emit('player:state', {
      id: p.id, pos: p.pos, yaw: p.yaw, pitch: p.pitch,
      weapon: p.weapon, ammo: p.ammo, state: p.state, shield: p.shield,
    })
  })

  socket.on('player:shoot', (data: { origin: [number,number,number]; dir: [number,number,number]; weapon: string }) => {
    const rid = socketToRoom.get(socket.id); if (!rid) return
    const room = rooms.get(rid); if (!room) return
    const p = room.players.get(socket.id); if (!p || p.state !== 'alive') return
    const w = WEAPONS[data.weapon]; if (!w) return
    const now = Date.now()
    if (now - p.lastShot < w.fireRate - 15) return
    p.lastShot = now
    if (p.weapon !== data.weapon) p.weapon = data.weapon
    if (p.ammo > 0) p.ammo -= 1
    socket.to(room.id).emit('player:shot', { shooterId: p.id, origin: data.origin, dir: data.dir, weapon: data.weapon })
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
      socket.to(room.id).emit('player:state', { id: p.id, pos: p.pos, yaw: p.yaw, pitch: p.pitch, weapon: p.weapon, ammo: p.ammo, state: p.state, shield: p.shield })
    }, w.reload)
  })

  socket.on('player:hit', (data: { targetId: string; damage: number; headshot: boolean; dist: number; kind: 'player' | 'mob' }) => {
    const rid = socketToRoom.get(socket.id); if (!rid) return
    const room = rooms.get(rid); if (!room) return
    const shooter = room.players.get(socket.id); if (!shooter || shooter.state !== 'alive') return
    const w = WEAPONS[shooter.weapon]; if (!w) return
    if (data.dist > w.range + 6) return
    if (data.damage > w.damage * w.pellets * 2.2 + 5) return

    if (data.kind === 'player') {
      const target = room.players.get(data.targetId)
      if (!target || target.state !== 'alive' || target.id === shooter.id) return
      // Friendly fire rules:
      // - coop: NO player vs player damage (always block)
      // - ffa/mixed: friendly fire ON (allow all player damage)
      // - team modes (1v1/2v2/team): block same-team damage
      if (room.mode === 'coop') return
      if (!hasFriendlyFire(room.mode) && target.team === shooter.team && shooter.team !== 'none') return
      const dmg = Math.min(data.damage, w.damage * (data.headshot ? 2 : 1) * w.pellets + 4)
      applyDamageToPlayer(room, target, dmg, shooter.id, shooter.weapon, data.headshot, shooter.pos)
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

  socket.on('item:pickup', (data: { itemId: string }) => {
    const rid = socketToRoom.get(socket.id); if (!rid) return
    const room = rooms.get(rid); if (!room) return
    const p = room.players.get(socket.id); if (!p || p.state !== 'alive') return
    const idx = room.items.findIndex(i => i.id === data.itemId)
    if (idx === -1) return
    const it = room.items[idx]
    // distance check
    if (dist2D(p.pos, it.pos) > 2.2) return
    // apply effect
    let applied = false
    if (it.type === 'ammo') {
      // give a weapon + ammo: pick a random weapon the player doesn't currently hold, or just refill
      const pool = ['smg','rifle','shotgun']
      const w = pool[Math.floor(Math.random()*pool.length)]
      p.weapon = w
      p.ammo = WEAPONS[w].magazine
      applied = true
    } else if (it.type === 'heal') {
      if (p.health < PLAYER_MAX_HP) {
        p.health = Math.min(PLAYER_MAX_HP, p.health + 35)
        applied = true
      }
    } else if (it.type === 'shield') {
      if (p.shield < PLAYER_MAX_SHIELD) {
        p.shield = Math.min(PLAYER_MAX_SHIELD, p.shield + 30)
        applied = true
      }
    }
    if (applied) {
      room.items.splice(idx, 1)
      io.to(room.id).emit('items:state', { items: room.items.map(i => ({ id: i.id, type: i.type, pos: i.pos })) })
      io.to(room.id).emit('item:picked', { id: it.id, by: p.id, type: it.type })
      socket.emit('player:ammo', { weapon: p.weapon, ammo: p.ammo })
      socket.emit('player:reloadDone', { weapon: p.weapon, ammo: p.ammo })
    }
  })

  // chat messages
  socket.on('chat:send', (data: { text: string }) => {
    const rid = socketToRoom.get(socket.id); if (!rid) return
    const room = rooms.get(rid); if (!room) return
    const p = room.players.get(socket.id); if (!p) return
    const text = (data.text || '').slice(0, 80)
    if (!text.trim()) return
    io.to(room.id).emit('chat:message', { id: genId('chat_'), name: p.name, text, at: Date.now() })
  })

  socket.on('room:leave', () => { leaveRoom(socket); socket.emit('lobby:state', lobbyState()) })
  socket.on('room:sync', () => {
    const rid = socketToRoom.get(socket.id); if (!rid) return
    const room = rooms.get(rid); if (!room) return
    const me = room.players.get(socket.id); if (!me) return
    socket.emit('room:joined', {
      room: { id: room.id, name: room.name, mode: room.mode, mapId: room.mapId, level: room.level },
      me: playerPublic(me),
      players: roomRoster(room),
      mobs: room.mobs.map(m => ({ id: m.id, pos: m.pos, state: m.state, health: m.health })),
      items: room.items.map(i => ({ id: i.id, type: i.type, pos: i.pos })),
    })
  })

  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`)
    leaveRoom(socket)
    socketToLobby.delete(socket.id)
  })
  socket.on('error', (err) => console.error(`[socket error] ${socket.id}`, err))
})

function applyDamageToPlayer(room: Room, target: Player, dmg: number, killerId: string, weapon: string, headshot: boolean, attackerPos?: [number, number, number]) {
  const now = Date.now()
  target.lastDamagedAt = now
  // shield absorbs first
  let remaining = dmg
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, remaining * 0.6)
    target.shield -= absorbed
    remaining -= absorbed
  }
  target.health -= remaining
  io.to(room.id).emit('player:damaged', {
    id: target.id, health: Math.max(0, target.health),
    shield: Math.max(0, target.shield), by: killerId, headshot,
    attackerPos: attackerPos ?? null,
  })
  if (target.health <= 0) killPlayer(room, target, killerId, weapon, headshot)
}

function joinRoom(socket: any, room: Room, name: string, skin: string) {
  leaveRoom(socket)
  const player = makePlayer(socket.id, name, skin, room)
  room.players.set(socket.id, player)
  socketToRoom.set(socket.id, room.id)
  socket.join(room.id)
  socket.emit('room:joined', {
    room: { id: room.id, name: room.name, mode: room.mode, mapId: room.mapId, level: room.level },
    me: playerPublic(player),
    players: roomRoster(room),
    mobs: room.mobs.map(m => ({ id: m.id, pos: m.pos, state: m.state, health: m.health })),
    items: room.items.map(i => ({ id: i.id, type: i.type, pos: i.pos })),
  })
  socket.to(room.id).emit('room:playerJoined', playerPublic(player))
  room.emptySince = null
  broadcastLobbyState()
  console.log(`[join] ${player.name} -> ${room.name} (${room.mode}, ${room.players.size}p)`)
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
    if (room.players.size === 0) {
      room.emptySince = Date.now()
    }
  }
  broadcastLobbyState()
}

function killPlayer(room: Room, victim: Player, killerId: string, weapon: string, headshot: boolean) {
  victim.state = 'dead'
  victim.health = 0
  victim.deaths += 1
  victim.streak = 0
  victim.respawnAt = Date.now() + RESPAWN_MS
  const killer = room.players.get(killerId)
  if (killer && killer.id !== victim.id) {
    killer.kills += 1
    killer.streak += 1
    killer.bestStreak = Math.max(killer.bestStreak, killer.streak)
    killer.score += headshot ? 150 : 100
    // streak rewards
    const reward = streakAt(killer.streak)
    if (reward && killer.streak === reward.streak) {
      io.to(room.id).emit('player:streak', { id: killer.id, streak: killer.streak, reward })
      io.to(killer.id).emit('player:streak', { id: killer.id, streak: killer.streak, reward })
      applyStreakReward(room, killer, reward.id)
    } else {
      io.to(room.id).emit('player:streak', { id: killer.id, streak: killer.streak, reward: null })
    }
    // PvP modes: drop a random item on death
    if (isPvPMode(room.mode) && Math.random() < 0.6) dropItemOnMobKill(room, victim.pos)
  }
  io.to(room.id).emit('player:killed', { victimId: victim.id, killerId, weapon, headshot })
  killFeed(room, victim.name, killer?.name ?? null, weapon, headshot, 'player')
  setTimeout(() => {
    if (!victim.connected) return
    if (!room.players.has(victim.id)) return
    // Always respawn — round restarts will override with fresh state if needed
    victim.state = 'alive'
    victim.health = PLAYER_MAX_HP
    victim.shield = 0
    victim.pos = pickSpawn(room, victim.team)
    victim.weapon = 'pistol'
    victim.ammo = WEAPONS.pistol.magazine
    victim.reloading = false
    io.to(room.id).emit('player:respawned', { id: victim.id, pos: victim.pos })
  }, RESPAWN_MS)
  // round-end checks (PvP modes only — PvE round end is triggered by mob kills)
  if (isPvPMode(room.mode)) checkPvPRoundEnd(room)
}

function applyStreakReward(room: Room, p: Player, rewardId: string) {
  if (rewardId === 'heal' || rewardId === 'aura') {
    p.health = Math.min(PLAYER_MAX_HP, p.health + 25)
    p.shield = Math.min(PLAYER_MAX_SHIELD, p.shield + 25)
  }
  if (rewardId === 'bomb') {
    // damage all mobs near player + nearby enemies
    for (const m of room.mobs) {
      if (m.state !== 'alive') continue
      if (dist2D(m.pos, p.pos) < 12) {
        m.health -= 80
        m.hitFlash = Date.now()
        io.to(room.id).emit('mob:damaged', { id: m.id, health: Math.max(0, m.health), by: p.id })
        if (m.health <= 0) killMob(room, m, p.id, 'bomb', false)
      }
    }
    for (const other of room.players.values()) {
      if (other.id === p.id || other.state !== 'alive') continue
      // coop: no player damage; ffa/mixed: friendly fire on; team modes: skip same team
      if (room.mode === 'coop') continue
      if (!hasFriendlyFire(room.mode) && other.team === p.team && p.team !== 'none') continue
      if (dist2D(other.pos, p.pos) < 10) {
        applyDamageToPlayer(room, other, 60, p.id, 'bomb', false)
      }
    }
  }
  if (rewardId === 'drone') {
    room.droneOwner = p.id
    room.droneEnd = Date.now() + 20000
    io.to(room.id).emit('drone:state', { ownerId: p.id, pos: [p.pos[0], 3.5, p.pos[2]], expires: room.droneEnd, targetYaw: p.yaw })
  }
  if (rewardId === 'aura') {
    p.ammo = WEAPONS[p.weapon].magazine
    p.reloading = false
    io.to(p.id).emit('player:reloadDone', { weapon: p.weapon, ammo: p.ammo })
  }
}

function killMob(room: Room, mob: Mob, killerId: string, weapon: string, headshot: boolean) {
  mob.state = 'dead'
  mob.health = 0
  mob.respawnAt = Date.now() + MOB_RESPAWN_MS
  const killer = room.players.get(killerId)
  if (killer) {
    killer.streak += 1
    killer.bestStreak = Math.max(killer.bestStreak, killer.streak)
    killer.score += headshot ? 60 : 40
    const reward = streakAt(killer.streak)
    if (reward && killer.streak === reward.streak) {
      io.to(room.id).emit('player:streak', { id: killer.id, streak: killer.streak, reward })
      io.to(killer.id).emit('player:streak', { id: killer.id, streak: killer.streak, reward })
      applyStreakReward(room, killer, reward.id)
    } else {
      io.to(room.id).emit('player:streak', { id: killer.id, streak: killer.streak, reward: null })
    }
  }
  io.to(room.id).emit('mob:killed', { id: mob.id, killerId, weapon, headshot })
  killFeed(room, 'Doodle Mob', killer?.name ?? null, weapon, headshot, 'mob')
  // item drop
  dropItemOnMobKill(room, mob.pos)
  checkPvERoundEnd(room)
  // schedule respawn
  setTimeout(() => {
    if (!rooms.has(room.id)) return
    if (!isPvEMode(room.mode)) return // mobs only respawn in PvE modes (coop/mixed) between levels
    mob.state = 'alive'
    mob.health = mob.maxHealth
    const a = Math.random() * Math.PI * 2
    const r = Math.random() * (HALF - 8)
    mob.pos = [Math.cos(a) * r, 1, Math.sin(a) * r]
    mob.wanderTarget = mob.pos.slice() as [number, number, number]
    io.to(room.id).emit('mob:respawned', { id: mob.id, pos: mob.pos })
  }, MOB_RESPAWN_MS)
}

// ----------------------- World tick -----------------------
setInterval(() => {
  const now = Date.now()
  // cleanup empty rooms
  for (const [rid, r] of rooms) {
    if (r.players.size === 0) {
      if (r.emptySince == null) r.emptySince = now
      if (now - (r.emptySince as number) > EMPTY_ROOM_TTL_MS) {
        // keep at least the default PvE room
        if (rooms.size > 1) {
          rooms.delete(rid)
          continue
        }
      }
    }
  }

  for (const room of rooms.values()) {
    if (room.players.size === 0) continue

    // round transitions
    if (!room.roundActive && room.roundEndsAt && now >= room.roundEndsAt) {
      room.roundEndsAt = 0
      if (isPvEMode(room.mode)) startPvERound(room, room.nextLevel)
      else startPvPRound(room, true)
    }

    // mob AI (PvE modes: coop + mixed)
    if (isPvEMode(room.mode)) {
      const cfg = pveLevelConfig(room.level)
      for (const mob of room.mobs) {
        if (mob.state === 'dead') continue
        let nearest: Player | null = null
        let nd = Infinity
        for (const p of room.players.values()) {
          if (p.state !== 'alive') continue
          const d = dist2D(mob.pos, p.pos)
          if (d < nd) { nd = d; nearest = p }
        }
        let tx: number, tz: number
        if (nearest && nd < 16) {
          tx = nearest.pos[0]; tz = nearest.pos[2]
          if (nd < 1.9 && now - mob.lastAttack > MOB_ATTACK_CD) {
            mob.lastAttack = now
            applyDamageToPlayer(room, nearest, cfg.mobDamage, mob.id, 'mob', false, mob.pos)
          }
        } else {
          if (dist2D(mob.pos, mob.wanderTarget) < 1.5) {
            const a = Math.random() * Math.PI * 2
            const r = Math.random() * (HALF - 6)
            mob.wanderTarget = [Math.cos(a) * r, 1, Math.sin(a) * r]
          }
          tx = mob.wanderTarget[0]; tz = mob.wanderTarget[2]
        }
        const dx = tx - mob.pos[0], dz = tz - mob.pos[2]
        const len = Math.hypot(dx, dz) || 1
        const vx = (dx / len) * cfg.mobSpeed, vz = (dz / len) * cfg.mobSpeed
        mob.vel[0] = vx; mob.vel[1] = vz
        const step = TICK_MS / 1000
        mob.pos[0] += vx * step
        mob.pos[2] += vz * step
        clampToArena(mob.pos)
        mob.pos[1] = 1
      }
      io.to(room.id).emit('mob:state', { mobs: room.mobs.map(m => ({ id: m.id, pos: m.pos, state: m.state, flash: m.hitFlash })) })
    }

    // PvE health regen: if player hasn't taken damage for 5s, regen 1.5 HP/sec
    if (isPvEMode(room.mode)) {
      for (const p of room.players.values()) {
        if (p.state !== 'alive') continue
        if (p.health >= PLAYER_MAX_HP) continue
        if (now - p.lastDamagedAt > 5000) {
          p.health = Math.min(PLAYER_MAX_HP, p.health + 1.5 * (TICK_MS / 1000) * 4)
          // send updated health to the player (throttled)
          if (now % 500 < TICK_MS) {
            io.to(p.id).emit('player:damaged', { id: p.id, health: Math.round(p.health), shield: p.shield, by: 'regen', headshot: false, attackerPos: null, regen: true })
          }
        }
      }
    }

    // drone streak reward: auto-attack nearest enemy/mob
    if (room.droneOwner && now < room.droneEnd) {
      const owner = room.players.get(room.droneOwner)
      if (owner && owner.state === 'alive') {
        // attack nearest mob every ~700ms
        if (now % 700 < TICK_MS) {
          let target: Mob | null = null; let td = Infinity
          for (const m of room.mobs) {
            if (m.state !== 'alive') continue
            const d = dist2D(m.pos, owner.pos)
            if (d < 18 && d < td) { td = d; target = m }
          }
          if (target) {
            target.health -= 14
            target.hitFlash = now
            io.to(room.id).emit('mob:damaged', { id: target.id, health: Math.max(0, target.health), by: owner.id })
            if (target.health <= 0) killMob(room, target, owner.id, 'drone', false)
          }
        }
      } else if (owner && owner.state !== 'alive') {
        // drone persists but does nothing while dead
      } else {
        room.droneOwner = null
      }
    } else if (room.droneOwner && now >= room.droneEnd) {
      room.droneOwner = null
      io.to(room.id).emit('drone:state', { ownerId: null, pos: null, expires: 0 })
    }
    // emit drone position to all clients (for 3D rendering)
    if (room.droneOwner && now < room.droneEnd) {
      const owner = room.players.get(room.droneOwner)
      if (owner && owner.state === 'alive') {
        // drone hovers above and behind the owner
        const dx = -Math.sin(owner.yaw) * 3
        const dz = -Math.cos(owner.yaw) * 3
        const dronePos: [number, number, number] = [owner.pos[0] + dx, 3.5, owner.pos[2] + dz]
        io.to(room.id).emit('drone:state', { ownerId: room.droneOwner, pos: dronePos, expires: room.droneEnd, targetYaw: owner.yaw })
      }
    }

    // item expiry
    let itemsChanged = false
    room.items = room.items.filter(it => {
      if (now - it.born > ITEM_LIFETIME_MS) { itemsChanged = true; return false }
      return true
    })
    if (itemsChanged) {
      io.to(room.id).emit('items:state', { items: room.items.map(i => ({ id: i.id, type: i.type, pos: i.pos })) })
    }

    // periodic item spawns (PvE: every ~12s, PvP: every ~16s)
    room.itemSpawnTimer += TICK_MS
    const interval = isPvEMode(room.mode) ? ITEM_RESPAWN_INTERVAL_MS : 16000
    if (room.itemSpawnTimer >= interval && room.items.length < 6) {
      room.itemSpawnTimer = 0
      const roll = Math.random()
      const type: 'ammo'|'heal'|'shield' = roll < 0.5 ? 'ammo' : roll < 0.8 ? 'heal' : 'shield'
      spawnItem(room, type)
    }

    // roster every ~1s
    if (now % 1000 < TICK_MS) emitRoomState(room)
  }
}, TICK_MS)

setInterval(() => { broadcastLobbyState() }, 4000)

httpServer.listen(PORT, () => {
  console.log(`[doodle-shooter] socket.io server listening on port ${PORT}`)
})

process.on('SIGTERM', () => { httpServer.close(() => process.exit(0)) })
process.on('SIGINT', () => { httpServer.close(() => process.exit(0)) })
