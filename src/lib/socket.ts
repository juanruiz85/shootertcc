'use client'

import { io, type Socket } from 'socket.io-client'
import type {
  PlayerPublic, MobPublic, RoomSummary, KillFeedEntry, Skin, Weapon, Vec3,
} from './game/types'

type Handlers = {
  onLobbyState?: (data: { rooms: RoomSummary[] }) => void
  onLobbyReady?: (data: { skins: Skin[]; weapons: Weapon[] }) => void
  onRoomJoined?: (data: {
    room: { id: string; name: string }
    me: PlayerPublic
    players: PlayerPublic[]
    mobs: MobPublic[]
  }) => void
  onRoomError?: (data: { message: string }) => void
  onRoomPlayers?: (data: { players: PlayerPublic[] }) => void
  onPlayerJoined?: (p: PlayerPublic) => void
  onPlayerLeft?: (data: { id: string }) => void
  onPlayerState?: (data: {
    id: string; pos: Vec3; yaw: number; pitch: number
    weapon: string; ammo: number; state: 'alive' | 'dead'
  }) => void
  onPlayerShot?: (data: { shooterId: string; origin: Vec3; dir: Vec3; weapon: string }) => void
  onPlayerAmmo?: (data: { weapon: string; ammo: number }) => void
  onPlayerReloading?: (data: { id: string; weapon: string }) => void
  onPlayerReloadDone?: (data: { weapon: string; ammo: number }) => void
  onPlayerDamaged?: (data: { id: string; health: number; by: string; headshot: boolean; mob?: boolean }) => void
  onPlayerKilled?: (data: { victimId: string; killerId: string; weapon: string; headshot: boolean }) => void
  onPlayerRespawned?: (data: { id: string; pos: Vec3 }) => void
  onMobState?: (data: { mobs: MobPublic[] }) => void
  onMobDamaged?: (data: { id: string; health: number; by: string }) => void
  onMobKilled?: (data: { id: string; killerId: string; weapon: string; headshot: boolean }) => void
  onMobRespawned?: (data: { id: string; pos: Vec3 }) => void
  onKillFeed?: (e: KillFeedEntry) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 999,
      reconnectionDelay: 1000,
      timeout: 10000,
    })
  }
  return socket
}

export function attachHandlers(h: Handlers): () => void {
  const s = getSocket()
  const binds: Array<[string, (...args: any[]) => void]> = [
    ['lobby:state', (d) => h.onLobbyState?.(d)],
    ['lobby:ready', (d) => h.onLobbyReady?.(d)],
    ['room:joined', (d) => h.onRoomJoined?.(d)],
    ['room:error', (d) => h.onRoomError?.(d)],
    ['room:players', (d) => h.onRoomPlayers?.(d)],
    ['room:playerJoined', (d) => h.onPlayerJoined?.(d)],
    ['room:playerLeft', (d) => h.onPlayerLeft?.(d)],
    ['player:state', (d) => h.onPlayerState?.(d)],
    ['player:shot', (d) => h.onPlayerShot?.(d)],
    ['player:ammo', (d) => h.onPlayerAmmo?.(d)],
    ['player:reloading', (d) => h.onPlayerReloading?.(d)],
    ['player:reloadDone', (d) => h.onPlayerReloadDone?.(d)],
    ['player:damaged', (d) => h.onPlayerDamaged?.(d)],
    ['player:killed', (d) => h.onPlayerKilled?.(d)],
    ['player:respawned', (d) => h.onPlayerRespawned?.(d)],
    ['mob:state', (d) => h.onMobState?.(d)],
    ['mob:damaged', (d) => h.onMobDamaged?.(d)],
    ['mob:killed', (d) => h.onMobKilled?.(d)],
    ['mob:respawned', (d) => h.onMobRespawned?.(d)],
    ['killfeed', (d) => h.onKillFeed?.(d)],
    ['connect', () => h.onConnect?.()],
    ['disconnect', () => h.onDisconnect?.()],
  ]
  for (const [ev, fn] of binds) s.on(ev as any, fn as any)
  return () => {
    for (const [ev, fn] of binds) s.off(ev as any, fn as any)
  }
}

// Emit helpers
export const net = {
  lobbyHello: (name: string, skin: string) => getSocket().emit('lobby:hello', { name, skin }),
  lobbyRefresh: () => getSocket().emit('lobby:refresh'),
  createRoom: (roomName: string) => getSocket().emit('room:create', { roomName }),
  joinRoom: (roomId: string) => getSocket().emit('room:join', { roomId }),
  leaveRoom: () => getSocket().emit('room:leave'),
  syncRoom: () => getSocket().emit('room:sync'),
  sendState: (data: { pos: Vec3; yaw: number; pitch: number; weapon: string; ammo: number; state: 'alive' | 'dead' }) =>
    getSocket().emit('player:state', data),
  shoot: (origin: Vec3, dir: Vec3, weapon: string) => getSocket().emit('player:shoot', { origin, dir, weapon }),
  reload: (weapon: string) => getSocket().emit('player:reload', { weapon }),
  reportHit: (targetId: string, damage: number, headshot: boolean, dist: number, kind: 'player' | 'mob') =>
    getSocket().emit('player:hit', { targetId, damage, headshot, dist, kind }),
}
