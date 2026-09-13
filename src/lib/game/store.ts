'use client'

import { create } from 'zustand'
import type {
  KillFeedEntry, PlayerPublic, MobPublic, RoomSummary, ItemPublic, Vec3,
  GameMode, Team, StreakReward,
} from './types'

export type HudState = {
  connected: boolean
  roomName: string
  roomMode: GameMode
  roomMapId: string
  roomLevel: number
  myId: string
  myName: string
  mySkin: string
  myTeam: Team
  health: number
  shield: number
  maxHealth: number
  maxShield: number
  weapon: string
  ammo: number
  magazine: number
  reloading: boolean
  reloadProgress: number
  alive: boolean
  respawnIn: number
  score: number
  kills: number
  deaths: number
  streak: number
  bestStreak: number
  players: PlayerPublic[]
  mobs: MobPublic[]
  items: ItemPublic[]
  rooms: RoomSummary[]
  killFeed: KillFeedEntry[]
  hitMarker: number
  damageFlash: number
  lastHitBy: string | null
  showScoreboard: boolean
  paused: boolean
  pointerLocked: boolean
  // high-frequency snapshots
  yawSnapshot: number
  myPosSnapshot: Vec3 | null
  // streak reward toast
  streakReward: StreakReward | null
  streakRewardAt: number
  // pickup toast
  pickupToast: { type: string; name: string; at: number } | null
  // pointer-lock resume
  requestResume: (() => void) | null
  // setters
  set: (partial: Partial<HudState>) => void
  addKillFeed: (e: KillFeedEntry) => void
  setPlayers: (p: PlayerPublic[]) => void
  setMobs: (m: MobPublic[]) => void
  setItems: (i: ItemPublic[]) => void
  setRooms: (r: RoomSummary[]) => void
  reset: () => void
}

const initial = {
  connected: false,
  roomName: '',
  roomMode: 'pve' as GameMode,
  roomMapId: 'arena',
  roomLevel: 1,
  myId: '',
  myName: '',
  mySkin: 'red',
  myTeam: 'none' as Team,
  health: 100,
  shield: 0,
  maxHealth: 100,
  maxShield: 50,
  weapon: 'pistol',
  ammo: 12,
  magazine: 12,
  reloading: false,
  reloadProgress: 0,
  alive: true,
  respawnIn: 0,
  score: 0,
  kills: 0,
  deaths: 0,
  streak: 0,
  bestStreak: 0,
  players: [] as PlayerPublic[],
  mobs: [] as MobPublic[],
  items: [] as ItemPublic[],
  rooms: [] as RoomSummary[],
  killFeed: [] as KillFeedEntry[],
  hitMarker: 0,
  damageFlash: 0,
  lastHitBy: null as string | null,
  showScoreboard: false,
  paused: false,
  pointerLocked: false,
  yawSnapshot: 0,
  myPosSnapshot: null,
  streakReward: null,
  streakRewardAt: 0,
  pickupToast: null,
  requestResume: null,
}

export const useGameStore = create<HudState>((set) => ({
  ...initial,
  set: (partial) => set(partial),
  addKillFeed: (e) =>
    set((s) => ({ killFeed: [e, ...s.killFeed].slice(0, 6) })),
  setPlayers: (p) => set({ players: p }),
  setMobs: (m) => set({ mobs: m }),
  setItems: (i) => set({ items: i }),
  setRooms: (r) => set({ rooms: r }),
  reset: () => set({ ...initial, requestResume: useGameStore.getState().requestResume, connected: useGameStore.getState().connected }),
}))
