'use client'

import { useEffect, useState } from 'react'
import { useGameStore } from '@/lib/game/store'
import { SKINS, WEAPONS, WEAPON_ORDER } from '@/lib/game/constants'
import { net, attachHandlers } from '@/lib/socket'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Crosshair, Users, Skull, Swords, RefreshCw, Plus, LogIn, Wifi, WifiOff, Gamepad2,
} from 'lucide-react'

export default function Lobby({ onEnterGame }: { onEnterGame: () => void }) {
  const rooms = useGameStore((s) => s.rooms)
  const connected = useGameStore((s) => s.connected)
  const set = useGameStore((s) => s.set)
  const setRooms = useGameStore((s) => s.setRooms)

  const [name, setName] = useState(() => {
    if (typeof localStorage !== 'undefined') return localStorage.getItem('ds_name') || ''
    return ''
  })
  const [skin, setSkin] = useState(() => {
    if (typeof localStorage !== 'undefined') return localStorage.getItem('ds_skin') || 'red'
    return 'red'
  })
  const [newRoom, setNewRoom] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // attach socket handlers for lobby events
  useEffect(() => {
    const off = attachHandlers({
      onLobbyState: (d) => setRooms(d.rooms),
      onLobbyReady: () => {},
      onRoomError: (d) => setError(d.message),
      onRoomJoined: () => {
        // persist
        localStorage.setItem('ds_name', name)
        localStorage.setItem('ds_skin', skin)
        onEnterGame()
      },
    })
    // kick off handshake
    net.lobbyHello(name || 'Jugador', skin)
    const t = setInterval(() => net.lobbyRefresh(), 5000)
    return () => { off(); clearInterval(t) }
  }, [name, skin, onEnterGame, setRooms])

  // keep server informed of name/skin changes (so join uses latest)
  useEffect(() => {
    if (connected) net.lobbyHello(name || 'Jugador', skin)
  }, [name, skin, connected])

  const doCreate = () => {
    setError(null)
    if (!name.trim()) { setError('Elige un nombre primero'); return }
    net.createRoom(newRoom.trim() || 'Nueva Sala')
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
          <div className="w-10 h-10 rounded-lg bg-black text-[#fdfbf7] flex items-center justify-center rotate-[-3deg] shadow-[3px_3px_0_0_#000]">
            <Crosshair className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-doodle text-2xl sm:text-3xl font-black tracking-tight leading-none">
              Doodle Shooter
            </h1>
            <p className="text-xs text-black/60 -mt-0.5">Multijugador · Arena</p>
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
        {/* LEFT: identity + create */}
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
              <Button onClick={doCreate} className="doodle-btn w-full" size="lg">
                <Plus className="w-4 h-4 mr-1" /> Crear y entrar
              </Button>
            </CardContent>
          </Card>

          {/* controls reference */}
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

          {/* weapons reference */}
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
        </div>

        {/* RIGHT: rooms */}
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
                <ScrollArea className="h-[420px] pr-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {rooms.map((r) => (
                      <div
                        key={r.id}
                        className="doodle-card-flat p-4 flex flex-col gap-3 hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform"
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
                        <div className="flex items-center gap-3 text-xs text-black/60">
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {r.players} jug</span>
                          <span className="flex items-center gap-1"><Skull className="w-3.5 h-3.5" /> {r.mobs} mobs</span>
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
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card className="doodle-card">
            <CardContent className="pt-4">
              <p className="text-sm text-black/60 leading-relaxed">
                <span className="font-bold text-black/80">¿Cómo se juega?</span> Entra a una sala (o crea la tuya).
                Elimina a otros jugadores <em>y</em> a los Doodle Mobs errantes para sumar puntos.
                Muerte → reapareces en 3 s. ¡El que tenga más puntos domina la arena!
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="mt-auto border-t-2 border-black/80 bg-[#fdfbf7] px-4 py-3 text-center text-xs text-black/50">
        Doodle Shooter · multijugador en tiempo real · Three.js + socket.io
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
