'use client'

import { useGameStore } from '@/lib/game/store'
import { WEAPONS, WEAPON_ORDER, getSkin, getWeapon, getTeam, ARENA_SIZE, PLAYER_MAX_HP, PLAYER_MAX_SHIELD, getMap, KILLSTREAKS, MAPS } from '@/lib/game/constants'
import { net } from '@/lib/socket'
import { Crosshair, Heart, Skull, Swords, LogOut, Loader2, Zap, Shield, Flame, MessageSquare, Send, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'

/* ============================ Crosshair ============================ */
function CrosshairHUD() {
  const weapon = useGameStore((s) => s.weapon)
  const w = getWeapon(weapon)
  const gap = 6 + w.spread * 120
  const len = 8
  const lineStyle: React.CSSProperties = {
    position: 'absolute', background: 'rgba(253,251,247,0.9)', boxShadow: '0 0 0 1.5px #1a1a1a',
  }
  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
      <div className="relative" style={{ width: 0, height: 0 }}>
        <div className="crosshair-dot" />
        <div style={{ ...lineStyle, width: 2.5, height: len, left: -1.25, top: -(gap + len) }} />
        <div style={{ ...lineStyle, width: 2.5, height: len, left: -1.25, top: gap }} />
        <div style={{ ...lineStyle, width: len, height: 2.5, top: -1.25, left: -(gap + len) }} />
        <div style={{ ...lineStyle, width: len, height: 2.5, top: -1.25, left: gap }} />
      </div>
    </div>
  )
}

/* ============================ Hit marker ============================ */
function HitMarker() {
  const hitMarker = useGameStore((s) => s.hitMarker)
  if (!hitMarker) return null
  return (
    <div key={hitMarker} className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      <div className="hit-marker relative" style={{ width: 26, height: 26 }}>
        <span className="absolute top-0 left-0 w-3 h-0.5 bg-[#fdfbf7]" style={{ boxShadow: '0 0 0 1.5px #1a1a1a', transformOrigin: 'left center' }} />
        <span className="absolute top-0 right-0 w-3 h-0.5 bg-[#fdfbf7]" style={{ boxShadow: '0 0 0 1.5px #1a1a1a', transformOrigin: 'right center' }} />
        <span className="absolute bottom-0 left-0 w-3 h-0.5 bg-[#fdfbf7]" style={{ boxShadow: '0 0 0 1.5px #1a1a1a', transformOrigin: 'left center' }} />
        <span className="absolute bottom-0 right-0 w-3 h-0.5 bg-[#fdfbf7]" style={{ boxShadow: '0 0 0 1.5px #1a1a1a', transformOrigin: 'right center' }} />
      </div>
    </div>
  )
}

/* ============================ Damage flash ============================ */
function DamageFlash() {
  const damageFlash = useGameStore((s) => s.damageFlash)
  if (!damageFlash) return null
  return (
    <div
      key={damageFlash}
      className="damage-flash pointer-events-none fixed inset-0 z-30"
      style={{ background: 'radial-gradient(ellipse at center, rgba(231,76,60,0) 40%, rgba(231,76,60,0.85) 100%)' }}
    />
  )
}

/* ============================ Top bar ============================ */
function TopBar() {
  const roomName = useGameStore((s) => s.roomName)
  const roomMode = useGameStore((s) => s.roomMode)
  const roomLevel = useGameStore((s) => s.roomLevel)
  const roomMapId = useGameStore((s) => s.roomMapId)
  const players = useGameStore((s) => s.players)
  const myName = useGameStore((s) => s.myName)
  const mySkin = useGameStore((s) => s.mySkin)
  const myTeam = useGameStore((s) => s.myTeam)
  const score = useGameStore((s) => s.score)
  const kills = useGameStore((s) => s.kills)
  const deaths = useGameStore((s) => s.deaths)
  const streak = useGameStore((s) => s.streak)
  const skin = getSkin(mySkin)
  const teamInfo = getTeam(myTeam)
  const mapInfo = getMap(roomMapId)
  return (
    <div className="pointer-events-none fixed top-0 left-0 right-0 z-20 px-4 py-3 flex items-start justify-between gap-3">
      <div className="doodle-card-flat px-3 py-2 flex items-center gap-3 pointer-events-auto">
        <div className="relative">
          <div
            className="w-9 h-9 rounded-lg border-2 border-black flex items-center justify-center font-doodle font-black text-[#fdfbf7]"
            style={{ background: teamInfo.id !== 'none' ? teamInfo.color : skin.color }}
          >
            {myName.slice(0, 1).toUpperCase()}
          </div>
          {myTeam !== 'none' && (
            <span
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black text-[8px] font-black flex items-center justify-center text-[#fdfbf7]"
              style={{ background: teamInfo.color }}
            >
              {myTeam === 'blue' ? 'A' : 'R'}
            </span>
          )}
        </div>
        <div className="leading-tight">
          <p className="font-doodle text-base font-bold flex items-center gap-1.5">
            {myName}
            {streak >= 2 && <Flame className="w-3.5 h-3.5 text-orange-500" />}
          </p>
          <div className="flex gap-2 text-xs text-black/60">
            <span className="flex items-center gap-0.5"><Swords className="w-3 h-3" />{kills}</span>
            <span className="flex items-center gap-0.5"><Skull className="w-3 h-3" />{deaths}</span>
            <span className="flex items-center gap-0.5"><Zap className="w-3 h-3" />{score}</span>
            {streak >= 2 && <span className="flex items-center gap-0.5 text-orange-600 font-bold"><Flame className="w-3 h-3" />{streak}</span>}
          </div>
        </div>
      </div>

      <div className="doodle-card-flat px-4 py-2 text-center pointer-events-auto">
        <p className="font-doodle text-sm font-bold leading-tight">{roomName}</p>
        <p className="text-xs text-black/60">
          {roomMode === 'pvp' ? '1v1 PvP' : `PvE · Nivel ${roomLevel}`} · {mapInfo.name} · {players.length} jug
        </p>
      </div>

      {/* spacer to balance; leave button moved into pause overlay for accessibility */}
      <div className="w-[100px]" />
    </div>
  )
}

/* ============================ Bottom bars ============================ */
function BottomBars() {
  const health = useGameStore((s) => s.health)
  const shield = useGameStore((s) => s.shield)
  const stamina = useGameStore((s) => s.stamina)
  const sprinting = useGameStore((s) => s.sprinting)
  const weapon = useGameStore((s) => s.weapon)
  const ammo = useGameStore((s) => s.ammo)
  const magazine = useGameStore((s) => s.magazine)
  const reloading = useGameStore((s) => s.reloading)
  const reloadProgress = useGameStore((s) => s.reloadProgress)
  const w = getWeapon(weapon)
  const hpPct = Math.max(0, Math.min(100, (health / PLAYER_MAX_HP) * 100))
  const hpColor = hpPct > 50 ? '#27ae60' : hpPct > 25 ? '#e67e22' : '#e74c3c'
  const shPct = Math.max(0, Math.min(100, (shield / PLAYER_MAX_SHIELD) * 100))
  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 px-4 py-4 flex items-end justify-between gap-3">
      <div className="doodle-card-flat px-3 py-2 w-60">
        <div className="flex items-center justify-between mb-1">
          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-black/60">
            <Heart className="w-3.5 h-3.5" /> Vida
          </span>
          <span className="font-doodle text-lg font-black leading-none">{Math.ceil(health)}</span>
        </div>
        <div className="h-3 rounded-full border-2 border-black bg-white overflow-hidden">
          <div className="h-full transition-all duration-200" style={{ width: `${hpPct}%`, background: hpColor }} />
        </div>
        <div className="flex items-center justify-between mb-1 mt-1.5">
          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-black/60">
            <Shield className="w-3.5 h-3.5" /> Escudo
          </span>
          <span className="font-doodle text-sm font-black leading-none">{Math.ceil(shield)}</span>
        </div>
        <div className="h-2 rounded-full border-2 border-black bg-white overflow-hidden">
          <div className="h-full transition-all duration-200" style={{ width: `${shPct}%`, background: '#1abc9c' }} />
        </div>
        <div className="flex items-center justify-between mb-1 mt-1.5">
          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-black/60">
            <Zap className={`w-3.5 h-3.5 ${sprinting ? 'text-orange-500' : ''}`} /> Aguante
          </span>
          <span className="font-doodle text-sm font-black leading-none">{Math.ceil(stamina)}</span>
        </div>
        <div className="h-1.5 rounded-full border-2 border-black bg-white overflow-hidden">
          <div className="h-full transition-all duration-100" style={{ width: `${stamina}%`, background: sprinting ? '#e67e22' : '#f1c40f' }} />
        </div>
      </div>

      <div className="doodle-card-flat px-3 py-2 min-w-[200px]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-doodle text-lg font-black leading-none">{w.name}</p>
            <p className="text-[10px] uppercase tracking-wide text-black/50 mt-0.5">
              {w.auto ? 'Automática' : 'Semi'} · {w.damage} dañ
            </p>
          </div>
          <div className="text-right">
            {reloading ? (
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-black/60 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Recargando
                </span>
                <div className="h-1.5 w-16 rounded-full border border-black bg-white overflow-hidden mt-0.5">
                  <div className="h-full bg-black" style={{ width: `${reloadProgress * 100}%` }} />
                </div>
              </div>
            ) : (
              <p className="font-doodle text-2xl font-black leading-none">
                {ammo}<span className="text-sm text-black/40">/{magazine}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-1 mt-2">
          {WEAPON_ORDER.map((id, i) => {
            const active = id === weapon
            return (
              <div key={id} className={`flex-1 px-1.5 py-0.5 rounded border-2 text-center text-[10px] font-bold ${active ? 'bg-black text-[#fdfbf7] border-black' : 'bg-white text-black/50 border-black/30'}`}>
                <span className="font-mono">{i + 1}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ============================ Minimap ============================ */
function Minimap() {
  const players = useGameStore((s) => s.players)
  const mobs = useGameStore((s) => s.mobs)
  const items = useGameStore((s) => s.items)
  const myId = useGameStore((s) => s.myId)
  const yaw = useGameStore((s) => s.yawSnapshot)
  const pos = useGameStore((s) => s.myPosSnapshot)
  const mapId = useGameStore((s) => s.roomMapId)
  const mapInfo = getMap(mapId)
  const size = 140
  const scale = size / ARENA_SIZE
  const toMap = (wx: number, wz: number) => ({ x: size/2 + wx*scale, y: size/2 + wz*scale })
  const me = pos ? toMap(pos[0], pos[2]) : null
  return (
    <div className="pointer-events-none fixed top-16 right-4 z-20">
      <div className="doodle-card-flat p-1" style={{ width: size + 8, height: size + 8 }}>
        <div className="relative bg-[#fdfbf7] rounded" style={{ width: size, height: size, overflow: 'hidden' }}>
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(26,26,26,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(26,26,26,0.08) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="absolute inset-1 border-2 border-black/70 rounded" />
          {/* obstacles */}
          {mapInfo.obstacles.map((o, i) => {
            const p = toMap(o.x - o.w/2, o.z - o.d/2)
            return <div key={i} className="absolute border border-black/30 rounded-sm" style={{ left: p.x, top: p.y, width: Math.max(2, o.w*scale), height: Math.max(2, o.d*scale), background: 'rgba(26,26,26,0.12)' }} />
          })}
          {/* items */}
          {items.map((it) => {
            const p = toMap(it.pos[0], it.pos[2])
            const c = it.type === 'ammo' ? '#f1c40f' : it.type === 'heal' ? '#e74c3c' : '#1abc9c'
            return <div key={it.id} className="absolute w-1.5 h-1.5 rounded-full border border-black" style={{ left: p.x-3, top: p.y-3, background: c }} />
          })}
          {/* mobs */}
          {mobs.filter((m) => m.state === 'alive').map((m) => {
            const p = toMap(m.pos[0], m.pos[2])
            return <div key={m.id} className="absolute w-1.5 h-1.5 rounded-full bg-[#c0392b] border border-black" style={{ left: p.x-3, top: p.y-3 }} />
          })}
          {/* other players */}
          {players.filter((p) => p.id !== myId && p.state === 'alive').map((p) => {
            const m = toMap(p.pos[0], p.pos[2])
            const t = getTeam(p.team)
            return <div key={p.id} className="absolute w-2 h-2 rounded-full border border-black" style={{ left: m.x-4, top: m.y-4, background: t.id !== 'none' ? t.color : getSkin(p.skin).color }} />
          })}
          {me && (
            <div className="absolute" style={{ left: me.x-5, top: me.y-5, width: 0, height: 0, transform: `rotate(${yaw}rad)` }}>
              <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '10px solid #1a1a1a' }} />
            </div>
          )}
        </div>
        <p className="text-[9px] uppercase tracking-wider text-black/50 text-center mt-0.5 font-bold">{mapInfo.name}</p>
      </div>
    </div>
  )
}

/* ============================ Kill feed ============================ */
function KillFeed() {
  const killFeed = useGameStore((s) => s.killFeed)
  return (
    <div className="pointer-events-none fixed top-16 left-4 z-20 flex flex-col gap-1.5 max-w-[300px]">
      {killFeed.map((e) => (
        <div key={e.id} className="doodle-card-flat px-2.5 py-1.5 flex items-center gap-1.5 text-sm">
          <span className="font-bold">{e.killer ?? 'Doodle Mob'}</span>
          <Skull className="w-3.5 h-3.5 text-black/60" />
          <span className="font-bold">{e.victim}</span>
          {e.headshot && <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-black text-[#fdfbf7] font-bold">HS</span>}
        </div>
      ))}
    </div>
  )
}

/* ============================ Streak reward toast ============================ */
function StreakToast() {
  const reward = useGameStore((s) => s.streakReward)
  const at = useGameStore((s) => s.streakRewardAt)
  // subscribe to a frequently-changing store field so the age check re-evaluates
  useGameStore((s) => s.myPosSnapshot)
  if (!reward || !at) return null
  const age = performance.now() - at
  if (age > 4000) return null
  const icons: Record<string, string> = { drone: '🛸', bomb: '💣', aura: '⚡' }
  return (
    <div className="pointer-events-none fixed top-1/4 left-1/2 -translate-x-1/2 z-40">
      <div key={at} className="doodle-card px-6 py-4 text-center" style={{ animation: 'hit-pop 0.5s ease-out' }}>
        <div className="text-4xl mb-1">{icons[reward.icon] ?? '⭐'}</div>
        <p className="font-doodle text-2xl font-black leading-tight">¡Racha x{reward.streak}!</p>
        <p className="font-bold text-sm">{reward.name}</p>
        <p className="text-xs text-black/55">{reward.desc}</p>
      </div>
    </div>
  )
}

/* ============================ Pickup toast ============================ */
function PickupToast() {
  const toast = useGameStore((s) => s.pickupToast)
  useGameStore((s) => s.myPosSnapshot)
  if (!toast) return null
  const age = performance.now() - toast.at
  if (age > 2500) return null
  const colors: Record<string,string> = { ammo: '#f1c40f', heal: '#e74c3c', shield: '#1abc9c' }
  return (
    <div className="pointer-events-none fixed bottom-32 left-1/2 -translate-x-1/2 z-40">
      <div key={toast.at} className="doodle-card-flat px-4 py-2 flex items-center gap-2" style={{ animation: 'hit-pop 0.4s ease-out' }}>
        <span className="w-5 h-5 rounded border-2 border-black" style={{ background: colors[toast.type] }} />
        <span className="font-doodle font-bold">+ {toast.name}</span>
      </div>
    </div>
  )
}

/* ============================ Scoreboard ============================ */
function Scoreboard() {
  const show = useGameStore((s) => s.showScoreboard)
  const players = useGameStore((s) => s.players)
  const myId = useGameStore((s) => s.myId)
  const roomName = useGameStore((s) => s.roomName)
  const roomMode = useGameStore((s) => s.roomMode)
  if (!show) return null
  const sorted = [...players].sort((a, b) => b.score - a.score)
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-start justify-center pt-16 px-4">
      <div className="doodle-card w-full max-w-2xl pointer-events-auto">
        <div className="px-5 py-3 border-b-2 border-black flex items-center justify-between">
          <h2 className="font-doodle text-2xl font-black">Marcador</h2>
          <span className="text-sm text-black/60 font-bold">{roomName} · {roomMode === 'pvp' ? 'PvP' : 'PvE'}</span>
        </div>
        <div className="px-5 py-2 grid grid-cols-[1fr_50px_50px_60px_50px] gap-2 text-[11px] uppercase tracking-wide text-black/50 font-bold border-b border-dashed border-black/20">
          <span>Jugador</span>
          <span className="text-center">Bajas</span>
          <span className="text-center">Muertes</span>
          <span className="text-right">Puntos</span>
          <span className="text-center">Racha</span>
        </div>
        <div className="max-h-[55vh] overflow-y-auto">
          {sorted.length === 0 && <div className="px-5 py-8 text-center text-black/40 text-sm">Sin jugadores</div>}
          {sorted.map((p, i) => {
            const sk = getSkin(p.skin)
            const t = getTeam(p.team)
            const isMe = p.id === myId
            const badge = t.id !== 'none' ? t.color : sk.color
            return (
              <div key={p.id} className={`score-row px-5 py-2 grid grid-cols-[1fr_50px_50px_60px_50px] gap-2 items-center text-sm ${isMe ? 'bg-[#fef3f8]' : ''} ${i !== sorted.length-1 ? 'border-b border-dashed border-black/10' : ''}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono text-black/40 w-4">{i+1}</span>
                  <span className="w-5 h-5 rounded border border-black flex items-center justify-center text-[10px] font-black text-[#fdfbf7] flex-shrink-0" style={{ background: badge }}>
                    {p.name.slice(0,1).toUpperCase()}
                  </span>
                  <span className="font-bold truncate flex items-center gap-1">
                    {p.name}
                    {isMe && <span className="text-[10px] text-black/40">(tú)</span>}
                    {p.state === 'dead' && <Skull className="w-3 h-3 text-black/40" />}
                    {p.streak >= 2 && <Flame className="w-3 h-3 text-orange-500" />}
                  </span>
                </div>
                <span className="text-center font-mono">{p.kills}</span>
                <span className="text-center font-mono">{p.deaths}</span>
                <span className="text-right font-doodle font-black text-base">{p.score}</span>
                <span className="text-center font-mono font-bold">{p.streak}</span>
              </div>
            )
          })}
        </div>
        <div className="px-5 py-2 border-t-2 border-black text-[11px] text-black/50 text-center">
          Mantén <kbd className="px-1 py-0.5 rounded border border-black/40 font-mono font-bold">Tab</kbd> para ver el marcador
        </div>
      </div>
    </div>
  )
}

/* ============================ Respawn overlay ============================ */
function RespawnOverlay() {
  const alive = useGameStore((s) => s.alive)
  const respawnIn = useGameStore((s) => s.respawnIn)
  const pointerLocked = useGameStore((s) => s.pointerLocked)
  if (alive) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
      <div className="text-center" style={{ animation: 'hit-pop 0.5s ease-out' }}>
        <Skull className="w-20 h-20 text-[#fdfbf7] mb-4 mx-auto drop-shadow-[3px_3px_0_#000]" />
        <h2 className="font-doodle text-6xl font-black text-[#fdfbf7] drop-shadow-[4px_4px_0_#000]">¡Eliminado!</h2>
        <p className="respawn-pulse font-doodle text-3xl text-[#fdfbf7] mt-3 drop-shadow-[2px_2px_0_#000]">Reaparición en {respawnIn}s…</p>
        {!pointerLocked && <p className="font-bold text-sm text-white/70 mt-4">Haz clic en la pantalla para volver a jugar</p>}
      </div>
    </div>
  )
}

/* ============================ Pause overlay ============================ */
function PauseOverlay({ onLeave }: { onLeave: () => void }) {
  const paused = useGameStore((s) => s.paused)
  const pointerLocked = useGameStore((s) => s.pointerLocked)
  const alive = useGameStore((s) => s.alive)
  const requestResume = useGameStore((s) => s.requestResume)
  // when dead, the RespawnOverlay takes priority (z-50) — don't show click-to-play
  if (paused) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur">
        <div className="doodle-card p-6 w-full max-w-sm text-center" style={{ animation: 'hit-pop 0.3s ease-out' }}>
          <h2 className="font-doodle text-3xl font-black mb-1">Pausa</h2>
          <p className="text-sm text-black/60 mb-4">El cursor está liberado.</p>
          <div className="flex flex-col gap-2">
            <Button className="doodle-btn w-full" onClick={() => requestResume?.()}>
              <Crosshair className="w-4 h-4 mr-1" /> Reanudar
            </Button>
            <Button className="doodle-btn-ghost w-full" onClick={onLeave}>
              <LogOut className="w-4 h-4 mr-1" /> Salir de la sala
            </Button>
          </div>
        </div>
      </div>
    )
  }
  if (!pointerLocked && alive) {
    return (
      <button className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 cursor-pointer" onClick={() => requestResume?.()}>
        <div className="doodle-card p-6 text-center pointer-events-none" style={{ animation: 'hit-pop 0.3s ease-out' }}>
          <Crosshair className="w-10 h-10 mx-auto mb-2" />
          <p className="font-doodle text-2xl font-black">Haz clic para jugar</p>
          <p className="text-sm text-black/60 mt-1">WASD mover · Ratón mirar · Click disparar</p>
        </div>
      </button>
    )
  }
  return null
}

/* ============================ Round/level transition banner ============================ */
function BannerOverlay() {
  const banner = useGameStore((s) => s.banner)
  const players = useGameStore((s) => s.players)
  const roomMode = useGameStore((s) => s.roomMode)
  useGameStore((s) => s.myPosSnapshot) // re-render to check age
  if (!banner) return null
  const age = performance.now() - banner.at
  if (age > 4000) return null
  const opacity = age < 300 ? age / 300 : age > 3500 ? 1 - (age - 3500) / 500 : 1
  const sorted = [...players].sort((a, b) => b.score - a.score).slice(0, 5)
  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center" style={{ opacity }}>
      <div className="doodle-card px-10 py-6 text-center" style={{ animation: 'hit-pop 0.4s ease-out' }}>
        <Trophy className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
        <h2 className="font-doodle text-4xl font-black leading-tight">{banner.text}</h2>
        <p className="font-bold text-lg text-black/60 mt-1 mb-3">{banner.sub}</p>
        {sorted.length > 0 && (
          <div className="border-t-2 border-black/20 pt-3 mt-2">
            <p className="text-xs uppercase tracking-wide text-black/50 font-bold mb-2">Marcador</p>
            <div className="flex flex-col gap-1">
              {sorted.map((p, i) => {
                const sk = getSkin(p.skin)
                const t = getTeam(p.team)
                return (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <span className="text-xs font-mono text-black/40 w-4">{i + 1}</span>
                    <span className="w-5 h-5 rounded border border-black flex items-center justify-center text-[10px] font-black text-[#fdfbf7]" style={{ background: t.id !== 'none' ? t.color : sk.color }}>{p.name.slice(0,1).toUpperCase()}</span>
                    <span className="font-bold flex-1 text-left">{p.name}</span>
                    <span className="font-mono text-xs text-black/50">{p.kills}B</span>
                    <span className="font-doodle font-black text-base">{p.score}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================ Directional damage indicator ============================ */
function DamageDirectionIndicator() {
  const damageDir = useGameStore((s) => s.damageDir)
  useGameStore((s) => s.myPosSnapshot)
  if (!damageDir) return null
  const age = performance.now() - damageDir.at
  if (age > 1500) return null
  const opacity = 1 - age / 1500
  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
      <div
        className="relative"
        style={{
          width: 120, height: 120,
          transform: `rotate(${damageDir.angle}rad)`,
          opacity,
        }}
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2"
          style={{
            width: 0, height: 0,
            borderLeft: '18px solid transparent',
            borderRight: '18px solid transparent',
            borderBottom: '28px solid #e74c3c',
            filter: 'drop-shadow(0 0 4px rgba(231,76,60,0.8))',
          }}
        />
      </div>
    </div>
  )
}

/* ============================ Killstreak progress ============================ */
function KillstreakProgress() {
  const streak = useGameStore((s) => s.streak)
  const alive = useGameStore((s) => s.alive)
  const pointerLocked = useGameStore((s) => s.pointerLocked)
  if (!alive || !pointerLocked || streak < 1) return null
  // find next streak threshold
  const next = KILLSTREAKS.find(k => k.streak > streak)
  if (!next) return null
  const prev = [...KILLSTREAKS].reverse().find(k => k.streak <= streak)
  const prevVal = prev ? prev.streak : 0
  const pct = ((streak - prevVal) / (next.streak - prevVal)) * 100
  const icons: Record<string, string> = { drone: '🛸', bomb: '💣', aura: '⚡' }
  return (
    <div className="pointer-events-none fixed top-32 left-1/2 -translate-x-1/2 z-20">
      <div className="doodle-card-flat px-4 py-2 flex items-center gap-3 min-w-[200px]">
        <Flame className="w-5 h-5 text-orange-500" />
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="font-bold">Racha {streak}</span>
            <span className="text-black/50 flex items-center gap-1">{icons[next.icon]} {next.name} ({next.streak})</span>
          </div>
          <div className="h-2 rounded-full border-2 border-black bg-white overflow-hidden">
            <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================ Quick chat ============================ */
function QuickChat() {
  const pointerLocked = useGameStore((s) => s.pointerLocked)
  const chatVisible = useGameStore((s) => s.chatVisible)
  const chatMessages = useGameStore((s) => s.chatMessages)
  if (!pointerLocked && !chatVisible) return null
  const presets = [
    { key: '1', text: '¡Hola!' },
    { key: '2', text: '¡Cuidado!' },
    { key: '3', text: '¡Buen tiro!' },
    { key: '4', text: '¡Ayuda!' },
    { key: '5', text: '¡GG!' },
  ]
  return (
    <>
      {/* chat messages display */}
      {chatVisible && chatMessages.length > 0 && (
        <div className="pointer-events-none fixed bottom-32 right-4 z-20 flex flex-col gap-1 max-w-[260px]">
          {chatMessages.slice(-4).map((msg) => (
            <div key={msg.id} className="doodle-card-flat px-2.5 py-1 text-xs">
              <span className="font-bold">{msg.name}:</span>{' '}
              <span>{msg.text}</span>
            </div>
          ))}
        </div>
      )}
      {/* quick chat bar (only visible when not pointer locked, i.e. paused) */}
      {!pointerLocked && (
        <div className="pointer-events-auto fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
          <div className="doodle-card-flat px-3 py-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-black/50" />
            {presets.map((p) => (
              <button
                key={p.key}
                onClick={() => net.sendChat(p.text)}
                className="px-2 py-1 rounded border-2 border-black/30 hover:border-black hover:bg-[#fef3f8] text-xs font-bold transition-colors"
              >
                <kbd className="font-mono mr-1">{p.key}</kbd>{p.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

/* ============================ Hud root ============================ */
export default function Hud({ onLeave }: { onLeave: () => void }) {
  return (
    <>
      <CrosshairHUD />
      <HitMarker />
      <DamageFlash />
      <DamageDirectionIndicator />
      <TopBar />
      <Minimap />
      <KillFeed />
      <BottomBars />
      <KillstreakProgress />
      <Scoreboard />
      <RespawnOverlay />
      <BannerOverlay />
      <StreakToast />
      <PickupToast />
      <QuickChat />
      <PauseOverlay onLeave={onLeave} />
    </>
  )
}
