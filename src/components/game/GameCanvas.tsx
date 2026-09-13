'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useGameStore } from '@/lib/game/store'
import { net, attachHandlers } from '@/lib/socket'
import {
  WEAPONS, WEAPON_ORDER, getSkin, getWeapon, getTeam,
  ARENA_SIZE, PLAYER_MAX_HP, PLAYER_MAX_SHIELD, MAPS, getMap,
} from '@/lib/game/constants'
import type { PlayerPublic, MobPublic, Vec3, KillFeedEntry, ItemPublic, StreakReward } from '@/lib/game/types'

/* ============================================================
   Doodle Shooter — 3D Game (Three.js)
   - Manual pointer lock
   - Movement from yaw-based forward/right (FIX for inverted controls)
   - 16 themed maps, climbable boxes, human player models,
     per-weapon visible meshes, item drops, killstreak drone
   ============================================================ */

const HALF = ARENA_SIZE / 2
const WALL_T = 2
const PLAYER_RADIUS = 0.5
const EYE_HEIGHT = 1.7
const GRAVITY = 26
const JUMP_V = 9.5
const MOVE_SPEED = 7.5
const SPRINT_SPEED = 11
const AIR_CONTROL = 0.55
const MOUSE_SENS = 0.0022

const PAPER = 0xfdfbf7
const INK = 0x1a1a1a

function doodleMat(color: number) { return new THREE.MeshLambertMaterial({ color, flatShading: true }) }
function addEdges(mesh: THREE.Mesh, color = INK) {
  const eg = new THREE.EdgesGeometry(mesh.geometry, 1)
  mesh.add(new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color, linewidth: 2 })))
}

/* ---------- text sprite ---------- */
function makeTextSprite(text: string, color = '#1a1a1a', bg = 'rgba(253,251,247,0.92)') {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const fontSize = 40
  ctx.font = `bold ${fontSize}px "Patrick Hand", "Comic Sans MS", sans-serif`
  const w = Math.ceil(ctx.measureText(text).width) + 24
  canvas.width = w; canvas.height = fontSize + 16
  ctx.fillStyle = bg
  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 4
  ctx.beginPath(); ctx.roundRect(2, 2, canvas.width - 4, canvas.height - 4, 10); ctx.fill(); ctx.stroke()
  ctx.font = `bold ${fontSize}px "Patrick Hand", "Comic Sans MS", sans-serif`
  ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2)
  const tex = new THREE.CanvasTexture(canvas); tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }))
  spr.scale.set((canvas.width / canvas.height) * 1.1, 1.1, 1); spr.renderOrder = 999
  return spr
}

function makeBarSprite(getColor: (pct: number) => string) {
  const canvas = document.createElement('canvas'); canvas.width = 100; canvas.height = 12
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, 100, 12)
  ctx.fillStyle = getColor(1); ctx.fillRect(3, 3, 94, 6)
  const tex = new THREE.CanvasTexture(canvas)
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }))
  spr.scale.set(1.2, 0.14, 1); spr.renderOrder = 999
  return { spr, canvas, ctx, tex }
}
function updateBar(b: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture; spr: THREE.Sprite }, pct: number, colorFn: (p: number) => string) {
  const ctx = b.ctx
  ctx.clearRect(0, 0, b.canvas.width, b.canvas.height)
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, 100, 12)
  ctx.fillStyle = colorFn(pct); ctx.fillRect(3, 3, 94 * Math.max(0, Math.min(1, pct)), 6)
  b.tex.needsUpdate = true
}

/* ---------- weapon mesh (held by remote players + viewmodel) ---------- */
function buildWeaponMesh(weaponId: string): THREE.Group {
  const g = new THREE.Group()
  const dark = doodleMat(0x2c2c2c)
  const wood = doodleMat(0x7a5230)
  const metal = doodleMat(0x555555)
  if (weaponId === 'pistol') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.34), dark); body.position.set(0, 0, 0.05); addEdges(body); g.add(body)
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.2), metal); barrel.position.set(0, 0.04, -0.18); addEdges(barrel); g.add(barrel)
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), wood); grip.position.set(0, -0.16, 0.1); grip.rotation.x = 0.3; addEdges(grip); g.add(grip)
  } else if (weaponId === 'smg') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.42), dark); body.position.set(0, 0, 0.02); addEdges(body); g.add(body)
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.22), metal); barrel.position.set(0, 0.02, -0.28); addEdges(barrel); g.add(barrel)
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.1), wood); mag.position.set(0, -0.16, 0.05); addEdges(mag); g.add(mag)
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.1), wood); grip.position.set(0, -0.14, 0.16); grip.rotation.x = 0.25; addEdges(grip); g.add(grip)
  } else if (weaponId === 'rifle') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.7), dark); body.position.set(0, 0, 0.05); addEdges(body); g.add(body)
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.4), metal); barrel.position.set(0, 0.03, -0.35); addEdges(barrel); g.add(barrel)
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.22), wood); stock.position.set(0, -0.02, 0.4); addEdges(stock); g.add(stock)
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, 0.1), wood); mag.position.set(0, -0.18, 0.05); addEdges(mag); g.add(mag)
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 8), metal); scope.rotation.z = Math.PI/2; scope.position.set(0, 0.13, 0.05); g.add(scope)
  } else if (weaponId === 'shotgun') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.6), wood); body.position.set(0, 0, 0.05); addEdges(body); g.add(body)
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.4), metal); barrel.position.set(0, 0.03, -0.28); addEdges(barrel); g.add(barrel)
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.18), wood); pump.position.set(0, -0.1, -0.12); addEdges(pump); g.add(pump)
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.1), wood); grip.position.set(0, -0.14, 0.2); grip.rotation.x = 0.25; addEdges(grip); g.add(grip)
  }
  return g
}

/* ---------- human player avatar ---------- */
type Avatar = {
  group: THREE.Group
  head: THREE.Mesh
  torso: THREE.Mesh
  armL: THREE.Mesh; armR: THREE.Mesh
  legL: THREE.Mesh; legR: THREE.Mesh
  weapon: THREE.Group
  nametag: THREE.Sprite
  hpBar: THREE.Sprite
  hpData: ReturnType<typeof makeBarSprite>
  shieldBar: THREE.Sprite
  shieldData: ReturnType<typeof makeBarSprite>
  teamRing: THREE.Mesh
}
function buildAvatar(skinId: string, name: string, team: string): Avatar {
  const skin = getSkin(skinId)
  const teamInfo = getTeam(team)
  const group = new THREE.Group()
  const bodyMat = doodleMat(new THREE.Color(skin.color).getHex())
  const accentMat = doodleMat(new THREE.Color(skin.accent).getHex())
  const skinMat = doodleMat(0xf0c8a0) // skin tone

  // legs
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.24), accentMat)
  legL.position.set(-0.16, 0.4, 0); addEdges(legL); group.add(legL)
  const legR = legL.clone(); legR.position.x = 0.16; group.add(legR)
  // torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.36), bodyMat)
  torso.position.y = 1.18; addEdges(torso); group.add(torso)
  // arms
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.2), bodyMat)
  armL.position.set(-0.39, 1.2, 0); addEdges(armL); group.add(armL)
  const armR = armL.clone(); armR.position.x = 0.39; group.add(armR)
  // head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skinMat)
  head.position.y = 1.78; addEdges(head); group.add(head)
  // hair
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.46), accentMat)
  hair.position.y = 2.02; addEdges(hair); group.add(hair)
  // eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const pupMat = new THREE.MeshBasicMaterial({ color: INK })
  for (const sx of [-0.1, 0.1]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.02), eyeMat)
    eye.position.set(sx, 1.8, 0.22); group.add(eye)
    const pup = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.02), pupMat)
    pup.position.set(sx, 1.8, 0.23); group.add(pup)
  }
  // weapon held in right hand
  const weapon = buildWeaponMesh('pistol')
  weapon.position.set(0.42, 1.15, 0.28)
  weapon.rotation.y = -0.1
  group.add(weapon)
  // team ring under feet
  const ringGeo = new THREE.RingGeometry(0.42, 0.62, 20)
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(teamInfo.color).getHex(), side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
  const teamRing = new THREE.Mesh(ringGeo, ringMat)
  teamRing.rotation.x = -Math.PI / 2
  teamRing.position.y = 0.03
  group.add(teamRing)

  const nametag = makeTextSprite(name)
  nametag.position.set(0, 2.4, 0); group.add(nametag)
  const hpData = makeBarSprite((p) => p > 0.5 ? '#27ae60' : p > 0.25 ? '#e67e22' : '#e74c3c')
  hpData.spr.position.set(0, 2.18, 0); group.add(hpData.spr)
  const shieldData = makeBarSprite(() => '#1abc9c')
  shieldData.spr.scale.set(0.9, 0.1, 1); shieldData.spr.position.set(0, 2.06, 0); group.add(shieldData.spr)
  shieldData.spr.visible = false

  return { group, head, torso, armL, armR, legL, legR, weapon, nametag, hpBar: hpData.spr, hpData, shieldBar: shieldData.spr, shieldData, teamRing }
}

function setAvatarWeapon(a: Avatar, weaponId: string) {
  a.group.remove(a.weapon)
  a.weapon.geometry?.dispose?.()
  const nw = buildWeaponMesh(weaponId)
  nw.position.set(0.42, 1.15, 0.28); nw.rotation.y = -0.1
  a.group.add(nw)
  a.weapon = nw
}

/* ---------- mob avatar ---------- */
function buildMobAvatar(): { group: THREE.Group; face: THREE.Group; bodyMat: THREE.MeshLambertMaterial } {
  const group = new THREE.Group()
  const bodyMat = doodleMat(0xc0392b)
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), bodyMat)
  cube.position.y = 0.6; addEdges(cube); group.add(cube)
  // spikes
  const spikeMat = doodleMat(0x8b2a23)
  for (const [x, y, z] of [[0.3, 1.1, 0], [-0.3, 1.1, 0], [0, 1.1, 0.3], [0, 1.1, -0.3]] as const) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 4), spikeMat)
    sp.position.set(x, y, z); group.add(sp)
  }
  const face = new THREE.Group()
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const pupMat = new THREE.MeshBasicMaterial({ color: INK })
  for (const sx of [-0.22, 0.22]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.04), eyeMat); eye.position.set(sx, 0.7, 0.51); face.add(eye)
    const pup = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), pupMat); pup.position.set(sx, 0.7, 0.54); face.add(pup)
  }
  const browMat = new THREE.MeshBasicMaterial({ color: INK })
  for (const [sx, rot] of [[-0.22, 0.4], [0.22, -0.4]] as const) {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.04), browMat); brow.position.set(sx, 0.84, 0.52); brow.rotation.z = rot; face.add(brow)
  }
  const frown = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.04), browMat); frown.position.set(0, 0.48, 0.52); frown.rotation.z = Math.PI; face.add(frown)
  group.add(face)
  return { group, face, bodyMat }
}

/* ---------- item avatar ---------- */
function buildItemAvatar(type: string): THREE.Group {
  const g = new THREE.Group()
  if (type === 'ammo') {
    // cartucho de balas: caja amarilla con balas
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.35), doodleMat(0xf1c40f)); box.position.y = 0.5; addEdges(box); g.add(box)
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.18, 6), doodleMat(0xb8860b))
      b.position.set(-0.13 + i * 0.09, 0.68, 0); g.add(b)
    }
  } else if (type === 'heal') {
    // cruz roja
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), doodleMat(0xffffff)); base.position.y = 0.5; addEdges(base); g.add(base)
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.4, 0.12), doodleMat(0xe74c3c)); v.position.set(0, 0.5, 0.06); addEdges(v); g.add(v)
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.12), doodleMat(0xe74c3c)); h.position.set(0, 0.5, 0.06); addEdges(h); g.add(h)
  } else if (type === 'shield') {
    // bebida: lata con etiqueta
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.5, 12), doodleMat(0x1abc9c)); can.position.y = 0.5; addEdges(can); g.add(can)
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 12), doodleMat(0x16a085)); cap.position.y = 0.78; g.add(cap)
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.181, 0.181, 0.2, 12), doodleMat(0xffffff)); label.position.y = 0.5; g.add(label)
  }
  return g
}

/* ============================================================
   Types for runtime entities
   ============================================================ */
type RemotePlayer = Avatar & {
  id: string; name: string; skin: string; team: string
  targetPos: THREE.Vector3; targetYaw: number
  pos: THREE.Vector3; yaw: number
  health: number; shield: number; alive: boolean; weapon: string; bob: number
}
type Mob = { id: string; group: THREE.Group; face: THREE.Group; bodyMat: THREE.MeshLambertMaterial; targetPos: THREE.Vector3; pos: THREE.Vector3; alive: boolean; hitFlashUntil: number; bob: number }
type ItemEnt = { id: string; type: string; group: THREE.Group; pos: THREE.Vector3; spin: number }
type Tracer = { line: THREE.Line; born: number; ttl: number }
type ObstacleBox = { box: THREE.Box3; top: number; climbable: boolean; x: number; z: number; hw: number; hd: number }

/* ============================================================
   Component
   ============================================================ */
export default function GameCanvas() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // ---------- renderer / scene / camera ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(PAPER, 1)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(PAPER)
    scene.fog = new THREE.Fog(PAPER, 35, 80)

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 200)
    camera.position.set(0, EYE_HEIGHT, 0)
    camera.rotation.order = 'YXZ'
    scene.add(camera)

    // lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.9))
    const dir = new THREE.DirectionalLight(0xffffff, 0.55); dir.position.set(20, 40, 10); scene.add(dir)
    scene.add(new THREE.HemisphereLight(0xfff7e0, 0xe8e4df, 0.4))

    // arena group (rebuilt on map change)
    const arenaGroup = new THREE.Group()
    scene.add(arenaGroup)
    const obstacles: ObstacleBox[] = []
    let boundLim = HALF - PLAYER_RADIUS
    let droneMesh: THREE.Group | null = null

    function buildArena(mapId: string) {
      // clear
      while (arenaGroup.children.length) {
        const c = arenaGroup.children.pop()!
        c.traverse((o: any) => {
          if (o.geometry) o.geometry.dispose?.()
          if (o.material) { if (o.material.map) o.material.map.dispose?.(); o.material.dispose?.() }
        })
      }
      obstacles.length = 0
      const map = getMap(mapId)
      // background/fog colors
      scene.background = new THREE.Color(map.fog)
      scene.fog = new THREE.Fog(map.fog, 35, 80)
      renderer.setClearColor(map.fog, 1)

      // floor texture
      const fc = document.createElement('canvas'); fc.width = 1024; fc.height = 1024
      const fctx = fc.getContext('2d')!
      const groundHex = '#' + map.ground.toString(16).padStart(6, '0')
      fctx.fillStyle = groundHex; fctx.fillRect(0, 0, 1024, 1024)
      fctx.strokeStyle = 'rgba(26,26,26,0.08)'; fctx.lineWidth = 2
      for (let i = 0; i <= 1024; i += 64) {
        fctx.beginPath(); fctx.moveTo(i, 0); fctx.lineTo(i, 1024); fctx.stroke()
        fctx.beginPath(); fctx.moveTo(0, i); fctx.lineTo(1024, i); fctx.stroke()
      }
      fctx.strokeStyle = 'rgba(231,76,60,0.12)'; fctx.lineWidth = 3
      for (let i = 0; i < 14; i++) {
        fctx.beginPath(); const x = Math.random()*1024, y = Math.random()*1024
        fctx.arc(x, y, 20 + Math.random()*40, 0, Math.PI*2); fctx.stroke()
      }
      const floorTex = new THREE.CanvasTexture(fc)
      floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(4, 4)
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE), new THREE.MeshLambertMaterial({ map: floorTex }))
      floor.rotation.x = -Math.PI/2; arenaGroup.add(floor)

      // walls
      const wallMat = doodleMat(map.accent)
      const wallH = 4
      const wN = new THREE.Mesh(new THREE.BoxGeometry(ARENA_SIZE + WALL_T*2, wallH, WALL_T), wallMat); wN.position.set(0, wallH/2, -HALF-WALL_T/2); addEdges(wN); arenaGroup.add(wN)
      const wS = wN.clone(); wS.position.z = HALF+WALL_T/2; arenaGroup.add(wS)
      const wW = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, wallH, ARENA_SIZE + WALL_T*2), wallMat); wW.position.set(-HALF-WALL_T/2, wallH/2, 0); addEdges(wW); arenaGroup.add(wW)
      const wE = wW.clone(); wE.position.x = HALF+WALL_T/2; arenaGroup.add(wE)

      // obstacles
      for (const c of map.obstacles) {
        let mesh: THREE.Mesh
        if (c.kind === 'cyl') mesh = new THREE.Mesh(new THREE.CylinderGeometry(c.w/2, c.w/2, c.h, 12), doodleMat(c.color))
        else mesh = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.d), doodleMat(c.color))
        mesh.position.set(c.x, c.h/2, c.z); addEdges(mesh); arenaGroup.add(mesh)
        const box = new THREE.Box3().setFromObject(mesh)
        box.expandByScalar(PLAYER_RADIUS * 0.5)
        obstacles.push({ box, top: c.h, climbable: c.climbable, x: c.x, z: c.z, hw: c.w/2, hd: c.d/2 })
      }
      boundLim = HALF - PLAYER_RADIUS
    }
    buildArena('arena')

    // ---------- viewmodel ----------
    const viewmodelGroup = new THREE.Group()
    camera.add(viewmodelGroup)
    let viewmodelWeapon = buildWeaponMesh('pistol')
    viewmodelWeapon.position.set(0.28, -0.26, -0.55)
    viewmodelGroup.add(viewmodelWeapon)
    const muzzleFlash = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0 }))
    muzzleFlash.position.set(0.28, -0.24, -0.95); viewmodelGroup.add(muzzleFlash)
    function setViewmodel(weaponId: string) {
      viewmodelGroup.remove(viewmodelWeapon)
      viewmodelWeapon.traverse((o: any) => { if (o.geometry) o.geometry.dispose?.(); if (o.material) o.material.dispose?.() })
      viewmodelWeapon = buildWeaponMesh(weaponId)
      const s = weaponId === 'shotgun' ? 1.35 : weaponId === 'rifle' ? 1.15 : weaponId === 'smg' ? 0.9 : 1
      viewmodelWeapon.scale.set(s, s, s)
      viewmodelWeapon.position.set(0.28, -0.26, -0.55)
      viewmodelGroup.add(viewmodelWeapon)
      muzzleFlash.position.set(0.28, -0.24, -0.95)
    }

    // ---------- local player ----------
    const local = {
      pos: new THREE.Vector3(0, EYE_HEIGHT, 0),
      vel: new THREE.Vector3(),
      yaw: 0, pitch: 0,
      onGround: true,
      onBoxTop: -1, // index of obstacle we stand on, or -1
      health: PLAYER_MAX_HP, shield: 0,
      alive: true, weapon: 'pistol', ammo: WEAPONS.pistol.magazine,
      reloading: false, reloadStart: 0,
      lastShot: 0, respawnAt: 0, bobT: 0,
      streak: 0,
    }
    const moveState = { f: false, b: false, l: false, r: false, sprint: false }
    const mouse = { down: false }

    const remotes = new Map<string, RemotePlayer>()
    const mobs = new Map<string, Mob>()
    const items = new Map<string, ItemEnt>()
    const tracers: Tracer[] = []

    const setStore = (p: Partial<ReturnType<typeof useGameStore.getState>>) => useGameStore.setState(p as any)

    // ---------- entity factories ----------
    function spawnRemote(p: PlayerPublic) {
      if (remotes.has(p.id)) return
      const av = buildAvatar(p.skin, p.name, p.team)
      av.group.position.set(p.pos[0], 0, p.pos[2])
      av.group.rotation.y = p.yaw
      setAvatarWeapon(av, p.weapon)
      scene.add(av.group)
      const rp: RemotePlayer = {
        ...av,
        id: p.id, name: p.name, skin: p.skin, team: p.team,
        targetPos: new THREE.Vector3(p.pos[0], 0, p.pos[2]),
        targetYaw: p.yaw,
        pos: new THREE.Vector3(p.pos[0], 0, p.pos[2]),
        yaw: p.yaw,
        health: p.health, shield: p.shield, alive: p.state === 'alive', weapon: p.weapon, bob: 0,
      }
      updateBar(rp.hpData, p.health / PLAYER_MAX_HP, (x) => x > 0.5 ? '#27ae60' : x > 0.25 ? '#e67e22' : '#e74c3c')
      if (p.shield > 0) { rp.shieldData.spr.visible = true; updateBar(rp.shieldData, p.shield / PLAYER_MAX_SHIELD, () => '#1abc9c') }
      rp.group.visible = rp.alive
      remotes.set(p.id, rp)
    }
    function removeRemote(id: string) {
      const rp = remotes.get(id); if (!rp) return
      scene.remove(rp.group)
      rp.group.traverse((o: any) => { if (o.geometry) o.geometry.dispose?.(); if (o.material) { o.material.map?.dispose?.(); o.material.dispose?.() } })
      remotes.delete(id)
    }
    function spawnMob(m: MobPublic) {
      if (mobs.has(m.id)) return
      const built = buildMobAvatar()
      built.group.position.set(m.pos[0], 0, m.pos[2])
      scene.add(built.group)
      mobs.set(m.id, { id: m.id, group: built.group, face: built.face, bodyMat: built.bodyMat, targetPos: new THREE.Vector3(m.pos[0],0,m.pos[2]), pos: new THREE.Vector3(m.pos[0],0,m.pos[2]), alive: m.state === 'alive', hitFlashUntil: 0, bob: Math.random()*6 })
      mobs.get(m.id)!.group.visible = m.state === 'alive'
    }
    function spawnItem(it: { id: string; type: string; pos: Vec3 }) {
      if (items.has(it.id)) return
      const g = buildItemAvatar(it.type)
      g.position.set(it.pos[0], 0, it.pos[2])
      scene.add(g)
      items.set(it.id, { id: it.id, type: it.type, group: g, pos: new THREE.Vector3(it.pos[0],0,it.pos[2]), spin: Math.random()*6 })
    }
    function removeItem(id: string) {
      const it = items.get(id); if (!it) return
      scene.remove(it.group)
      it.group.traverse((o: any) => { if (o.geometry) o.geometry.dispose?.(); if (o.material) o.material.dispose?.() })
      items.delete(id)
    }
    function clearMobs() { for (const id of Array.from(mobs.keys())) { const m = mobs.get(id)!; scene.remove(m.group); mobs.delete(id) } }
    function clearItems() { for (const id of Array.from(items.keys())) removeItem(id) }

    // ---------- shooting ----------
    const raycaster = new THREE.Raycaster()
    function shoot() {
      const now = performance.now()
      const w = getWeapon(local.weapon)
      if (now - local.lastShot < w.fireRate) return
      if (local.reloading) return
      if (local.ammo <= 0) { startReload(); return }
      local.lastShot = now
      local.ammo -= 1
      setStore({ ammo: local.ammo })
      muzzleFlash.material.opacity = 1; (muzzleFlash as any)._flashUntil = now + 60
      viewmodelGroup.position.z = 0.06
      const origin = new THREE.Vector3(); camera.getWorldPosition(origin)
      const baseDir = new THREE.Vector3(); camera.getWorldDirection(baseDir)
      for (let i = 0; i < w.pellets; i++) {
        const dir = baseDir.clone()
        dir.x += (Math.random()-0.5) * w.spread * 2
        dir.y += (Math.random()-0.5) * w.spread * 2
        dir.z += (Math.random()-0.5) * w.spread * 2
        dir.normalize()
        raycastAndReport(origin, dir, w)
        spawnTracer(origin, dir, w.range, INK)
      }
      net.shoot([origin.x, origin.y, origin.z], [baseDir.x, baseDir.y, baseDir.z], local.weapon)
      if (local.ammo <= 0) startReload()
    }
    function raycastAndReport(origin: THREE.Vector3, dir: THREE.Vector3, w: ReturnType<typeof getWeapon>) {
      raycaster.set(origin, dir); raycaster.far = w.range
      const candidates: THREE.Object3D[] = []
      const info = new Map<THREE.Object3D, { type: 'player'|'mob'; id: string; headY: number }>()
      for (const rp of remotes.values()) {
        if (!rp.alive) continue
        rp.group.traverse((o) => { if ((o as any).isMesh) { candidates.push(o); info.set(o, { type: 'player', id: rp.id, headY: rp.pos.y + 2.0 }) } })
      }
      for (const mb of mobs.values()) {
        if (!mb.alive) continue
        mb.group.traverse((o) => { if ((o as any).isMesh) { candidates.push(o); info.set(o, { type: 'mob', id: mb.id, headY: mb.pos.y + 0.9 }) } })
      }
      if (!candidates.length) return
      const hits = raycaster.intersectObjects(candidates, false)
      if (!hits.length) return
      const hit = hits[0]; const i = info.get(hit.object); if (!i) return
      const headshot = hit.point.y >= i.headY
      const damage = w.damage * (headshot ? (i.type === 'player' ? 2 : 1.6) : 1)
      net.reportHit(i.id, damage, headshot, hit.distance, i.type)
      setStore({ hitMarker: performance.now() })
    }
    function spawnTracer(origin: THREE.Vector3, dir: THREE.Vector3, range: number, color: number) {
      const end = origin.clone().add(dir.clone().multiplyScalar(range))
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([origin.clone(), end]), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 }))
      scene.add(line)
      tracers.push({ line, born: performance.now(), ttl: 90 })
    }
    function startReload() {
      const w = getWeapon(local.weapon)
      if (local.reloading || local.ammo >= w.magazine) return
      local.reloading = true; local.reloadStart = performance.now()
      setStore({ reloading: true, reloadProgress: 0 })
      net.reload(local.weapon)
    }
    function finishReload() {
      const w = getWeapon(local.weapon)
      local.reloading = false; local.ammo = w.magazine
      setStore({ reloading: false, ammo: local.ammo, magazine: w.magazine })
    }
    function switchWeapon(id: string) {
      if (!WEAPONS[id] || id === local.weapon) return
      local.weapon = id; const w = getWeapon(id)
      local.reloading = false; local.ammo = w.magazine
      setViewmodel(id)
      setStore({ weapon: id, ammo: local.ammo, magazine: w.magazine, reloading: false })
    }

    // ---------- input ----------
    let isLocked = false
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': moveState.f = true; break
        case 'KeyS': case 'ArrowDown': moveState.b = true; break
        case 'KeyA': case 'ArrowLeft': moveState.l = true; break
        case 'KeyD': case 'ArrowRight': moveState.r = true; break
        case 'Space': if (local.onGround && local.alive) { local.vel.y = JUMP_V; local.onGround = false } break
        case 'ShiftLeft': case 'ShiftRight': moveState.sprint = true; break
        case 'KeyR': startReload(); break
        case 'Digit1': switchWeapon('pistol'); break
        case 'Digit2': switchWeapon('smg'); break
        case 'Digit3': switchWeapon('rifle'); break
        case 'Digit4': switchWeapon('shotgun'); break
        case 'Tab': e.preventDefault(); setStore({ showScoreboard: true }); break
        case 'Escape': setStore({ paused: true }); break
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': moveState.f = false; break
        case 'KeyS': case 'ArrowDown': moveState.b = false; break
        case 'KeyA': case 'ArrowLeft': moveState.l = false; break
        case 'KeyD': case 'ArrowRight': moveState.r = false; break
        case 'ShiftLeft': case 'ShiftRight': moveState.sprint = false; break
        case 'Tab': setStore({ showScoreboard: false }); break
      }
    }
    const onMouseDown = (e: MouseEvent) => { if (e.button !== 0 || !isLocked) return; mouse.down = true; const w = getWeapon(local.weapon); if (!w.auto) shoot() }
    const onMouseUp = (e: MouseEvent) => { if (e.button === 0) mouse.down = false }
    const onMouseMove = (e: MouseEvent) => {
      if (!isLocked) return
      local.yaw -= e.movementX * MOUSE_SENS; local.pitch -= e.movementY * MOUSE_SENS
      const lim = Math.PI/2 - 0.05; local.pitch = Math.max(-lim, Math.min(lim, local.pitch))
    }
    const onWheel = (e: WheelEvent) => {
      if (!isLocked) return
      const idx = WEAPON_ORDER.indexOf(local.weapon)
      const next = e.deltaY > 0 ? (idx+1) % WEAPON_ORDER.length : (idx-1+WEAPON_ORDER.length) % WEAPON_ORDER.length
      switchWeapon(WEAPON_ORDER[next])
    }
    const onCanvasClick = () => { if (!isLocked) renderer.domElement.requestPointerLock() }
    const onPointerLockChange = () => {
      isLocked = document.pointerLockElement === renderer.domElement
      setStore({ pointerLocked: isLocked, paused: isLocked ? false : useGameStore.getState().paused })
      if (!isLocked) { moveState.f = moveState.b = moveState.l = moveState.r = false; mouse.down = false }
    }
    const onResize = () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight) }
    document.addEventListener('keydown', onKeyDown); document.addEventListener('keyup', onKeyUp)
    document.addEventListener('mousedown', onMouseDown); document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('mousemove', onMouseMove); document.addEventListener('wheel', onWheel, { passive: true })
    document.addEventListener('pointerlockchange', onPointerLockChange)
    window.addEventListener('resize', onResize)
    renderer.domElement.addEventListener('click', onCanvasClick)

    const resumeFn = () => { renderer.domElement.requestPointerLock() }
    setStore({ requestResume: resumeFn })

    // ---------- socket handlers ----------
    const handlers = attachHandlers({
      onRoomJoined: (data) => {
        setStore({
          roomName: data.room.name, roomMode: data.room.mode, roomMapId: data.room.mapId, roomLevel: data.room.level,
          myId: data.me.id, myName: data.me.name, mySkin: data.me.skin, myTeam: data.me.team,
          connected: true,
        })
        buildArena(data.room.mapId)
        local.pos.set(data.me.pos[0], EYE_HEIGHT, data.me.pos[2])
        local.yaw = data.me.yaw; local.pitch = data.me.pitch
        local.health = data.me.health; local.shield = data.me.shield
        local.alive = data.me.state === 'alive'; local.weapon = data.me.weapon; local.ammo = data.me.ammo
        local.streak = data.me.streak
        setViewmodel(local.weapon)
        const w = getWeapon(local.weapon)
        setStore({
          health: local.health, shield: local.shield, alive: local.alive,
          weapon: local.weapon, ammo: local.ammo, magazine: w.magazine,
          reloading: false, score: data.me.score, kills: data.me.kills, deaths: data.me.deaths,
          streak: data.me.streak, bestStreak: data.me.bestStreak,
        })
        camera.position.copy(local.pos)
        // rebuild remotes & mobs & items
        for (const id of Array.from(remotes.keys())) removeRemote(id)
        clearMobs(); clearItems()
        for (const p of data.players) if (p.id !== data.me.id) spawnRemote(p)
        for (const m of data.mobs) spawnMob(m)
        for (const it of data.items) spawnItem(it)
        setStore({ items: data.items, mobs: data.mobs })
      },
      onRoomMapChange: (data) => {
        setStore({ roomMapId: data.mapId, roomLevel: data.level, roomMode: data.mode })
        buildArena(data.mapId)
        // reset positions: server will send room:joined with fresh state shortly after for round transitions
        // but for safety, clear entities to avoid stale references
        for (const id of Array.from(remotes.keys())) removeRemote(id)
        clearMobs(); clearItems()
      },
      onRoomPlayers: (data) => {
        const me = data.players.find((p) => p.id === useGameStore.getState().myId)
        if (me) {
          setStore({ score: me.score, kills: me.kills, deaths: me.deaths, health: me.health, shield: me.shield, alive: me.state === 'alive', streak: me.streak, bestStreak: me.bestStreak })
          local.health = me.health; local.shield = me.shield; local.alive = me.state === 'alive'; local.streak = me.streak
        }
        setStore({ players: data.players })
        const ids = new Set(data.players.map((p) => p.id))
        for (const id of Array.from(remotes.keys())) if (!ids.has(id)) removeRemote(id)
      },
      onPlayerJoined: (p) => { if (p.id !== useGameStore.getState().myId) spawnRemote(p) },
      onPlayerLeft: (d) => removeRemote(d.id),
      onPlayerState: (d) => {
        const rp = remotes.get(d.id); if (!rp) return
        rp.targetPos.set(d.pos[0], 0, d.pos[2]); rp.targetYaw = d.yaw
        if (rp.weapon !== d.weapon) { rp.weapon = d.weapon; setAvatarWeapon(rp, d.weapon) }
        rp.alive = d.state === 'alive'; rp.group.visible = rp.alive
      },
      onPlayerShot: (d) => {
        const origin = new THREE.Vector3(d.origin[0], d.origin[1], d.origin[2])
        const dir = new THREE.Vector3(d.dir[0], d.dir[1], d.dir[2])
        const rp = remotes.get(d.shooterId)
        const color = rp ? new THREE.Color(getSkin(rp.skin).color).getHex() : 0xe74c3c
        spawnTracer(origin, dir, getWeapon(d.weapon).range, color)
      },
      onPlayerAmmo: (d) => { if (d.weapon === local.weapon) { local.ammo = d.ammo; setStore({ ammo: d.ammo }) } },
      onPlayerReloading: () => {},
      onPlayerReloadDone: (d) => { if (d.weapon === local.weapon) { local.ammo = d.ammo; setStore({ ammo: d.ammo, reloading: false }); local.reloading = false } },
      onPlayerDamaged: (d) => {
        const meId = useGameStore.getState().myId
        if (d.id === meId) {
          local.health = d.health; local.shield = d.shield ?? local.shield
          setStore({ health: d.health, shield: d.shield ?? local.shield, damageFlash: performance.now(), lastHitBy: d.by })
        } else {
          const rp = remotes.get(d.id)
          if (rp) {
            rp.health = d.health; rp.shield = d.shield ?? rp.shield
            updateBar(rp.hpData, d.health / PLAYER_MAX_HP, (x) => x > 0.5 ? '#27ae60' : x > 0.25 ? '#e67e22' : '#e74c3c')
            if ((d.shield ?? 0) > 0) { rp.shieldData.spr.visible = true; updateBar(rp.shieldData, (d.shield ?? 0) / PLAYER_MAX_SHIELD, () => '#1abc9c') }
            else rp.shieldData.spr.visible = false
          }
        }
      },
      onPlayerKilled: (d) => {
        const meId = useGameStore.getState().myId
        if (d.victimId === meId) {
          local.alive = false; local.health = 0; local.streak = 0
          setStore({ alive: false, health: 0, respawnIn: 3, streak: 0 })
          local.respawnAt = performance.now() + 3000
        } else {
          const rp = remotes.get(d.victimId); if (rp) { rp.alive = false; rp.group.visible = false }
        }
      },
      onPlayerRespawned: (d) => {
        const meId = useGameStore.getState().myId
        if (d.id === meId) {
          local.alive = true; local.health = PLAYER_MAX_HP; local.shield = 0
          local.pos.set(d.pos[0], EYE_HEIGHT, d.pos[2]); local.vel.set(0,0,0)
          local.ammo = getWeapon(local.weapon).magazine
          setStore({ alive: true, health: PLAYER_MAX_HP, shield: 0, respawnIn: 0, ammo: local.ammo })
        } else {
          const rp = remotes.get(d.id); if (rp) { rp.alive = true; rp.health = PLAYER_MAX_HP; rp.shield = 0; rp.pos.set(d.pos[0],0,d.pos[2]); rp.targetPos.copy(rp.pos); rp.group.visible = true; updateBar(rp.hpData, 1, (x) => x > 0.5 ? '#27ae60' : '#e67e22'); rp.shieldData.spr.visible = false }
        }
      },
      onPlayerStreak: (d) => {
        const meId = useGameStore.getState().myId
        if (d.id === meId && d.reward) {
          local.streak = d.streak
          setStore({ streak: d.streak, streakReward: d.reward, streakRewardAt: performance.now() })
        } else if (d.id === meId) {
          setStore({ streak: d.streak })
        }
        if (d.id !== meId && d.reward) {
          // show in kill feed area (handled by store via toast? we just leave it)
        }
      },
      onMobState: (data) => {
        for (const m of data.mobs) {
          let mob = mobs.get(m.id)
          if (!mob) { spawnMob(m); mob = mobs.get(m.id) }
          if (!mob) continue
          mob.targetPos.set(m.pos[0], 0, m.pos[2]); mob.alive = m.state === 'alive'
          if (m.flash) mob.hitFlashUntil = performance.now() + 120
        }
        setStore({ mobs: data.mobs })
      },
      onMobDamaged: (d) => { const mob = mobs.get(d.id); if (mob) mob.hitFlashUntil = performance.now() + 120 },
      onMobKilled: (d) => { const mob = mobs.get(d.id); if (mob) { mob.alive = false; mob.group.visible = false } },
      onMobRespawned: (d) => {
        const mob = mobs.get(d.id)
        if (mob) { mob.alive = true; mob.group.visible = true; mob.pos.set(d.pos[0],0,d.pos[2]); mob.targetPos.copy(mob.pos) }
        else spawnMob({ id: d.id, pos: d.pos, state: 'alive' })
      },
      onItemsState: (data) => {
        const ids = new Set(data.items.map(i => i.id))
        for (const id of Array.from(items.keys())) if (!ids.has(id)) removeItem(id)
        for (const it of data.items) if (!items.has(it.id)) spawnItem(it)
        setStore({ items: data.items })
      },
      onItemPicked: (d) => {
        const meId = useGameStore.getState().myId
        if (d.by === meId) {
          const names: Record<string,string> = { ammo: 'Cartucho', heal: 'Cruz', shield: 'Bebida' }
          setStore({ pickupToast: { type: d.type, name: names[d.type] ?? d.type, at: performance.now() } })
        }
        removeItem(d.id)
      },
      onKillFeed: (e: KillFeedEntry) => useGameStore.getState().addKillFeed(e),
      onConnect: () => setStore({ connected: true }),
      onDisconnect: () => setStore({ connected: false }),
      onLobbyState: () => {}, onLobbyReady: () => {}, onRoomError: () => {},
    })

    net.syncRoom()

    // ---------- collision (with climbable tops) ----------
    function horizontalBlocked(x: number, z: number, feetY: number): boolean {
      if (Math.abs(x) > boundLim || Math.abs(z) > boundLim) return true
      const p = new THREE.Vector3(x, feetY + 0.1, z)
      for (let i = 0; i < obstacles.length; i++) {
        const o = obstacles[i]
        if (!o.climbable) {
          if (o.box.containsPoint(p)) return true
          continue
        }
        // climbable: only block if player's body intersects box vertically (feet below top)
        if (feetY < o.top - 0.15) {
          // check XZ overlap (expanded)
          if (Math.abs(x - o.x) < o.hw + PLAYER_RADIUS && Math.abs(z - o.z) < o.hd + PLAYER_RADIUS) return true
        }
      }
      return false
    }
    function standingOnBox(x: number, z: number, feetY: number): { idx: number; top: number } | null {
      for (let i = 0; i < obstacles.length; i++) {
        const o = obstacles[i]
        if (!o.climbable) continue
        if (Math.abs(x - o.x) < o.hw + PLAYER_RADIUS * 0.6 && Math.abs(z - o.z) < o.hd + PLAYER_RADIUS * 0.6) {
          if (Math.abs(feetY - o.top) < 0.25) return { idx: i, top: o.top }
        }
      }
      return null
    }

    // ---------- loop ----------
    let last = performance.now()
    let lastStateSent = 0
    let raf = 0
    const tmpForward = new THREE.Vector3()
    const tmpRight = new THREE.Vector3()

    const animate = () => {
      raf = requestAnimationFrame(animate)
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      camera.rotation.set(local.pitch, local.yaw, 0, 'YXZ')

      // movement (yaw-based forward/right — THE FIX)
      if (local.alive && isLocked) {
        const sy = Math.sin(local.yaw), cy = Math.cos(local.yaw)
        tmpForward.set(-sy, 0, -cy); tmpRight.set(cy, 0, -sy)
        let mx = 0, mz = 0
        if (moveState.f) { mx += tmpForward.x; mz += tmpForward.z }
        if (moveState.b) { mx -= tmpForward.x; mz -= tmpForward.z }
        if (moveState.r) { mx += tmpRight.x; mz += tmpRight.z }
        if (moveState.l) { mx -= tmpRight.x; mz -= tmpRight.z }
        const len = Math.hypot(mx, mz)
        const speed = (moveState.sprint ? SPRINT_SPEED : MOVE_SPEED) * (local.onGround ? 1 : AIR_CONTROL)
        if (len > 0) {
          mx = (mx/len) * speed * dt; mz = (mz/len) * speed * dt
          const feetY = local.pos.y - EYE_HEIGHT
          const nx = local.pos.x + mx
          if (!horizontalBlocked(nx, local.pos.z, feetY)) local.pos.x = nx
          const nz = local.pos.z + mz
          if (!horizontalBlocked(local.pos.x, nz, feetY)) local.pos.z = nz
          local.bobT += dt * (moveState.sprint ? 14 : 10)
        } else local.bobT *= 0.9
      }

      // gravity + ground / box-top collision
      local.vel.y -= GRAVITY * dt
      const prevFeet = local.pos.y - EYE_HEIGHT
      local.pos.y += local.vel.y * dt
      const feetY = local.pos.y - EYE_HEIGHT

      let landed = false
      // box tops
      const onBox = standingOnBox(local.pos.x, local.pos.z, feetY)
      if (local.vel.y <= 0 && onBox && prevFeet >= onBox.top - 0.1) {
        local.pos.y = onBox.top + EYE_HEIGHT; local.vel.y = 0; local.onGround = true; local.onBoxTop = onBox.idx; landed = true
      } else if (local.onBoxTop >= 0) {
        // walked off the box?
        const o = obstacles[local.onBoxTop]
        if (o && (Math.abs(local.pos.x - o.x) > o.hw + PLAYER_RADIUS*0.6 || Math.abs(local.pos.z - o.z) > o.hd + PLAYER_RADIUS*0.6)) {
          local.onBoxTop = -1; local.onGround = false
        } else if (!landed) {
          // still on box
          local.pos.y = o.top + EYE_HEIGHT; local.vel.y = 0; local.onGround = true; landed = true
        }
      }
      if (!landed && local.vel.y <= 0 && feetY <= 0) {
        local.pos.y = EYE_HEIGHT; local.vel.y = 0; local.onGround = true; local.onBoxTop = -1
      } else if (!landed && feetY > 0) {
        local.onGround = false
      }

      camera.position.copy(local.pos)
      const bobY = Math.sin(local.bobT) * 0.045
      const bobX = Math.cos(local.bobT * 0.5) * 0.03
      camera.position.y += bobY
      viewmodelGroup.position.x = bobX
      viewmodelGroup.position.y = -Math.abs(bobY) * 0.5
      viewmodelGroup.position.z *= 0.82
      if ((muzzleFlash as any)._flashUntil && now < (muzzleFlash as any)._flashUntil) (muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 1
      else (muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 0

      if (mouse.down && isLocked && local.alive) { const w = getWeapon(local.weapon); if (w.auto) shoot() }
      if (local.reloading) {
        const w = getWeapon(local.weapon)
        const p = Math.min(1, (now - local.reloadStart) / w.reload)
        setStore({ reloadProgress: p })
        if (p >= 1) finishReload()
      }
      if (!local.alive && local.respawnAt > 0) {
        const remain = Math.max(0, Math.ceil((local.respawnAt - now) / 1000))
        if (useGameStore.getState().respawnIn !== remain) setStore({ respawnIn: remain })
      }

      // pickup items by proximity
      for (const it of items.values()) {
        if (!local.alive) break
        if (local.pos.distanceTo(new THREE.Vector3(it.pos.x, local.pos.y, it.pos.z)) < 1.8) {
          net.pickupItem(it.id)
        }
      }

      // send state ~20Hz
      if (now - lastStateSent > 50) {
        lastStateSent = now
        net.sendState({
          pos: [local.pos.x, local.pos.y, local.pos.z],
          yaw: local.yaw, pitch: local.pitch,
          weapon: local.weapon, ammo: local.ammo,
          state: local.alive ? 'alive' : 'dead',
          shield: local.shield,
        })
      }
      // minimap snapshots
      if (now - (animate as any)._lastSnap > 66) {
        (animate as any)._lastSnap = now
        setStore({ yawSnapshot: local.yaw, myPosSnapshot: [local.pos.x, local.pos.y, local.pos.z] })
      }

      // remotes lerp + walk anim
      for (const rp of remotes.values()) {
        rp.pos.lerp(rp.targetPos, 1 - Math.pow(0.001, dt))
        rp.yaw = THREE.MathUtils.lerp(rp.yaw, rp.targetYaw, 1 - Math.pow(0.001, dt))
        rp.group.position.copy(rp.pos); rp.group.rotation.y = rp.yaw
        if (rp.pos.distanceTo(rp.targetPos) > 0.05) {
          rp.bob += dt * 10
          const s = Math.sin(rp.bob) * 0.5
          rp.legL.rotation.x = s; rp.legR.rotation.x = -s
          rp.armL.rotation.x = -s * 0.6; rp.armR.rotation.x = s * 0.4
        } else {
          rp.legL.rotation.x *= 0.8; rp.legR.rotation.x *= 0.8
        }
        rp.nametag.quaternion.copy(camera.quaternion)
        rp.hpBar.quaternion.copy(camera.quaternion)
        rp.shieldBar.quaternion.copy(camera.quaternion)
        rp.teamRing.quaternion.copy(camera.quaternion)
      }
      // mobs lerp + face player + bob
      for (const mb of mobs.values()) {
        if (!mb.alive) continue
        mb.pos.lerp(mb.targetPos, 1 - Math.pow(0.0001, dt))
        mb.group.position.copy(mb.pos)
        mb.bob += dt * 4; mb.group.position.y = Math.sin(mb.bob) * 0.08
        const dx = local.pos.x - mb.pos.x, dz = local.pos.z - mb.pos.z
        mb.group.rotation.y = Math.atan2(dx, dz)
        if (now < mb.hitFlashUntil) mb.bodyMat.color.setHex(0xffffff)
        else mb.bodyMat.color.setHex(0xc0392b)
      }
      // items spin + bob
      for (const it of items.values()) {
        it.spin += dt * 2
        it.group.rotation.y = it.spin
        it.group.position.y = Math.sin(it.spin) * 0.12
      }
      // tracers fade
      for (let i = tracers.length - 1; i >= 0; i--) {
        const t = tracers[i]; const age = now - t.born
        if (age > t.ttl) { scene.remove(t.line); t.line.geometry.dispose(); (t.line.material as THREE.Material).dispose(); tracers.splice(i,1) }
        else (t.line.material as THREE.LineBasicMaterial).opacity = 0.85 * (1 - age / t.ttl)
      }

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(raf)
      setStore({ requestResume: null })
      document.removeEventListener('keydown', onKeyDown); document.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('mousedown', onMouseDown); document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('wheel', onWheel)
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('click', onCanvasClick)
      handlers()
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock()
      scene.traverse((o: any) => {
        if (o.geometry) o.geometry.dispose?.()
        if (o.material) { if (Array.isArray(o.material)) o.material.forEach((m:any)=>{m.map?.dispose?.();m.dispose?.()}); else { o.material.map?.dispose?.(); o.material.dispose?.() } }
      })
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="fixed inset-0 bg-[#fdfbf7]" />
}
