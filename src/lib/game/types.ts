// Shared game types (mirror of server-side shapes)

export type Skin = {
  id: string
  name: string
  color: string
  accent: string
}

export type Weapon = {
  id: string
  name: string
  damage: number
  fireRate: number // ms between shots
  magazine: number
  reload: number // ms
  spread: number // radians
  auto: boolean
  range: number
  pellets: number
}

export type PlayerState = 'alive' | 'dead'

export type Vec3 = [number, number, number]

export type PlayerPublic = {
  id: string
  name: string
  skin: string
  pos: Vec3
  yaw: number
  pitch: number
  health: number
  state: PlayerState
  weapon: string
  ammo: number
  reloading: boolean
  score: number
  kills: number
  deaths: number
}

export type MobPublic = {
  id: string
  pos: Vec3
  state: 'alive' | 'dead'
  health?: number
  flash?: number
}

export type RoomSummary = {
  id: string
  name: string
  players: number
  max: number
  mobs: number
}

export type KillFeedEntry = {
  id: string
  victim: string
  killer: string | null
  weapon: string
  headshot: boolean
  kind: 'player' | 'mob'
  ts: number
}
