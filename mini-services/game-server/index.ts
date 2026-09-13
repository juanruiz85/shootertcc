import { createServer } from 'http'
import { Server } from 'socket.io'

// ====================================================================
// Doodle Shooter — Multiplayer Game Server (socket.io)
// Port: 3003 (exposed via Caddy gateway using ?XTransformPort=3003)
// Modes: 1v1, 2v2, team (blue vs red), ffa (free-for-all), coop (players vs mobs), mixed (mobs + PvP)
// ====================================================================

// ----------------------- Constants -----------------------
const PORT = 3003
const HALF = 80 // arena half-size
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
  pistol:  { id: 'pistol',  name: 'Pistola',        damage: 18,  fireRate: 330,  magazine: 12, reload: 1200, spread: 0.012, auto: false, range: 80,  pellets: 1 },
  smg:     { id: 'smg',     name: 'SMG',            damage: 12,  fireRate: 90,   magazine: 30, reload: 1500, spread: 0.035, auto: true,  range: 60,  pellets: 1 },
  rifle:   { id: 'rifle',   name: 'Rifle',          damage: 26,  fireRate: 170,  magazine: 20, reload: 1800, spread: 0.018, auto: true,  range: 95,  pellets: 1 },
  shotgun: { id: 'shotgun', name: 'Escopeta',       damage: 11,  fireRate: 720,  magazine: 6,  reload: 2100, spread: 0.13,  auto: false, range: 32,  pellets: 7 },
  sniper:  { id: 'sniper',  name: 'Francotirador',  damage: 80,  fireRate: 1500, magazine: 5,  reload: 3000, spread: 0.001, auto: false, range: 150, pellets: 1 },
  rocket:  { id: 'rocket',  name: 'Lanzacohetes',   damage: 120, fireRate: 2500, magazine: 1,  reload: 5000, spread: 0.02,  auto: false, range: 60,  pellets: 1 },
}

// weapons obtainable only from rare drops (not from 'ammo' pickups)
const RARE_WEAPONS = ['sniper', 'rocket']
// weapons granted by an 'ammo' pickup (random switch)
const AMMO_PICKUP_POOL = ['smg', 'rifle', 'shotgun']

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
  const floorH = 3.0
  const wallT = 0.3
  const doorW = 1.5
  const totalH = floors * floorH
  // Outer walls (full height) — North, East, West
  result.push(ob(cx, cz - d/2, w, totalH, wallT, false, color, 'wall'))
  result.push(ob(cx + w/2, cz, wallT, totalH, d, false, color, 'wall'))
  result.push(ob(cx - w/2, cz, wallT, totalH, d, false, color, 'wall'))
  // South wall with door gap at ground floor only
  result.push(ob(cx - w/4 - doorW/4, cz + d/2, w/2 - doorW/2, floorH - 0.1, wallT, false, color, 'wall', 0, false, 0))
  result.push(ob(cx + w/4 + doorW/4, cz + d/2, w/2 - doorW/2, floorH - 0.1, wallT, false, color, 'wall', 0, false, 0))
  // Upper floor walls (full)
  for (let f = 1; f < floors; f++) {
    const fy = f * floorH
    result.push(ob(cx, cz + d/2, w, floorH - 0.1, wallT, false, color, 'wall', 0, false, fy))
  }
  // Floor platforms for upper floors (walkable, thin slabs)
  for (let f = 1; f < floors; f++) {
    const fy = f * floorH
    result.push(ob(cx + w/4, cz, w/2 - wallT, 0.2, d - wallT * 2, true, color, 'roof', 0, false, fy))
  }
  // Stairs: start from floor 1 (ground) going up to each floor
  for (let f = 0; f < floors - 1; f++) {
    const fy = f * floorH
    result.push(...buildStairs(cx, cz - d/4, 5, 'N', 0x8a7a5a).map(s => ({ ...s, y: (s.y || 0) + fy })))
  }
  // Roof at top
  result.push(ob(cx, cz, w + 0.6, 0.3, d + 0.6, true, roofColor, 'roof', 0, false, totalH))
  return result
}

const MAPS: GameMap[] = [
  { id: 'arena', name: 'Arena Doodle', theme: 'Clásica', ground: 0xf5f1e8, fog: 0xfdfbf7, accent: 0xe8e4df,
    obstacles: [
      ob(0,0,3,4,3,true,0xd5c4a0), ob(-35,-25,4,3,4,true,0xe8d5b7), ob(30,20,5,2.5,3,true,0xe8d5b7),
      ob(-45,35,2.5,3.5,2.5,true,0xb8a47a,'cyl'), ob(45,-40,4,3,4,true,0xe8d5b7),
      ob(20,-15,1.6,3.2,1.6,false,0xb8a47a,'cyl'), ob(-20,15,1.6,3.2,1.6,false,0xb8a47a,'cyl'),
      ob(-10,-50,6,2,2,true,0xd5c4a0), ob(40,45,2,2,6,true,0xd5c4a0),
    ],
    spawns: [[0,-22],[0,22],[22,0],[-22,0],[16,-16],[-16,16]] },
  { id: 'patios', name: 'Patios', theme: 'Cuadrantes', ground: 0xf0e6d2, fog: 0xf6efde, accent: 0xe0d5b8,
    obstacles: [
      ob(-25,-25,3,3,3,true,0xe8d5b7), ob(25,-25,3,3,3,true,0xe8d5b7),
      ob(-25,25,3,3,3,true,0xe8d5b7), ob(25,25,3,3,3,true,0xe8d5b7),
      ob(0,-45,8,2,2,true,0xd5c4a0), ob(0,45,8,2,2,true,0xd5c4a0),
      ob(-45,0,2,2,8,true,0xd5c4a0), ob(45,0,2,2,8,true,0xd5c4a0),
      ob(0,0,2,4,2,true,0xb8a47a),
    ],
    spawns: [[-50,-50],[50,50],[20,-20],[-20,20],[0,-60],[0,60]] },
  { id: 'bunkers', name: 'Bunkers', theme: 'Trincheras', ground: 0xe8e4df, fog: 0xeae6e0, accent: 0xcfc8bc,
    obstacles: [
      ob(-40,-20,12,2,2,true,0xd5c4a0), ob(40,20,12,2,2,true,0xd5c4a0),
      ob(-20,20,2,2,12,true,0xd5c4a0), ob(20,-20,2,2,12,true,0xd5c4a0),
      ob(0,-50,18,3,2,true,0xcdb98a), ob(0,50,18,3,2,true,0xcdb98a),
      ob(-55,0,2,3,10,true,0xcdb98a), ob(55,0,2,3,10,true,0xcdb98a),
      ob(0,0,4,3.5,4,true,0xe8d5b7),
    ],
    spawns: [[0,-60],[0,60],[-60,0],[60,0]] },
  { id: 'torres', name: 'Torres', theme: 'Pilares', ground: 0xe8e4df, fog: 0xeae6e0, accent: 0xcfc8bc,
    obstacles: [
      ob(-35,-35,3,5,3,true,0xb8a47a,'cyl'), ob(35,-35,3,5,3,true,0xb8a47a,'cyl'),
      ob(-35,35,3,5,3,true,0xb8a47a,'cyl'), ob(35,35,3,5,3,true,0xb8a47a,'cyl'),
      ob(0,0,4,6,4,true,0xb8a47a),
      ob(-55,0,2,3,2,true,0xe8d5b7), ob(55,0,2,3,2,true,0xe8d5b7),
      ob(0,-55,2,3,2,true,0xe8d5b7), ob(0,55,2,3,2,true,0xe8d5b7),
    ],
    spawns: [[0,-60],[0,60],[60,0],[-60,0],[-50,-50],[50,50]] },
  { id: 'crucero', name: 'Crucero', theme: 'Cruz', ground: 0xf5f1e8, fog: 0xfdfbf7, accent: 0xe8e4df,
    obstacles: [
      ob(0,-30,4,3,16,true,0xe8d5b7), ob(0,30,4,3,16,true,0xe8d5b7),
      ob(-30,0,16,3,4,true,0xe8d5b7), ob(30,0,16,3,4,true,0xe8d5b7),
      ob(0,0,3,5,3,true,0xd5c4a0),
      ob(-50,-50,3,2,3,true,0xcdb98a), ob(50,-50,3,2,3,true,0xcdb98a),
      ob(-50,50,3,2,3,true,0xcdb98a), ob(50,50,3,2,3,true,0xcdb98a),
    ],
    spawns: [[0,-60],[0,60],[-60,0],[60,0]] },
  { id: 'espinas', name: 'Espinas', theme: 'Zig-zag', ground: 0xf0e6d2, fog: 0xf6efde, accent: 0xe0d5b8,
    obstacles: [
      ob(-45,-40,2,3,8,true,0xd5c4a0), ob(-23,-20,8,3,2,true,0xd5c4a0),
      ob(0,0,2,3,8,true,0xd5c4a0), ob(23,20,8,3,2,true,0xd5c4a0),
      ob(45,40,2,3,8,true,0xd5c4a0),
      ob(-23,20,2,3,8,true,0xe8d5b7), ob(23,-20,2,3,8,true,0xe8d5b7),
      ob(0,-50,6,2,2,true,0xcdb98a), ob(0,50,6,2,2,true,0xcdb98a),
    ],
    spawns: [[-60,-60],[60,60],[-60,60],[60,-60]] },
  { id: 'fortaleza', name: 'Fortaleza', theme: 'Murallas', ground: 0xe8e4df, fog: 0xeae6e0, accent: 0xcfc8bc,
    obstacles: [
      ob(0,-50,30,3,2,true,0xcdb98a), ob(0,50,30,3,2,true,0xcdb98a),
      ob(-50,0,2,3,30,true,0xcdb98a), ob(50,0,2,3,30,true,0xcdb98a),
      ob(-25,-25,3,4,3,true,0xd5c4a0), ob(25,-25,3,4,3,true,0xd5c4a0),
      ob(-25,25,3,4,3,true,0xd5c4a0), ob(25,25,3,4,3,true,0xd5c4a0),
      ob(0,0,5,3,5,true,0xe8d5b7),
    ],
    spawns: [[0,-60],[0,60],[-60,0],[60,0]] },
  { id: 'laberinto', name: 'Laberinto', theme: 'Maze', ground: 0xeaf3e0, fog: 0xeef5e6, accent: 0xcfdcc0,
    obstacles: [
      ob(-30,-30,2,3,12,true,0xe8d5b7), ob(0,-15,12,3,2,true,0xe8d5b7),
      ob(30,0,2,3,12,true,0xe8d5b7), ob(-15,30,12,3,2,true,0xe8d5b7),
      ob(-45,15,6,3,2,true,0xd5c4a0), ob(15,-45,2,3,6,true,0xd5c4a0),
      ob(45,-15,6,3,2,true,0xd5c4a0), ob(-15,45,2,3,6,true,0xd5c4a0),
      ob(0,0,2,2,2,false,0xcdb98a),
    ],
    spawns: [[-60,-60],[60,60],[60,-60],[-60,60],[0,-60],[0,60]] },
  { id: 'puentes', name: 'Puentes', theme: 'Rampas', ground: 0xf0e6d2, fog: 0xf6efde, accent: 0xe0d5b8,
    obstacles: [
      ob(0,-25,4,2,12,true,0xe8d5b7), ob(0,25,4,2,12,true,0xe8d5b7),
      ob(-30,0,12,2,4,true,0xe8d5b7), ob(30,0,12,2,4,true,0xe8d5b7),
      ob(-45,-45,4,4,4,true,0xd5c4a0,'ramp'), ob(45,45,4,4,4,true,0xd5c4a0,'ramp'),
      ob(45,-45,4,4,4,true,0xd5c4a0,'ramp'), ob(-45,45,4,4,4,true,0xd5c4a0,'ramp'),
      ob(0,0,3,5,3,true,0xb8a47a),
    ],
    spawns: [[0,-60],[0,60],[60,0],[-60,0]] },
  { id: 'crater', name: 'Cráter', theme: 'Anillo', ground: 0xf6e3d8, fog: 0xf6e3d8, accent: 0xe0c8bc,
    obstacles: [
      ob(0,0,6,1.5,6,true,0xe0a3a0),
      ob(-30,0,2,3,2,true,0xd5c4a0), ob(30,0,2,3,2,true,0xd5c4a0),
      ob(0,-30,2,3,2,true,0xd5c4a0), ob(0,30,2,3,2,true,0xd5c4a0),
      ob(-45,-45,3,3,3,true,0xcdb98a), ob(45,-45,3,3,3,true,0xcdb98a),
      ob(-45,45,3,3,3,true,0xcdb98a), ob(45,45,3,3,3,true,0xcdb98a),
      ob(0,-55,8,2,2,true,0xd5c4a0), ob(0,55,8,2,2,true,0xd5c4a0),
    ],
    spawns: [[0,-60],[0,60],[60,0],[-60,0],[-55,-55],[55,55]] },
  { id: 'zigzag', name: 'Zigzag', theme: 'Dientes', ground: 0xf5f1e8, fog: 0xfdfbf7, accent: 0xe8e4df,
    obstacles: [
      ob(-40,-30,3,3,3,true,0xe8d5b7), ob(-20,30,3,3,3,true,0xe8d5b7),
      ob(0,-30,3,3,3,true,0xe8d5b7), ob(20,30,3,3,3,true,0xe8d5b7),
      ob(40,-30,3,3,3,true,0xe8d5b7),
      ob(-30,0,2,4,2,true,0xb8a47a,'cyl'), ob(30,0,2,4,2,true,0xb8a47a,'cyl'),
      ob(0,0,4,5,4,true,0xd5c4a0),
    ],
    spawns: [[0,-60],[0,60],[-60,0],[60,0]] },
  { id: 'diamante', name: 'Diamante', theme: 'Rombo', ground: 0xf7fafc, fog: 0xf7fafc, accent: 0xdfe7ec,
    obstacles: [
      ob(0,-35,4,3,4,true,0xa3c8e0), ob(35,0,4,3,4,true,0xa3c8e0),
      ob(0,35,4,3,4,true,0xa3c8e0), ob(-35,0,4,3,4,true,0xa3c8e0),
      ob(0,0,5,5,5,true,0xd5c4a0),
      ob(-50,-50,3,2,3,true,0xe8d5b7), ob(50,-50,3,2,3,true,0xe8d5b7),
      ob(-50,50,3,2,3,true,0xe8d5b7), ob(50,50,3,2,3,true,0xe8d5b7),
    ],
    spawns: [[0,-60],[0,60],[60,0],[-60,0]] },
  { id: 'colmena', name: 'Colmena', theme: 'Celdas', ground: 0xeaf3e0, fog: 0xeef5e6, accent: 0xcfdcc0,
    obstacles: [
      ob(-30,-30,4,3,4,true,0xe8d5b7), ob(0,-30,4,3,4,true,0xe8d5b7), ob(30,-30,4,3,4,true,0xe8d5b7),
      ob(-30,0,4,3,4,true,0xe8d5b7), ob(30,0,4,3,4,true,0xe8d5b7),
      ob(-30,30,4,3,4,true,0xe8d5b7), ob(0,30,4,3,4,true,0xe8d5b7), ob(30,30,4,3,4,true,0xe8d5b7),
      ob(0,0,4,2,4,true,0xd5c4a0),
    ],
    spawns: [[0,-60],[0,60],[-60,0],[60,0],[-24,-24],[24,24]] },
  { id: 'ruinas', name: 'Ruinas', theme: 'Escombros', ground: 0xe8e4df, fog: 0xeae6e0, accent: 0xcfc8bc,
    obstacles: [
      ob(-40,-35,6,2,3,true,0xcdb98a), ob(-35,30,4,3,4,true,0xd5c4a0),
      ob(30,-40,5,2.5,4,true,0xe8d5b7), ob(40,30,3,3,5,true,0xcdb98a),
      ob(0,-15,2,4,2,true,0xb8a47a,'cyl'), ob(0,20,2,4,2,true,0xb8a47a,'cyl'),
      ob(-15,0,3,1.5,3,true,0xd5c4a0), ob(15,0,3,1.5,3,true,0xd5c4a0),
      ob(0,0,8,1,8,true,0xe0a3a0),
    ],
    spawns: [[0,-60],[0,60],[-60,0],[60,0],[-55,-55],[55,55]] },
  { id: 'estadio', name: 'Estadio', theme: 'Graderías', ground: 0xeaf3e0, fog: 0xeef5e6, accent: 0xcfdcc0,
    obstacles: [
      ob(0,-55,44,4,2,true,0xd5c4a0), ob(0,55,44,4,2,true,0xd5c4a0),
      ob(-55,0,2,4,44,true,0xd5c4a0), ob(55,0,2,4,44,true,0xd5c4a0),
      ob(0,-40,30,2,2,true,0xe8d5b7), ob(0,40,30,2,2,true,0xe8d5b7),
      ob(-40,0,2,2,16,true,0xe8d5b7), ob(40,0,2,2,16,true,0xe8d5b7),
      ob(0,0,4,3,4,true,0xcdb98a),
    ],
    spawns: [[0,-18],[0,18],[-18,0],[18,0]] },
  { id: 'nucleo', name: 'Núcleo', theme: 'Anillo central', ground: 0xf6e3d8, fog: 0xf6e3d8, accent: 0xe0c8bc,
    obstacles: [
      ob(0,0,8,1.5,8,true,0xe0a3a0),
      ob(-25,0,2,4,2,true,0xb8a47a,'cyl'), ob(25,0,2,4,2,true,0xb8a47a,'cyl'),
      ob(0,-25,2,4,2,true,0xb8a47a,'cyl'), ob(0,25,2,4,2,true,0xb8a47a,'cyl'),
      ob(-40,-40,4,3,4,true,0xd5c4a0), ob(40,-40,4,3,4,true,0xd5c4a0),
      ob(-40,40,4,3,4,true,0xd5c4a0), ob(40,40,4,3,4,true,0xd5c4a0),
      ob(0,-55,10,2,2,true,0xe8d5b7), ob(0,55,10,2,2,true,0xe8d5b7),
    ],
    spawns: [[0,-60],[0,60],[60,0],[-60,0]] },
  { id: 'barrio', name: 'Barrio', theme: 'Conjunto residencial', ground: 0xb0b8c0, fog: 0xc8d0d8, accent: 0x8a92a0,
    obstacles: [
      ...buildHouse(-50,-40,6,6,3.5,0xe8d5b7,0xc0392b,'S'),
      ...buildHouse(-20,-40,6,6,3.5,0xd5c4a0,0x2980b9,'S'),
      ...buildHouse(20,-40,6,6,3.5,0xcdb98a,0x27ae60,'S'),
      ...buildHouse(50,-40,6,6,3.5,0xe8d5b7,0xf1c40f,'S'),
      ...buildHouse(-50,40,6,6,3.5,0xd5c4a0,0x8e44ad,'N'),
      ...buildHouse(-20,40,6,6,3.5,0xe8d5b7,0xe67e22,'N'),
      ...buildHouse(20,40,6,6,3.5,0xcdb98a,0x1abc9c,'N'),
      ...buildHouse(50,40,6,6,3.5,0xe8d5b7,0xe74c3c,'N'),
      ...buildTower(0,0,8,8,5,0xa0a8b0,0x2c3e50),
      ob(-43,-30,1,1.2,1,true,0x555555), ob(-13,-30,1,1.2,1,true,0x555555),
      ob(28,-30,1,1.2,1,true,0x555555), ob(58,-30,1,1.2,1,true,0x555555),
      ob(-43,30,1,1.2,1,true,0x555555), ob(-13,30,1,1.2,1,true,0x555555),
      ob(28,30,1,1.2,1,true,0x555555), ob(58,30,1,1.2,1,true,0x555555),
      ...buildCar(-35,0,0xe74c3c,0), ...buildCar(35,0,0x3498db,0),
      ...buildCar(0,-20,0x27ae60,Math.PI/2), ...buildCar(0,20,0xf1c40f,Math.PI/2),
      ob(-30,-10,0.2,3,0.2,false,0x2c3e50,'cyl'), ob(30,10,0.2,3,0.2,false,0x2c3e50,'cyl'),
      ob(-15,-10,1.5,1.5,1.5,true,0xe8d5b7), ob(15,10,1.5,1.5,1.5,true,0xe8d5b7),
      ob(-35,-40,0.3,1.5,4,false,0x8a92a0,'wall'), ob(35,-40,0.3,1.5,4,false,0x8a92a0,'wall'),
      ob(-35,40,0.3,1.5,4,false,0x8a92a0,'wall'), ob(35,40,0.3,1.5,4,false,0x8a92a0,'wall'),
      ob(0,-10,2,0.4,2,true,0x3498db,'water',0,true),
    ],
    spawns: [[0,-60],[0,60],[-60,0],[60,0],[-24,-24],[24,24]] },
  {
    id: 'escuela', name: 'Escuela', theme: 'Escuela 2 pisos', ground: 0xd5d8de, fog: 0xe0e3e8, accent: 0xa0a8b0,
    obstacles: [
      // ============ OUTER WALLS (70×70, h=8, 2 stories) ============
      // South wall with door gap (2 wide) at center — main entrance
      ob(-18, 35, 34, 8, 0.3, false, 0xe8e0d0, 'wall'),
      ob(18, 35, 34, 8, 0.3, false, 0xe8e0d0, 'wall'),
      // Door lintel above entrance (no collision, decorative)
      ob(0, 35, 2, 5.8, 0.3, false, 0xe8e0d0, 'wall', 0, true, 2.2),
      // North, East, West walls (full height)
      ob(0, -35, 70, 8, 0.3, false, 0xe8e0d0, 'wall'),
      ob(35, 0, 0.3, 8, 70, false, 0xe8e0d0, 'wall'),
      ob(-35, 0, 0.3, 8, 70, false, 0xe8e0d0, 'wall'),
      // Accent stripe near top of exterior walls (decorative band, no collide)
      ob(0, 35, 70, 0.3, 0.3, false, 0xc0392b, 'wall', 0, true, 6.5),
      ob(0, -35, 70, 0.3, 0.3, false, 0xc0392b, 'wall', 0, true, 6.5),
      ob(35, 0, 0.3, 0.3, 70, false, 0xc0392b, 'wall', 0, true, 6.5),
      ob(-35, 0, 0.3, 0.3, 70, false, 0xc0392b, 'wall', 0, true, 6.5),

      // ============ INTERIOR CLASSROOM WALLS (h=4, ground floor) ============
      // 4 classrooms in corners (NW, NE, SW, SE), each 30×30
      // Cross-shaped hallway: NS (x∈[-5,5]) and EW (z∈[-5,5])
      // Each classroom has 2 door gaps (2 wide) facing the hallways
      // NW classroom (x∈[-35,-5], z∈[-35,-5]): east + south walls
      ob(-5, -28, 0.3, 4, 14, false, 0xcdb98a, 'wall'),
      ob(-5, -12, 0.3, 4, 14, false, 0xcdb98a, 'wall'),
      ob(-28, -5, 14, 4, 0.3, false, 0xcdb98a, 'wall'),
      ob(-12, -5, 14, 4, 0.3, false, 0xcdb98a, 'wall'),
      // NE classroom (x∈[5,35], z∈[-35,-5]): west + south walls
      ob(5, -28, 0.3, 4, 14, false, 0xcdb98a, 'wall'),
      ob(5, -12, 0.3, 4, 14, false, 0xcdb98a, 'wall'),
      ob(12, -5, 14, 4, 0.3, false, 0xcdb98a, 'wall'),
      ob(28, -5, 14, 4, 0.3, false, 0xcdb98a, 'wall'),
      // SW classroom (x∈[-35,-5], z∈[5,35]): east + north walls
      ob(-5, 12, 0.3, 4, 14, false, 0xcdb98a, 'wall'),
      ob(-5, 28, 0.3, 4, 14, false, 0xcdb98a, 'wall'),
      ob(-28, 5, 14, 4, 0.3, false, 0xcdb98a, 'wall'),
      ob(-12, 5, 14, 4, 0.3, false, 0xcdb98a, 'wall'),
      // SE classroom (x∈[5,35], z∈[5,35]): west + north walls
      ob(5, 12, 0.3, 4, 14, false, 0xcdb98a, 'wall'),
      ob(5, 28, 0.3, 4, 14, false, 0xcdb98a, 'wall'),
      ob(12, 5, 14, 4, 0.3, false, 0xcdb98a, 'wall'),
      ob(28, 5, 14, 4, 0.3, false, 0xcdb98a, 'wall'),

      // ============ CLASSROOM FURNITURE ============
      // --- NW classroom (center -20, -20) ---
      ob(-20, -34.5, 5, 2, 0.2, false, 0x1a1a1a, 'wall', 0, false, 1),     // pizarrón on N wall
      ob(-20, -31, 2, 1, 1, true, 0x8b4513, 'box'),                          // escritorio del maestro
      ob(-21, -31, 0.8, 0.5, 0.8, true, 0x5d4037, 'box'),                    // teacher chair
      ...[-26, -20, -14].flatMap(x => [-25, -15].map(z => ob(x, z, 1.5, 0.8, 1, true, 0xe8d5b7, 'box'))),       // 6 pupitres
      ...[-26, -20, -14].flatMap(x => [-23.5, -13.5].map(z => ob(x, z, 0.6, 0.5, 0.6, true, 0x8b4513, 'box'))),  // 6 sillas
      // --- NE classroom (center 20, -20) ---
      ob(20, -34.5, 5, 2, 0.2, false, 0x1a1a1a, 'wall', 0, false, 1),
      ob(20, -31, 2, 1, 1, true, 0x8b4513, 'box'),
      ob(21, -31, 0.8, 0.5, 0.8, true, 0x5d4037, 'box'),
      ...[14, 20, 26].flatMap(x => [-25, -15].map(z => ob(x, z, 1.5, 0.8, 1, true, 0xe8d5b7, 'box'))),
      ...[14, 20, 26].flatMap(x => [-23.5, -13.5].map(z => ob(x, z, 0.6, 0.5, 0.6, true, 0x8b4513, 'box'))),
      // --- SW classroom (center -20, 20) ---
      ob(-20, 34.5, 5, 2, 0.2, false, 0x1a1a1a, 'wall', 0, false, 1),
      ob(-20, 31, 2, 1, 1, true, 0x8b4513, 'box'),
      ob(-21, 31, 0.8, 0.5, 0.8, true, 0x5d4037, 'box'),
      ...[-26, -20, -14].flatMap(x => [25, 15].map(z => ob(x, z, 1.5, 0.8, 1, true, 0xe8d5b7, 'box'))),
      ...[-26, -20, -14].flatMap(x => [23.5, 13.5].map(z => ob(x, z, 0.6, 0.5, 0.6, true, 0x8b4513, 'box'))),
      // --- SE classroom (center 20, 20) ---
      ob(20, 34.5, 5, 2, 0.2, false, 0x1a1a1a, 'wall', 0, false, 1),
      ob(20, 31, 2, 1, 1, true, 0x8b4513, 'box'),
      ob(21, 31, 0.8, 0.5, 0.8, true, 0x5d4037, 'box'),
      ...[14, 20, 26].flatMap(x => [25, 15].map(z => ob(x, z, 1.5, 0.8, 1, true, 0xe8d5b7, 'box'))),
      ...[14, 20, 26].flatMap(x => [23.5, 13.5].map(z => ob(x, z, 0.6, 0.5, 0.6, true, 0x8b4513, 'box'))),

      // ============ LOCKERS along NS hallway walls ============
      ob(-4.5, -32, 0.8, 2.5, 1, true, 0x3498db, 'box'),   // blue
      ob(-4.5, -28, 0.8, 2.5, 1, true, 0xe74c3c, 'box'),   // red
      ob(-4.5, 28, 0.8, 2.5, 1, true, 0x27ae60, 'box'),    // green
      ob(-4.5, 32, 0.8, 2.5, 1, true, 0xf1c40f, 'box'),    // yellow
      ob(4.5, -32, 0.8, 2.5, 1, true, 0x9b59b6, 'box'),    // purple
      ob(4.5, -28, 0.8, 2.5, 1, true, 0xe67e22, 'box'),    // orange
      ob(4.5, 28, 0.8, 2.5, 1, true, 0x1abc9c, 'box'),     // teal
      ob(4.5, 32, 0.8, 2.5, 1, true, 0x3498db, 'box'),     // blue

      // ============ BATHROOMS (small rooms in EW hallway ends) ============
      // East bathroom (x∈[28,35], z∈[-5,5]) — partition walls + sink
      ob(28, -1.5, 0.3, 4, 7, false, 0xcdb98a, 'wall'),    // west wall seg 1 (door gap at z∈[2,5])
      ob(28, 4, 0.3, 4, 2, false, 0xcdb98a, 'wall'),        // west wall seg 2
      ob(31.5, 0, 0.1, 2, 10, false, 0xcdb98a, 'wall'),     // partition wall
      ob(33, -3, 1, 0.5, 0.5, true, 0xb8d4e3, 'box'),       // sink 1
      ob(33, 3, 1, 0.5, 0.5, true, 0xb8d4e3, 'box'),        // sink 2
      // West bathroom (x∈[-35,-28], z∈[-5,5])
      ob(-28, -1.5, 0.3, 4, 7, false, 0xcdb98a, 'wall'),
      ob(-28, 4, 0.3, 4, 2, false, 0xcdb98a, 'wall'),
      ob(-31.5, 0, 0.1, 2, 10, false, 0xcdb98a, 'wall'),
      ob(-33, -3, 1, 0.5, 0.5, true, 0xb8d4e3, 'box'),
      ob(-33, 3, 1, 0.5, 0.5, true, 0xb8d4e3, 'box'),

      // ============ STAIRS TO 2ND FLOOR (in NS hallway, west side) ============
      // 7 steps going N, top at z=6.8, y=4.2 (top of last step)
      ...buildStairs(-3, 11, 7, 'N', 0xd5c4a0),

      // ============ 2ND FLOOR PLATFORM (y=4.2, walkable roof slabs) ============
      // Stairwell gap at x∈[-5,0], z∈[7,12] so stairs aren't covered
      // East half (x∈[0,35], full z)
      ob(17.5, 0, 35, 0.2, 70, true, 0xe8e0d0, 'roof', 0, false, 4.2),
      // West north (x∈[-35,0], z∈[-35,7]) — south edge meets top of stairs
      ob(-17.5, -14, 35, 0.2, 42, true, 0xe8e0d0, 'roof', 0, false, 4.2),
      // West south (x∈[-35,0], z∈[12,35])
      ob(-17.5, 23.5, 35, 0.2, 23, true, 0xe8e0d0, 'roof', 0, false, 4.2),

      // ============ 2ND FLOOR: open plan, areas defined by furniture ============
      // (No interior walls on 2nd floor — bookshelves and tables define areas)

      // ============ 2ND FLOOR: BIBLIOTECA (library, NE area) ============
      ob(15, -32, 0.5, 3, 4, false, 0x8b4513, 'box', 0, false, 4.2),        // bookshelf
      ob(22, -32, 0.5, 3, 4, false, 0x8b4513, 'box', 0, false, 4.2),
      ob(30, -28, 4, 3, 0.5, false, 0x8b4513, 'box', 0, false, 4.2),
      ob(30, -18, 4, 3, 0.5, false, 0x8b4513, 'box', 0, false, 4.2),
      ob(15, -15, 3, 0.8, 1.5, true, 0xe8d5b7, 'box', 0, false, 4.2),       // reading table
      ob(22, -15, 3, 0.8, 1.5, true, 0xe8d5b7, 'box', 0, false, 4.2),
      ob(15, -13, 0.6, 0.5, 0.6, true, 0x8b4513, 'box', 0, false, 5),       // reading chair
      ob(22, -13, 0.6, 0.5, 0.6, true, 0x8b4513, 'box', 0, false, 5),
      ob(22, -34.5, 5, 2, 0.2, false, 0x1a1a1a, 'wall', 0, false, 5),       // library pizarrón

      // ============ 2ND FLOOR: LABORATORIO (SE area) ============
      ob(15, 15, 3, 0.8, 1.5, true, 0xd5c4a0, 'box', 0, false, 4.2),        // lab table
      ob(22, 15, 3, 0.8, 1.5, true, 0xd5c4a0, 'box', 0, false, 4.2),
      ob(15, 25, 3, 0.8, 1.5, true, 0xd5c4a0, 'box', 0, false, 4.2),
      ob(22, 25, 3, 0.8, 1.5, true, 0xd5c4a0, 'box', 0, false, 4.2),
      ob(15, 15, 1, 1, 1, true, 0x95a5a6, 'box', 0, false, 5),              // microscope
      ob(22, 15, 1, 1, 1, true, 0x95a5a6, 'box', 0, false, 5),
      ob(15, 25, 0.8, 0.8, 0.8, true, 0xe74c3c, 'box', 0, false, 5),        // beaker (red)
      ob(22, 25, 0.8, 0.8, 0.8, true, 0x27ae60, 'box', 0, false, 5),        // beaker (green)
      ob(30, 20, 0.5, 3, 4, false, 0x8b4513, 'box', 0, false, 4.2),         // equipment shelf

      // ============ 2ND FLOOR: NW study area ============
      ob(-15, -15, 3, 0.8, 1.5, true, 0xe8d5b7, 'box', 0, false, 4.2),
      ob(-25, -15, 3, 0.8, 1.5, true, 0xe8d5b7, 'box', 0, false, 4.2),
      ob(-15, -25, 3, 0.8, 1.5, true, 0xe8d5b7, 'box', 0, false, 4.2),
      ob(-25, -25, 3, 0.8, 1.5, true, 0xe8d5b7, 'box', 0, false, 4.2),
      // ============ 2ND FLOOR: SW study area ============
      ob(-15, 15, 3, 0.8, 1.5, true, 0xe8d5b7, 'box', 0, false, 4.2),
      ob(-25, 15, 3, 0.8, 1.5, true, 0xe8d5b7, 'box', 0, false, 4.2),
      ob(-15, 25, 3, 0.8, 1.5, true, 0xe8d5b7, 'box', 0, false, 4.2),
      ob(-25, 25, 3, 0.8, 1.5, true, 0xe8d5b7, 'box', 0, false, 4.2),

      // ============ STAIRS TO ROOF (2nd floor → roof, NE area) ============
      // 7 steps going N, starting at y=4.2, top at y=8.4
      ...buildStairs(3, 11, 7, 'N', 0xd5c4a0).map(s => ({ ...s, y: (s.y || 0) + 4.2 })),

      // ============ ROOF (y=8, with stairwell gap at x∈[0,6], z∈[7,12]) ============
      ob(-17.5, 0, 35, 0.3, 70, true, 0xc0392b, 'roof', 0, false, 8),         // west part (x∈[-35,0])
      ob(20.5, 0, 29, 0.3, 70, true, 0xc0392b, 'roof', 0, false, 8),          // east part (x∈[6,35])
      ob(3, -14, 6, 0.3, 42, true, 0xc0392b, 'roof', 0, false, 8),            // north of stairwell (x∈[0,6], z∈[-35,7])
      ob(3, 23.5, 6, 0.3, 23, true, 0xc0392b, 'roof', 0, false, 8),           // south of stairwell (x∈[0,6], z∈[12,35])
      // Roof parapet (low decorative walls around roof edge)
      ob(0, -34.5, 70, 0.6, 0.3, false, 0xa0a8b0, 'wall', 0, false, 8.3),
      ob(0, 34.5, 70, 0.6, 0.3, false, 0xa0a8b0, 'wall', 0, false, 8.3),
      ob(-34.5, 0, 0.3, 0.6, 70, false, 0xa0a8b0, 'wall', 0, false, 8.3),
      ob(34.5, 0, 0.3, 0.6, 70, false, 0xa0a8b0, 'wall', 0, false, 8.3),

      // ============ BASKETBALL COURT (outside, south of school z∈[40,58]) ============
      // Hoops at north and south ends
      ob(0, 42, 0.3, 4, 0.3, false, 0xe74c3c, 'box'),                         // north hoop pole
      ob(0, 42, 1.5, 0.1, 0.8, false, 0xe74c3c, 'box', 0, false, 3.5),        // backboard
      ob(0, 42, 1.2, 0.4, 1.2, true, 0xe67e22, 'cyl', 0, false, 4),           // rim (orange)
      ob(0, 58, 0.3, 4, 0.3, false, 0x3498db, 'box'),                         // south hoop pole
      ob(0, 58, 1.5, 0.1, 0.8, false, 0x3498db, 'box', 0, false, 3.5),
      ob(0, 58, 1.2, 0.4, 1.2, true, 0xe67e22, 'cyl', 0, false, 4),
      // Court boundary lines (low walls, no collide for gameplay)
      ob(-15, 50, 0.3, 0.1, 18, false, 0xf1c40f, 'wall', 0, true),            // west line
      ob(15, 50, 0.3, 0.1, 18, false, 0xf1c40f, 'wall', 0, true),             // east line
      ob(0, 41, 30, 0.1, 0.3, false, 0xf1c40f, 'wall', 0, true),              // north line
      ob(0, 59, 30, 0.1, 0.3, false, 0xf1c40f, 'wall', 0, true),              // south line
      // Center line + circle
      ob(0, 50, 30, 0.1, 0.3, false, 0xf1c40f, 'wall', 0, true),
      ob(0, 50, 4, 0.1, 4, false, 0xf1c40f, 'wall', 0, true),

      // ============ COURTYARD (north of school + sides) ============
      ...buildTree(-50, -50, 1.8), ...buildTree(50, -50, 1.8),
      ...buildTree(-50, 50, 1.5), ...buildTree(50, 50, 1.5),
      ...buildTree(-55, 0, 1.3), ...buildTree(55, 0, 1.3),
      ...buildTree(-50, -20, 1.5), ...buildTree(50, -20, 1.5),
      // Park benches
      ob(-45, -45, 2, 0.5, 0.6, true, 0x7a5230, 'box'),
      ob(45, -45, 2, 0.5, 0.6, true, 0x7a5230, 'box'),
      ob(-45, 45, 2, 0.5, 0.6, true, 0x7a5230, 'box'),
      ob(45, 45, 2, 0.5, 0.6, true, 0x7a5230, 'box'),
      ob(-55, -20, 2, 0.5, 0.6, true, 0x7a5230, 'box'),
      ob(55, -20, 2, 0.5, 0.6, true, 0x7a5230, 'box'),
      // Decorative fountain (north courtyard)
      ob(0, -50, 3, 0.4, 3, true, 0xb8c5d6, 'cyl'),
      ob(0, -50, 2, 0.3, 2, false, 0x3498db, 'water', 0, true, 0.4),

      // ============ TRASH CANS (corners, for climbing to roof) ============
      ob(-32, 32, 1, 1.2, 1, true, 0x555555, 'box'),
      ob(32, 32, 1, 1.2, 1, true, 0x555555, 'box'),
      ob(-32, -32, 1, 1.2, 1, true, 0x555555, 'box'),
      ob(32, -32, 1, 1.2, 1, true, 0x555555, 'box'),
      // Flagpole in front of school
      ob(0, 38, 0.2, 5, 0.2, false, 0xc0c0c0, 'cyl'),
      ob(0, 38, 1.5, 0.05, 1, false, 0xe74c3c, 'box', 0, false, 4.5),
    ],
    spawns: [[0,-60],[0,60],[-60,0],[60,0],[-55,-55],[55,55]],
  },
  { id: 'oficinas', name: 'Oficinas', theme: 'Edificio corporativo 6 pisos', ground: 0xc8ccd0, fog: 0xd0d4d8, accent: 0x9098a0,
    obstacles: ((): MapObstacle[] => {
      const W = 40, D = 40, FH = 4, FLOORS = 6
      const TOT = FH * FLOORS
      const wallT = 0.3, doorW = 2
      const cWall = 0x9098a0, cFloor = 0xb8c0c8, cGlass = 0xb8d4e3, cDesk = 0xe8d5b7, cChair = 0x555555, cPC = 0x2c3e50, cDark = 0x4a4a4a
      const r: MapObstacle[] = []

      // ════════ HELPERS ════════
      // Build a solid floor platform with a hole at (hx, hz) for stairwell
      const holeSize = 8 // 8×8 hole — covers full staircase length + clearance
      const hs = holeSize / 2
      const buildFloor = (y: number, hx: number, hz: number) => {
        const z1 = hz - hs, z2 = hz + hs, x1 = hx - hs, x2 = hx + hs
        const xMin = -W/2 + wallT, xMax = W/2 - wallT, zMin = -D/2 + wallT, zMax = D/2 - wallT
        // North piece (z from zMin to z1, full width)
        if (z1 > zMin) r.push(ob(0, (zMin + z1)/2, xMax - xMin, 0.25, z1 - zMin, true, cFloor, 'roof', 0, false, y))
        // South piece (z from z2 to zMax, full width)
        if (zMax > z2) r.push(ob(0, (z2 + zMax)/2, xMax - xMin, 0.25, zMax - z2, true, cFloor, 'roof', 0, false, y))
        // West piece (z from z1 to z2, x from xMin to x1)
        if (x1 > xMin) r.push(ob((xMin + x1)/2, hz, x1 - xMin, 0.25, z2 - z1, true, cFloor, 'roof', 0, false, y))
        // East piece (z from z1 to z2, x from x2 to xMax)
        if (xMax > x2) r.push(ob((x2 + xMax)/2, hz, xMax - x2, 0.25, z2 - z1, true, cFloor, 'roof', 0, false, y))
      }

      // Build stairs going UP from floor baseY, starting at (sx, sz), direction dir
      // 7 steps × 0.57 = 3.99, then a landing step at exactly floor height (4.0)
      const stepH = 0.57, stepD = 0.7, stepW = 4.0
      const buildStaircase = (sx: number, sz: number, dir: 'N'|'S'|'E'|'W', baseY: number) => {
        for (let s = 0; s < 7; s++) {
          let x = sx, z = sz
          if (dir === 'N') z = sz + s * stepD
          if (dir === 'S') z = sz - s * stepD
          if (dir === 'E') x = sx - s * stepD
          if (dir === 'W') x = sx + s * stepD
          r.push(ob(x, z, stepW, stepH, stepD, true, 0x8a7a5a, 'stair', dir === 'E' || dir === 'W' ? Math.PI/2 : 0, false, baseY + s * stepH))
        }
        // Landing step at exact floor height — connects stairs to upper floor
        let lx = sx, lz = sz
        if (dir === 'N') lz = sz + 7 * stepD
        if (dir === 'S') lz = sz - 7 * stepD
        if (dir === 'E') lx = sx - 7 * stepD
        if (dir === 'W') lx = sx + 7 * stepD
        r.push(ob(lx, lz, stepW, FH - 7 * stepH, stepD, true, 0x8a7a5a, 'stair', dir === 'E' || dir === 'W' ? Math.PI/2 : 0, false, baseY + 7 * stepH))
      }

      // Stair positions per floor (different corners)
      // Floor 0→1: NW corner, going N. Hole on floor 1 at top of stairs
      // Floor 1→2: NE corner, going N. Hole on floor 2 at top
      // Floor 2→3: SE corner, going S. Hole on floor 3 at top
      // Floor 3→4: SW corner, going S. Hole on floor 4 at top
      // Floor 4→5: center-N, going N. Hole on floor 5 at top
      const stairs = [
        { sx: -14, sz: -14, dir: 'N' as const }, // 0→1
        { sx: 14, sz: -14, dir: 'N' as const },  // 1→2
        { sx: 14, sz: 14, dir: 'S' as const },   // 2→3
        { sx: -14, sz: 14, dir: 'S' as const },  // 3→4
        { sx: -14, sz: -14, dir: 'N' as const }, // 4→5
      ]
      // Hole positions on each floor (where stairs from below emerge)
      // Top of stairs going N from (sx,sz): position = (sx, sz + 6*stepD) ≈ (sx, sz+4.2)
      // Top of stairs going S from (sx,sz): position = (sx, sz - 6*stepD) ≈ (sx, sz-4.2)
      const getHolePos = (s: typeof stairs[0]) => {
        const midOffset = 3.5 * stepD
        if (s.dir === 'N') return { hx: s.sx, hz: s.sz + midOffset }
        if (s.dir === 'S') return { hx: s.sx, hz: s.sz - midOffset }
        if (s.dir === 'E') return { hx: s.sx - midOffset, hz: s.sz }
        return { hx: s.sx + midOffset, hz: s.sz }
      }

      // ════════ EXTERIOR WALLS ════════
      r.push(ob(0, -D/2, W, TOT, wallT, false, cWall, 'wall')) // North
      r.push(ob(W/2, 0, wallT, TOT, D, false, cGlass, 'wall')) // East (glass)
      r.push(ob(-W/2, 0, wallT, TOT, D, false, cGlass, 'wall')) // West (glass)
      // South wall: door gap ground floor, solid above
      r.push(ob(-W/4 - doorW/4, D/2, W/2 - doorW/2, FH - 0.1, wallT, false, cWall, 'wall'))
      r.push(ob(W/4 + doorW/4, D/2, W/2 - doorW/2, FH - 0.1, wallT, false, cWall, 'wall'))
      for (let f = 1; f < FLOORS; f++) r.push(ob(0, D/2, W, FH - 0.1, wallT, false, cWall, 'wall', 0, false, f * FH))

      // ════════ FLOOR PLATFORMS (floors 1-5, each with hole for stairs from below) ════════
      for (let f = 1; f < FLOORS; f++) {
        const hp = getHolePos(stairs[f - 1])
        buildFloor(f * FH, hp.hx, hp.hz)
      }

      // ════════ STAIRCASES (connect all floors) ════════
      for (let f = 0; f < FLOORS - 1; f++) {
        const s = stairs[f]
        buildStaircase(s.sx, s.sz, s.dir, f * FH)
      }

      // ════════ PISO 1 (y=0..4): LOBBY ════════
      // All furniture at y=0 (ground floor)
      r.push(ob(0, 12, 6, 1, 1.5, true, cDesk, 'box', 0, false, 0)) // reception desk
      r.push(ob(0, 12.8, 4, 0.3, 0.5, false, cPC, 'box', 0, false, 1)) // PC on desk (y=1, on top of desk h=1)
      r.push(ob(-8, 12, 1, 0.5, 1, true, cChair, 'box', 0, false, 0)) // chairs
      r.push(ob(8, 12, 1, 0.5, 1, true, cChair, 'box', 0, false, 0))
      r.push(ob(-12, 8, 4, 0.8, 1.5, true, 0x8e44ad, 'box', 0, false, 0)) // sofa
      r.push(ob(-12, 11, 2, 0.5, 1, true, cDesk, 'box', 0, false, 0)) // coffee table
      r.push(ob(-16, -12, 1, 1.5, 1, false, 0x27ae60, 'cyl', 0, false, 0)) // plants
      r.push(ob(16, -12, 1, 1.5, 1, false, 0x27ae60, 'cyl', 0, false, 0))
      r.push(ob(0, 17, 3, 1, 1, true, cDark, 'box', 0, false, 0)) // security desk
      r.push(ob(-5, -5, 0.8, 1, 0.8, true, 0x555555, 'box', 0, false, 0)) // trash
      r.push(ob(5, 5, 0.8, 1, 0.8, true, 0x555555, 'box', 0, false, 0))

      // ════════ PISO 2 (y=4..8): OFICINAS ABIERTAS ════════
      // All furniture at y=4 (on top of floor platform at y=4)
      const f2 = FH
      // Desks along north and south walls (away from stair areas at corners)
      for (const [dx, dz] of [[-12, -10], [12, -10], [-12, 10], [12, 10]] as const) {
        r.push(ob(dx, dz, 3, 0.8, 1.5, true, cDesk, 'box', 0, false, f2)) // desk at floor level
        r.push(ob(dx, dz - 0.5, 1.5, 0.4, 0.5, false, cPC, 'box', 0, false, f2 + 0.8)) // monitor on desk
        r.push(ob(dx, dz + 1.5, 1, 0.5, 1, true, cChair, 'box', 0, false, f2)) // chair at floor level
      }
      // Filing cabinets along west wall (away from stairs at x=-14)
      r.push(ob(-18, 0, 1, 2, 1, true, cDark, 'box', 0, false, f2))
      r.push(ob(-18, 5, 1, 2, 1, true, cDark, 'box', 0, false, f2))
      r.push(ob(-18, -5, 1, 2, 1, true, cDark, 'box', 0, false, f2))
      // Water cooler near east wall
      r.push(ob(18, -8, 0.8, 1.5, 0.8, true, 0x3498db, 'box', 0, false, f2))
      // Printer near east wall
      r.push(ob(18, 8, 1.5, 1, 1, true, cDark, 'box', 0, false, f2))

      // ════════ PISO 3 (y=8..12): SALAS DE REUNIONES ════════
      const f3 = 2 * FH
      // Partition walls — AVOID stair areas! Stairs 1→2 emerge at (14, -10.5) and stairs 2→3 start at (14, 14)
      // Only put partition walls in center, away from corners where stairs are
      // Horizontal divider at z=0 (but with gaps at x=±14 for stair clearance)
      r.push(ob(-8, 0, 12, FH - 0.5, wallT, false, cWall, 'wall', 0, false, f3)) // left of center
      r.push(ob(8, 0, 12, FH - 0.5, wallT, false, cWall, 'wall', 0, false, f3)) // right of center
      // Vertical divider at x=0 (with gap at z=±14 for stair clearance)
      r.push(ob(0, -8, wallT, FH - 0.5, 12, false, cWall, 'wall', 0, false, f3)) // top half
      r.push(ob(0, 8, wallT, FH - 0.5, 12, false, cWall, 'wall', 0, false, f3)) // bottom half
      // Meeting tables in 4 quadrants (away from stair corners)
      for (const [tx, tz] of [[-10, -10], [10, -10], [-10, 10], [10, 10]] as const) {
        r.push(ob(tx, tz, 4, 0.8, 2, true, cDesk, 'box', 0, false, f3)) // table at floor level
        r.push(ob(tx, tz - 2.5, 1, 0.5, 1, true, cChair, 'box', 0, false, f3)) // chairs at floor level
        r.push(ob(tx, tz + 2.5, 1, 0.5, 1, true, cChair, 'box', 0, false, f3))
        r.push(ob(tx - 2.5, tz, 1, 0.5, 1, true, cChair, 'box', 0, false, f3))
        r.push(ob(tx + 2.5, tz, 1, 0.5, 1, true, cChair, 'box', 0, false, f3))
        r.push(ob(tx, tz, 1, 0.3, 1, false, cDark, 'box', 0, false, f3 + 2.8)) // projector (hanging from ceiling)
      }

      // ════════ PISO 4 (y=12..16): CUBÍCULOS ════════
      const f4 = 3 * FH
      // Cubicles in center area only (avoid stair corners at ±14)
      for (let cx = -8; cx <= 8; cx += 8) {
        for (let cz = -8; cz <= 8; cz += 8) {
          r.push(ob(cx + 1.5, cz, 0.15, 1.5, 2.5, false, 0xc8ccd0, 'wall', 0, false, f4)) // partition at floor level
          r.push(ob(cx, cz + 1.5, 2.5, 1.5, 0.15, false, 0xc8ccd0, 'wall', 0, false, f4)) // partition at floor level
          r.push(ob(cx, cz, 2, 0.8, 1, true, cDesk, 'box', 0, false, f4)) // desk at floor level
          r.push(ob(cx, cz - 0.4, 1, 0.3, 0.4, false, cPC, 'box', 0, false, f4 + 0.8)) // monitor on desk
          r.push(ob(cx, cz + 1.5, 0.8, 0.5, 0.8, true, cChair, 'box', 0, false, f4)) // chair at floor level
        }
      }

      // ════════ PISO 5 (y=16..20): SERVIDORES ════════
      const f5 = 4 * FH
      // Server racks in center rows (avoid stair corners)
      for (const [sx, sz] of [[-10, -8], [0, -8], [10, -8], [-10, 8], [0, 8], [10, 8]] as const) {
        r.push(ob(sx, sz, 1.5, 3, 1, true, 0x2c3e50, 'box', 0, false, f5)) // rack at floor level
        r.push(ob(sx, sz, 1.2, 2.8, 0.8, false, 0x1a1a1a, 'box', 0, false, f5 + 0.1)) // rack interior
        r.push(ob(sx, sz, 1.3, 0.1, 0.9, false, 0x27ae60, 'box', 0, false, f5 + 1)) // green LED
        r.push(ob(sx, sz, 1.3, 0.1, 0.9, false, 0xe74c3c, 'box', 0, false, f5 + 1.5)) // red LED
      }
      // Cooling units near walls (away from stairs)
      r.push(ob(-18, 14, 2, 1.5, 2, true, 0x95a5a6, 'box', 0, false, f5))
      r.push(ob(18, 14, 2, 1.5, 2, true, 0x95a5a6, 'box', 0, false, f5))
      // UPS batteries near walls
      r.push(ob(-18, -14, 2, 1.5, 1, true, cDark, 'box', 0, false, f5))
      r.push(ob(18, -14, 2, 1.5, 1, true, cDark, 'box', 0, false, f5))

      // ════════ PISO 6 (y=20..24): TERRAZA ════════
      const f6 = 5 * FH
      // Railings around perimeter
      r.push(ob(0, D/2 - 1, W - 2, 1.2, 0.15, false, cWall, 'wall', 0, false, f6))
      r.push(ob(0, -D/2 + 1, W - 2, 1.2, 0.15, false, cWall, 'wall', 0, false, f6))
      r.push(ob(W/2 - 1, 0, 0.15, 1.2, D - 2, false, cWall, 'wall', 0, false, f6))
      r.push(ob(-W/2 + 1, 0, 0.15, 1.2, D - 2, false, cWall, 'wall', 0, false, f6))
      // Jacuzzi (water)
      r.push(ob(-10, -10, 4, 0.8, 4, false, 0x2980b9, 'water', 0, true, f6))
      // Bar counter
      r.push(ob(10, -10, 5, 1.2, 1.5, true, cDesk, 'box', 0, false, f6))
      r.push(ob(12, -10, 0.5, 0.3, 0.5, false, 0x27ae60, 'box', 0, false, f6 + 1.2)) // bottle on bar
      r.push(ob(8, -10, 0.5, 0.3, 0.5, false, 0xe74c3c, 'box', 0, false, f6 + 1.2)) // bottle on bar
      // Lounge chairs
      r.push(ob(10, 10, 1.5, 0.6, 2, true, 0xe67e22, 'box', 0, false, f6))
      r.push(ob(13, 10, 1.5, 0.6, 2, true, 0xe67e22, 'box', 0, false, f6))
      r.push(ob(10, 13, 1.5, 0.6, 2, true, 0xe67e22, 'box', 0, false, f6))
      // Plants
      r.push(ob(-15, 15, 1.5, 2, 1.5, false, 0x27ae60, 'cyl', 0, false, f6))
      r.push(ob(15, 15, 1.5, 2, 1.5, false, 0x27ae60, 'cyl', 0, false, f6))
      // Table with umbrella
      r.push(ob(0, 5, 2, 0.8, 2, true, cDesk, 'box', 0, false, f6))
      r.push(ob(0, 5, 0.2, 2.5, 0.2, false, 0xe74c3c, 'box', 0, false, f6 + 0.8))
      r.push(ob(0, 5, 3, 0.1, 3, false, 0xe74c3c, 'box', 0, true, f6 + 3))
      // BBQ grill
      r.push(ob(-12, 8, 1.5, 1, 1.5, true, 0x2c3e50, 'box', 0, false, f6))
      r.push(ob(-12, 8, 1, 0.2, 1, false, 0xe74c3c, 'box', 0, false, f6 + 1)) // hot coals

      // ════════ ROOF ════════
      r.push(ob(0, 0, W + 0.6, 0.3, D + 0.6, true, 0x2c3e50, 'roof', 0, false, TOT))

      // ════════ EXTERIOR ════════
      r.push(...buildCar(-30, -40, 0xe74c3c, 0))
      r.push(...buildCar(-20, -40, 0x3498db, 0))
      r.push(...buildCar(20, -40, 0x27ae60, 0))
      r.push(...buildCar(30, -40, 0xf1c40f, 0))
      r.push(...buildCar(-30, 40, 0xe67e22, 0))
      r.push(...buildCar(30, 40, 0x9b59b6, 0))
      r.push(ob(-40, 0, 0.3, 5, 0.3, false, 0x2c3e50, 'cyl'))
      r.push(ob(40, 0, 0.3, 5, 0.3, false, 0x2c3e50, 'cyl'))
      r.push(...buildTree(-50, -50, 1.5))
      r.push(...buildTree(50, -50, 1.5))
      r.push(...buildTree(-50, 50, 1.5))
      r.push(...buildTree(50, 50, 1.5))
      r.push(ob(-3, 22, 0.8, 1.2, 0.8, true, 0x555555, 'box'))
      r.push(ob(3, 22, 0.8, 1.2, 0.8, true, 0x555555, 'box'))

      return r
    })(),
    spawns: [[0,-60],[0,60],[-60,0],[60,0],[-55,-55],[55,55]],
  },
  {
    id: 'bosque', name: 'Bosque', theme: 'Bosque con río y árboles escalables', ground: 0x3a6a2a, fog: 0x5a8a4a, accent: 0x2a4a1a,
    waterLevel: 0.3,
    obstacles: ((): MapObstacle[] => {
      const r: MapObstacle[] = []
      const cTrunk = 0x5d3a1a, cLeaf = 0x2d6a2d, cLeaf2 = 0x3a7a3a, cRock = 0x888888, cRockD = 0x666666, cWater = 0x2a6aaa, cWood = 0x7a5230, cBush = 0x1a5a1a

      // ════════ RÍO QUE ATRAVIESA TODO EL MAPA (diagonal NE→SW) ════════
      // River as a series of water segments going diagonally across the map
      for (let i = -5; i <= 5; i++) {
        r.push(ob(i * 12, i * 12, 7, 0.3, 7, false, cWater, 'water', Math.PI/4, true))
      }

      // ════════ PUENTES sobre el río ════════
      // Bridge 1 (centro)
      r.push(ob(0, 0, 10, 0.5, 3, true, cWood, 'box', Math.PI/4))
      // Bridge 2 (NE)
      r.push(ob(24, 24, 10, 0.5, 3, true, cWood, 'box', Math.PI/4))
      // Bridge 3 (SW)
      r.push(ob(-24, -24, 10, 0.5, 3, true, cWood, 'box', Math.PI/4))
      // Bridge railings
      r.push(ob(0, 0, 10, 0.6, 0.15, false, 0x4a3210, 'wall', Math.PI/4, true, 0.5))
      r.push(ob(24, 24, 10, 0.6, 0.15, false, 0x4a3210, 'wall', Math.PI/4, true, 0.5))
      r.push(ob(-24, -24, 10, 0.6, 0.15, false, 0x4a3210, 'wall', Math.PI/4, true, 0.5))

      // ════════ ÁRBOLES GRANDES ESCALABLES (tronco grueso + ramas + copa) ════════
      // Cada árbol grande tiene: tronco (escalable), ramas bajas (cajas para saltar), copa
      const buildBigTree = (x: number, z: number, scale: number = 1) => {
        const tH = 5 * scale, tR = 0.6 * scale
        // Tronco principal (escalable)
        r.push(ob(x, z, tR * 2, tH, tR * 2, true, cTrunk, 'cyl'))
        // Ramas bajas (cajas escalables a diferentes alturas para saltar)
        r.push(ob(x + 1.5 * scale, z, 2 * scale, 0.4, 0.5, true, cTrunk, 'box', 0, false, tH * 0.4))
        r.push(ob(x - 1.5 * scale, z, 2 * scale, 0.4, 0.5, true, cTrunk, 'box', 0, false, tH * 0.5))
        r.push(ob(x, z + 1.5 * scale, 0.5, 0.4, 2 * scale, true, cTrunk, 'box', 0, false, tH * 0.6))
        // Copa (foliage en lo alto)
        r.push(ob(x, z, 4 * scale, 2.5 * scale, 4 * scale, true, cLeaf, 'box', 0, false, tH))
        r.push(ob(x, z, 3 * scale, 2 * scale, 3 * scale, true, cLeaf2, 'box', 0, false, tH + 1.5 * scale))
      }
      // 8 árboles grandes en posiciones alejadas del río
      buildBigTree(-35, -35, 1.3)  // SW
      buildBigTree(35, -35, 1.2)   // SE
      buildBigTree(-35, 35, 1.4)   // NW
      buildBigTree(35, 35, 1.1)    // NE
      buildBigTree(-50, 0, 1.2)    // W
      buildBigTree(50, 0, 1.3)     // E
      buildBigTree(0, -50, 1.4)    // N
      buildBigTree(0, 50, 1.2)     // S

      // ════════ ÁRBOLES PEQUEÑOS (no escalables, solo decoración/cobertura) ════════
      const buildSmallTree = (x: number, z: number) => {
        r.push(ob(x, z, 0.3, 3, 0.3, false, cTrunk, 'cyl'))
        r.push(ob(x, z, 2, 1.5, 2, false, cLeaf, 'box', 0, false, 2.5))
      }
      // 12 árboles pequeños esparcidos (lejos del río diagonal)
      buildSmallTree(-20, -40); buildSmallTree(-40, -20); buildSmallTree(-15, -50)
      buildSmallTree(20, -40); buildSmallTree(40, -20); buildSmallTree(15, -50)
      buildSmallTree(-20, 40); buildSmallTree(-40, 20); buildSmallTree(-15, 50)
      buildSmallTree(20, 40); buildSmallTree(40, 20); buildSmallTree(15, 50)

      // ════════ PIEDRAS GRANDES (forma de rocas, escalables) ════════
      // Cada piedra es un cilindro achatado (más ancho que alto)
      const buildRock = (x: number, z: number, size: number = 1) => {
        r.push(ob(x, z, 3 * size, 2 * size, 3 * size, true, cRock, 'cyl'))
        r.push(ob(x + 1 * size, z + 0.5 * size, 1.5 * size, 1.2 * size, 1.5 * size, true, cRockD, 'cyl', 0, false, 1 * size))
      }
      buildRock(-30, 10, 1.2)
      buildRock(30, -10, 1.0)
      buildRock(-10, 30, 1.1)
      buildRock(10, -30, 1.3)
      buildRock(-45, -10, 0.9)
      buildRock(45, 10, 1.1)
      buildRock(-25, 45, 1.0)
      buildRock(25, -45, 1.2)

      // ════════ PIEDRAS PEQUEÑAS (para saltar y cobertura) ════════
      for (const [px, pz] of [[-15, -15], [15, 15], [-15, 15], [15, -15], [-25, 5], [25, -5], [5, 25], [-5, -25], [-35, 20], [35, -20], [20, 35], [-20, -35]] as const) {
        r.push(ob(px, pz, 1.2, 1, 1.2, true, cRock, 'cyl'))
      }

      // ════════ MATORRALES (para esconderse, no escalables, baja altura) ════════
      // Grupos de matorrales densos donde el jugador puede agacharse/esconderse
      const buildBushCluster = (cx: number, cz: number) => {
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2
          const bx = cx + Math.cos(a) * 2, bz = cz + Math.sin(a) * 2
          r.push(ob(bx, bz, 2.5, 1.2, 2.5, false, cBush, 'box'))
        }
        r.push(ob(cx, cz, 3, 1.5, 3, false, cBush, 'box')) // centro más alto
      }
      buildBushCluster(-30, 0)
      buildBushCluster(30, 0)
      buildBushCluster(0, -30)
      buildBushCluster(0, 30)
      buildBushCluster(-40, 40)
      buildBushCluster(40, -40)

      // ════════ TRONCOS CAÍDOS (escalables, cobertura baja) ════════
      r.push(ob(-20, 10, 5, 1, 1, true, cTrunk, 'box', 0.3))
      r.push(ob(20, -10, 5, 1, 1, true, cTrunk, 'box', -0.2))
      r.push(ob(-10, -20, 1, 1, 5, true, cTrunk, 'box', 0.1))
      r.push(ob(10, 20, 1, 1, 5, true, cTrunk, 'box', -0.3))
      r.push(ob(40, 30, 5, 1, 1, true, 0x4a3210, 'box', 0.2))
      r.push(ob(-40, -30, 5, 1, 1, true, 0x4a3210, 'box', -0.1))

      // ════════ CABAÑA (entrable, NE) ════════
      r.push(...buildHouse(45, -45, 8, 8, 4, 0x8b4513, 0xc0392b, 'S'))
      r.push(ob(43, -48, 1.5, 0.5, 2, true, 0x4a3210, 'box')) // bed
      r.push(ob(48, -43, 2, 0.6, 1, true, 0xe8d5b7, 'box'))   // table

      // ════════ TORRE DE VIGILANCIA (SW, 3 pisos) ════════
      r.push(...buildTower(-45, 45, 6, 6, 3, 0x8b4513, 0x2c3e50))

      // ════════ FOGATA ════════
      r.push(ob(-15, 15, 1, 0.5, 1, true, 0xe67e22, 'box')) // fire
      r.push(ob(-15, 15, 0.6, 0.3, 0.6, true, 0xf1c40f, 'box', 0, false, 0.5)) // flame
      r.push(ob(-17, 15, 0.6, 0.5, 0.6, true, cRock, 'box')) // rocks around fire
      r.push(ob(-13, 15, 0.6, 0.5, 0.6, true, cRockD, 'box'))
      r.push(ob(-15, 13, 0.6, 0.5, 0.6, true, cRock, 'box'))
      r.push(ob(-15, 17, 0.6, 0.5, 0.6, true, cRockD, 'box'))

      // ════════ HONGOS (decoración) ════════
      for (const [mx, mz] of [[-12, 8], [12, -8], [8, 12], [-8, -12], [22, 0], [-22, 0]] as const) {
        r.push(ob(mx, mz, 0.5, 0.3, 0.5, true, 0xe74c3c, 'cyl'))
      }

      return r
    })(),
    spawns: [[0,-60],[0,60],[-60,0],[60,0],[-55,-55],[55,55]],
  },
  { id: 'paisaje', name: 'Paisaje', theme: 'Río y montañas', ground: 0x5a8a4a, fog: 0x7aa85a, accent: 0x4a6a3a, waterLevel: 0.3,
    obstacles: [
      ob(-35,-25,4,4,4,true,0x95a5a6,'box'), ob(35,25,4,4,4,true,0x7f8c8d,'box'),
      ob(35,-25,4,4,4,true,0x95a5a6,'box'), ob(-35,25,4,4,4,true,0x7f8c8d,'box'),
      ob(-25,-18,1.5,1.5,1.5,true,0x95a5a6,'box'), ob(25,18,1.5,1.5,1.5,true,0x7f8c8d,'box'),
      ob(25,-18,1.5,1.5,1.5,true,0x95a5a6,'box'), ob(-25,18,1.5,1.5,1.5,true,0x7f8c8d,'box'),
      ob(0,0,6,0.3,24,false,0x3498db,'water',0,true),
      ob(-9,0,0.5,1,24,false,0x8a7a5a,'wall'), ob(9,0,0.5,1,24,false,0x8a7a5a,'wall'),
      ...buildTree(-45,-35,1.3), ...buildTree(45,35,1.3),
      ...buildTree(-45,35,1.3), ...buildTree(45,-35,1.3),
      ob(0,0,3,0.5,8,true,0x7a5230,'box'),
      ob(0,-50,6,2,4,true,0x6a9a5a,'box'), ob(0,50,6,2,4,true,0x6a9a5a,'box'),
      ob(-50,0,3,6,3,true,0x95a5a6,'box'),
      ...buildStairs(-43,0,6,'W',0x7f8c8d),
    ],
    spawns: [[0,-60],[0,60],[-60,0],[60,0]] },
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
  type: 'ammo' | 'heal' | 'shield' | 'weapon'
  pos: [number, number, number]
  born: number
  weaponId?: string  // for type='weapon': which weapon this pickup grants
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
      items: r.items.map(it => ({ id: it.id, type: it.type, pos: it.pos, weaponId: it.weaponId })),
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
function spawnItem(r: Room, type: 'ammo'|'heal'|'shield'|'weapon', pos?: [number,number,number], weaponId?: string) {
  const map = getMap(r.mapId)
  const p: [number, number, number] = pos ?? (() => {
    const s = map.spawns[Math.floor(Math.random() * map.spawns.length)]
    return [s[0] + (Math.random()-0.5)*10, 1, s[1] + (Math.random()-0.5)*10]
  })()
  const it: Item = { id: genId('item_'), type, pos: p, born: Date.now(), weaponId: type === 'weapon' ? weaponId : undefined }
  r.items.push(it)
  io.to(r.id).emit('items:state', { items: r.items.map(i => ({ id: i.id, type: i.type, pos: i.pos, weaponId: i.weaponId })) })
}

function dropItemOnMobKill(r: Room, pos: [number,number,number]) {
  const roll = Math.random()
  let type: 'ammo'|'heal'|'shield'
  if (roll < 0.5) type = 'ammo'
  else if (roll < 0.8) type = 'heal'
  else type = 'shield'
  spawnItem(r, type, [pos[0], 1, pos[2]])
}

// Rare weapon drop from mobs: 5% total — split 3% sniper, 2% rocket
function maybeDropRareWeapon(r: Room, pos: [number,number,number]) {
  const roll = Math.random()
  if (roll < 0.02) {
    spawnItem(r, 'weapon', [pos[0], 1, pos[2]], 'rocket')
  } else if (roll < 0.05) {
    spawnItem(r, 'weapon', [pos[0], 1, pos[2]], 'sniper')
  }
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
    let grantedWeapon: string | undefined = undefined
    if (it.type === 'ammo') {
      // give a random non-rifle-pool weapon + ammo (smg/rifle/shotgun)
      // rare weapons (sniper/rocket) are NOT obtainable from ammo pickups
      const pool = AMMO_PICKUP_POOL
      const w = pool[Math.floor(Math.random()*pool.length)]
      p.weapon = w
      p.ammo = WEAPONS[w].magazine
      p.reloading = false
      grantedWeapon = w
      applied = true
    } else if (it.type === 'weapon') {
      // gives a specific weapon (set at drop time — e.g. sniper, rocket, or a player's dropped weapon)
      const wid = it.weaponId && WEAPONS[it.weaponId] ? it.weaponId : 'sniper'
      p.weapon = wid
      p.ammo = WEAPONS[wid].magazine
      p.reloading = false
      grantedWeapon = wid
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
      io.to(room.id).emit('items:state', { items: room.items.map(i => ({ id: i.id, type: i.type, pos: i.pos, weaponId: i.weaponId })) })
      io.to(room.id).emit('item:picked', { id: it.id, by: p.id, type: it.type, weaponId: it.type === 'ammo' ? grantedWeapon : it.weaponId })
      socket.emit('player:ammo', { weapon: p.weapon, ammo: p.ammo })
      socket.emit('player:reloadDone', { weapon: p.weapon, ammo: p.ammo })
      // broadcast updated weapon + ammo to other players in the room (so they see the new gun)
      socket.to(room.id).emit('player:state', { id: p.id, pos: p.pos, yaw: p.yaw, pitch: p.pitch, weapon: p.weapon, ammo: p.ammo, state: p.state, shield: p.shield })
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
      items: room.items.map(i => ({ id: i.id, type: i.type, pos: i.pos, weaponId: i.weaponId })),
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
    items: room.items.map(i => ({ id: i.id, type: i.type, pos: i.pos, weaponId: i.weaponId })),
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
  // capture streak BEFORE resetting it — used for the "die on a streak >= 5" weapon drop
  const streakAtDeath = victim.streak
  // also capture the victim's weapon before respawn resets it to pistol
  const weaponAtDeath = victim.weapon
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
  // When a player dies on a streak >= 5, they drop their current weapon as an item
  // (works in any mode — the dropped weapon is a 'weapon' pickup anyone can grab)
  if (streakAtDeath >= 5 && weaponAtDeath && weaponAtDeath !== 'pistol' && WEAPONS[weaponAtDeath]) {
    spawnItem(room, 'weapon', [victim.pos[0], 1, victim.pos[2]], weaponAtDeath)
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
  // regular item drop (always — ammo/heal/shield)
  dropItemOnMobKill(room, mob.pos)
  // 5% rare weapon drop (3% sniper + 2% rocket) — only in PvE modes where mobs spawn
  if (isPvEMode(room.mode)) maybeDropRareWeapon(room, mob.pos)
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
      io.to(room.id).emit('items:state', { items: room.items.map(i => ({ id: i.id, type: i.type, pos: i.pos, weaponId: i.weaponId })) })
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
