'use client'

import { useEffect, useState } from 'react'
import { getSocket } from '@/lib/socket'
import { useGameStore } from '@/lib/game/store'
import { net } from '@/lib/socket'
import Lobby from '@/components/game/Lobby'
import GameCanvas from '@/components/game/GameCanvas'
import Hud from '@/components/game/Hud'

type View = 'lobby' | 'game'

export default function Page() {
  const [view, setView] = useState<View>('lobby')

  // Top-level connection tracking (lives for the whole app session)
  useEffect(() => {
    const s = getSocket()
    const onConn = () => useGameStore.getState().set({ connected: true })
    const onDisc = () => useGameStore.getState().set({ connected: false })
    s.on('connect', onConn)
    s.on('disconnect', onDisc)
    if (!s.connected) s.connect()
    return () => {
      s.off('connect', onConn)
      s.off('disconnect', onDisc)
    }
  }, [])

  const handleLeave = () => {
    net.leaveRoom()
    // reset HUD state and go back to lobby
    useGameStore.getState().reset()
    setView('lobby')
  }

  if (view === 'game') {
    return (
      <div className="fixed inset-0 bg-[#fdfbf7] overflow-hidden">
        <GameCanvas />
        <Hud onLeave={handleLeave} />
      </div>
    )
  }

  return <Lobby onEnterGame={() => setView('game')} />
}
