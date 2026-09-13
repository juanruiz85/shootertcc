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

export const ARENA_SIZE = 64
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

// Build a multi-floor tower: enterable, with internal stairs
// floors = number of stories, each floor has walls with a door + stairs inside
function buildTower(cx: number, cz: number, w: number, d: number, floors: number, color: number, roofColor: number): MapObstacle[] {
  const result: MapObstacle[] = []
  const floorH = 3.0  // height per floor
  const wallT = 0.3
  const doorW = 1.5
  const totalH = floors * floorH
  // Outer walls (full height, with door gap on south side at ground floor only)
  // North wall (full)
  result.push(ob(cx, cz - d/2, w, totalH, wallT, false, color, 'wall'))
  // East wall (full)
  result.push(ob(cx + w/2, cz, wallT, totalH, d, false, color, 'wall'))
  // West wall (full)
  result.push(ob(cx - w/2, cz, wallT, totalH, d, false, color, 'wall'))
  // South wall with door gaps at each floor
  for (let f = 0; f < floors; f++) {
    const fy = f * floorH
    // wall segments on either side of door
    result.push(ob(cx - w/4 - doorW/4, cz + d/2, w/2 - doorW/2, floorH - 0.1, wallT, false, color, 'wall', 0, false, fy))
    result.push(ob(cx + w/4 + doorW/4, cz + d/2, w/2 - doorW/2, floorH - 0.1, wallT, false, color, 'wall', 0, false, fy))
    // window above door
    result.push(ob(cx, cz + d/2, doorW, 0.8, wallT, false, color, 'wall', 0, true, fy + 2.0))
    // floor platform (roof type, walkable) for upper floors
    if (f > 0) {
      result.push(ob(cx, cz, w - wallT * 2, 0.2, d - wallT * 2, true, color, 'roof', 0, false, fy))
      // stairs inside (going up to next floor)
      if (f < floors) {
        result.push(...buildStairs(cx - w/4, cz, 4, 'N', 0x8a7a5a).map(s => ({ ...s, y: (s.y || 0) + fy })))
      }
    }
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
      ob(-14, -10, 4, 3, 4, true, C_WOOD),
      ob(12, 8, 5, 2.5, 3, true, C_WOOD),
      ob(-18, 14, 2.5, 3.5, 2.5, true, C_PILLAR, 'cyl'),
      ob(18, -16, 4, 3, 4, true, C_WOOD),
      ob(8, -6, 1.6, 3.2, 1.6, false, C_PILLAR, 'cyl'),
      ob(-8, 6, 1.6, 3.2, 1.6, false, C_PILLAR, 'cyl'),
      ob(-4, -20, 6, 2, 2, true, C_STONE),
      ob(16, 18, 2, 2, 6, true, C_STONE),
    ],
    spawns: [[0,-22],[0,22],[22,0],[-22,0],[16,-16],[-16,16]],
  },
  {
    id: 'patios', name: 'Patios', theme: 'Cuadrantes', ground: G_SAND, fog: 0xf6efde, accent: 0xe0d5b8,
    obstacles: [
      ob(-10,-10, 3,3,3, true, C_WOOD), ob(10,-10, 3,3,3, true, C_WOOD),
      ob(-10,10, 3,3,3, true, C_WOOD),  ob(10,10, 3,3,3, true, C_WOOD),
      ob(0,-18, 8,2,2, true, C_STONE), ob(0,18, 8,2,2, true, C_STONE),
      ob(-18,0, 2,2,8, true, C_STONE), ob(18,0, 2,2,8, true, C_STONE),
      ob(0,0, 2,4,2, true, C_PILLAR),
    ],
    spawns: [[-20,-20],[20,20],[20,-20],[-20,20],[0,-24],[0,24]],
  },
  {
    id: 'bunkers', name: 'Bunkers', theme: 'Trincheras', ground: G_STONE, fog: 0xeae6e0, accent: 0xcfc8bc,
    obstacles: [
      ob(-16,-8, 12,2,2, true, C_STONE), ob(16,8, 12,2,2, true, C_STONE),
      ob(-8,8, 2,2,12, true, C_STONE), ob(8,-8, 2,2,12, true, C_STONE),
      ob(0,-20, 18,3,2, true, C_DARK), ob(0,20, 18,3,2, true, C_DARK),
      ob(-22,0, 2,3,10, true, C_DARK), ob(22,0, 2,3,10, true, C_DARK),
      ob(0,0, 4,3.5,4, true, C_WOOD),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0]],
  },
  {
    id: 'torres', name: 'Torres', theme: 'Pilares', ground: G_STONE, fog: 0xeae6e0, accent: 0xcfc8bc,
    obstacles: [
      ob(-14,-14, 3,5,3, true, C_PILLAR,'cyl'), ob(14,-14, 3,5,3, true, C_PILLAR,'cyl'),
      ob(-14,14, 3,5,3, true, C_PILLAR,'cyl'),  ob(14,14, 3,5,3, true, C_PILLAR,'cyl'),
      ob(0,0, 4,6,4, true, C_PILLAR),
      ob(-22,0, 2,3,2, true, C_WOOD), ob(22,0, 2,3,2, true, C_WOOD),
      ob(0,-22, 2,3,2, true, C_WOOD), ob(0,22, 2,3,2, true, C_WOOD),
    ],
    spawns: [[0,-24],[0,24],[24,0],[-24,0],[-20,-20],[20,20]],
  },
  {
    id: 'crucero', name: 'Crucero', theme: 'Cruz', ground: G_PAPER, fog: 0xfdfbf7, accent: 0xe8e4df,
    obstacles: [
      ob(0,-12, 4,3,16, true, C_WOOD), ob(0,12, 4,3,16, true, C_WOOD),
      ob(-12,0, 16,3,4, true, C_WOOD), ob(12,0, 16,3,4, true, C_WOOD),
      ob(0,0, 3,5,3, true, C_STONE),
      ob(-20,-20, 3,2,3, true, C_DARK), ob(20,-20, 3,2,3, true, C_DARK),
      ob(-20,20, 3,2,3, true, C_DARK), ob(20,20, 3,2,3, true, C_DARK),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0]],
  },
  {
    id: 'espinas', name: 'Espinas', theme: 'Zig-zag', ground: G_SAND, fog: 0xf6efde, accent: 0xe0d5b8,
    obstacles: [
      ob(-18,-16, 2,3,8, true, C_STONE), ob(-9,-8, 8,3,2, true, C_STONE),
      ob(0,0, 2,3,8, true, C_STONE), ob(9,8, 8,3,2, true, C_STONE),
      ob(18,16, 2,3,8, true, C_STONE),
      ob(-9,8, 2,3,8, true, C_WOOD), ob(9,-8, 2,3,8, true, C_WOOD),
      ob(0,-20, 6,2,2, true, C_DARK), ob(0,20, 6,2,2, true, C_DARK),
    ],
    spawns: [[-24,-24],[24,24],[-24,24],[24,-24]],
  },
  {
    id: 'fortaleza', name: 'Fortaleza', theme: 'Murallas', ground: G_STONE, fog: 0xeae6e0, accent: 0xcfc8bc,
    obstacles: [
      ob(0,-20, 30,3,2, true, C_DARK), ob(0,20, 30,3,2, true, C_DARK),
      ob(-20,0, 2,3,30, true, C_DARK), ob(20,0, 2,3,30, true, C_DARK),
      ob(-10,-10, 3,4,3, true, C_STONE), ob(10,-10, 3,4,3, true, C_STONE),
      ob(-10,10, 3,4,3, true, C_STONE), ob(10,10, 3,4,3, true, C_STONE),
      ob(0,0, 5,3,5, true, C_WOOD),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0]],
  },
  {
    id: 'laberinto', name: 'Laberinto', theme: 'Maze', ground: G_GRASS, fog: 0xeef5e6, accent: 0xcfdcc0,
    obstacles: [
      ob(-12,-12, 2,3,12, true, C_WOOD), ob(0,-6, 12,3,2, true, C_WOOD),
      ob(12,0, 2,3,12, true, C_WOOD), ob(-6,12, 12,3,2, true, C_WOOD),
      ob(-18,6, 6,3,2, true, C_STONE), ob(6,-18, 2,3,6, true, C_STONE),
      ob(18,-6, 6,3,2, true, C_STONE), ob(-6,18, 2,3,6, true, C_STONE),
      ob(0,0, 2,2,2, false, C_DARK),
    ],
    spawns: [[-24,-24],[24,24],[24,-24],[-24,24],[0,-24],[0,24]],
  },
  {
    id: 'puentes', name: 'Puentes', theme: 'Rampas', ground: G_SAND, fog: 0xf6efde, accent: 0xe0d5b8,
    obstacles: [
      ob(0,-10, 4,2,12, true, C_WOOD), ob(0,10, 4,2,12, true, C_WOOD),
      ob(-12,0, 12,2,4, true, C_WOOD), ob(12,0, 12,2,4, true, C_WOOD),
      ob(-18,-18, 4,4,4, true, C_STONE,'ramp'), ob(18,18, 4,4,4, true, C_STONE,'ramp'),
      ob(18,-18, 4,4,4, true, C_STONE,'ramp'), ob(-18,18, 4,4,4, true, C_STONE,'ramp'),
      ob(0,0, 3,5,3, true, C_PILLAR),
    ],
    spawns: [[0,-24],[0,24],[24,0],[-24,0]],
  },
  {
    id: 'crater', name: 'Cráter', theme: 'Anillo', ground: G_LAVA, fog: 0xf6e3d8, accent: 0xe0c8bc,
    obstacles: [
      ob(0,0, 6,1.5,6, true, C_RED),
      ob(-12,0, 2,3,2, true, C_STONE), ob(12,0, 2,3,2, true, C_STONE),
      ob(0,-12, 2,3,2, true, C_STONE), ob(0,12, 2,3,2, true, C_STONE),
      ob(-18,-18, 3,3,3, true, C_DARK), ob(18,-18, 3,3,3, true, C_DARK),
      ob(-18,18, 3,3,3, true, C_DARK), ob(18,18, 3,3,3, true, C_DARK),
      ob(0,-22, 8,2,2, true, C_STONE), ob(0,22, 8,2,2, true, C_STONE),
    ],
    spawns: [[0,-24],[0,24],[24,0],[-24,0],[-22,-22],[22,22]],
  },
  {
    id: 'zigzag', name: 'Zigzag', theme: 'Dientes', ground: G_PAPER, fog: 0xfdfbf7, accent: 0xe8e4df,
    obstacles: [
      ob(-16,-12, 3,3,3, true, C_WOOD), ob(-8,12, 3,3,3, true, C_WOOD),
      ob(0,-12, 3,3,3, true, C_WOOD), ob(8,12, 3,3,3, true, C_WOOD),
      ob(16,-12, 3,3,3, true, C_WOOD),
      ob(-12,0, 2,4,2, true, C_PILLAR,'cyl'), ob(12,0, 2,4,2, true, C_PILLAR,'cyl'),
      ob(0,0, 4,5,4, true, C_STONE),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0]],
  },
  {
    id: 'diamante', name: 'Diamante', theme: 'Rombo', ground: G_SNOW, fog: 0xf7fafc, accent: 0xdfe7ec,
    obstacles: [
      ob(0,-14, 4,3,4, true, C_BLUE), ob(14,0, 4,3,4, true, C_BLUE),
      ob(0,14, 4,3,4, true, C_BLUE), ob(-14,0, 4,3,4, true, C_BLUE),
      ob(0,0, 5,5,5, true, C_STONE),
      ob(-20,-20, 3,2,3, true, C_WOOD), ob(20,-20, 3,2,3, true, C_WOOD),
      ob(-20,20, 3,2,3, true, C_WOOD), ob(20,20, 3,2,3, true, C_WOOD),
    ],
    spawns: [[0,-24],[0,24],[24,0],[-24,0]],
  },
  {
    id: 'colmena', name: 'Colmena', theme: 'Celdas', ground: G_GRASS, fog: 0xeef5e6, accent: 0xcfdcc0,
    obstacles: [
      ob(-12,-12, 4,3,4, true, C_WOOD), ob(0,-12, 4,3,4, true, C_WOOD), ob(12,-12, 4,3,4, true, C_WOOD),
      ob(-12,0, 4,3,4, true, C_WOOD), ob(12,0, 4,3,4, true, C_WOOD),
      ob(-12,12, 4,3,4, true, C_WOOD), ob(0,12, 4,3,4, true, C_WOOD), ob(12,12, 4,3,4, true, C_WOOD),
      ob(0,0, 4,2,4, true, C_STONE),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0],[-24,-24],[24,24]],
  },
  {
    id: 'ruinas', name: 'Ruinas', theme: 'Escombros', ground: G_STONE, fog: 0xeae6e0, accent: 0xcfc8bc,
    obstacles: [
      ob(-16,-14, 6,2,3, true, C_DARK), ob(-14,12, 4,3,4, true, C_STONE),
      ob(12,-16, 5,2.5,4, true, C_WOOD), ob(16,12, 3,3,5, true, C_DARK),
      ob(0,-6, 2,4,2, true, C_PILLAR,'cyl'), ob(0,8, 2,4,2, true, C_PILLAR,'cyl'),
      ob(-6,0, 3,1.5,3, true, C_STONE), ob(6,0, 3,1.5,3, true, C_STONE),
      ob(0,0, 8,1,8, true, C_RED),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0],[-22,-22],[22,22]],
  },
  {
    id: 'estadio', name: 'Estadio', theme: 'Graderías', ground: G_GRASS, fog: 0xeef5e6, accent: 0xcfdcc0,
    obstacles: [
      ob(0,-22, 44,4,2, true, C_STONE), ob(0,22, 44,4,2, true, C_STONE),
      ob(-22,0, 2,4,44, true, C_STONE), ob(22,0, 2,4,44, true, C_STONE),
      ob(0,-16, 30,2,2, true, C_WOOD), ob(0,16, 30,2,2, true, C_WOOD),
      ob(-16,0, 2,2,16, true, C_WOOD), ob(16,0, 2,2,16, true, C_WOOD),
      ob(0,0, 4,3,4, true, C_DARK),
    ],
    spawns: [[0,-18],[0,18],[-18,0],[18,0]],
  },
  {
    id: 'nucleo', name: 'Núcleo', theme: 'Anillo central', ground: G_LAVA, fog: 0xf6e3d8, accent: 0xe0c8bc,
    obstacles: [
      ob(0,0, 8,1.5,8, true, C_RED),
      ob(-10,0, 2,4,2, true, C_PILLAR,'cyl'), ob(10,0, 2,4,2, true, C_PILLAR,'cyl'),
      ob(0,-10, 2,4,2, true, C_PILLAR,'cyl'), ob(0,10, 2,4,2, true, C_PILLAR,'cyl'),
      ob(-16,-16, 4,3,4, true, C_STONE), ob(16,-16, 4,3,4, true, C_STONE),
      ob(-16,16, 4,3,4, true, C_STONE), ob(16,16, 4,3,4, true, C_STONE),
      ob(0,-22, 10,2,2, true, C_WOOD), ob(0,22, 10,2,2, true, C_WOOD),
    ],
    spawns: [[0,-24],[0,24],[24,0],[-24,0]],
  },
  // ===== DETAILED MAPS — Roblox/Fortnite/CoD inspired =====
  {
    id: 'barrio', name: 'Barrio', theme: 'Conjunto residencial', ground: 0xb0b8c0, fog: 0xc8d0d8, accent: 0x8a92a0,
    obstacles: [
      // 8 enterable houses with doors + windows + roofs (bigger neighborhood)
      ...buildHouse(-20, -16, 6, 6, 3.5, 0xe8d5b7, 0xc0392b, 'S'),
      ...buildHouse(-8, -16, 6, 6, 3.5, 0xd5c4a0, 0x2980b9, 'S'),
      ...buildHouse(8, -16, 6, 6, 3.5, 0xcdb98a, 0x27ae60, 'S'),
      ...buildHouse(20, -16, 6, 6, 3.5, 0xe8d5b7, 0xf1c40f, 'S'),
      ...buildHouse(-20, 16, 6, 6, 3.5, 0xd5c4a0, 0x8e44ad, 'N'),
      ...buildHouse(-8, 16, 6, 6, 3.5, 0xe8d5b7, 0xe67e22, 'N'),
      ...buildHouse(8, 16, 6, 6, 3.5, 0xcdb98a, 0x1abc9c, 'N'),
      ...buildHouse(20, 16, 6, 6, 3.5, 0xe8d5b7, 0xe74c3c, 'N'),
      // 5-floor tower in center (enterable, with internal stairs)
      ...buildTower(0, 0, 8, 8, 5, 0xa0a8b0, 0x2c3e50),
      // trash cans next to houses (for climbing to roof)
      ob(-17, -12, 1, 1.2, 1, true, 0x555555), ob(-5, -12, 1, 1.2, 1, true, 0x555555),
      ob(11, -12, 1, 1.2, 1, true, 0x555555), ob(23, -12, 1, 1.2, 1, true, 0x555555),
      ob(-17, 12, 1, 1.2, 1, true, 0x555555), ob(-5, 12, 1, 1.2, 1, true, 0x555555),
      ob(11, 12, 1, 1.2, 1, true, 0x555555), ob(23, 12, 1, 1.2, 1, true, 0x555555),
      // cars on the street
      ...buildCar(-14, 0, 0xe74c3c, 0), ...buildCar(14, 0, 0x3498db, 0),
      ...buildCar(0, -8, 0x27ae60, Math.PI/2), ...buildCar(0, 8, 0xf1c40f, Math.PI/2),
      // street lamps
      ob(-12, -4, 0.2, 3, 0.2, false, 0x2c3e50, 'cyl'), ob(12, 4, 0.2, 3, 0.2, false, 0x2c3e50, 'cyl'),
      // crates for climbing
      ob(-6, -4, 1.5, 1.5, 1.5, true, 0xe8d5b7), ob(6, 4, 1.5, 1.5, 1.5, true, 0xe8d5b7),
      // low fences between houses
      ob(-14, -16, 0.3, 1.5, 4, false, 0x8a92a0, 'wall'), ob(14, -16, 0.3, 1.5, 4, false, 0x8a92a0, 'wall'),
      ob(-14, 16, 0.3, 1.5, 4, false, 0x8a92a0, 'wall'), ob(14, 16, 0.3, 1.5, 4, false, 0x8a92a0, 'wall'),
      // central water fountain (decorative)
      ob(0, -4, 2, 0.4, 2, true, 0x3498db, 'water', 0, true),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0],[-24,-24],[24,24]],
  },
  {
    id: 'escuela', name: 'Escuela', theme: 'Escuela con salones', ground: 0xd5d8de, fog: 0xe0e3e8, accent: 0xa0a8b0,
    obstacles: [
      // Main school building — closed, with 4 classrooms inside
      // Outer walls (large building 30x30)
      ...buildHouse(0, 0, 30, 30, 5, 0xe8e0d0, 0xc0392b, 'S'),
      // Interior classroom walls (dividing into 4 rooms)
      ob(0, 0, 30, 4, 0.3, false, 0xd5c4a0, 'wall'),  // horizontal divider
      ob(0, 0, 0.3, 4, 30, false, 0xd5c4a0, 'wall'),  // vertical divider
      // Desks in each classroom
      ...[-9, 9].flatMap(x => [-9, 9].map(z => ob(x, z, 1.5, 0.8, 1, true, 0xe8d5b7, 'box'))),
      ...[-6, 6].flatMap(x => [-9, 9].map(z => ob(x, z, 1.5, 0.8, 1, true, 0xe8d5b7, 'box'))),
      ...[-9, 9].flatMap(x => [-6, 6].map(z => ob(x, z, 1.5, 0.8, 1, true, 0xe8d5b7, 'box'))),
      // Blackboards on walls
      ob(-14, 0, 0.3, 2, 4, false, 0x1a1a1a, 'wall'),  // west blackboard
      ob(14, 0, 0.3, 2, 4, false, 0x1a1a1a, 'wall'),   // east blackboard
      ob(0, -14, 4, 2, 0.3, false, 0x1a1a1a, 'wall'),  // north blackboard
      ob(0, 14, 4, 2, 0.3, false, 0x1a1a1a, 'wall'),   // south blackboard
      // Lockers along walls
      ob(-14, -10, 0.8, 2.5, 1, true, 0x3498db, 'box'), ob(-14, -7, 0.8, 2.5, 1, true, 0xe74c3c, 'box'),
      ob(14, 10, 0.8, 2.5, 1, true, 0x27ae60, 'box'), ob(14, 7, 0.8, 2.5, 1, true, 0xf1c40f, 'box'),
      // Basketball court elements (outside building, in courtyard)
      ob(0, -20, 0.3, 3, 0.3, false, 0xe74c3c, 'box'),  // hoop pole
      ob(0, -20, 1.5, 0.1, 0.8, false, 0xe74c3c, 'box'),  // backboard
      ob(0, 20, 0.3, 3, 0.3, false, 0x3498db, 'box'),
      ob(0, 20, 1.5, 0.1, 0.8, false, 0x3498db, 'box'),
      // Trash cans
      ob(-10, 0, 1, 1.2, 1, true, 0x555555, 'box'), ob(10, 0, 1, 1.2, 1, true, 0x555555, 'box'),
      // Stairs to second floor (roof access)
      ...buildStairs(-13, 0, 6, 'E', 0xd5c4a0),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0]],
  },
  {
    id: 'oficinas', name: 'Oficinas', theme: 'Edificio corporativo', ground: 0xc8ccd0, fog: 0xd0d4d8, accent: 0x9098a0,
    obstacles: [
      // 6 office buildings (enterable) — bigger map
      ...buildHouse(-18, -12, 6, 6, 4, 0xa3c8e0, 0x2c3e50, 'S'),
      ...buildHouse(-6, -12, 6, 6, 4, 0xa3c8e0, 0x2c3e50, 'S'),
      ...buildHouse(6, -12, 6, 6, 4, 0xa3c8e0, 0x2c3e50, 'S'),
      ...buildHouse(18, -12, 6, 6, 4, 0xa3c8e0, 0x2c3e50, 'S'),
      ...buildHouse(-18, 12, 6, 6, 4, 0xd5c4a0, 0x2c3e50, 'N'),
      ...buildHouse(-6, 12, 6, 6, 4, 0xd5c4a0, 0x2c3e50, 'N'),
      ...buildHouse(6, 12, 6, 6, 4, 0xd5c4a0, 0x2c3e50, 'N'),
      ...buildHouse(18, 12, 6, 6, 4, 0xd5c4a0, 0x2c3e50, 'N'),
      // 5-floor office tower in center
      ...buildTower(0, 0, 7, 7, 5, 0x9098a0, 0x2c3e50),
      // Glass partitions
      ob(-10, 0, 0.3, 2, 8, true, 0xb8d4e3, 'wall'), ob(10, 0, 0.3, 2, 8, true, 0xb8d4e3, 'wall'),
      // Trash cans for climbing
      ob(-14, -8, 1, 1.2, 1, true, 0x555555), ob(-2, -8, 1, 1.2, 1, true, 0x555555),
      ob(10, -8, 1, 1.2, 1, true, 0x555555), ob(14, 8, 1, 1.2, 1, true, 0x555555),
      // Office desks
      ob(-14, 0, 3, 0.8, 1.5, true, 0xe8d5b7, 'box'), ob(14, 0, 3, 0.8, 1.5, true, 0xe8d5b7, 'box'),
      // Ramps to second level
      ob(-4, -6, 2, 1, 4, true, 0xd5c4a0, 'ramp'), ob(4, 6, 2, 1, 4, true, 0xd5c4a0, 'ramp'),
      // Bridges connecting buildings
      ob(0, -12, 12, 0.3, 2, true, 0x8a92a0, 'roof', 0, false, 4),
      ob(0, 12, 12, 0.3, 2, true, 0x8a92a0, 'roof', 0, false, 4),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0]],
  },
  {
    id: 'bosque', name: 'Bosque', theme: 'Bosque con río', ground: 0x4a7a3a, fog: 0x6a9a5a, accent: 0x3a5a2a,
    waterLevel: 0.3,
    obstacles: [
      // Detailed trees with trunk + foliage
      ...buildTree(-12, -12, 1.5), ...buildTree(12, -12, 1.5),
      ...buildTree(-12, 12, 1.5), ...buildTree(12, 12, 1.5),
      ...buildTree(0, -18, 2), ...buildTree(0, 18, 2),
      ...buildTree(-18, 0, 1.2), ...buildTree(18, 0, 1.2),
      // River (water plane, shallow — sink slightly)
      ob(0, 0, 8, 0.3, 24, false, 0x3498db, 'water', 0, true),
      // Rocks for climbing to tree tops
      ob(-9, -9, 2, 2, 2, true, 0x95a5a6, 'box'), ob(9, -9, 2, 2, 2, true, 0x95a5a6, 'box'),
      ob(-9, 9, 2, 2, 2, true, 0x7f8c8d, 'box'), ob(9, 9, 2, 2, 2, true, 0x7f8c8d, 'box'),
      // Fallen logs (low cover, climbable)
      ob(-5, -5, 5, 1, 1, true, 0x7a5230, 'box'), ob(5, 5, 5, 1, 1, true, 0x7a5230, 'box'),
      // Boulders (large rocks)
      ob(-18, -4, 3, 2.5, 3, true, 0x95a5a6, 'box'), ob(18, 4, 3, 2.5, 3, true, 0x7f8c8d, 'box'),
      // Bridge across river
      ob(0, 0, 3, 0.5, 6, true, 0x7a5230, 'box'),
      // Bushes (low, non-climbable)
      ob(-8, 0, 3, 0.8, 2, false, 0x27ae60, 'box'), ob(8, 0, 3, 0.8, 2, false, 0x27ae60, 'box'),
      // Tree stump (climbable)
      ob(-15, 6, 1.5, 1, 1.5, true, 0x7a5230, 'box'), ob(15, -6, 1.5, 1, 1.5, true, 0x7a5230, 'box'),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0],[-22,-22],[22,22]],
  },
  {
    id: 'paisaje', name: 'Paisaje', theme: 'Río y montañas', ground: 0x5a8a4a, fog: 0x7aa85a, accent: 0x4a6a3a,
    waterLevel: 0.3,
    obstacles: [
      // Large rocks (climbable via smaller rocks)
      ob(-14, -10, 4, 4, 4, true, 0x95a5a6, 'box'), ob(14, 10, 4, 4, 4, true, 0x7f8c8d, 'box'),
      ob(14, -10, 4, 4, 4, true, 0x95a5a6, 'box'), ob(-14, 10, 4, 4, 4, true, 0x7f8c8d, 'box'),
      // Small rocks for climbing
      ob(-10, -7, 1.5, 1.5, 1.5, true, 0x95a5a6, 'box'), ob(10, 7, 1.5, 1.5, 1.5, true, 0x7f8c8d, 'box'),
      ob(10, -7, 1.5, 1.5, 1.5, true, 0x95a5a6, 'box'), ob(-10, 7, 1.5, 1.5, 1.5, true, 0x7f8c8d, 'box'),
      // River (water plane)
      ob(0, 0, 6, 0.3, 24, false, 0x3498db, 'water', 0, true),
      // River banks (low walls)
      ob(-3.5, 0, 0.5, 1, 24, false, 0x8a7a5a, 'wall'), ob(3.5, 0, 0.5, 1, 24, false, 0x8a7a5a, 'wall'),
      // Trees on banks
      ...buildTree(-18, -14, 1.3), ...buildTree(18, 14, 1.3),
      ...buildTree(-18, 14, 1.3), ...buildTree(18, -14, 1.3),
      // Bridge across river
      ob(0, 0, 3, 0.5, 8, true, 0x7a5230, 'box'),
      // Hills (climbable mounds)
      ob(0, -20, 6, 2, 4, true, 0x6a9a5a, 'box'), ob(0, 20, 6, 2, 4, true, 0x6a9a5a, 'box'),
      // Tower with stairs (vantage point)
      ob(-20, 0, 3, 6, 3, true, 0x95a5a6, 'box'),
      ...buildStairs(-17, 0, 6, 'W', 0x7f8c8d),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0]],
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
