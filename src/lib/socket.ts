'use client'

import { io, type Socket } from 'socket.io-client'
import type {
  PlayerPublic, MobPublic, RoomSummary, KillFeedEntry, Skin, Weapon, Vec3,
  GameMode, ItemPublic, StreakReward, Team,
} from './game/types'

type Handlers = {
  onLobbyState?: (data: { rooms: RoomSummary[] }) => void
  onLobbyReady?: (data: { skins: Skin[]; weapons: Weapon[] }) => void
  onRoomJoined?: (data: {
    room: { id: string; name: string; mode: GameMode; mapId: string; level: number }
    me: PlayerPublic
    players: PlayerPublic[]
    mobs: MobPublic[]
    items: ItemPublic[]
  }) => void
  onRoomMapChange?: (data: { mapId: string; level: number; mode: GameMode; banner?: string }) => void
  onRoomError?: (data: { message: string }) => void
  onRoomPlayers?: (data: { players: PlayerPublic[] }) => void
  onPlayerJoined?: (p: PlayerPublic) => void
  onPlayerLeft?: (data: { id: string }) => void
  onPlayerState?: (data: {
    id: string; pos: Vec3; yaw: number; pitch: number
    weapon: string; ammo: number; state: 'alive' | 'dead'; shield: number
  }) => void
  onPlayerShot?: (data: { shooterId: string; origin: Vec3; dir: Vec3; weapon: string }) => void
  onPlayerAmmo?: (data: { weapon: string; ammo: number }) => void
  onPlayerReloading?: (data: { id: string; weapon: string }) => void
  onPlayerReloadDone?: (data: { weapon: string; ammo: number }) => void
  onPlayerDamaged?: (data: { id: string; health: number; shield?: number; by: string; headshot: boolean; mob?: boolean; attackerPos?: Vec3 | null; regen?: boolean }) => void
  onPlayerKilled?: (data: { victimId: string; killerId: string; weapon: string; headshot: boolean }) => void
  onPlayerRespawned?: (data: { id: string; pos: Vec3 }) => void
  onPlayerStreak?: (data: { id: string; streak: number; reward: StreakReward | null }) => void
  onMobState?: (data: { mobs: MobPublic[] }) => void
  onMobDamaged?: (data: { id: string; health: number; by: string }) => void
  onMobKilled?: (data: { id: string; killerId: string; weapon: string; headshot: boolean }) => void
  onMobRespawned?: (data: { id: string; pos: Vec3 }) => void
  onItemsState?: (data: { items: ItemPublic[] }) => void
  onItemPicked?: (data: { id: string; by: string; type: string; weaponId?: string }) => void
  onKillFeed?: (e: KillFeedEntry) => void
  onDroneState?: (data: { ownerId: string | null; pos: Vec3 | null; expires: number; targetYaw?: number }) => void
  onChatMessage?: (msg: { id: string; name: string; text: string; at: number }) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    // In production (behind the Caddy gateway), connect to the same origin
    // with ?XTransformPort=3003 so the gateway forwards to the game server.
    // In local dev previews (agent-browser / localhost), connect directly
    // to the game server on port 3003.
    let url = '/?XTransformPort=3003'
    let path = '/'
    if (typeof window !== 'undefined') {
      const host = window.location.hostname
      if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
        url = `http://${window.location.hostname}:3003`
        path = '/'
      }
    }
    socket = io(url, {
      path,
      transports: ['polling', 'websocket'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 999,
      reconnectionDelay: 800,
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
    ['room:mapChange', (d) => h.onRoomMapChange?.(d)],
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
    ['player:streak', (d) => h.onPlayerStreak?.(d)],
    ['mob:state', (d) => h.onMobState?.(d)],
    ['mob:damaged', (d) => h.onMobDamaged?.(d)],
    ['mob:killed', (d) => h.onMobKilled?.(d)],
    ['mob:respawned', (d) => h.onMobRespawned?.(d)],
    ['items:state', (d) => h.onItemsState?.(d)],
    ['item:picked', (d) => h.onItemPicked?.(d)],
    ['killfeed', (d) => h.onKillFeed?.(d)],
    ['drone:state', (d) => h.onDroneState?.(d)],
    ['chat:message', (d) => h.onChatMessage?.(d)],
    ['connect', () => h.onConnect?.()],
    ['disconnect', () => h.onDisconnect?.()],
  ]
  for (const [ev, fn] of binds) s.on(ev as any, fn as any)
  return () => {
    for (const [ev, fn] of binds) s.off(ev as any, fn as any)
  }
}

export const net = {
  lobbyHello: (name: string, skin: string) => getSocket().emit('lobby:hello', { name, skin }),
  lobbyRefresh: () => getSocket().emit('lobby:refresh'),
  createRoom: (roomName: string, mode: GameMode, mapId?: string) => getSocket().emit('room:create', { roomName, mode, mapId }),
  joinRoom: (roomId: string) => getSocket().emit('room:join', { roomId }),
  leaveRoom: () => getSocket().emit('room:leave'),
  syncRoom: () => getSocket().emit('room:sync'),
  sendState: (data: { pos: Vec3; yaw: number; pitch: number; weapon: string; ammo: number; state: 'alive' | 'dead'; shield: number }) =>
    getSocket().emit('player:state', data),
  shoot: (origin: Vec3, dir: Vec3, weapon: string) => getSocket().emit('player:shoot', { origin, dir, weapon }),
  reload: (weapon: string) => getSocket().emit('player:reload', { weapon }),
  reportHit: (targetId: string, damage: number, headshot: boolean, dist: number, kind: 'player' | 'mob') =>
    getSocket().emit('player:hit', { targetId, damage, headshot, dist, kind }),
  pickupItem: (itemId: string) => getSocket().emit('item:pickup', { itemId }),
  sendChat: (text: string) => getSocket().emit('chat:send', { text }),
}
