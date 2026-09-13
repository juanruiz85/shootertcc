'use client'

import { useGameStore } from '@/lib/game/store'
import { WEAPONS, WEAPON_ORDER, getSkin, getWeapon, ARENA_SIZE, PLAYER_MAX_HP } from '@/lib/game/constants'
import { Crosshair, Heart, Skull, Swords, LogOut, Loader2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

/* ============================ Crosshair ============================ */
function CrosshairHUD() {
  const weapon = useGameStore((s) => s.weapon)
  const w = getWeapon(weapon)
  const spread = w.spread
  // gap scales with spread (bigger spread = wider crosshair)
  const gap = 6 + spread * 120
  const len = 8
  const lineStyle: React.CSSProperties = {
    position: 'absolute',
    background: 'rgba(253,251,247,0.9)',
    boxShadow: '0 0 0 1.5px #1a1a1a',
  }
  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
      <div className="relative" style={{ width: 0, height: 0 }}>
        <div className="crosshair-dot" />
        {/* top */}
        <div style={{ ...lineStyle, width: 2.5, height: len, left: -1.25, top: -(gap + len) }} />
        {/* bottom */}
        <div style={{ ...lineStyle, width: 2.5, height: len, left: -1.25, top: gap }} />
        {/* left */}
        <div style={{ ...lineStyle, width: len, height: 2.5, top: -1.25, left: -(gap + len) }} />
        {/* right */}
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
      style={{
        background: 'radial-gradient(ellipse at center, rgba(231,76,60,0) 40%, rgba(231,76,60,0.85) 100%)',
      }}
    />
  )
}

/* ============================ Top bar ============================ */
function TopBar({ onLeave }: { onLeave: () => void }) {
  const roomName = useGameStore((s) => s.roomName)
  const players = useGameStore((s) => s.players)
  const myName = useGameStore((s) => s.myName)
  const mySkin = useGameStore((s) => s.mySkin)
  const score = useGameStore((s) => s.score)
  const kills = useGameStore((s) => s.kills)
  const deaths = useGameStore((s) => s.deaths)
  const skin = getSkin(mySkin)
  return (
    <div className="pointer-events-none fixed top-0 left-0 right-0 z-20 px-4 py-3 flex items-start justify-between gap-3">
      {/* left: player card */}
      <div className="doodle-card-flat px-3 py-2 flex items-center gap-3 pointer-events-auto">
        <div
          className="w-9 h-9 rounded-lg border-2 border-black flex items-center justify-center font-doodle font-black text-[#fdfbf7]"
          style={{ background: skin.color }}
        >
          {myName.slice(0, 1).toUpperCase()}
        </div>
        <div className="leading-tight">
          <p className="font-doodle text-base font-bold">{myName}</p>
          <div className="flex gap-2 text-xs text-black/60">
            <span className="flex items-center gap-0.5"><Swords className="w-3 h-3" />{kills}</span>
            <span className="flex items-center gap-0.5"><Skull className="w-3 h-3" />{deaths}</span>
            <span className="flex items-center gap-0.5"><Zap className="w-3 h-3" />{score}</span>
          </div>
        </div>
      </div>

      {/* center: room */}
      <div className="doodle-card-flat px-4 py-2 text-center pointer-events-auto">
        <p className="font-doodle text-sm font-bold leading-tight">{roomName}</p>
        <p className="text-xs text-black/60">{players.length} en arena</p>
      </div>

      {/* right: leave */}
      <div className="pointer-events-auto">
        <Button
          size="sm"
          variant="outline"
          className="doodle-btn-ghost"
          onClick={onLeave}
        >
          <LogOut className="w-4 h-4 mr-1" /> Salir
        </Button>
      </div>
    </div>
  )
}

/* ============================ Health + Ammo (bottom) ============================ */
function BottomBars() {
  const health = useGameStore((s) => s.health)
  const weapon = useGameStore((s) => s.weapon)
  const ammo = useGameStore((s) => s.ammo)
  const magazine = useGameStore((s) => s.magazine)
  const reloading = useGameStore((s) => s.reloading)
  const reloadProgress = useGameStore((s) => s.reloadProgress)
  const w = getWeapon(weapon)
  const hpPct = Math.max(0, Math.min(100, (health / PLAYER_MAX_HP) * 100))
  const hpColor = hpPct > 50 ? '#27ae60' : hpPct > 25 ? '#e67e22' : '#e74c3c'
  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 px-4 py-4 flex items-end justify-between gap-3">
      {/* health */}
      <div className="doodle-card-flat px-3 py-2 w-56">
        <div className="flex items-center justify-between mb-1">
          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-black/60">
            <Heart className="w-3.5 h-3.5" /> Vida
          </span>
          <span className="font-doodle text-lg font-black leading-none">{Math.ceil(health)}</span>
        </div>
        <div className="h-3 rounded-full border-2 border-black bg-white overflow-hidden">
          <div
            className="h-full transition-all duration-200"
            style={{ width: `${hpPct}%`, background: hpColor }}
          />
        </div>
      </div>

      {/* weapon + ammo */}
      <div className="doodle-card-flat px-3 py-2 min-w-[180px]">
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
                {ammo}
                <span className="text-sm text-black/40">/{magazine}</span>
              </p>
            )}
          </div>
        </div>
        {/* weapon slots */}
        <div className="flex gap-1 mt-2">
          {WEAPON_ORDER.map((id, i) => {
            const ww = WEAPONS[id]
            const active = id === weapon
            return (
              <div
                key={id}
                className={`flex-1 px-1.5 py-0.5 rounded border-2 text-center text-[10px] font-bold ${
                  active ? 'bg-black text-[#fdfbf7] border-black' : 'bg-white text-black/50 border-black/30'
                }`}
                title={ww.name}
              >
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
  const myId = useGameStore((s) => s.myId)
  const yaw = useGameStore((s) => s.yawSnapshot)
  const pos = useGameStore((s) => s.myPosSnapshot)
  const size = 140
  const scale = size / ARENA_SIZE
  const toMap = (wx: number, wz: number) => ({
    x: size / 2 + wx * scale,
    y: size / 2 + wz * scale,
  })
  const me = pos ? toMap(pos[0], pos[2]) : null
  return (
    <div className="pointer-events-none fixed top-16 right-4 z-20">
      <div
        className="doodle-card-flat p-1"
        style={{ width: size + 8, height: size + 8 }}
      >
        <div className="relative bg-[#fdfbf7] rounded" style={{ width: size, height: size, overflow: 'hidden' }}>
          {/* grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(26,26,26,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(26,26,26,0.08) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
          {/* border ring */}
          <div className="absolute inset-1 border-2 border-black/70 rounded" />
          {/* mobs */}
          {mobs.filter((m) => m.state === 'alive').map((m) => {
            const p = toMap(m.pos[0], m.pos[2])
            return (
              <div
                key={m.id}
                className="absolute w-1.5 h-1.5 rounded-full bg-[#e74c3c] border border-black"
                style={{ left: p.x - 3, top: p.y - 3 }}
              />
            )
          })}
          {/* other players */}
          {players.filter((p) => p.id !== myId && p.state === 'alive').map((p) => {
            const m = toMap(p.pos[0], p.pos[2])
            const sk = getSkin(p.skin)
            return (
              <div
                key={p.id}
                className="absolute w-2 h-2 rounded-full border border-black"
                style={{ left: m.x - 4, top: m.y - 4, background: sk.color }}
              />
            )
          })}
          {/* me */}
          {me && (
            <div
              className="absolute"
              style={{
                left: me.x - 5,
                top: me.y - 5,
                width: 0,
                height: 0,
                transform: `rotate(${(yaw ?? 0)}rad)`,
              }}
            >
              <div
                style={{
                  width: 0, height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderBottom: '10px solid #1a1a1a',
                }}
              />
            </div>
          )}
        </div>
        <p className="text-[9px] uppercase tracking-wider text-black/50 text-center mt-0.5 font-bold">Mapa</p>
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
        <div
          key={e.id}
          className="doodle-card-flat px-2.5 py-1.5 flex items-center gap-1.5 text-sm"
        >
          <span className="font-bold">{e.killer ?? 'Doodle Mob'}</span>
          <Skull className="w-3.5 h-3.5 text-black/60" />
          <span className="font-bold">{e.victim}</span>
          {e.headshot && (
            <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-black text-[#fdfbf7] font-bold">HS</span>
          )}
        </div>
      ))}
    </div>
  )
}

/* ============================ Scoreboard (Tab) ============================ */
function Scoreboard() {
  const show = useGameStore((s) => s.showScoreboard)
  const players = useGameStore((s) => s.players)
  const myId = useGameStore((s) => s.myId)
  const roomName = useGameStore((s) => s.roomName)
  if (!show) return null
  const sorted = [...players].sort((a, b) => b.score - a.score)
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-start justify-center pt-20 px-4">
      <div className="doodle-card w-full max-w-2xl pointer-events-auto">
        <div className="px-5 py-3 border-b-2 border-black flex items-center justify-between">
          <h2 className="font-doodle text-2xl font-black">Marcador</h2>
          <span className="text-sm text-black/60 font-bold">{roomName}</span>
        </div>
        <div className="px-5 py-2 grid grid-cols-[1fr_50px_50px_60px] gap-2 text-[11px] uppercase tracking-wide text-black/50 font-bold border-b border-dashed border-black/20">
          <span>Jugador</span>
          <span className="text-center">Bajas</span>
          <span className="text-center">Muertes</span>
          <span className="text-right">Puntos</span>
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {sorted.length === 0 && (
            <div className="px-5 py-8 text-center text-black/40 text-sm">Sin jugadores</div>
          )}
          {sorted.map((p, i) => {
            const sk = getSkin(p.skin)
            const isMe = p.id === myId
            return (
              <div
                key={p.id}
                className={`score-row px-5 py-2 grid grid-cols-[1fr_50px_50px_60px] gap-2 items-center text-sm ${
                  isMe ? 'bg-[#fef3f8]' : ''
                } ${i !== sorted.length - 1 ? 'border-b border-dashed border-black/10' : ''}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono text-black/40 w-4">{i + 1}</span>
                  <span
                    className="w-5 h-5 rounded border border-black flex items-center justify-center text-[10px] font-black text-[#fdfbf7] flex-shrink-0"
                    style={{ background: sk.color }}
                  >
                    {p.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="font-bold truncate flex items-center gap-1">
                    {p.name}
                    {isMe && <span className="text-[10px] text-black/40">(tú)</span>}
                    {p.state === 'dead' && <Skull className="w-3 h-3 text-black/40" />}
                  </span>
                </div>
                <span className="text-center font-mono">{p.kills}</span>
                <span className="text-center font-mono">{p.deaths}</span>
                <span className="text-right font-doodle font-black text-base">{p.score}</span>
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
  if (alive) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
      <Skull className="w-16 h-16 text-[#fdfbf7] mb-4" />
      <h2 className="font-doodle text-5xl font-black text-[#fdfbf7] drop-shadow-[3px_3px_0_#000]">¡Eliminado!</h2>
      <p className="respawn-pulse font-doodle text-2xl text-[#fdfbf7] mt-2 drop-shadow-[2px_2px_0_#000]">
        Reaparición en {respawnIn}s…
      </p>
    </div>
  )
}

/* ============================ Pause overlay ============================ */
function PauseOverlay() {
  const paused = useGameStore((s) => s.paused)
  const pointerLocked = useGameStore((s) => s.pointerLocked)
  const requestResume = useGameStore((s) => s.requestResume)
  if (paused) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur">
        <div className="doodle-card p-6 w-full max-w-sm text-center">
          <h2 className="font-doodle text-3xl font-black mb-1">Pausa</h2>
          <p className="text-sm text-black/60 mb-4">El cursor está liberado. Haz clic para seguir jugando.</p>
          <Button className="doodle-btn w-full" onClick={() => requestResume?.()}>
            <Crosshair className="w-4 h-4 mr-1" /> Reanudar
          </Button>
        </div>
      </div>
    )
  }
  if (!pointerLocked) {
    return (
      <button
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm cursor-pointer"
        onClick={() => requestResume?.()}
      >
        <div className="doodle-card p-6 text-center pointer-events-none">
          <Crosshair className="w-10 h-10 mx-auto mb-2" />
          <p className="font-doodle text-2xl font-black">Haz clic para jugar</p>
          <p className="text-sm text-black/60 mt-1">WASD mover · Ratón mirar · Click disparar</p>
        </div>
      </button>
    )
  }
  return null
}

/* ============================ Hud root ============================ */
export default function Hud({ onLeave }: { onLeave: () => void }) {
  return (
    <>
      <CrosshairHUD />
      <HitMarker />
      <DamageFlash />
      <TopBar onLeave={onLeave} />
      <Minimap />
      <KillFeed />
      <BottomBars />
      <Scoreboard />
      <RespawnOverlay />
      <PauseOverlay />
    </>
  )
}
