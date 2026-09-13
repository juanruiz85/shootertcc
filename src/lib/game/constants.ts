import type { Skin, Weapon } from './types'

export const SKINS: Skin[] = [
  { id: 'red',    name: 'Rojo',    color: '#e74c3c', accent: '#a93226' },
  { id: 'blue',   name: 'Azul',    color: '#3498db', accent: '#21618c' },
  { id: 'green',  name: 'Verde',   color: '#27ae60', accent: '#196f3d' },
  { id: 'orange', name: 'Naranja', color: '#e67e22', accent: '#b9770e' },
  { id: 'purple', name: 'Morado',  color: '#9b59b6', accent: '#6c3483' },
  { id: 'teal',   name: 'Cian',    color: '#1abc9c', accent: '#117864' },
  { id: 'pink',   name: 'Rosa',    color: '#e84393', accent: '#a72165' },
  { id: 'yellow', name: 'Amarillo',color: '#f1c40f', accent: '#b7950b' },
]

export const WEAPONS: Record<string, Weapon> = {
  pistol:  { id: 'pistol',  name: 'Pistola',        damage: 18,  fireRate: 330,  magazine: 12, reload: 1200, spread: 0.012, auto: false, range: 80,  pellets: 1 },
  smg:     { id: 'smg',     name: 'SMG',            damage: 12,  fireRate: 90,   magazine: 30, reload: 1500, spread: 0.035, auto: true,  range: 60,  pellets: 1 },
  rifle:   { id: 'rifle',   name: 'Rifle',          damage: 26,  fireRate: 170,  magazine: 20, reload: 1800, spread: 0.018, auto: true,  range: 95,  pellets: 1 },
  shotgun: { id: 'shotgun', name: 'Escopeta',       damage: 11,  fireRate: 720,  magazine: 6,  reload: 2100, spread: 0.13,  auto: false, range: 32,  pellets: 7 },
  sniper:  { id: 'sniper',  name: 'Francotirador',  damage: 80,  fireRate: 1500, magazine: 5,  reload: 3000, spread: 0.001, auto: false, range: 150, pellets: 1 },
  rocket:  { id: 'rocket',  name: 'Lanzacohetes',   damage: 120, fireRate: 2500, magazine: 1,  reload: 5000, spread: 0.02,  auto: false, range: 60,  pellets: 1 },
}

export const WEAPON_ORDER = ['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'rocket']

// weapons obtainable only from rare drops (not from 'ammo' pickups)
export const RARE_WEAPONS = ['sniper', 'rocket']
// weapons that can be granted by an 'ammo' pickup (random switch)
export const AMMO_PICKUP_POOL = ['smg', 'rifle', 'shotgun']

export const ARENA_SIZE = 160
export const PLAYER_MAX_HP = 100
export const PLAYER_MAX_SHIELD = 50
export const MOB_MAX_HP = 60

export type GameMode = '1v1' | '2v2' | 'team' | 'ffa' | 'coop' | 'mixed'
export type Team = 'blue' | 'red' | 'none'

export const TEAMS: Record<Team, { id: Team; name: string; color: string; accent: string }> = {
  blue:  { id: 'blue',  name: 'Azul',  color: '#3498db', accent: '#21618c' },
  red:   { id: 'red',   name: 'Rojo',  color: '#e74c3c', accent: '#a93226' },
  none:  { id: 'none',  name: '—',     color: '#5d6d7e', accent: '#2c3e50' },
}

/* ============================ ITEMS ============================ */
export type ItemType = 'ammo' | 'heal' | 'shield' | 'weapon'
export interface ItemDef { id: ItemType; name: string; color: string; icon: string }
export const ITEMS: Record<ItemType, ItemDef> = {
  ammo:   { id: 'ammo',   name: 'Cartucho',     color: '#f1c40f', icon: 'ammo' },
  heal:   { id: 'heal',   name: 'Cruz',         color: '#e74c3c', icon: 'heal' },
  shield: { id: 'shield', name: 'Bebida',       color: '#1abc9c', icon: 'shield' },
  weapon: { id: 'weapon', name: 'Arma especial', color: '#9b59b6', icon: 'weapon' },
}

/* ============================ KILLSTREAKS ============================ */
export interface KillstreakDef { id: string; name: string; streak: number; desc: string; icon: string }
export const KILLSTREAKS: KillstreakDef[] = [
  { id: 'drone',  name: 'Dron',     streak: 3,  desc: 'Dron aliado que ataca enemigos',   icon: 'drone' },
  { id: 'bomb',   name: 'Bomba',    streak: 5,  desc: 'Bombardeo de zona',                 icon: 'bomb' },
  { id: 'aura',   name: 'Ráfaga',   streak: 7,  desc: 'Velocidad + recarga instantánea',   icon: 'aura' },
]
export function streakAt(streak: number): KillstreakDef | null {
  let best: KillstreakDef | null = null
  for (const k of KILLSTREAKS) if (streak >= k.streak && (!best || k.streak > best.streak)) best = k
  return best
}

/* ============================ MAPS ============================ */
export interface MapObstacle {
  x: number; z: number; w: number; h: number; d: number
  climbable: boolean
  color: number
  kind: 'box' | 'cyl' | 'ramp' | 'wall' | 'stair' | 'water' | 'roof'
  rotation?: number  // y-rotation in radians
  noCollide?: boolean  // if true, no collision (for roofs you can stand on via stairs)
  y?: number  // vertical offset from ground (default 0 = on the floor)
}
export interface GameMap {
  id: string
  name: string
  theme: string
  ground: number      // floor color
  fog: number         // fog color
  accent: number      // wall/trim color
  obstacles: MapObstacle[]
  spawns: [number, number][]  // x,z
  waterLevel?: number  // y-height of water plane (optional)
}

const G_PAPER = 0xf5f1e8
const G_SAND  = 0xf0e6d2
const G_GRASS = 0xeaf3e0
const G_STONE = 0xe8e4df
const G_SNOW  = 0xf7fafc
const G_LAVA  = 0xf6e3d8

const C_WOOD = 0xe8d5b7
const C_STONE = 0xd5c4a0
const C_DARK = 0xcdb98a
const C_PILLAR = 0xb8a47a
const C_RED = 0xe0a3a0
const C_BLUE = 0xa3c8e0

// helper to build obstacle
const ob = (x: number, z: number, w: number, h: number, d: number, climbable = true, color = C_WOOD, kind: 'box'|'cyl'|'ramp'|'wall'|'stair'|'water'|'roof' = 'box', rotation = 0, noCollide = false, y = 0): MapObstacle => ({ x, z, w, h, d, climbable, color, kind, rotation, noCollide, y })

// Build a house: 4 walls with a door gap on one side, windows, optional roof
// Returns array of obstacles (wall segments)
function buildHouse(cx: number, cz: number, w: number, d: number, h: number, color: number, roofColor: number, doorSide: 'N'|'S'|'E'|'W' = 'S'): MapObstacle[] {
  const walls: MapObstacle[] = []
  const wallT = 0.3
  const doorW = 1.5
  const doorH = 2.2  // door height
  const winH = 1.0
  // North wall (z = cz - d/2)
  if (doorSide !== 'N') {
    walls.push(ob(cx, cz - d/2, w, h, wallT, false, color, 'wall'))
  } else {
    walls.push(ob(cx - w/4 - doorW/4, cz - d/2, w/2 - doorW/2, h, wallT, false, color, 'wall'))
    walls.push(ob(cx + w/4 + doorW/4, cz - d/2, w/2 - doorW/2, h, wallT, false, color, 'wall'))
    // window above door (positioned at doorH, no collision)
    walls.push(ob(cx, cz - d/2, doorW, h - doorH, wallT, false, color, 'wall', 0, true, doorH))
  }
  // South wall (z = cz + d/2)
  if (doorSide !== 'S') {
    walls.push(ob(cx, cz + d/2, w, h, wallT, false, color, 'wall'))
  } else {
    walls.push(ob(cx - w/4 - doorW/4, cz + d/2, w/2 - doorW/2, h, wallT, false, color, 'wall'))
    walls.push(ob(cx + w/4 + doorW/4, cz + d/2, w/2 - doorW/2, h, wallT, false, color, 'wall'))
    walls.push(ob(cx, cz + d/2, doorW, h - doorH, wallT, false, color, 'wall', 0, true, doorH))
  }
  // East wall (x = cx + w/2)
  if (doorSide !== 'E') {
    walls.push(ob(cx + w/2, cz, wallT, h, d, false, color, 'wall'))
  } else {
    walls.push(ob(cx + w/2, cz - d/4 - doorW/4, wallT, h, d/2 - doorW/2, false, color, 'wall'))
    walls.push(ob(cx + w/2, cz + d/4 + doorW/4, wallT, h, d/2 - doorW/2, false, color, 'wall'))
  }
  // West wall (x = cx - w/2)
  if (doorSide !== 'W') {
    walls.push(ob(cx - w/2, cz, wallT, h, d, false, color, 'wall'))
  } else {
    walls.push(ob(cx - w/2, cz - d/4 - doorW/4, wallT, h, d/2 - doorW/2, false, color, 'wall'))
    walls.push(ob(cx - w/2, cz + d/4 + doorW/4, wallT, h, d/2 - doorW/2, false, color, 'wall'))
  }
  // Roof at top of walls (player can stand on it)
  walls.push(ob(cx, cz, w + 0.6, 0.3, d + 0.6, true, roofColor, 'roof', 0, false, h))
  return walls
}

// Build stairs: a series of steps going up, each at increasing height
function buildStairs(cx: number, cz: number, steps: number, dir: 'N'|'S'|'E'|'W', color: number): MapObstacle[] {
  const result: MapObstacle[] = []
  const stepH = 0.6, stepD = 0.7, stepW = 2.5
  for (let i = 0; i < steps; i++) {
    let x = cx, z = cz
    if (dir === 'N') z = cz - i * stepD
    if (dir === 'S') z = cz + i * stepD
    if (dir === 'E') x = cx + i * stepD
    if (dir === 'W') x = cx - i * stepD
    // each step is positioned at y = i * stepH (stacking upward)
    result.push(ob(x, z, stepW, stepH, stepD, true, color, 'stair', 0, false, i * stepH))
  }
  return result
}

// Build a tree (trunk + foliage on top)
function buildTree(cx: number, cz: number, scale: number = 1): MapObstacle[] {
  const trunkH = 3 * scale
  const foliageH = 2.5 * scale
  return [
    // trunk at ground level
    ob(cx, cz, 0.4 * scale, trunkH, 0.4 * scale, false, 0x7a5230, 'cyl'),
    // foliage on top of trunk
    ob(cx, cz, 2.5 * scale, foliageH, 2.5 * scale, true, 0x27ae60, 'box', 0, false, trunkH),
  ]
}

// Build a car (body + cabin on top)
function buildCar(cx: number, cz: number, color: number, rotation: number = 0): MapObstacle[] {
  return [
    ob(cx, cz, 2, 0.8, 4, true, color, 'box', rotation),           // body at ground
    ob(cx, cz, 1.8, 0.6, 2, false, 0x2c3e50, 'box', rotation, false, 0.8), // cabin on top
  ]
}

// Build a multi-floor tower: enterable, with internal stairs starting from floor 1
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
  // South wall with door gap at ground floor only (upper floors have full wall + window)
  // Ground floor door
  result.push(ob(cx - w/4 - doorW/4, cz + d/2, w/2 - doorW/2, floorH - 0.1, wallT, false, color, 'wall', 0, false, 0))
  result.push(ob(cx + w/4 + doorW/4, cz + d/2, w/2 - doorW/2, floorH - 0.1, wallT, false, color, 'wall', 0, false, 0))
  // Upper floor walls (full, with windows)
  for (let f = 1; f < floors; f++) {
    const fy = f * floorH
    result.push(ob(cx, cz + d/2, w, floorH - 0.1, wallT, false, color, 'wall', 0, false, fy))
  }
  // Floor platforms for upper floors (walkable, thin slabs — no horizontal blocking)
  for (let f = 1; f < floors; f++) {
    const fy = f * floorH
    // platform with a gap for stairs (stair opening on one side)
    result.push(ob(cx + w/4, cz, w/2 - wallT, 0.2, d - wallT * 2, true, color, 'roof', 0, false, fy))
  }
  // Stairs: start from floor 1 (ground) going up to each floor
  // Place stairs against the north wall, going up
  for (let f = 0; f < floors - 1; f++) {
    const fy = f * floorH
    // 4 steps per floor (stepH=0.6, so 4 steps = 2.4 height, close to floorH=3.0)
    // stairs positioned at north side of tower, going from south to north (upward)
    result.push(...buildStairs(cx, cz - d/4, 5, 'N', 0x8a7a5a).map(s => ({ ...s, y: (s.y || 0) + fy })))
  }
  // Roof at top
  result.push(ob(cx, cz, w + 0.6, 0.3, d + 0.6, true, roofColor, 'roof', 0, false, totalH))
  return result
}

// 16 themed maps
export const MAPS: GameMap[] = [
  {
    id: 'arena', name: 'Arena Doodle', theme: 'Clásica', ground: G_PAPER, fog: 0xfdfbf7, accent: 0xe8e4df,
    obstacles: [
      ob(0, 0, 3, 4, 3, true, C_STONE),
      ob(-35, -25, 4, 3, 4, true, C_WOOD),
      ob(30, 20, 5, 2.5, 3, true, C_WOOD),
      ob(-45, 35, 2.5, 3.5, 2.5, true, C_PILLAR, 'cyl'),
      ob(45, -40, 4, 3, 4, true, C_WOOD),
      ob(20, -15, 1.6, 3.2, 1.6, false, C_PILLAR, 'cyl'),
      ob(-20, 15, 1.6, 3.2, 1.6, false, C_PILLAR, 'cyl'),
      ob(-10, -50, 6, 2, 2, true, C_STONE),
      ob(40, 45, 2, 2, 6, true, C_STONE),
    ],
    spawns: [[0,-22],[0,22],[22,0],[-22,0],[16,-16],[-16,16]],
  },
  {
    id: 'patios', name: 'Patios', theme: 'Cuadrantes', ground: G_SAND, fog: 0xf6efde, accent: 0xe0d5b8,
    obstacles: [
      ob(-25,-25, 3,3,3, true, C_WOOD), ob(25,-25, 3,3,3, true, C_WOOD),
      ob(-25,25, 3,3,3, true, C_WOOD),  ob(25,25, 3,3,3, true, C_WOOD),
      ob(0,-45, 8,2,2, true, C_STONE), ob(0,45, 8,2,2, true, C_STONE),
      ob(-45,0, 2,2,8, true, C_STONE), ob(45,0, 2,2,8, true, C_STONE),
      ob(0,0, 2,4,2, true, C_PILLAR),
    ],
    spawns: [[-50,-50],[50,50],[20,-20],[-20,20],[0,-60],[0,60]],
  },
  {
    id: 'bunkers', name: 'Bunkers', theme: 'Trincheras', ground: G_STONE, fog: 0xeae6e0, accent: 0xcfc8bc,
    obstacles: [
      ob(-40,-20, 12,2,2, true, C_STONE), ob(40,20, 12,2,2, true, C_STONE),
      ob(-20,20, 2,2,12, true, C_STONE), ob(20,-20, 2,2,12, true, C_STONE),
      ob(0,-50, 18,3,2, true, C_DARK), ob(0,50, 18,3,2, true, C_DARK),
      ob(-55,0, 2,3,10, true, C_DARK), ob(55,0, 2,3,10, true, C_DARK),
      ob(0,0, 4,3.5,4, true, C_WOOD),
    ],
    spawns: [[0,-60],[0,60],[-60,0],[60,0]],
  },
  {
    id: 'torres', name: 'Torres', theme: 'Pilares', ground: G_STONE, fog: 0xeae6e0, accent: 0xcfc8bc,
    obstacles: [
      ob(-35,-35, 3,5,3, true, C_PILLAR,'cyl'), ob(35,-35, 3,5,3, true, C_PILLAR,'cyl'),
      ob(-35,35, 3,5,3, true, C_PILLAR,'cyl'),  ob(35,35, 3,5,3, true, C_PILLAR,'cyl'),
      ob(0,0, 4,6,4, true, C_PILLAR),
      ob(-55,0, 2,3,2, true, C_WOOD), ob(55,0, 2,3,2, true, C_WOOD),
      ob(0,-55, 2,3,2, true, C_WOOD), ob(0,55, 2,3,2, true, C_WOOD),
    ],
    spawns: [[0,-60],[0,60],[60,0],[-60,0],[-50,-50],[50,50]],
  },
  {
    id: 'crucero', name: 'Crucero', theme: 'Cruz', ground: G_PAPER, fog: 0xfdfbf7, accent: 0xe8e4df,
    obstacles: [
      ob(0,-30, 4,3,16, true, C_WOOD), ob(0,30, 4,3,16, true, C_WOOD),
      ob(-30,0, 16,3,4, true, C_WOOD), ob(30,0, 16,3,4, true, C_WOOD),
      ob(0,0, 3,5,3, true, C_STONE),
      ob(-50,-50, 3,2,3, true, C_DARK), ob(50,-50, 3,2,3, true, C_DARK),
      ob(-50,50, 3,2,3, true, C_DARK), ob(50,50, 3,2,3, true, C_DARK),
    ],
    spawns: [[0,-60],[0,60],[-60,0],[60,0]],
  },
  {
    id: 'espinas', name: 'Espinas', theme: 'Zig-zag', ground: G_SAND, fog: 0xf6efde, accent: 0xe0d5b8,
    obstacles: [
      ob(-45,-40, 2,3,8, true, C_STONE), ob(-23,-20, 8,3,2, true, C_STONE),
      ob(0,0, 2,3,8, true, C_STONE), ob(23,20, 8,3,2, true, C_STONE),
      ob(45,40, 2,3,8, true, C_STONE),
      ob(-23,20, 2,3,8, true, C_WOOD), ob(23,-20, 2,3,8, true, C_WOOD),
      ob(0,-50, 6,2,2, true, C_DARK), ob(0,50, 6,2,2, true, C_DARK),
    ],
    spawns: [[-60,-60],[60,60],[-60,60],[60,-60]],
  },
  {
    id: 'fortaleza', name: 'Fortaleza', theme: 'Murallas', ground: G_STONE, fog: 0xeae6e0, accent: 0xcfc8bc,
    obstacles: [
      ob(0,-50, 30,3,2, true, C_DARK), ob(0,50, 30,3,2, true, C_DARK),
      ob(-50,0, 2,3,30, true, C_DARK), ob(50,0, 2,3,30, true, C_DARK),
      ob(-25,-25, 3,4,3, true, C_STONE), ob(25,-25, 3,4,3, true, C_STONE),
      ob(-25,25, 3,4,3, true, C_STONE), ob(25,25, 3,4,3, true, C_STONE),
      ob(0,0, 5,3,5, true, C_WOOD),
    ],
    spawns: [[0,-60],[0,60],[-60,0],[60,0]],
  },
  {
    id: 'laberinto', name: 'Laberinto', theme: 'Maze', ground: G_GRASS, fog: 0xeef5e6, accent: 0xcfdcc0,
    obstacles: [
      ob(-30,-30, 2,3,12, true, C_WOOD), ob(0,-15, 12,3,2, true, C_WOOD),
      ob(30,0, 2,3,12, true, C_WOOD), ob(-15,30, 12,3,2, true, C_WOOD),
      ob(-45,15, 6,3,2, true, C_STONE), ob(15,-45, 2,3,6, true, C_STONE),
      ob(45,-15, 6,3,2, true, C_STONE), ob(-15,45, 2,3,6, true, C_STONE),
      ob(0,0, 2,2,2, false, C_DARK),
    ],
    spawns: [[-60,-60],[60,60],[60,-60],[-60,60],[0,-60],[0,60]],
  },
  {
    id: 'puentes', name: 'Puentes', theme: 'Rampas', ground: G_SAND, fog: 0xf6efde, accent: 0xe0d5b8,
    obstacles: [
      ob(0,-25, 4,2,12, true, C_WOOD), ob(0,25, 4,2,12, true, C_WOOD),
      ob(-30,0, 12,2,4, true, C_WOOD), ob(30,0, 12,2,4, true, C_WOOD),
      ob(-45,-45, 4,4,4, true, C_STONE,'ramp'), ob(45,45, 4,4,4, true, C_STONE,'ramp'),
      ob(45,-45, 4,4,4, true, C_STONE,'ramp'), ob(-45,45, 4,4,4, true, C_STONE,'ramp'),
      ob(0,0, 3,5,3, true, C_PILLAR),
    ],
    spawns: [[0,-60],[0,60],[60,0],[-60,0]],
  },
  {
    id: 'crater', name: 'Cráter', theme: 'Anillo', ground: G_LAVA, fog: 0xf6e3d8, accent: 0xe0c8bc,
    obstacles: [
      ob(0,0, 6,1.5,6, true, C_RED),
      ob(-30,0, 2,3,2, true, C_STONE), ob(30,0, 2,3,2, true, C_STONE),
      ob(0,-30, 2,3,2, true, C_STONE), ob(0,30, 2,3,2, true, C_STONE),
      ob(-45,-45, 3,3,3, true, C_DARK), ob(45,-45, 3,3,3, true, C_DARK),
      ob(-45,45, 3,3,3, true, C_DARK), ob(45,45, 3,3,3, true, C_DARK),
      ob(0,-55, 8,2,2, true, C_STONE), ob(0,55, 8,2,2, true, C_STONE),
    ],
    spawns: [[0,-60],[0,60],[60,0],[-60,0],[-55,-55],[55,55]],
  },
  {
    id: 'zigzag', name: 'Zigzag', theme: 'Dientes', ground: G_PAPER, fog: 0xfdfbf7, accent: 0xe8e4df,
    obstacles: [
      ob(-40,-30, 3,3,3, true, C_WOOD), ob(-20,30, 3,3,3, true, C_WOOD),
      ob(0,-30, 3,3,3, true, C_WOOD), ob(20,30, 3,3,3, true, C_WOOD),
      ob(40,-30, 3,3,3, true, C_WOOD),
      ob(-30,0, 2,4,2, true, C_PILLAR,'cyl'), ob(30,0, 2,4,2, true, C_PILLAR,'cyl'),
      ob(0,0, 4,5,4, true, C_STONE),
    ],
    spawns: [[0,-60],[0,60],[-60,0],[60,0]],
  },
  {
    id: 'diamante', name: 'Diamante', theme: 'Rombo', ground: G_SNOW, fog: 0xf7fafc, accent: 0xdfe7ec,
    obstacles: [
      ob(0,-35, 4,3,4, true, C_BLUE), ob(35,0, 4,3,4, true, C_BLUE),
      ob(0,35, 4,3,4, true, C_BLUE), ob(-35,0, 4,3,4, true, C_BLUE),
      ob(0,0, 5,5,5, true, C_STONE),
      ob(-50,-50, 3,2,3, true, C_WOOD), ob(50,-50, 3,2,3, true, C_WOOD),
      ob(-50,50, 3,2,3, true, C_WOOD), ob(50,50, 3,2,3, true, C_WOOD),
    ],
    spawns: [[0,-60],[0,60],[60,0],[-60,0]],
  },
  {
    id: 'colmena', name: 'Colmena', theme: 'Celdas', ground: G_GRASS, fog: 0xeef5e6, accent: 0xcfdcc0,
    obstacles: [
      ob(-30,-30, 4,3,4, true, C_WOOD), ob(0,-30, 4,3,4, true, C_WOOD), ob(30,-30, 4,3,4, true, C_WOOD),
      ob(-30,0, 4,3,4, true, C_WOOD), ob(30,0, 4,3,4, true, C_WOOD),
      ob(-30,30, 4,3,4, true, C_WOOD), ob(0,30, 4,3,4, true, C_WOOD), ob(30,30, 4,3,4, true, C_WOOD),
      ob(0,0, 4,2,4, true, C_STONE),
    ],
    spawns: [[0,-60],[0,60],[-60,0],[60,0],[-24,-24],[24,24]],
  },
  {
    id: 'ruinas', name: 'Ruinas', theme: 'Escombros', ground: G_STONE, fog: 0xeae6e0, accent: 0xcfc8bc,
    obstacles: [
      ob(-40,-35, 6,2,3, true, C_DARK), ob(-35,30, 4,3,4, true, C_STONE),
      ob(30,-40, 5,2.5,4, true, C_WOOD), ob(40,30, 3,3,5, true, C_DARK),
      ob(0,-15, 2,4,2, true, C_PILLAR,'cyl'), ob(0,20, 2,4,2, true, C_PILLAR,'cyl'),
      ob(-15,0, 3,1.5,3, true, C_STONE), ob(15,0, 3,1.5,3, true, C_STONE),
      ob(0,0, 8,1,8, true, C_RED),
    ],
    spawns: [[0,-60],[0,60],[-60,0],[60,0],[-55,-55],[55,55]],
  },
  {
    id: 'estadio', name: 'Estadio', theme: 'Graderías', ground: G_GRASS, fog: 0xeef5e6, accent: 0xcfdcc0,
    obstacles: [
      ob(0,-55, 44,4,2, true, C_STONE), ob(0,55, 44,4,2, true, C_STONE),
      ob(-55,0, 2,4,44, true, C_STONE), ob(55,0, 2,4,44, true, C_STONE),
      ob(0,-40, 30,2,2, true, C_WOOD), ob(0,40, 30,2,2, true, C_WOOD),
      ob(-40,0, 2,2,16, true, C_WOOD), ob(40,0, 2,2,16, true, C_WOOD),
      ob(0,0, 4,3,4, true, C_DARK),
    ],
    spawns: [[0,-18],[0,18],[-18,0],[18,0]],
  },
  {
    id: 'nucleo', name: 'Núcleo', theme: 'Anillo central', ground: G_LAVA, fog: 0xf6e3d8, accent: 0xe0c8bc,
    obstacles: [
      ob(0,0, 8,1.5,8, true, C_RED),
      ob(-25,0, 2,4,2, true, C_PILLAR,'cyl'), ob(25,0, 2,4,2, true, C_PILLAR,'cyl'),
      ob(0,-25, 2,4,2, true, C_PILLAR,'cyl'), ob(0,25, 2,4,2, true, C_PILLAR,'cyl'),
      ob(-40,-40, 4,3,4, true, C_STONE), ob(40,-40, 4,3,4, true, C_STONE),
      ob(-40,40, 4,3,4, true, C_STONE), ob(40,40, 4,3,4, true, C_STONE),
      ob(0,-55, 10,2,2, true, C_WOOD), ob(0,55, 10,2,2, true, C_WOOD),
    ],
    spawns: [[0,-60],[0,60],[60,0],[-60,0]],
  },
  // ===== DETAILED MAPS — Roblox/Fortnite/CoD inspired =====
  {
    id: 'barrio', name: 'Barrio', theme: 'Conjunto residencial', ground: 0xb0b8c0, fog: 0xc8d0d8, accent: 0x8a92a0,
    obstacles: [
      // 8 enterable houses with doors + windows + roofs (bigger neighborhood)
      ...buildHouse(-50, -40, 6, 6, 3.5, 0xe8d5b7, 0xc0392b, 'S'),
      ...buildHouse(-20, -40, 6, 6, 3.5, 0xd5c4a0, 0x2980b9, 'S'),
      ...buildHouse(20, -40, 6, 6, 3.5, 0xcdb98a, 0x27ae60, 'S'),
      ...buildHouse(50, -40, 6, 6, 3.5, 0xe8d5b7, 0xf1c40f, 'S'),
      ...buildHouse(-50, 40, 6, 6, 3.5, 0xd5c4a0, 0x8e44ad, 'N'),
      ...buildHouse(-20, 40, 6, 6, 3.5, 0xe8d5b7, 0xe67e22, 'N'),
      ...buildHouse(20, 40, 6, 6, 3.5, 0xcdb98a, 0x1abc9c, 'N'),
      ...buildHouse(50, 40, 6, 6, 3.5, 0xe8d5b7, 0xe74c3c, 'N'),
      // 5-floor tower in center (enterable, with internal stairs)
      ...buildTower(0, 0, 8, 8, 5, 0xa0a8b0, 0x2c3e50),
      // trash cans next to houses (for climbing to roof)
      ob(-43, -30, 1, 1.2, 1, true, 0x555555), ob(-13, -30, 1, 1.2, 1, true, 0x555555),
      ob(28, -30, 1, 1.2, 1, true, 0x555555), ob(58, -30, 1, 1.2, 1, true, 0x555555),
      ob(-43, 30, 1, 1.2, 1, true, 0x555555), ob(-13, 30, 1, 1.2, 1, true, 0x555555),
      ob(28, 30, 1, 1.2, 1, true, 0x555555), ob(58, 30, 1, 1.2, 1, true, 0x555555),
      // cars on the street
      ...buildCar(-35, 0, 0xe74c3c, 0), ...buildCar(35, 0, 0x3498db, 0),
      ...buildCar(0, -20, 0x27ae60, Math.PI/2), ...buildCar(0, 20, 0xf1c40f, Math.PI/2),
      // street lamps
      ob(-30, -10, 0.2, 3, 0.2, false, 0x2c3e50, 'cyl'), ob(30, 10, 0.2, 3, 0.2, false, 0x2c3e50, 'cyl'),
      // crates for climbing
      ob(-15, -10, 1.5, 1.5, 1.5, true, 0xe8d5b7), ob(15, 10, 1.5, 1.5, 1.5, true, 0xe8d5b7),
      // low fences between houses
      ob(-35, -40, 0.3, 1.5, 4, false, 0x8a92a0, 'wall'), ob(35, -40, 0.3, 1.5, 4, false, 0x8a92a0, 'wall'),
      ob(-35, 40, 0.3, 1.5, 4, false, 0x8a92a0, 'wall'), ob(35, 40, 0.3, 1.5, 4, false, 0x8a92a0, 'wall'),
      // central water fountain (decorative)
      ob(0, -10, 2, 0.4, 2, true, 0x3498db, 'water', 0, true),
    ],
    spawns: [[0,-60],[0,60],[-60,0],[60,0],[-24,-24],[24,24]],
  },
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
  {
    id: 'oficinas', name: 'Oficinas', theme: 'Edificio corporativo 6 pisos', ground: 0xc8ccd0, fog: 0xd0d4d8, accent: 0x9098a0,
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
      const stairs = [
        { sx: -14, sz: -14, dir: 'N' as const }, // 0→1
        { sx: 14, sz: -14, dir: 'N' as const },  // 1→2
        { sx: 14, sz: 14, dir: 'S' as const },   // 2→3
        { sx: -14, sz: 14, dir: 'S' as const },  // 3→4
        { sx: -14, sz: -14, dir: 'N' as const }, // 4→5
      ]
      // Hole position = CENTER of the staircase (8 steps total: 7 + landing)
      // Stairs span 8 × 0.7 = 5.6 units. Center is at step 4 = 4*0.7 = 2.8 from start
      const getHolePos = (s: typeof stairs[0]) => {
        const midOffset = 3.5 * stepD // center of 8-step staircase
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
      r.push(ob(0, 12, 6, 1, 1.5, true, cDesk, 'box')) // reception desk
      r.push(ob(0, 12.8, 4, 0.3, 0.5, false, cPC, 'box', 0, false, 1)) // PC on desk
      r.push(ob(-8, 12, 1, 0.5, 1, true, cChair, 'box')) // chairs
      r.push(ob(8, 12, 1, 0.5, 1, true, cChair, 'box'))
      r.push(ob(-12, 8, 4, 0.8, 1.5, true, 0x8e44ad, 'box')) // sofa
      r.push(ob(-12, 11, 2, 0.5, 1, true, cDesk, 'box')) // coffee table
      r.push(ob(-16, -12, 1, 1.5, 1, false, 0x27ae60, 'cyl')) // plants
      r.push(ob(16, -12, 1, 1.5, 1, false, 0x27ae60, 'cyl'))
      r.push(ob(0, 17, 3, 1, 1, true, cDark, 'box')) // security desk
      r.push(ob(-5, -5, 0.8, 1, 0.8, true, 0x555555, 'box')) // trash
      r.push(ob(5, 5, 0.8, 1, 0.8, true, 0x555555, 'box'))

      // ════════ PISO 2 (y=4..8): OFICINAS ABIERTAS ════════
      const f2 = FH
      for (let i = 0; i < 4; i++) {
        const dx = -12 + i * 8, dz = -10 + (i % 2) * 16
        r.push(ob(dx, dz, 3, 0.8, 1.5, true, cDesk, 'box', 0, false, f2))
        r.push(ob(dx, dz - 0.5, 1.5, 0.4, 0.5, false, cPC, 'box', 0, false, f2 + 0.8))
        r.push(ob(dx, dz + 1.5, 1, 0.5, 1, true, cChair, 'box', 0, false, f2))
      }
      for (let i = 0; i < 4; i++) {
        const dx = 4 + i * 4
        r.push(ob(dx, 0, 1, 2, 1, true, cDark, 'box', 0, false, f2)) // filing cabinets
      }
      r.push(ob(16, -8, 0.8, 1.5, 0.8, true, 0x3498db, 'box', 0, false, f2)) // water cooler
      r.push(ob(16, 8, 1.5, 1, 1, true, cDark, 'box', 0, false, f2)) // printer

      // ════════ PISO 3 (y=8..12): SALAS DE REUNIONES ════════
      const f3 = 2 * FH
      // Partition walls with door gaps (cross shape, gap in center of each arm)
      r.push(ob(0, -D/4 - 2, W - wallT*2 - 4, FH - 0.5, wallT, false, cWall, 'wall', 0, false, f3)) // NW→NE horizontal
      r.push(ob(0, D/4 + 2, W - wallT*2 - 4, FH - 0.5, wallT, false, cWall, 'wall', 0, false, f3)) // SW→SE horizontal
      r.push(ob(-W/4 - 2, 0, wallT, FH - 0.5, D - wallT*2 - 4, false, cWall, 'wall', 0, false, f3)) // N→S vertical left
      r.push(ob(W/4 + 2, 0, wallT, FH - 0.5, D - wallT*2 - 4, false, cWall, 'wall', 0, false, f3)) // N→S vertical right
      // Meeting tables in 4 quadrants
      for (const [tx, tz] of [[-12, -12], [12, -12], [-12, 12], [12, 12]] as const) {
        r.push(ob(tx, tz, 4, 0.8, 2, true, cDesk, 'box', 0, false, f3))
        r.push(ob(tx, tz - 2.5, 1, 0.5, 1, true, cChair, 'box', 0, false, f3))
        r.push(ob(tx, tz + 2.5, 1, 0.5, 1, true, cChair, 'box', 0, false, f3))
        r.push(ob(tx - 2.5, tz, 1, 0.5, 1, true, cChair, 'box', 0, false, f3))
        r.push(ob(tx + 2.5, tz, 1, 0.5, 1, true, cChair, 'box', 0, false, f3))
        r.push(ob(tx, tz, 1, 0.3, 1, false, cDark, 'box', 0, false, f3 + 3)) // projector
      }

      // ════════ PISO 4 (y=12..16): CUBÍCULOS ════════
      const f4 = 3 * FH
      for (let cx = -12; cx <= 12; cx += 8) {
        for (let cz = -12; cz <= 12; cz += 8) {
          r.push(ob(cx + 1.5, cz, 0.15, 1.5, 2.5, false, 0xc8ccd0, 'wall', 0, false, f4)) // partition N
          r.push(ob(cx, cz + 1.5, 2.5, 1.5, 0.15, false, 0xc8ccd0, 'wall', 0, false, f4)) // partition W
          r.push(ob(cx, cz, 2, 0.8, 1, true, cDesk, 'box', 0, false, f4)) // desk
          r.push(ob(cx, cz - 0.4, 1, 0.3, 0.4, false, cPC, 'box', 0, false, f4 + 0.8)) // monitor
          r.push(ob(cx, cz + 1.5, 0.8, 0.5, 0.8, true, cChair, 'box', 0, false, f4)) // chair
        }
      }

      // ════════ PISO 5 (y=16..20): SERVIDORES ════════
      const f5 = 4 * FH
      for (let i = 0; i < 6; i++) {
        const sx = -12 + (i % 3) * 8, sz = -8 + Math.floor(i / 3) * 16
        r.push(ob(sx, sz, 1.5, 3, 1, true, 0x2c3e50, 'box', 0, false, f5))
        r.push(ob(sx, sz, 1.2, 2.8, 0.8, false, 0x1a1a1a, 'box', 0, false, f5 + 0.1))
        r.push(ob(sx, sz, 1.3, 0.1, 0.9, false, 0x27ae60, 'box', 0, false, f5 + 1))
        r.push(ob(sx, sz, 1.3, 0.1, 0.9, false, 0xe74c3c, 'box', 0, false, f5 + 1.5))
      }
      r.push(ob(-15, 15, 2, 1.5, 2, true, 0x95a5a6, 'box', 0, false, f5)) // cooling
      r.push(ob(15, 15, 2, 1.5, 2, true, 0x95a5a6, 'box', 0, false, f5))
      r.push(ob(-15, -15, 2, 1.5, 1, true, cDark, 'box', 0, false, f5)) // UPS
      r.push(ob(15, -15, 2, 1.5, 1, true, cDark, 'box', 0, false, f5))

      // ════════ PISO 6 (y=20..24): TERRAZA ════════
      const f6 = 5 * FH
      // Railings
      r.push(ob(0, D/2 - 1, W - 2, 1.2, 0.15, false, cWall, 'wall', 0, false, f6))
      r.push(ob(0, -D/2 + 1, W - 2, 1.2, 0.15, false, cWall, 'wall', 0, false, f6))
      r.push(ob(W/2 - 1, 0, 0.15, 1.2, D - 2, false, cWall, 'wall', 0, false, f6))
      r.push(ob(-W/2 + 1, 0, 0.15, 1.2, D - 2, false, cWall, 'wall', 0, false, f6))
      // Jacuzzi
      r.push(ob(-10, -10, 4, 0.8, 4, false, 0x2980b9, 'water', 0, true, f6))
      // Bar
      r.push(ob(10, -10, 5, 1.2, 1.5, true, cDesk, 'box', 0, false, f6))
      r.push(ob(12, -10, 0.5, 0.3, 0.5, false, 0x27ae60, 'box', 0, false, f6 + 1.2))
      r.push(ob(8, -10, 0.5, 0.3, 0.5, false, 0xe74c3c, 'box', 0, false, f6 + 1.2))
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
      // BBQ
      r.push(ob(-12, 8, 1.5, 1, 1.5, true, 0x2c3e50, 'box', 0, false, f6))
      r.push(ob(-12, 8, 1, 0.2, 1, false, 0xe74c3c, 'box', 0, false, f6 + 1))

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
    id: 'bosque', name: 'Bosque', theme: 'Bosque denso con río y lago', ground: 0x4a7a3a, fog: 0x6a9a5a, accent: 0x3a5a2a,
    waterLevel: 0.3,
    obstacles: [
      // ============ WATER FEATURES ============
      // Large lake (NW corner) — 20×30
      ob(-40, -40, 20, 0.3, 30, false, 0x2980b9, 'water', 0, true),
      // River crossing the map north-south (x=0, z∈[-40,40])
      ob(0, 0, 6, 0.3, 80, false, 0x2980b9, 'water', 0, true),
      // Small pond (SE corner)
      ob(45, 45, 10, 0.3, 10, false, 0x2980b9, 'water', 0, true),

      // ============ BRIDGES over river ============
      // Wooden bridge at z=0 (crossing river east-west)
      ob(0, 0, 8, 0.5, 3, true, 0x7a5230, 'box'),
      // Bridge at z=20
      ob(0, 20, 8, 0.5, 3, true, 0x7a5230, 'box'),
      // Bridge at z=-20
      ob(0, -20, 8, 0.5, 3, true, 0x7a5230, 'box'),
      // Bridge railings (low walls, no collide) — north & south edges of each bridge
      ob(0, -1.5, 8, 0.6, 0.2, false, 0x5d4037, 'wall', 0, true, 0.5),
      ob(0, 1.5, 8, 0.6, 0.2, false, 0x5d4037, 'wall', 0, true, 0.5),
      ob(0, 18.5, 8, 0.6, 0.2, false, 0x5d4037, 'wall', 0, true, 0.5),
      ob(0, 21.5, 8, 0.6, 0.2, false, 0x5d4037, 'wall', 0, true, 0.5),
      ob(0, -21.5, 8, 0.6, 0.2, false, 0x5d4037, 'wall', 0, true, 0.5),
      ob(0, -18.5, 8, 0.6, 0.2, false, 0x5d4037, 'wall', 0, true, 0.5),

      // ============ TREES (27 total, clustered + scattered) ============
      // NE cluster (dense)
      ...buildTree(38, -25, 1.8), ...buildTree(25, -38, 1.3),
      ...buildTree(45, -35, 2.0), ...buildTree(50, -45, 2.2),
      ...buildTree(33, -45, 1.5),
      // SE cluster
      ...buildTree(38, 25, 1.8), ...buildTree(25, 38, 1.3),
      ...buildTree(45, 35, 2.0), ...buildTree(33, 45, 1.5),
      // SW cluster
      ...buildTree(-38, 25, 1.8), ...buildTree(-25, 38, 1.3),
      ...buildTree(-45, 35, 2.0), ...buildTree(-50, 45, 2.2),
      ...buildTree(-33, 45, 1.5),
      // NW cluster (near lake, avoiding water)
      ...buildTree(-25, -25, 1.5), ...buildTree(-20, -30, 1.2),
      ...buildTree(-15, -45, 1.5),
      // Scattered edges
      ...buildTree(0, -50, 2.0), ...buildTree(0, 50, 2.0),
      ...buildTree(-50, 0, 1.5), ...buildTree(50, 0, 1.5),
      ...buildTree(-55, -25, 1.3), ...buildTree(55, 25, 1.3),
      ...buildTree(15, -45, 1.5), ...buildTree(-15, 45, 1.5),
      ...buildTree(50, -20, 1.4), ...buildTree(-50, 20, 1.4),

      // ============ BOULDERS (large rocks, 8 total) ============
      ob(-35, -10, 3, 2.5, 3, true, 0x95a5a6, 'box'),
      ob(35, 10, 3, 2.5, 3, true, 0x7f8c8d, 'box'),
      ob(-20, 20, 3, 2.5, 3, true, 0x95a5a6, 'box'),
      ob(20, -20, 3, 2.5, 3, true, 0x7f8c8d, 'box'),
      ob(-45, 15, 3, 2.5, 3, true, 0x95a5a6, 'box'),
      ob(45, -15, 3, 2.5, 3, true, 0x7f8c8d, 'box'),
      ob(15, 45, 3, 2.5, 3, true, 0x95a5a6, 'box'),
      ob(-10, -50, 3, 2.5, 3, true, 0x7f8c8d, 'box'),

      // ============ SMALL ROCKS (climbing stones, 12 total) ============
      ob(-33, -8, 1.5, 1.5, 1.5, true, 0x95a5a6, 'box'),
      ob(33, 8, 1.5, 1.5, 1.5, true, 0x7f8c8d, 'box'),
      ob(-18, 18, 1.5, 1.5, 1.5, true, 0x95a5a6, 'box'),
      ob(18, -18, 1.5, 1.5, 1.5, true, 0x7f8c8d, 'box'),
      ob(-43, 13, 1.5, 1.5, 1.5, true, 0x95a5a6, 'box'),
      ob(43, -13, 1.5, 1.5, 1.5, true, 0x7f8c8d, 'box'),
      ob(13, 43, 1.5, 1.5, 1.5, true, 0x95a5a6, 'box'),
      ob(-8, -48, 1.5, 1.5, 1.5, true, 0x7f8c8d, 'box'),
      ob(25, 5, 1.5, 1.5, 1.5, true, 0x95a5a6, 'box'),
      ob(-25, -5, 1.5, 1.5, 1.5, true, 0x7f8c8d, 'box'),
      ob(8, 25, 1.5, 1.5, 1.5, true, 0x95a5a6, 'box'),
      ob(-8, -25, 1.5, 1.5, 1.5, true, 0x7f8c8d, 'box'),

      // ============ FALLEN LOGS (5 total, climbable low cover) ============
      ob(-30, 5, 5, 1, 1, true, 0x7a5230, 'box'),
      ob(30, -5, 5, 1, 1, true, 0x7a5230, 'box'),
      ob(10, 35, 5, 1, 1, true, 0x7a5230, 'box'),
      ob(-10, -35, 5, 1, 1, true, 0x7a5230, 'box'),
      ob(40, 0, 5, 1, 1, true, 0x5d4037, 'box'),

      // ============ BUSHES (10 total, low non-climbable) ============
      ob(-28, 28, 2, 0.8, 2, false, 0x27ae60, 'box'),
      ob(28, -28, 2, 0.8, 2, false, 0x27ae60, 'box'),
      ob(-28, -28, 2, 0.8, 2, false, 0x1e8449, 'box'),
      ob(28, 28, 2, 0.8, 2, false, 0x1e8449, 'box'),
      ob(10, 10, 2, 0.8, 2, false, 0x27ae60, 'box'),
      ob(-10, -10, 2, 0.8, 2, false, 0x1e8449, 'box'),
      ob(10, -10, 2, 0.8, 2, false, 0x27ae60, 'box'),
      ob(-10, 10, 2, 0.8, 2, false, 0x1e8449, 'box'),
      ob(48, -25, 2, 0.8, 2, false, 0x27ae60, 'box'),
      ob(-48, 25, 2, 0.8, 2, false, 0x1e8449, 'box'),

      // ============ TREE STUMPS (5 total, climbable) ============
      ob(-25, -20, 1.5, 1, 1.5, true, 0x7a5230, 'box'),
      ob(25, 20, 1.5, 1, 1.5, true, 0x7a5230, 'box'),
      ob(-20, 25, 1.5, 1, 1.5, true, 0x5d4037, 'box'),
      ob(20, -25, 1.5, 1, 1.5, true, 0x5d4037, 'box'),
      ob(5, -35, 1.5, 1, 1.5, true, 0x7a5230, 'box'),

      // ============ WOODEN CABIN (enterable, NE area) ============
      ...buildHouse(30, -30, 8, 8, 4, 0x8b4513, 0xc0392b, 'S'),
      // Cabin details: bed + table inside
      ob(28, -33, 1.5, 0.5, 2, true, 0x5d4037, 'box'),     // bed
      ob(33, -28, 2, 0.6, 1, true, 0xe8d5b7, 'box'),       // table

      // ============ WATCHTOWER (3-floor, SW area) ============
      ...buildTower(-30, 30, 6, 6, 3, 0x8b4513, 0x2c3e50),

      // ============ ROPE BRIDGES between trees (high up) ============
      ob(42.5, 32.5, 12, 0.2, 1, true, 0x7a5230, 'roof', 0, false, 5),    // SE rope bridge
      ob(-42.5, 32.5, 12, 0.2, 1, true, 0x7a5230, 'roof', 0, false, 5),   // SW rope bridge
      // Rope bridge posts (anchors)
      ob(36, 32.5, 0.3, 6, 0.3, false, 0x5d4037, 'box'),
      ob(48, 32.5, 0.3, 6, 0.3, false, 0x5d4037, 'box'),
      ob(-36, 32.5, 0.3, 6, 0.3, false, 0x5d4037, 'box'),
      ob(-48, 32.5, 0.3, 6, 0.3, false, 0x5d4037, 'box'),

      // ============ CAMPFIRE (circle of rocks + central fire) ============
      ob(15, -15, 1, 0.5, 1, true, 0xe67e22, 'box'),        // fire (orange)
      ob(15, -15, 0.6, 0.3, 0.6, true, 0xf1c40f, 'box', 0, false, 0.5),  // flame top (yellow)
      ob(13, -15, 0.6, 0.5, 0.6, true, 0x95a5a6, 'box'),    // rock 1 (west)
      ob(17, -15, 0.6, 0.5, 0.6, true, 0x7f8c8d, 'box'),    // rock 2 (east)
      ob(15, -13, 0.6, 0.5, 0.6, true, 0x95a5a6, 'box'),    // rock 3 (south)
      ob(15, -17, 0.6, 0.5, 0.6, true, 0x7f8c8d, 'box'),    // rock 4 (north)
      ob(15, -15, 2, 0.3, 0.4, true, 0x7a5230, 'box'),      // log under fire

      // ============ MUSHROOMS (small red domes, scattered) ============
      ob(12, 12, 0.5, 0.3, 0.5, true, 0xe74c3c, 'cyl'),
      ob(-12, -12, 0.5, 0.3, 0.5, true, 0xe74c3c, 'cyl'),
      ob(22, 8, 0.5, 0.3, 0.5, true, 0xe74c3c, 'cyl'),
      ob(-22, -8, 0.5, 0.3, 0.5, true, 0xe74c3c, 'cyl'),
      ob(8, 22, 0.5, 0.3, 0.5, true, 0xe74c3c, 'cyl'),
      ob(-8, -22, 0.5, 0.3, 0.5, true, 0xe74c3c, 'cyl'),
      ob(35, 0, 0.5, 0.3, 0.5, true, 0xe74c3c, 'cyl'),
      ob(-35, 0, 0.5, 0.3, 0.5, true, 0xe74c3c, 'cyl'),

      // ============ WOODEN SIGNPOSTS ============
      ob(-5, 30, 0.2, 2, 0.2, false, 0x7a5230, 'box'),                      // post
      ob(-5, 30, 1.5, 0.8, 0.1, false, 0xe8d5b7, 'box', 0, false, 1.5),     // sign board
      ob(5, -30, 0.2, 2, 0.2, false, 0x7a5230, 'box'),
      ob(5, -30, 1.5, 0.8, 0.1, false, 0xe8d5b7, 'box', 0, false, 1.5),
      ob(20, 0, 0.2, 2, 0.2, false, 0x7a5230, 'box'),
      ob(20, 0, 1.5, 0.8, 0.1, false, 0xe8d5b7, 'box', 0, false, 1.5),

      // ============ FALLEN TREE (climbable, near river) ============
      ob(0, 35, 0.8, 1, 6, true, 0x5d4037, 'box'),
    ],
    spawns: [[0,-60],[0,60],[-60,0],[60,0],[-55,-55],[55,55]],
  },
  {
    id: 'paisaje', name: 'Paisaje', theme: 'Río y montañas', ground: 0x5a8a4a, fog: 0x7aa85a, accent: 0x4a6a3a,
    waterLevel: 0.3,
    obstacles: [
      // Large rocks (climbable via smaller rocks)
      ob(-35, -25, 4, 4, 4, true, 0x95a5a6, 'box'), ob(35, 25, 4, 4, 4, true, 0x7f8c8d, 'box'),
      ob(35, -25, 4, 4, 4, true, 0x95a5a6, 'box'), ob(-35, 25, 4, 4, 4, true, 0x7f8c8d, 'box'),
      // Small rocks for climbing
      ob(-25, -18, 1.5, 1.5, 1.5, true, 0x95a5a6, 'box'), ob(25, 18, 1.5, 1.5, 1.5, true, 0x7f8c8d, 'box'),
      ob(25, -18, 1.5, 1.5, 1.5, true, 0x95a5a6, 'box'), ob(-25, 18, 1.5, 1.5, 1.5, true, 0x7f8c8d, 'box'),
      // River (water plane)
      ob(0, 0, 6, 0.3, 24, false, 0x3498db, 'water', 0, true),
      // River banks (low walls)
      ob(-9, 0, 0.5, 1, 24, false, 0x8a7a5a, 'wall'), ob(9, 0, 0.5, 1, 24, false, 0x8a7a5a, 'wall'),
      // Trees on banks
      ...buildTree(-45, -35, 1.3), ...buildTree(45, 35, 1.3),
      ...buildTree(-45, 35, 1.3), ...buildTree(45, -35, 1.3),
      // Bridge across river
      ob(0, 0, 3, 0.5, 8, true, 0x7a5230, 'box'),
      // Hills (climbable mounds)
      ob(0, -50, 6, 2, 4, true, 0x6a9a5a, 'box'), ob(0, 50, 6, 2, 4, true, 0x6a9a5a, 'box'),
      // Tower with stairs (vantage point)
      ob(-50, 0, 3, 6, 3, true, 0x95a5a6, 'box'),
      ...buildStairs(-43, 0, 6, 'W', 0x7f8c8d),
    ],
    spawns: [[0,-60],[0,60],[-60,0],[60,0]],
  },
]

export function getMap(id: string): GameMap {
  return MAPS.find(m => m.id === id) ?? MAPS[0]
}

export function getSkin(id: string): Skin {
  return SKINS.find(s => s.id === id) ?? SKINS[0]
}
export function getWeapon(id: string): Weapon {
  return WEAPONS[id] ?? WEAPONS.pistol
}
export function getTeam(id: string) {
  return TEAMS[(id as Team)] ?? TEAMS.none
}

// Mode helpers (mirror server)
export function isPvPMode(mode: GameMode): boolean { return mode === '1v1' || mode === '2v2' || mode === 'team' || mode === 'ffa' }
export function isPvEMode(mode: GameMode): boolean { return mode === 'coop' || mode === 'mixed' }
export function hasMobs(mode: GameMode): boolean { return mode === 'coop' || mode === 'mixed' }
export function maxPlayersForMode(mode: GameMode): number {
  if (mode === '1v1') return 2
  if (mode === '2v2') return 4
  if (mode === 'ffa') return 8
  return 12
}
export const MODE_INFO: Record<GameMode, { name: string; desc: string; icon: string; team: boolean }> = {
  '1v1':   { name: '1 vs 1',      desc: 'Azul vs Rojo, 1 cada uno',  icon: '⚔️', team: true },
  '2v2':   { name: '2 vs 2',      desc: 'Azul vs Rojo, 2 cada uno',  icon: '⚔️', team: true },
  'team':  { name: 'Equipos',     desc: 'Azul vs Rojo, hasta 6',     icon: '🛡️', team: true },
  'ffa':   { name: 'Todos x todos', desc: 'Sin equipos, todos contra todos', icon: '💀', team: false },
  'coop':  { name: 'Cooperativo', desc: 'Jugadores vs Mobs',          icon: '🤝', team: false },
  'mixed': { name: 'Mixto',       desc: 'Jugadores vs Mobs + vs otros', icon: '🔥', team: false },
}

// PvE difficulty scaling per level
export function pveLevelConfig(level: number) {
  return {
    mobCount: Math.min(14, 4 + Math.floor(level * 1.4)),
    mobHp: MOB_MAX_HP + (level - 1) * 18,
    mobSpeed: Math.min(6.5, 3.4 + (level - 1) * 0.28),
    mobDamage: 9 + (level - 1) * 2,
    mapId: MAPS[(level - 1) % MAPS.length].id,
  }
}
