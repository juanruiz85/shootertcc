// Shared game types (mirror of server-side shapes)

export type Skin = { id: string; name: string; color: string; accent: string }
export type Weapon = {
  id: string; name: string; damage: number; fireRate: number; magazine: number
  reload: number; spread: number; auto: boolean; range: number; pellets: number
}
export type PlayerState = 'alive' | 'dead'
export type Vec3 = [number, number, number]
export type GameMode = '1v1' | '2v2' | 'team' | 'ffa' | 'coop' | 'mixed'
export type Team = 'blue' | 'red' | 'none'
export type ItemType = 'ammo' | 'heal' | 'shield'

export type PlayerPublic = {
  id: string
  name: string
  skin: string
  team: Team
  pos: Vec3
  yaw: number
  pitch: number
  health: number
  shield: number
  state: PlayerState
  weapon: string
  ammo: number
  reloading: boolean
  score: number
  kills: number
  deaths: number
  streak: number
  bestStreak: number
}

export type MobPublic = {
  id: string
  pos: Vec3
  state: 'alive' | 'dead'
  health?: number
  flash?: number
}

export type ItemPublic = {
  id: string
  type: ItemType
  pos: Vec3
}

export type RoomSummary = {
  id: string
  name: string
  mode: GameMode
  mapId: string
  level: number
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

export type StreakReward = {
  id: string
  name: string
  desc: string
  icon: string
  streak: number
}
