'use client'

import { useEffect, useState } from 'react'
import { useGameStore } from '@/lib/game/store'
import { SKINS, WEAPONS, WEAPON_ORDER, MAPS, getMap, MODE_INFO, isPvPMode } from '@/lib/game/constants'
import { net, attachHandlers } from '@/lib/socket'
import type { GameMode } from '@/lib/game/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Crosshair, Users, Skull, Swords, RefreshCw, Plus, LogIn, Wifi, WifiOff,
  Gamepad2, Zap, Map as MapIcon, Layers, Bot,
} from 'lucide-react'

export default function Lobby({ onEnterGame }: { onEnterGame: () => void }) {
  const rooms = useGameStore((s) => s.rooms)
  const connected = useGameStore((s) => s.connected)
  const setRooms = useGameStore((s) => s.setRooms)

  const [name, setName] = useState(() => {
    if (typeof localStorage !== 'undefined') return localStorage.getItem('ds_name') || ''
    return ''
  })
  const [skin, setSkin] = useState(() => {
    if (typeof localStorage !== 'undefined') return localStorage.getItem('ds_skin') || 'red'
    return 'red'
  })
  const [mode, setMode] = useState<GameMode>('coop')
  const [selectedMapId, setSelectedMapId] = useState<string>('')
  const [newRoom, setNewRoom] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const off = attachHandlers({
      onLobbyState: (d) => setRooms(d.rooms),
      onLobbyReady: () => {},
      onRoomError: (d) => setError(d.message),
      onRoomJoined: () => {
        localStorage.setItem('ds_name', name)
        localStorage.setItem('ds_skin', skin)
        onEnterGame()
      },
    })
    net.lobbyHello(name || 'Jugador', skin)
    const t = setInterval(() => net.lobbyRefresh(), 5000)
    return () => { off(); clearInterval(t) }
  }, [name, skin, onEnterGame, setRooms])

  useEffect(() => {
    if (connected) net.lobbyHello(name || 'Jugador', skin)
  }, [name, skin, connected])

  const doCreate = () => {
    setError(null)
    if (!name.trim()) { setError('Elige un nombre primero'); return }
    const defName = MODE_INFO[mode].name
    net.createRoom(newRoom.trim() || defName, mode, isPvPMode(mode) && selectedMapId ? selectedMapId : undefined)
  }
  const doJoin = (id: string) => {
    setError(null)
    if (!name.trim()) { setError('Elige un nombre primero'); return }
    net.joinRoom(id)
  }
  const doRefresh = () => {
    setRefreshing(true)
    net.lobbyRefresh()
    setTimeout(() => setRefreshing(false), 400)
  }

  return (
    <div className="min-h-screen w-full doodle-bg flex flex-col">
      {/* top bar */}
      <header className="border-b-2 border-black/80 bg-[#fdfbf7]/80 backdrop-blur px-4 sm:px-8 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-black text-[#fdfbf7] flex items-center justify-center wobble shadow-[3px_3px_0_0_#000]">
            <Crosshair className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-doodle text-2xl sm:text-3xl font-black tracking-tight leading-none">
              Doodle Shooter
            </h1>
            <p className="text-xs text-black/60 -mt-0.5">Multijugador · {MAPS.length} mapas · 6 modos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`gap-1.5 border-2 border-black/80 font-bold ${
              connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {connected ? 'Conectado' : 'Desconectado'}
          </Badge>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-8 py-6 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 max-w-7xl w-full mx-auto">
        {/* LEFT */}
        <div className="space-y-4">
          <Card className="doodle-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-doodle text-xl flex items-center gap-2">
                <Gamepad2 className="w-5 h-5" /> Tu jugador
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-black/60">Nombre</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 16))}
                  placeholder="Ej: BorradorX"
                  className="doodle-input"
                  maxLength={16}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-black/60">Skin</label>
                <div className="grid grid-cols-4 gap-2">
                  {SKINS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSkin(s.id)}
                      className={`relative aspect-square rounded-lg border-2 transition-all ${
                        skin === s.id
                          ? 'border-black scale-105 shadow-[3px_3px_0_0_#000]'
                          : 'border-black/30 hover:border-black/70'
                      }`}
                      style={{ background: s.color }}
                      title={s.name}
                      aria-label={s.name}
                    >
                      {skin === s.id && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="w-2.5 h-2.5 rounded-full bg-white border-2 border-black" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              {/* mode selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-black/60">Modo de juego</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(MODE_INFO) as GameMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`p-2 rounded-lg border-2 text-center transition-all ${
                        mode === m
                          ? 'border-black bg-[#fef3f8] shadow-[2px_2px_0_0_#000] -translate-x-0.5 -translate-y-0.5'
                          : 'border-black/30 hover:border-black/70 bg-white'
                      }`}
                    >
                      <div className="text-lg leading-none mb-0.5">{MODE_INFO[m].icon}</div>
                      <p className="font-doodle font-bold text-xs leading-tight">{MODE_INFO[m].name}</p>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-black/55 mt-1">{MODE_INFO[mode].desc}</p>
              </div>
              {/* map selector (PvP modes only) */}
              {isPvPMode(mode) && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-black/60">Mapa (opcional)</label>
                  <select
                    value={selectedMapId}
                    onChange={(e) => setSelectedMapId(e.target.value)}
                    className="doodle-input w-full text-sm"
                  >
                    <option value="">Aleatorio</option>
                    {MAPS.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} — {m.theme}</option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="doodle-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-doodle text-xl flex items-center gap-2">
                <Plus className="w-5 h-5" /> Crear sala
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value.slice(0, 28))}
                placeholder="Nombre de la sala"
                className="doodle-input"
                maxLength={28}
                onKeyDown={(e) => e.key === 'Enter' && doCreate()}
              />
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="border-2 border-black/70 gap-1">
                  {MODE_INFO[mode].icon} {MODE_INFO[mode].name}
                </Badge>
                {isPvPMode(mode) && selectedMapId && (
                  <Badge variant="outline" className="border-2 border-black/60 gap-1">
                    <MapIcon className="w-3 h-3" /> {getMap(selectedMapId).name}
                  </Badge>
                )}
              </div>
              <Button onClick={doCreate} className="doodle-btn w-full" size="lg">
                <Plus className="w-4 h-4 mr-1" /> Crear y entrar
              </Button>
            </CardContent>
          </Card>

          <Card className="doodle-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-doodle text-xl flex items-center gap-2">
                <Swords className="w-5 h-5" /> Controles
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
              <Ctrl keys="W A S D" desc="Moverse" />
              <Ctrl keys="Ratón" desc="Mirar" />
              <Ctrl keys="Click" desc="Disparar" />
              <Ctrl keys="R" desc="Recargar" />
              <Ctrl keys="1 2 3 4" desc="Armas" />
              <Ctrl keys="Espacio" desc="Saltar" />
              <Ctrl keys="Tab" desc="Marcador" />
              <Ctrl keys="Esc" desc="Pausa" />
            </CardContent>
          </Card>

          <Card className="doodle-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-doodle text-xl flex items-center gap-2">
                <Crosshair className="w-5 h-5" /> Arsenal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {WEAPON_ORDER.map((id, i) => {
                const w = WEAPONS[id]
                return (
                  <div key={id} className="flex items-center justify-between text-sm py-1 border-b border-dashed border-black/15 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-black text-[#fdfbf7] text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="font-bold">{w.name}</span>
                    </div>
                    <div className="flex gap-2 text-xs text-black/60">
                      <span>{w.damage} dañ</span>
                      <span>·</span>
                      <span>{w.magazine} bal</span>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Items reference */}
          <Card className="doodle-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-doodle text-xl flex items-center gap-2">
                <Layers className="w-5 h-5" /> Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ItemRow color="#f1c40f" label="Cartucho" desc="Cambia de arma + munición" glyph="▮▮" />
              <ItemRow color="#e74c3c" label="Cruz" desc="+35 de vida" glyph="✚" />
              <ItemRow color="#1abc9c" label="Bebida" desc="+30 de escudo" glyph="▮" />
            </CardContent>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          <Card className="doodle-card">
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="font-doodle text-xl flex items-center gap-2">
                <Users className="w-5 h-5" /> Salas activas
                <Badge variant="outline" className="ml-1 border-2 border-black/80">{rooms.length}</Badge>
              </CardTitle>
              <Button variant="outline" size="sm" onClick={doRefresh} className="doodle-btn-ghost">
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refrescar
              </Button>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-3 px-3 py-2 rounded-md bg-red-100 border-2 border-red-400 text-red-800 text-sm font-semibold">
                  {error}
                </div>
              )}
              {rooms.length === 0 ? (
                <div className="py-12 text-center text-black/50">
                  <Skull className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>No hay salas todavía. ¡Crea la primera!</p>
                </div>
              ) : (
                <ScrollArea className="h-[460px] pr-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {rooms.map((r) => {
                      const m = getMap(r.mapId)
                      return (
                        <div
                          key={r.id}
                          className="doodle-card-flat p-4 flex flex-col gap-3 hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform doodle-in"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-doodle text-lg font-bold leading-tight">{r.name}</p>
                              <p className="text-xs text-black/50 font-mono">{r.id.slice(0, 10)}</p>
                            </div>
                            <Badge variant="outline" className="border-2 border-black/70">
                              {r.players}/{r.max}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <Badge variant="outline" className={`border-2 gap-1 ${isPvPMode(r.mode as GameMode) ? 'border-red-400 text-red-700 bg-red-50' : 'border-emerald-400 text-emerald-700 bg-emerald-50'}`}>
                              {MODE_INFO[r.mode as GameMode]?.icon} {MODE_INFO[r.mode as GameMode]?.name ?? r.mode}
                            </Badge>
                            <Badge variant="outline" className="border-2 border-black/60 gap-1">
                              <MapIcon className="w-3 h-3" /> {m.name}
                            </Badge>
                            {(r.mode === 'coop' || r.mode === 'mixed') && (
                              <Badge variant="outline" className="border-2 border-black/60 gap-1">
                                <Layers className="w-3 h-3" /> Nv {r.level}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-black/60">
                            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {r.players} jug</span>
                            {(r.mode === 'coop' || r.mode === 'mixed') && <span className="flex items-center gap-1"><Skull className="w-3.5 h-3.5" /> {r.mobs} mobs</span>}
                          </div>
                          <Button
                            onClick={() => doJoin(r.id)}
                            disabled={r.players >= r.max}
                            className="doodle-btn w-full"
                            size="sm"
                          >
                            <LogIn className="w-4 h-4 mr-1" />
                            {r.players >= r.max ? 'Llena' : 'Entrar'}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Map gallery */}
          <Card className="doodle-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-doodle text-xl flex items-center gap-2">
                <MapIcon className="w-5 h-5" /> Mapas disponibles ({MAPS.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {MAPS.map((m) => (
                  <div key={m.id} className="doodle-card-flat p-2 text-center">
                    <div
                      className="w-full h-12 rounded border-2 border-black/20 mb-1.5 flex items-center justify-center"
                      style={{ background: `#${m.ground.toString(16).padStart(6,'0')}` }}
                    >
                      <Zap className="w-4 h-4 text-black/30" />
                    </div>
                    <p className="font-doodle text-sm font-bold leading-tight">{m.name}</p>
                    <p className="text-[10px] text-black/50">{m.theme}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="doodle-card">
            <CardContent className="pt-4">
              <p className="text-sm text-black/60 leading-relaxed">
                <span className="font-bold text-black/80">¿Cómo se juega?</span>{' '}
                <b>Cooperativo:</b> jugadores vs Mobs, sin fuego amigo. <b>Mixto:</b> jugadores vs Mobs y entre ellos.
                <br /><b>PvP:</b> 1v1, 2v2, Equipos o Todos contra todos. Elige mapa o deja aleatorio.
                <br />Sube tu racha de bajas para desbloquear <b>Dron (3)</b>, <b>Bomba (5)</b> y <b>Ráfaga (7)</b>.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="mt-auto border-t-2 border-black/80 bg-[#fdfbf7] px-4 py-3 text-center text-xs text-black/50">
        Doodle Shooter · multijugador en tiempo real · Three.js + socket.io · {MAPS.length} mapas · 6 modos
      </footer>
    </div>
  )
}

function Ctrl({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex items-center gap-2">
      <kbd className="px-1.5 py-0.5 rounded border-2 border-black/70 bg-[#fdfbf7] text-xs font-mono font-bold shadow-[1.5px_1.5px_0_0_#000]">
        {keys}
      </kbd>
      <span className="text-black/70">{desc}</span>
    </div>
  )
}

function ItemRow({ color, label, desc, glyph }: { color: string; label: string; desc: string; glyph: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="w-7 h-7 rounded-md border-2 border-black flex items-center justify-center font-black text-sm text-white"
        style={{ background: color }}
      >
        {glyph}
      </span>
      <div className="leading-tight">
        <p className="font-bold text-sm">{label}</p>
        <p className="text-[11px] text-black/55">{desc}</p>
      </div>
    </div>
  )
}
