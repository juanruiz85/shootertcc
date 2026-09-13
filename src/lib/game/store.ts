'use client'

import { create } from 'zustand'
import type { KillFeedEntry, PlayerPublic, MobPublic, RoomSummary } from './types'

// HUD-facing store. The Three.js game loop writes here; React HUD reads.
export type HudState = {
  connected: boolean
  roomName: string
  myId: string
  myName: string
  mySkin: string
  health: number
  maxHealth: number
  weapon: string
  ammo: number
  magazine: number
  reloading: boolean
  reloadProgress: number // 0..1
  alive: boolean
  respawnIn: number // seconds
  score: number
  kills: number
  deaths: number
  players: PlayerPublic[] // roster (scoreboard)
  mobs: MobPublic[]
  rooms: RoomSummary[]
  killFeed: KillFeedEntry[]
  hitMarker: number // timestamp of last hit confirmed
  damageFlash: number // timestamp of last damage taken
  lastHitBy: string | null
  showScoreboard: boolean
  paused: boolean
  pointerLocked: boolean
  // high-frequency snapshots (written by game loop, read by minimap)
  yawSnapshot: number
  myPosSnapshot: [number, number, number] | null
  // pointer-lock resume function registered by GameCanvas
  requestResume: (() => void) | null
  // setters
  set: (partial: Partial<HudState>) => void
  addKillFeed: (e: KillFeedEntry) => void
  setPlayers: (p: PlayerPublic[]) => void
  upsertPlayer: (p: PlayerPublic) => void
  removePlayer: (id: string) => void
  setMobs: (m: MobPublic[]) => void
  setRooms: (r: RoomSummary[]) => void
  reset: () => void
}

const initial = {
  connected: false,
  roomName: '',
  myId: '',
  myName: '',
  mySkin: 'red',
  health: 100,
  maxHealth: 100,
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
  players: [] as PlayerPublic[],
  mobs: [] as MobPublic[],
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
  requestResume: null,
}

export const useGameStore = create<HudState>((set) => ({
  ...initial,
  set: (partial) => set(partial),
  addKillFeed: (e) =>
    set((s) => ({ killFeed: [e, ...s.killFeed].slice(0, 6) })),
  setPlayers: (p) => set({ players: p }),
  upsertPlayer: (p) =>
    set((s) => {
      const i = s.players.findIndex((x) => x.id === p.id)
      if (i === -1) return { players: [...s.players, p] }
      const next = s.players.slice()
      next[i] = { ...next[i], ...p }
      return { players: next }
    }),
  removePlayer: (id) =>
    set((s) => ({ players: s.players.filter((x) => x.id !== id) })),
  setMobs: (m) => set({ mobs: m }),
  setRooms: (r) => set({ rooms: r }),
  reset: () => set({ ...initial }),
}))
