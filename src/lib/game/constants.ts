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
  pistol:  { id: 'pistol',  name: 'Pistola',  damage: 18, fireRate: 330, magazine: 12, reload: 1200, spread: 0.012, auto: false, range: 80, pellets: 1 },
  smg:     { id: 'smg',     name: 'SMG',      damage: 12, fireRate: 90,  magazine: 30, reload: 1500, spread: 0.035, auto: true,  range: 60, pellets: 1 },
  rifle:   { id: 'rifle',   name: 'Rifle',    damage: 26, fireRate: 170, magazine: 20, reload: 1800, spread: 0.018, auto: true,  range: 95, pellets: 1 },
  shotgun: { id: 'shotgun', name: 'Escopeta', damage: 11, fireRate: 720, magazine: 6,  reload: 2100, spread: 0.13,  auto: false, range: 32, pellets: 7 },
}

export const WEAPON_ORDER = ['pistol', 'smg', 'rifle', 'shotgun']

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
export type ItemType = 'ammo' | 'heal' | 'shield'
export interface ItemDef { id: ItemType; name: string; color: string; icon: string }
export const ITEMS: Record<ItemType, ItemDef> = {
  ammo:   { id: 'ammo',   name: 'Cartucho',  color: '#f1c40f', icon: 'ammo' },
  heal:   { id: 'heal',   name: 'Cruz',      color: '#e74c3c', icon: 'heal' },
  shield: { id: 'shield', name: 'Bebida',    color: '#1abc9c', icon: 'shield' },
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
    id: 'escuela', name: 'Escuela', theme: 'Escuela con salones', ground: 0xd5d8de, fog: 0xe0e3e8, accent: 0xa0a8b0,
    obstacles: [
      // Main school building — 60x60, height 6 (bigger for the larger arena)
      ...buildHouse(0, 0, 60, 60, 6, 0xe8e0d0, 0xc0392b, 'S'),
      // (interior dividers removed — they blocked movement inside)
      // Desks in 4 classrooms (16 desks filling the bigger space)
      ...[-22, -15, 15, 22].flatMap(x => [-22, -15, 15, 22].map(z => ob(x, z, 1.5, 0.8, 1, true, 0xe8d5b7, 'box'))),
      // Blackboards on 3 walls (south blackboard removed — it blocked the door)
      ob(-28, 0, 0.3, 2, 4, false, 0x1a1a1a, 'wall'),  // west blackboard
      ob(28, 0, 0.3, 2, 4, false, 0x1a1a1a, 'wall'),   // east blackboard
      ob(0, -28, 4, 2, 0.3, false, 0x1a1a1a, 'wall'),  // north blackboard
      // Lockers along east/west walls (moved away from south door)
      ob(-28, -22, 0.8, 2.5, 1, true, 0x3498db, 'box'), ob(-28, -15, 0.8, 2.5, 1, true, 0xe74c3c, 'box'),
      ob(28, -22, 0.8, 2.5, 1, true, 0x27ae60, 'box'), ob(28, -15, 0.8, 2.5, 1, true, 0xf1c40f, 'box'),
      ob(-28, 15, 0.8, 2.5, 1, true, 0x9b59b6, 'box'), ob(-28, 22, 0.8, 2.5, 1, true, 0xe67e22, 'box'),
      ob(28, 15, 0.8, 2.5, 1, true, 0x1abc9c, 'box'), ob(28, 22, 0.8, 2.5, 1, true, 0x3498db, 'box'),
      // Basketball court elements (outside building, in courtyard) — scaled by 2.5
      ob(0, -45, 0.3, 3, 0.3, false, 0xe74c3c, 'box'),  // hoop pole
      ob(0, -45, 1.5, 0.1, 0.8, false, 0xe74c3c, 'box'),  // backboard
      ob(0, 45, 0.3, 3, 0.3, false, 0x3498db, 'box'),
      ob(0, 45, 1.5, 0.1, 0.8, false, 0x3498db, 'box'),
      // Trash cans (moved to sides, away from door path at z=+30)
      ob(-20, -10, 1, 1.2, 1, true, 0x555555, 'box'), ob(20, -10, 1, 1.2, 1, true, 0x555555, 'box'),
      // Stairs to second floor (roof access) — scaled position
      ...buildStairs(-25, 5, 6, 'E', 0xd5c4a0),
    ],
    spawns: [[0,-60],[0,60],[-60,0],[60,0]],
  },
  {
    id: 'oficinas', name: 'Oficinas', theme: 'Edificio corporativo', ground: 0xc8ccd0, fog: 0xd0d4d8, accent: 0x9098a0,
    obstacles: [
      // 8 office buildings (enterable) — scaled for bigger arena
      ...buildHouse(-45, -30, 6, 6, 4, 0xa3c8e0, 0x2c3e50, 'S'),
      ...buildHouse(-15, -30, 6, 6, 4, 0xa3c8e0, 0x2c3e50, 'S'),
      ...buildHouse(15, -30, 6, 6, 4, 0xa3c8e0, 0x2c3e50, 'S'),
      ...buildHouse(45, -30, 6, 6, 4, 0xa3c8e0, 0x2c3e50, 'S'),
      ...buildHouse(-45, 30, 6, 6, 4, 0xd5c4a0, 0x2c3e50, 'N'),
      ...buildHouse(-15, 30, 6, 6, 4, 0xd5c4a0, 0x2c3e50, 'N'),
      ...buildHouse(15, 30, 6, 6, 4, 0xd5c4a0, 0x2c3e50, 'N'),
      ...buildHouse(45, 30, 6, 6, 4, 0xd5c4a0, 0x2c3e50, 'N'),
      // 5-floor office tower in center
      ...buildTower(0, 0, 7, 7, 5, 0x9098a0, 0x2c3e50),
      // Glass partitions
      ob(-25, 0, 0.3, 2, 8, true, 0xb8d4e3, 'wall'), ob(25, 0, 0.3, 2, 8, true, 0xb8d4e3, 'wall'),
      // Trash cans for climbing
      ob(-35, -20, 1, 1.2, 1, true, 0x555555), ob(-5, -20, 1, 1.2, 1, true, 0x555555),
      ob(25, -20, 1, 1.2, 1, true, 0x555555), ob(35, 20, 1, 1.2, 1, true, 0x555555),
      // Office desks
      ob(-35, 0, 3, 0.8, 1.5, true, 0xe8d5b7, 'box'), ob(35, 0, 3, 0.8, 1.5, true, 0xe8d5b7, 'box'),
      // Ramps to second level
      ob(-10, -15, 2, 1, 4, true, 0xd5c4a0, 'ramp'), ob(10, 15, 2, 1, 4, true, 0xd5c4a0, 'ramp'),
      // Bridges connecting buildings
      ob(0, -30, 12, 0.3, 2, true, 0x8a92a0, 'roof', 0, false, 4),
      ob(0, 30, 12, 0.3, 2, true, 0x8a92a0, 'roof', 0, false, 4),
    ],
    spawns: [[0,-60],[0,60],[-60,0],[60,0]],
  },
  {
    id: 'bosque', name: 'Bosque', theme: 'Bosque con río', ground: 0x4a7a3a, fog: 0x6a9a5a, accent: 0x3a5a2a,
    waterLevel: 0.3,
    obstacles: [
      // Detailed trees with trunk + foliage
      ...buildTree(-30, -30, 1.5), ...buildTree(30, -30, 1.5),
      ...buildTree(-30, 30, 1.5), ...buildTree(30, 30, 1.5),
      ...buildTree(0, -45, 2), ...buildTree(0, 45, 2),
      ...buildTree(-45, 0, 1.2), ...buildTree(45, 0, 1.2),
      // River (water plane, shallow — sink slightly)
      ob(0, 0, 8, 0.3, 24, false, 0x3498db, 'water', 0, true),
      // Rocks for climbing to tree tops
      ob(-23, -23, 2, 2, 2, true, 0x95a5a6, 'box'), ob(23, -23, 2, 2, 2, true, 0x95a5a6, 'box'),
      ob(-23, 23, 2, 2, 2, true, 0x7f8c8d, 'box'), ob(23, 23, 2, 2, 2, true, 0x7f8c8d, 'box'),
      // Fallen logs (low cover, climbable)
      ob(-13, -13, 5, 1, 1, true, 0x7a5230, 'box'), ob(13, 13, 5, 1, 1, true, 0x7a5230, 'box'),
      // Boulders (large rocks)
      ob(-45, -10, 3, 2.5, 3, true, 0x95a5a6, 'box'), ob(45, 10, 3, 2.5, 3, true, 0x7f8c8d, 'box'),
      // Bridge across river
      ob(0, 0, 3, 0.5, 6, true, 0x7a5230, 'box'),
      // Bushes (low, non-climbable)
      ob(-20, 0, 3, 0.8, 2, false, 0x27ae60, 'box'), ob(20, 0, 3, 0.8, 2, false, 0x27ae60, 'box'),
      // Tree stump (climbable)
      ob(-38, 15, 1.5, 1, 1.5, true, 0x7a5230, 'box'), ob(38, -15, 1.5, 1, 1.5, true, 0x7a5230, 'box'),
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
