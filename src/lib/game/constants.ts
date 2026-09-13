import type { Skin, Weapon } from './types'

// Mirror of server constants. Must stay in sync with mini-services/game-server/index.ts
export const SKINS: Skin[] = [
  { id: 'red',    name: 'Rojo',    color: '#e74c3c', accent: '#a93226' },
  { id: 'green',  name: 'Verde',   color: '#27ae60', accent: '#196f3d' },
  { id: 'orange', name: 'Naranja', color: '#e67e22', accent: '#b9770e' },
  { id: 'purple', name: 'Morado',  color: '#9b59b6', accent: '#6c3483' },
  { id: 'teal',   name: 'Cian',    color: '#1abc9c', accent: '#117864' },
  { id: 'pink',   name: 'Rosa',    color: '#e84393', accent: '#a72165' },
  { id: 'yellow', name: 'Amarillo',color: '#f1c40f', accent: '#b7950b' },
  { id: 'slate',  name: 'Grafito', color: '#5d6d7e', accent: '#2c3e50' },
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
export const MOB_MAX_HP = 60

export function getSkin(id: string): Skin {
  return SKINS.find(s => s.id === id) ?? SKINS[0]
}

export function getWeapon(id: string): Weapon {
  return WEAPONS[id] ?? WEAPONS.pistol
}
