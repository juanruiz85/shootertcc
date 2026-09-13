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
  kind: 'box' | 'cyl' | 'ramp'
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
const ob = (x: number, z: number, w: number, h: number, d: number, climbable = true, color = C_WOOD, kind: 'box'|'cyl'|'ramp' = 'box'): MapObstacle => ({ x, z, w, h, d, climbable, color, kind })

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
  // ===== NEW MAPS with climbable buildings =====
  {
    id: 'barrio', name: 'Barrio', theme: 'Conjunto residencial', ground: G_STONE, fog: 0xeae6e0, accent: 0xcfc8bc,
    obstacles: [
      // houses (climbable via trash cans next to them)
      ob(-14,-12, 6,4,6, true, 0xd5c4a0), ob(14,-12, 6,4,6, true, 0xd5c4a0),
      ob(-14,12, 6,4,6, true, 0xcdb98a), ob(14,12, 6,4,6, true, 0xcdb98a),
      // trash cans next to houses (for climbing to roof)
      ob(-10,-8, 1,1.2,1, true, 0x555555), ob(10,-8, 1,1.2,1, true, 0x555555),
      ob(-10,8, 1,1.2,1, true, 0x555555), ob(10,8, 1,1.2,1, true, 0x555555),
      // cars (street)
      ob(-4,-18, 2,1.2,4, true, 0xe74c3c), ob(4,18, 2,1.2,4, true, 0x3498db),
      ob(18,0, 2,1.2,4, true, 0x27ae60), ob(-18,0, 2,1.2,4, true, 0xf1c40f),
      // low walls (fences)
      ob(0,-6, 4,1,0.3, true, C_DARK), ob(0,6, 4,1,0.3, true, C_DARK),
      // crates for climbing
      ob(-6,0, 1.5,1.5,1.5, true, C_WOOD), ob(6,0, 1.5,1.5,1.5, true, C_WOOD),
      ob(0,0, 2,3,2, true, C_STONE),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0],[-20,-20],[20,20]],
  },
  {
    id: 'escuela', name: 'Escuela', theme: 'Aulas y pizarrones', ground: G_PAPER, fog: 0xfdfbf7, accent: 0xe8e4df,
    obstacles: [
      // classroom buildings (climbable via desks)
      ob(-14,-10, 6,4,5, true, 0xe8d5b7), ob(14,-10, 6,4,5, true, 0xe8d5b7),
      ob(-14,10, 6,4,5, true, 0xd5c4a0), ob(14,10, 6,4,5, true, 0xd5c4a0),
      // desks (for climbing to roof)
      ob(-10,-6, 1.5,0.8,1, true, C_WOOD), ob(-8,-6, 1.5,0.8,1, true, C_WOOD),
      ob(10,-6, 1.5,0.8,1, true, C_WOOD), ob(8,-6, 1.5,0.8,1, true, C_WOOD),
      ob(-10,6, 1.5,0.8,1, true, C_WOOD), ob(10,6, 1.5,0.8,1, true, C_WOOD),
      // blackboard wall (center)
      ob(0,0, 8,3,0.5, false, 0x2c3e50),
      // stacked desks (climbable tower)
      ob(-4,-14, 1.5,1.6,1, true, C_WOOD), ob(-4,-14, 1.5,2.4,1, false, C_WOOD),
      ob(4,14, 1.5,1.6,1, true, C_WOOD), ob(4,14, 1.5,2.4,1, false, C_WOOD),
      // lockers
      ob(-20,0, 0.8,2.5,6, true, C_BLUE), ob(20,0, 0.8,2.5,6, true, C_RED),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0]],
  },
  {
    id: 'oficinas', name: 'Oficinas', theme: 'Edificio corporativo', ground: G_STONE, fog: 0xeae6e0, accent: 0xcfc8bc,
    obstacles: [
      // office building blocks (climbable via trash cans)
      ob(-12,-10, 5,5,5, true, 0xa3c8e0), ob(12,-10, 5,5,5, true, 0xa3c8e0),
      ob(-12,10, 5,5,5, true, 0xd5c4a0), ob(12,10, 5,5,5, true, 0xd5c4a0),
      // glass partitions (low, climbable)
      ob(-6,0, 0.3,2,8, true, 0xb8d4e3), ob(6,0, 0.3,2,8, true, 0xb8d4e3),
      // trash cans for climbing
      ob(-8,-6, 1,1.2,1, true, 0x555555), ob(8,-6, 1,1.2,1, true, 0x555555),
      ob(-8,6, 1,1.2,1, true, 0x555555), ob(8,6, 1,1.2,1, true, 0x555555),
      // desks
      ob(-3,-14, 3,0.8,1.5, true, C_WOOD), ob(3,14, 3,0.8,1.5, true, C_WOOD),
      // central elevator shaft
      ob(0,0, 3,6,3, true, C_DARK),
      // ramps to second level
      ob(-4,0, 2,1,4, true, C_STONE,'ramp'), ob(4,0, 2,1,4, true, C_STONE,'ramp'),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0]],
  },
  {
    id: 'bosque', name: 'Bosque', theme: 'Densa vegetación', ground: G_GRASS, fog: 0xeef5e6, accent: 0xcfdcc0,
    obstacles: [
      // large trees (climbable via rocks next to them)
      ob(-12,-12, 2,6,2, true, 0x27ae60,'cyl'), ob(12,-12, 2,6,2, true, 0x27ae60,'cyl'),
      ob(-12,12, 2,6,2, true, 0x229954,'cyl'), ob(12,12, 2,6,2, true, 0x229954,'cyl'),
      ob(0,-18, 2,7,2, true, 0x27ae60,'cyl'), ob(0,18, 2,7,2, true, 0x229954,'cyl'),
      // rocks for climbing to tree tops
      ob(-9,-9, 2,2,2, true, 0x95a5a6), ob(9,-9, 2,2,2, true, 0x95a5a6),
      ob(-9,9, 2,2,2, true, 0x7f8c8d), ob(9,9, 2,2,2, true, 0x7f8c8d),
      // fallen logs (low cover)
      ob(-5,0, 5,1,1, true, 0x7a5230), ob(5,0, 5,1,1, true, 0x7a5230),
      // boulders
      ob(-18,0, 3,2.5,3, true, 0x95a5a6), ob(18,0, 3,2.5,3, true, 0x7f8c8d),
      // bushes (low, non-climbable)
      ob(0,-8, 3,0.8,2, false, 0x27ae60), ob(0,8, 3,0.8,2, false, 0x27ae60),
    ],
    spawns: [[0,-24],[0,24],[-24,0],[24,0],[-22,-22],[22,22]],
  },
  {
    id: 'paisaje', name: 'Paisaje', theme: 'Río y montañas', ground: G_GRASS, fog: 0xeef5e6, accent: 0xcfdcc0,
    obstacles: [
      // large rocks (climbable via smaller rocks)
      ob(-14,-10, 4,4,4, true, 0x95a5a6), ob(14,10, 4,4,4, true, 0x7f8c8d),
      ob(14,-10, 4,4,4, true, 0x95a5a6), ob(-14,10, 4,4,4, true, 0x7f8c8d),
      // small rocks for climbing
      ob(-10,-7, 1.5,1.5,1.5, true, 0x95a5a6), ob(10,7, 1.5,1.5,1.5, true, 0x7f8c8d),
      ob(10,-7, 1.5,1.5,1.5, true, 0x95a5a6), ob(-10,7, 1.5,1.5,1.5, true, 0x7f8c8d),
      // river banks (low walls along center)
      ob(-6,0, 0.5,1,12, false, C_STONE), ob(6,0, 0.5,1,12, false, C_STONE),
      // trees
      ob(-20,-18, 1.5,5,1.5, true, 0x27ae60,'cyl'), ob(20,18, 1.5,5,1.5, true, 0x229954,'cyl'),
      ob(-20,18, 1.5,5,1.5, true, 0x27ae60,'cyl'), ob(20,-18, 1.5,5,1.5, true, 0x229954,'cyl'),
      // bridge across river
      ob(0,0, 3,0.5,14, true, C_WOOD),
      // hills (climbable mounds)
      ob(0,-20, 6,2,4, true, C_DARK), ob(0,20, 6,2,4, true, C_DARK),
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
