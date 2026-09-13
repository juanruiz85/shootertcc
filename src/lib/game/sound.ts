'use client'

// Synthesized sound effects using Web Audio API — no asset files needed.
// All sounds are generated procedurally for a lightweight, doodle-game feel.

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    try { ctx = new (window.AudioContext || (window as any).webkitAudioContext)() } catch { return null }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

type ToneOpts = {
  freq: number
  duration: number
  type?: OscillatorType
  volume?: number
  freqEnd?: number
}

function tone({ freq, duration, type = 'square', volume = 0.15, freqEnd }: ToneOpts) {
  const ac = getCtx(); if (!ac) return
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ac.currentTime)
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), ac.currentTime + duration)
  }
  gain.gain.setValueAtTime(volume, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration)
  osc.connect(gain); gain.connect(ac.destination)
  osc.start()
  osc.stop(ac.currentTime + duration)
}

function noiseBurst(duration: number, volume = 0.1, filterFreq = 2000) {
  const ac = getCtx(); if (!ac) return
  const bufferSize = Math.floor(ac.sampleRate * duration)
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  const src = ac.createBufferSource(); src.buffer = buffer
  const filter = ac.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = filterFreq
  const gain = ac.createGain(); gain.gain.value = volume
  src.connect(filter); filter.connect(gain); gain.connect(ac.destination)
  src.start()
}

export const sfx = {
  shoot() {
    tone({ freq: 800, freqEnd: 200, duration: 0.08, type: 'square', volume: 0.08 })
    noiseBurst(0.05, 0.06, 3000)
  },
  shotgun() {
    tone({ freq: 400, freqEnd: 80, duration: 0.15, type: 'sawtooth', volume: 0.12 })
    noiseBurst(0.12, 0.1, 1500)
  },
  hit() {
    tone({ freq: 600, freqEnd: 300, duration: 0.05, type: 'triangle', volume: 0.1 })
  },
  headshot() {
    tone({ freq: 1200, freqEnd: 400, duration: 0.12, type: 'square', volume: 0.12 })
  },
  hurt() {
    tone({ freq: 200, freqEnd: 80, duration: 0.15, type: 'sawtooth', volume: 0.12 })
  },
  death() {
    tone({ freq: 300, freqEnd: 50, duration: 0.5, type: 'sawtooth', volume: 0.15 })
  },
  pickup() {
    tone({ freq: 600, duration: 0.06, type: 'sine', volume: 0.1 })
    setTimeout(() => tone({ freq: 900, duration: 0.08, type: 'sine', volume: 0.1 }), 60)
  },
  reload() {
    tone({ freq: 300, duration: 0.03, type: 'square', volume: 0.08 })
    setTimeout(() => tone({ freq: 500, duration: 0.03, type: 'square', volume: 0.08 }), 100)
  },
  levelup() {
    tone({ freq: 523, duration: 0.1, type: 'sine', volume: 0.12 })
    setTimeout(() => tone({ freq: 659, duration: 0.1, type: 'sine', volume: 0.12 }), 100)
    setTimeout(() => tone({ freq: 784, duration: 0.15, type: 'sine', volume: 0.12 }), 200)
  },
  kill() {
    tone({ freq: 800, duration: 0.04, type: 'square', volume: 0.08 })
    setTimeout(() => tone({ freq: 1000, duration: 0.06, type: 'square', volume: 0.08 }), 40)
  },
  streak() {
    tone({ freq: 659, duration: 0.08, type: 'sine', volume: 0.12 })
    setTimeout(() => tone({ freq: 880, duration: 0.08, type: 'sine', volume: 0.12 }), 80)
    setTimeout(() => tone({ freq: 1100, duration: 0.15, type: 'sine', volume: 0.12 }), 160)
  },
  jump() {
    tone({ freq: 300, freqEnd: 500, duration: 0.1, type: 'sine', volume: 0.06 })
  },
  switchWeapon() {
    tone({ freq: 400, duration: 0.04, type: 'square', volume: 0.06 })
  },
}
