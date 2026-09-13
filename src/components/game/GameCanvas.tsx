'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useGameStore } from '@/lib/game/store'
import { net, attachHandlers } from '@/lib/socket'
import {
  WEAPONS, WEAPON_ORDER, getSkin, getWeapon,
  ARENA_SIZE, PLAYER_MAX_HP,
} from '@/lib/game/constants'
import type { PlayerPublic, MobPublic, Vec3, KillFeedEntry } from '@/lib/game/types'

/* ============================================================
   Doodle Shooter — 3D Game (Three.js)
   - Manual pointer lock (no PointerLockControls dependency)
   - Movement built from yaw-based forward/right vectors
     → THIS IS THE FIX for the inverted-controls bug.
       (source files used `camera.rotation.y` (XYZ Euler) or
        world-space deltas; both break after turning.)
   ============================================================ */

const HALF = ARENA_SIZE / 2
const WALL_T = 2
const PLAYER_RADIUS = 0.6
const EYE_HEIGHT = 1.7
const GRAVITY = 26
const JUMP_V = 9
const MOVE_SPEED = 7.5
const SPRINT_SPEED = 11
const AIR_CONTROL = 0.5
const MOUSE_SENS = 0.0022

type RemotePlayer = {
  id: string
  name: string
  skin: string
  group: THREE.Group
  body: THREE.Mesh
  head: THREE.Mesh
  nametag: THREE.Sprite
  hpBar: THREE.Sprite
  targetPos: THREE.Vector3
  targetYaw: number
  pos: THREE.Vector3
  yaw: number
  health: number
  alive: boolean
  weapon: string
  bob: number
}

type Mob = {
  id: string
  group: THREE.Group
  targetPos: THREE.Vector3
  pos: THREE.Vector3
  alive: boolean
  hitFlashUntil: number
  bob: number
}

type Tracer = {
  line: THREE.Line
  born: number
  ttl: number
}

type Obstacle = { box: THREE.Box3 }

/* ---------- doodle material factory ---------- */
const PAPER = 0xfdfbf7
const INK = 0x1a1a1a

function doodleMat(color: number, opts: { flat?: boolean } = {}) {
  return new THREE.MeshLambertMaterial({ color, flatShading: opts.flat ?? true })
}

function addEdges(mesh: THREE.Mesh, color = INK) {
  const eg = new THREE.EdgesGeometry(mesh.geometry, 1)
  const lines = new THREE.LineSegments(
    eg,
    new THREE.LineBasicMaterial({ color, linewidth: 2 })
  )
  mesh.add(lines)
  return lines
}

/* ---------- nametag sprite ---------- */
function makeTextSprite(text: string, color = '#1a1a1a', bg = 'rgba(253,251,247,0.92)') {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const fontSize = 40
  ctx.font = `bold ${fontSize}px "Patrick Hand", "Comic Sans MS", sans-serif`
  const w = Math.ceil(ctx.measureText(text).width) + 24
  canvas.width = w
  canvas.height = fontSize + 16
  ctx.fillStyle = bg
  // rounded rect
  const r = 10
  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.roundRect(2, 2, canvas.width - 4, canvas.height - 4, r)
  ctx.fill()
  ctx.stroke()
  ctx.font = `bold ${fontSize}px "Patrick Hand", "Comic Sans MS", sans-serif`
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2)
  const tex = new THREE.CanvasTexture(canvas)
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })
  const spr = new THREE.Sprite(mat)
  spr.scale.set((canvas.width / canvas.height) * 1.1, 1.1, 1)
  spr.renderOrder = 999
  return spr
}

function makeHpBarSprite() {
  const canvas = document.createElement('canvas')
  canvas.width = 100
  canvas.height = 12
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, 100, 12)
  ctx.fillStyle = '#27ae60'
  ctx.fillRect(3, 3, 94, 6)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })
  const spr = new THREE.Sprite(mat)
  spr.scale.set(1.2, 0.14, 1)
  spr.renderOrder = 999
  return { spr, canvas, ctx, tex }
}

function updateHpBarSprite(b: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture; spr: THREE.Sprite }, health: number, max: number) {
  const pct = Math.max(0, Math.min(1, health / max))
  const ctx = b.ctx
  ctx.clearRect(0, 0, b.canvas.width, b.canvas.height)
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, 100, 12)
  ctx.fillStyle = pct > 0.5 ? '#27ae60' : pct > 0.25 ? '#e67e22' : '#e74c3c'
  ctx.fillRect(3, 3, 94 * pct, 6)
  b.tex.needsUpdate = true
}

/* ---------- build a doodle character (remote player) ---------- */
function buildCharacter(skinId: string, name: string): {
  group: THREE.Group; body: THREE.Mesh; head: THREE.Mesh; nametag: THREE.Sprite; hpBar: THREE.Sprite; hpBarData: ReturnType<typeof makeHpBarSprite>
} {
  const skin = getSkin(skinId)
  const group = new THREE.Group()
  const bodyMat = doodleMat(new THREE.Color(skin.color).getHex())
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.55), bodyMat)
  body.position.y = 0.95
  addEdges(body)
  group.add(body)

  // arms
  const armMat = doodleMat(new THREE.Color(skin.accent).getHex())
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 0.22), armMat)
  armL.position.set(-0.55, 0.95, 0)
  addEdges(armL); group.add(armL)
  const armR = armL.clone()
  armR.position.x = 0.55
  group.add(armR)

  // head
  const headMat = doodleMat(new THREE.Color(skin.color).getHex())
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), headMat)
  head.position.y = 1.75
  addEdges(head)
  group.add(head)

  // eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const pupMat = new THREE.MeshBasicMaterial({ color: INK })
  for (const sx of [-0.1, 0.1]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.02), eyeMat)
    eye.position.set(sx, 1.8, 0.26)
    group.add(eye)
    const pup = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.02), pupMat)
    pup.position.set(sx, 1.8, 0.28)
    group.add(pup)
  }

  // legs
  const legMat = doodleMat(new THREE.Color(skin.accent).getHex())
  for (const sx of [-0.2, 0.2]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.7, 0.24), legMat)
    leg.position.set(sx, 0.05, 0)
    addEdges(leg); group.add(leg)
  }

  const nametag = makeTextSprite(name)
  nametag.position.set(0, 2.45, 0)
  group.add(nametag)

  const hpBarData = makeHpBarSprite()
  hpBarData.spr.position.set(0, 2.15, 0)
  group.add(hpBarData.spr)

  return { group, body, head, nametag, hpBar: hpBarData.spr, hpBarData }
}

/* ---------- build a doodle mob ---------- */
function buildMob(): { group: THREE.Group; faceGroup: THREE.Group } {
  const group = new THREE.Group()
  const mat = doodleMat(0xc0392b)
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat)
  cube.position.y = 0.5
  addEdges(cube)
  group.add(cube)

  // angry eyes
  const faceGroup = new THREE.Group()
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const pupMat = new THREE.MeshBasicMaterial({ color: INK })
  for (const sx of [-0.22, 0.22]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.04), eyeMat)
    eye.position.set(sx, 0.6, 0.51)
    faceGroup.add(eye)
    const pup = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), pupMat)
    pup.position.set(sx, 0.6, 0.54)
    faceGroup.add(pup)
  }
  // angry brows
  const browMat = new THREE.MeshBasicMaterial({ color: INK })
  for (const [sx, rot] of [[-0.22, 0.4], [0.22, -0.4]] as const) {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.04), browMat)
    brow.position.set(sx, 0.74, 0.52)
    brow.rotation.z = rot
    faceGroup.add(brow)
  }
  // frown
  const frown = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.04), browMat)
  frown.position.set(0, 0.38, 0.52)
  frown.rotation.z = Math.PI
  faceGroup.add(frown)
  group.add(faceGroup)

  return { group, faceGroup }
}

/* ============================================================
   Component
   ============================================================ */
export default function GameCanvas() {
  const mountRef = useRef<HTMLDivElement>(null)
  const onResumeRef = useRef<() => void>(() => {})

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // ---------- renderer / scene / camera ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(PAPER, 1)
    mount.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(PAPER)
    scene.fog = new THREE.Fog(PAPER, 35, 75)

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 200)
    camera.position.set(0, EYE_HEIGHT, 0)
    camera.rotation.order = 'YXZ' // safe Euler order for FPS

    // ---------- lighting ----------
    const ambient = new THREE.AmbientLight(0xffffff, 0.85)
    scene.add(ambient)
    const dir = new THREE.DirectionalLight(0xffffff, 0.55)
    dir.position.set(20, 40, 10)
    scene.add(dir)
    const hemi = new THREE.HemisphereLight(0xfff7e0, 0xe8e4df, 0.4)
    scene.add(hemi)

    // ---------- arena ----------
    const arenaGroup = new THREE.Group()
    scene.add(arenaGroup)

    // floor: paper with grid via canvas texture
    const floorCanvas = document.createElement('canvas')
    floorCanvas.width = 1024; floorCanvas.height = 1024
    const fctx = floorCanvas.getContext('2d')!
    fctx.fillStyle = '#f5f1e8'
    fctx.fillRect(0, 0, 1024, 1024)
    fctx.strokeStyle = 'rgba(26,26,26,0.08)'
    fctx.lineWidth = 2
    const grid = 64
    for (let i = 0; i <= 1024; i += grid) {
      fctx.beginPath(); fctx.moveTo(i, 0); fctx.lineTo(i, 1024); fctx.stroke()
      fctx.beginPath(); fctx.moveTo(0, i); fctx.lineTo(1024, i); fctx.stroke()
    }
    // a few doodle scribbles
    fctx.strokeStyle = 'rgba(231,76,60,0.12)'
    fctx.lineWidth = 3
    for (let i = 0; i < 14; i++) {
      fctx.beginPath()
      const x = Math.random() * 1024, y = Math.random() * 1024
      fctx.arc(x, y, 20 + Math.random() * 40, 0, Math.PI * 2)
      fctx.stroke()
    }
    const floorTex = new THREE.CanvasTexture(floorCanvas)
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping
    floorTex.repeat.set(4, 4)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE),
      new THREE.MeshLambertMaterial({ map: floorTex })
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = 0
    arenaGroup.add(floor)

    // walls
    const wallMat = doodleMat(0xf0ece3)
    const wallH = 4
    const wallGeoH = new THREE.BoxGeometry(ARENA_SIZE + WALL_T * 2, wallH, WALL_T)
    const wallN = new THREE.Mesh(wallGeoH, wallMat); wallN.position.set(0, wallH / 2, -HALF - WALL_T / 2); addEdges(wallN); arenaGroup.add(wallN)
    const wallS = wallN.clone(); wallS.position.z = HALF + WALL_T / 2; arenaGroup.add(wallS)
    const wallGeoV = new THREE.BoxGeometry(WALL_T, wallH, ARENA_SIZE + WALL_T * 2)
    const wallW = new THREE.Mesh(wallGeoV, wallMat); wallW.position.set(-HALF - WALL_T / 2, wallH / 2, 0); addEdges(wallW); arenaGroup.add(wallW)
    const wallE = wallW.clone(); wallE.position.x = HALF + WALL_T / 2; arenaGroup.add(wallE)

    // obstacles (AABB collidable doodle shapes)
    const obstacles: Obstacle[] = []
    const obstacleConfigs: Array<{ x: number; z: number; w: number; h: number; d: number; color: number; kind: 'box' | 'cyl' }> = [
      { x: -14, z: -10, w: 4, h: 3, d: 4, color: 0xe8d5b7, kind: 'box' },
      { x: 12, z: 8, w: 5, h: 2.5, d: 3, color: 0xd5c4a0, kind: 'box' },
      { x: 0, z: 0, w: 3, h: 4, d: 3, color: 0xcdb98a, kind: 'box' },
      { x: -18, z: 14, w: 2.5, h: 3.5, d: 2.5, color: 0xe8d5b7, kind: 'box' },
      { x: 18, z: -16, w: 4, h: 3, d: 4, color: 0xd5c4a0, kind: 'box' },
      { x: 8, z: -6, w: 1.6, h: 3.2, d: 1.6, color: 0xb8a47a, kind: 'cyl' },
      { x: -8, z: 6, w: 1.6, h: 3.2, d: 1.6, color: 0xb8a47a, kind: 'cyl' },
      { x: -4, z: -20, w: 6, h: 2, d: 2, color: 0xe8d5b7, kind: 'box' },
      { x: 16, z: 18, w: 2, h: 2, d: 6, color: 0xd5c4a0, kind: 'box' },
    ]
    for (const c of obstacleConfigs) {
      let mesh: THREE.Mesh
      if (c.kind === 'cyl') {
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(c.w / 2, c.w / 2, c.h, 12), doodleMat(c.color))
      } else {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.d), doodleMat(c.color))
      }
      mesh.position.set(c.x, c.h / 2, c.z)
      addEdges(mesh)
      arenaGroup.add(mesh)
      const box = new THREE.Box3().setFromObject(mesh)
      // expand slightly for collision
      box.expandByScalar(PLAYER_RADIUS * 0.6)
      obstacles.push({ box })
    }
    // arena bounds as obstacles (clamp)
    const boundLim = HALF - PLAYER_RADIUS

    // ---------- viewmodel (gun) ----------
    const viewmodelGroup = new THREE.Group()
    camera.add(viewmodelGroup)
    scene.add(camera)
    const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.5), doodleMat(0x2c2c2c))
    gunBody.position.set(0.28, -0.26, -0.55)
    addEdges(gunBody)
    viewmodelGroup.add(gunBody)
    const gunBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), doodleMat(0x1a1a1a))
    gunBarrel.position.set(0.28, -0.24, -0.78)
    addEdges(gunBarrel)
    viewmodelGroup.add(gunBarrel)
    const muzzle = new THREE.Object3D()
    muzzle.position.set(0.28, -0.24, -0.95)
    viewmodelGroup.add(muzzle)
    const muzzleFlash = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0 })
    )
    muzzleFlash.scale.set(1, 1, 1)
    viewmodelGroup.add(muzzleFlash)
    muzzleFlash.position.copy(muzzle.position)

    // ---------- local player state (closure) ----------
    const local = {
      pos: new THREE.Vector3(0, EYE_HEIGHT, 0),
      vel: new THREE.Vector3(),
      yaw: 0,
      pitch: 0,
      onGround: true,
      health: PLAYER_MAX_HP,
      alive: true,
      weapon: 'pistol',
      ammo: WEAPONS.pistol.magazine,
      reloading: false,
      reloadStart: 0,
      lastShot: 0,
      respawnAt: 0,
      bobT: 0,
      lastWalkBob: 0,
    }

    const moveState = { f: false, b: false, l: false, r: false, sprint: false, jump: false }
    const mouse = { down: false }

    // ---------- remote players & mobs ----------
    const remotes = new Map<string, RemotePlayer>()
    const mobs = new Map<string, Mob>()
    const tracers: Tracer[] = []

    // ---------- store helpers ----------
    const store = useGameStore.getState()
    const setStore = (p: Partial<typeof store>) => useGameStore.setState(p as any)

    // ---------- spawn remote player ----------
    function spawnRemote(p: PlayerPublic) {
      if (remotes.has(p.id)) return
      const built = buildCharacter(p.skin, p.name)
      built.group.position.set(p.pos[0], 0, p.pos[2])
      built.group.rotation.y = p.yaw
      scene.add(built.group)
      const rp: RemotePlayer = {
        id: p.id,
        name: p.name,
        skin: p.skin,
        group: built.group,
        body: built.body,
        head: built.head,
        nametag: built.nametag,
        hpBar: built.hpBar,
        targetPos: new THREE.Vector3(p.pos[0], 0, p.pos[2]),
        targetYaw: p.yaw,
        pos: new THREE.Vector3(p.pos[0], 0, p.pos[2]),
        yaw: p.yaw,
        health: p.health,
        alive: p.state === 'alive',
        weapon: p.weapon,
        bob: 0,
      }
      ;(rp as any)._hpData = built.hpBarData
      updateHpBarSprite(built.hpBarData, p.health, PLAYER_MAX_HP)
      remotes.set(p.id, rp)
      rp.group.visible = rp.alive
    }
    function removeRemote(id: string) {
      const rp = remotes.get(id)
      if (!rp) return
      scene.remove(rp.group)
      rp.group.traverse((o: any) => {
        if (o.geometry) o.geometry.dispose?.()
        if (o.material) {
          if (o.material.map) o.material.map.dispose?.()
          o.material.dispose?.()
        }
      })
      remotes.delete(id)
    }
    function spawnMob(m: MobPublic) {
      if (mobs.has(m.id)) return
      const built = buildMob()
      built.group.position.set(m.pos[0], 0, m.pos[2])
      scene.add(built.group)
      const mob: Mob = {
        id: m.id,
        group: built.group,
        targetPos: new THREE.Vector3(m.pos[0], 0, m.pos[2]),
        pos: new THREE.Vector3(m.pos[0], 0, m.pos[2]),
        alive: m.state === 'alive',
        hitFlashUntil: 0,
        bob: Math.random() * Math.PI * 2,
      }
      mobs.set(m.id, mob)
      mob.group.visible = mob.alive
    }

    // ---------- shooting ----------
    const raycaster = new THREE.Raycaster()
    function shoot() {
      const now = performance.now()
      const w = getWeapon(local.weapon)
      if (now - local.lastShot < w.fireRate) return
      if (local.reloading) return
      if (local.ammo <= 0) return
      local.lastShot = now
      local.ammo -= 1
      setStore({ ammo: local.ammo })

      // muzzle flash
      muzzleFlash.material.opacity = 1
      ;(muzzleFlash as any)._flashUntil = now + 60

      // recoil / bob
      viewmodelGroup.position.z = 0.06

      const origin = new THREE.Vector3()
      camera.getWorldPosition(origin)
      const baseDir = new THREE.Vector3()
      camera.getWorldDirection(baseDir)

      // emit each pellet as a separate shot? Server expects single shot event.
      // We'll raycast per pellet locally and report hits; send one shot event for tracers.
      for (let i = 0; i < w.pellets; i++) {
        const dir = baseDir.clone()
        // apply spread
        dir.x += (Math.random() - 0.5) * w.spread * 2
        dir.y += (Math.random() - 0.5) * w.spread * 2
        dir.z += (Math.random() - 0.5) * w.spread * 2
        dir.normalize()
        // raycast against remotes + mobs
        raycastAndReport(origin, dir, w)
        // local tracer for this pellet
        spawnTracer(origin, dir, w.range, 0x1a1a1a)
      }

      // report shot to server (for other clients' tracers)
      net.shoot(
        [origin.x, origin.y, origin.z],
        [baseDir.x, baseDir.y, baseDir.z],
        local.weapon
      )

      // auto reload when empty
      if (local.ammo <= 0) {
        startReload()
      }
    }

    function raycastAndReport(origin: THREE.Vector3, dir: THREE.Vector3, w: ReturnType<typeof getWeapon>) {
      raycaster.set(origin, dir)
      raycaster.far = w.range
      // gather candidate meshes
      const candidates: THREE.Object3D[] = []
      const candidateInfo: Map<THREE.Object3D, { type: 'player' | 'mob'; id: string; headY: number }> = new Map()
      for (const rp of remotes.values()) {
        if (!rp.alive) continue
        rp.group.traverse((o) => {
          if ((o as any).isMesh) {
            candidates.push(o)
            candidateInfo.set(o, { type: 'player', id: rp.id, headY: rp.pos.y + 1.95 })
          }
        })
      }
      for (const mb of mobs.values()) {
        if (!mb.alive) continue
        mb.group.traverse((o) => {
          if ((o as any).isMesh) {
            candidates.push(o)
            candidateInfo.set(o, { type: 'mob', id: mb.id, headY: mb.pos.y + 0.8 })
          }
        })
      }
      if (candidates.length === 0) return
      const hits = raycaster.intersectObjects(candidates, false)
      if (hits.length === 0) return
      const hit = hits[0]
      const info = candidateInfo.get(hit.object)
      if (!info) return
      const dist = hit.distance
      const headshot = hit.point.y >= info.headY
      const damage = w.damage * (headshot ? (info.type === 'player' ? 2 : 1.6) : 1)
      net.reportHit(info.id, damage, headshot, dist, info.type)
      // immediate hit marker feedback
      setStore({ hitMarker: performance.now() })
    }

    function spawnTracer(origin: THREE.Vector3, dir: THREE.Vector3, range: number, color: number) {
      const end = origin.clone().add(dir.clone().multiplyScalar(range))
      const geo = new THREE.BufferGeometry().setFromPoints([origin.clone(), end])
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 })
      const line = new THREE.Line(geo, mat)
      scene.add(line)
      tracers.push({ line, born: performance.now(), ttl: 90 })
    }

    function startReload() {
      const w = getWeapon(local.weapon)
      if (local.reloading) return
      if (local.ammo >= w.magazine) return
      local.reloading = true
      local.reloadStart = performance.now()
      setStore({ reloading: true, reloadProgress: 0 })
      net.reload(local.weapon)
    }
    function finishReload() {
      const w = getWeapon(local.weapon)
      local.reloading = false
      local.ammo = w.magazine
      setStore({ reloading: false, ammo: local.ammo, magazine: w.magazine })
    }
    function switchWeapon(id: string) {
      if (!WEAPONS[id]) return
      if (id === local.weapon) return
      local.weapon = id
      const w = getWeapon(id)
      local.reloading = false
      local.ammo = w.magazine
      // resize viewmodel slightly per weapon
      const s = id === 'shotgun' ? 1.35 : id === 'rifle' ? 1.15 : id === 'smg' ? 0.9 : 1
      viewmodelGroup.scale.set(s, s, s)
      setStore({ weapon: id, ammo: local.ammo, magazine: w.magazine, reloading: false })
    }

    // ---------- input ----------
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': moveState.f = true; break
        case 'KeyS': case 'ArrowDown': moveState.b = true; break
        case 'KeyA': case 'ArrowLeft': moveState.l = true; break
        case 'KeyD': case 'ArrowRight': moveState.r = true; break
        case 'Space':
          if (local.onGround && local.alive) { local.vel.y = JUMP_V; local.onGround = false }
          break
        case 'ShiftLeft': case 'ShiftRight': moveState.sprint = true; break
        case 'KeyR': startReload(); break
        case 'Digit1': switchWeapon('pistol'); break
        case 'Digit2': switchWeapon('smg'); break
        case 'Digit3': switchWeapon('rifle'); break
        case 'Digit4': switchWeapon('shotgun'); break
        case 'Tab':
          e.preventDefault()
          setStore({ showScoreboard: true })
          break
        case 'Escape':
          // browser exits pointer lock automatically; we set paused
          setStore({ paused: true })
          break
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
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      if (!isLocked) return
      mouse.down = true
      const w = getWeapon(local.weapon)
      if (!w.auto) shoot()
    }
    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 0) return
      mouse.down = false
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isLocked) return
      local.yaw -= e.movementX * MOUSE_SENS
      local.pitch -= e.movementY * MOUSE_SENS
      const lim = Math.PI / 2 - 0.05
      local.pitch = Math.max(-lim, Math.min(lim, local.pitch))
    }
    const onWheel = (e: WheelEvent) => {
      if (!isLocked) return
      const idx = WEAPON_ORDER.indexOf(local.weapon)
      const next = e.deltaY > 0 ? (idx + 1) % WEAPON_ORDER.length : (idx - 1 + WEAPON_ORDER.length) % WEAPON_ORDER.length
      switchWeapon(WEAPON_ORDER[next])
    }
    const onCanvasClick = () => {
      if (!isLocked) {
        renderer.domElement.requestPointerLock()
      }
    }

    let isLocked = false
    const onPointerLockChange = () => {
      isLocked = document.pointerLockElement === renderer.domElement
      setStore({ pointerLocked: isLocked, paused: isLocked ? false : useGameStore.getState().paused })
      if (!isLocked) {
        // release movement keys
        moveState.f = moveState.b = moveState.l = moveState.r = false
        mouse.down = false
      }
    }

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('wheel', onWheel, { passive: true })
    document.addEventListener('pointerlockchange', onPointerLockChange)
    window.addEventListener('resize', onResize)
    renderer.domElement.addEventListener('click', onCanvasClick)

    onResumeRef.current = () => {
      renderer.domElement.requestPointerLock()
    }
    setStore({ requestResume: onResumeRef.current })

    // ---------- socket handlers ----------
    const handlers = attachHandlers({
      onRoomJoined: (data) => {
        setStore({
          roomName: data.room.name,
          myId: data.me.id,
          myName: data.me.name,
          mySkin: data.me.skin,
          connected: true,
        })
        // reset local player to server state
        local.pos.set(data.me.pos[0], EYE_HEIGHT, data.me.pos[2])
        local.yaw = data.me.yaw
        local.pitch = data.me.pitch
        local.health = data.me.health
        local.alive = data.me.state === 'alive'
        local.weapon = data.me.weapon
        local.ammo = data.me.ammo
        const w = getWeapon(local.weapon)
        setStore({
          health: local.health,
          alive: local.alive,
          weapon: local.weapon,
          ammo: local.ammo,
          magazine: w.magazine,
          reloading: false,
          score: data.me.score,
          kills: data.me.kills,
          deaths: data.me.deaths,
        })
        camera.position.copy(local.pos)

        // build remotes (excluding me)
        for (const p of data.players) {
          if (p.id === data.me.id) {
            // still track my own roster entry via room:players
            continue
          }
          spawnRemote(p)
        }
        // build mobs
        for (const m of data.mobs) spawnMob(m)
      },
      onRoomPlayers: (data) => {
        // full roster — update scoreboard + my own stats
        const me = data.players.find((p) => p.id === useGameStore.getState().myId)
        if (me) {
          setStore({
            score: me.score,
            kills: me.kills,
            deaths: me.deaths,
            health: me.health,
            alive: me.state === 'alive',
          })
          local.health = me.health
          local.alive = me.state === 'alive'
        }
        setStore({ players: data.players })
        // sync remote existence
        const ids = new Set(data.players.map((p) => p.id))
        for (const id of Array.from(remotes.keys())) {
          if (!ids.has(id)) removeRemote(id)
        }
      },
      onPlayerJoined: (p) => {
        if (p.id === useGameStore.getState().myId) return
        spawnRemote(p)
      },
      onPlayerLeft: (d) => removeRemote(d.id),
      onPlayerState: (d) => {
        const rp = remotes.get(d.id)
        if (!rp) return
        rp.targetPos.set(d.pos[0], 0, d.pos[2])
        rp.targetYaw = d.yaw
        rp.weapon = d.weapon
        rp.alive = d.state === 'alive'
        rp.group.visible = rp.alive
      },
      onPlayerShot: (d) => {
        const origin = new THREE.Vector3(d.origin[0], d.origin[1], d.origin[2])
        const dir = new THREE.Vector3(d.dir[0], d.dir[1], d.dir[2])
        spawnTracer(origin, dir, getWeapon(d.weapon).range, getSkin(remotes.get(d.shooterId)?.skin ?? 'red').color === '#e74c3c' ? 0xe74c3c : 0x1a1a1a)
      },
      onPlayerAmmo: (d) => {
        if (d.weapon === local.weapon) {
          local.ammo = d.ammo
          setStore({ ammo: d.ammo })
        }
      },
      onPlayerReloading: () => {},
      onPlayerReloadDone: (d) => {
        if (d.weapon === local.weapon) {
          local.ammo = d.ammo
          setStore({ ammo: d.ammo, reloading: false })
          local.reloading = false
        }
      },
      onPlayerDamaged: (d) => {
        const meId = useGameStore.getState().myId
        if (d.id === meId) {
          // damage to me
          local.health = d.health
          setStore({ health: d.health, damageFlash: performance.now(), lastHitBy: d.by })
          if (d.health <= 0) {
            // death handled by onPlayerKilled, but ensure alive flag
          }
        } else {
          const rp = remotes.get(d.id)
          if (rp) {
            rp.health = d.health
            const data = (rp as any)._hpData
            if (data) updateHpBarSprite(data, d.health, PLAYER_MAX_HP)
          }
        }
      },
      onPlayerKilled: (d) => {
        const meId = useGameStore.getState().myId
        if (d.victimId === meId) {
          local.alive = false
          local.health = 0
          setStore({ alive: false, health: 0, respawnIn: 3 })
          local.respawnAt = performance.now() + 3000
        } else {
          const rp = remotes.get(d.victimId)
          if (rp) {
            rp.alive = false
            rp.group.visible = false
          }
        }
      },
      onPlayerRespawned: (d) => {
        const meId = useGameStore.getState().myId
        if (d.id === meId) {
          local.alive = true
          local.health = PLAYER_MAX_HP
          local.pos.set(d.pos[0], EYE_HEIGHT, d.pos[2])
          local.vel.set(0, 0, 0)
          local.ammo = getWeapon(local.weapon).magazine
          setStore({ alive: true, health: PLAYER_MAX_HP, respawnIn: 0, ammo: local.ammo })
        } else {
          const rp = remotes.get(d.id)
          if (rp) {
            rp.alive = true
            rp.health = PLAYER_MAX_HP
            rp.pos.set(d.pos[0], 0, d.pos[2])
            rp.targetPos.copy(rp.pos)
            rp.group.visible = true
            const data = (rp as any)._hpData
            if (data) updateHpBarSprite(data, PLAYER_MAX_HP, PLAYER_MAX_HP)
          }
        }
      },
      onMobState: (data) => {
        for (const m of data.mobs) {
          let mob = mobs.get(m.id)
          if (!mob) { spawnMob(m); mob = mobs.get(m.id) }
          if (!mob) continue
          mob.targetPos.set(m.pos[0], 0, m.pos[2])
          mob.alive = m.state === 'alive'
          if (m.flash) mob.hitFlashUntil = performance.now() + 120
        }
        setStore({ mobs: data.mobs })
      },
      onMobDamaged: (d) => {
        const mob = mobs.get(d.id)
        if (mob) mob.hitFlashUntil = performance.now() + 120
      },
      onMobKilled: (d) => {
        const mob = mobs.get(d.id)
        if (mob) { mob.alive = false; mob.group.visible = false }
      },
      onMobRespawned: (d) => {
        const mob = mobs.get(d.id)
        if (mob) {
          mob.alive = true
          mob.group.visible = true
          mob.pos.set(d.pos[0], 0, d.pos[2])
          mob.targetPos.copy(mob.pos)
        } else {
          spawnMob({ id: d.id, pos: d.pos, state: 'alive' })
        }
      },
      onKillFeed: (e: KillFeedEntry) => {
        useGameStore.getState().addKillFeed(e)
      },
      onConnect: () => setStore({ connected: true }),
      onDisconnect: () => setStore({ connected: false }),
      onLobbyState: () => {},
      onLobbyReady: () => {},
      onRoomError: () => {},
    })

    // request fresh room state
    net.syncRoom()

    // ---------- helpers: collision ----------
    function blocked(x: number, z: number): boolean {
      if (Math.abs(x) > boundLim || Math.abs(z) > boundLim) return true
      const p = new THREE.Vector3(x, EYE_HEIGHT, z)
      for (const o of obstacles) {
        if (o.box.containsPoint(p)) return true
      }
      return false
    }

    // ---------- animation loop ----------
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

      // apply camera orientation from yaw/pitch (YXZ)
      camera.rotation.set(local.pitch, local.yaw, 0, 'YXZ')

      // ---- movement (THE FIX: yaw-based forward/right vectors) ----
      if (local.alive && isLocked) {
        // forward = (-sin(yaw), 0, -cos(yaw)); right = (cos(yaw), 0, -sin(yaw))
        const sy = Math.sin(local.yaw), cy = Math.cos(local.yaw)
        tmpForward.set(-sy, 0, -cy)
        tmpRight.set(cy, 0, -sy)

        let mx = 0, mz = 0
        if (moveState.f) { mx += tmpForward.x; mz += tmpForward.z }
        if (moveState.b) { mx -= tmpForward.x; mz -= tmpForward.z }
        if (moveState.r) { mx += tmpRight.x; mz += tmpRight.z }
        if (moveState.l) { mx -= tmpRight.x; mz -= tmpRight.z }
        const len = Math.hypot(mx, mz)
        const speed = (moveState.sprint ? SPRINT_SPEED : MOVE_SPEED) * (local.onGround ? 1 : AIR_CONTROL)
        if (len > 0) {
          mx = (mx / len) * speed * dt
          mz = (mz / len) * speed * dt
          // per-axis collision rollback
          const nx = local.pos.x + mx
          if (!blocked(nx, local.pos.z)) local.pos.x = nx
          const nz = local.pos.z + mz
          if (!blocked(local.pos.x, nz)) local.pos.z = nz
          // walk bob
          local.bobT += dt * (moveState.sprint ? 14 : 10)
        } else {
          local.bobT *= 0.9
        }
      }

      // gravity & jump
      local.vel.y -= GRAVITY * dt
      local.pos.y += local.vel.y * dt
      if (local.pos.y <= EYE_HEIGHT) {
        local.pos.y = EYE_HEIGHT
        local.vel.y = 0
        local.onGround = true
      } else {
        local.onGround = false
      }

      camera.position.copy(local.pos)
      // head bob
      const bobY = Math.sin(local.bobT) * 0.045
      const bobX = Math.cos(local.bobT * 0.5) * 0.03
      camera.position.y += bobY
      // viewmodel bob + recoil decay
      viewmodelGroup.position.x = bobX
      viewmodelGroup.position.y = -Math.abs(bobY) * 0.5
      viewmodelGroup.position.z *= 0.82 // recoil decay
      // muzzle flash fade
      if ((muzzleFlash as any)._flashUntil && now < (muzzleFlash as any)._flashUntil) {
        ;(muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 1
      } else {
        ;(muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 0
      }

      // auto-fire for auto weapons
      if (mouse.down && isLocked && local.alive) {
        const w = getWeapon(local.weapon)
        if (w.auto) shoot()
      }

      // reload progress
      if (local.reloading) {
        const w = getWeapon(local.weapon)
        const p = Math.min(1, (now - local.reloadStart) / w.reload)
        setStore({ reloadProgress: p })
        if (p >= 1) finishReload()
      }

      // respawn countdown
      if (!local.alive && local.respawnAt > 0) {
        const remain = Math.max(0, Math.ceil((local.respawnAt - now) / 1000))
        if (useGameStore.getState().respawnIn !== remain) {
          setStore({ respawnIn: remain })
        }
      }

      // send state to server ~20Hz
      if (now - lastStateSent > 50) {
        lastStateSent = now
        net.sendState({
          pos: [local.pos.x, local.pos.y, local.pos.z],
          yaw: local.yaw,
          pitch: local.pitch,
          weapon: local.weapon,
          ammo: local.ammo,
          state: local.alive ? 'alive' : 'dead',
        })
      }

      // update store snapshots for minimap (throttled to ~15Hz)
      if (now - (animate as any)._lastSnap > 66) {
        (animate as any)._lastSnap = now
        setStore({ yawSnapshot: local.yaw, myPosSnapshot: [local.pos.x, local.pos.y, local.pos.z] })
      }

      // ---- update remote players (lerp) ----
      for (const rp of remotes.values()) {
        rp.pos.lerp(rp.targetPos, 1 - Math.pow(0.001, dt))
        rp.yaw = THREE.MathUtils.lerp(rp.yaw, rp.targetYaw, 1 - Math.pow(0.001, dt))
        rp.group.position.copy(rp.pos)
        rp.group.rotation.y = rp.yaw
        // walking bob
        if (rp.pos.distanceTo(rp.targetPos) > 0.05) {
          rp.bob += dt * 10
          rp.body.position.y = 0.95 + Math.sin(rp.bob) * 0.04
        }
        // face camera with nametag/hpbar (billboard)
        rp.nametag.quaternion.copy(camera.quaternion)
        rp.hpBar.quaternion.copy(camera.quaternion)
      }

      // ---- update mobs (lerp + bob + face player) ----
      for (const mb of mobs.values()) {
        if (!mb.alive) continue
        mb.pos.lerp(mb.targetPos, 1 - Math.pow(0.0001, dt))
        mb.group.position.copy(mb.pos)
        mb.bob += dt * 4
        mb.group.position.y = Math.sin(mb.bob) * 0.08
        // face nearest player (rough: face the local camera)
        const dx = local.pos.x - mb.pos.x
        const dz = local.pos.z - mb.pos.z
        mb.group.rotation.y = Math.atan2(dx, dz)
        // hit flash
        const mat = (mb.group.children[0] as THREE.Mesh)?.material as THREE.MeshLambertMaterial
        if (mat) {
          if (now < mb.hitFlashUntil) {
            mat.color.setHex(0xffffff)
          } else {
            mat.color.setHex(0xc0392b)
          }
        }
      }

      // ---- update tracers ----
      for (let i = tracers.length - 1; i >= 0; i--) {
        const t = tracers[i]
        const age = now - t.born
        if (age > t.ttl) {
          scene.remove(t.line)
          t.line.geometry.dispose()
          ;(t.line.material as THREE.Material).dispose()
          tracers.splice(i, 1)
        } else {
          ;(t.line.material as THREE.LineBasicMaterial).opacity = 0.85 * (1 - age / t.ttl)
        }
      }

      renderer.render(scene, camera)
    }
    animate()

    // ---------- cleanup ----------
    return () => {
      cancelAnimationFrame(raf)
      setStore({ requestResume: null })
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('wheel', onWheel)
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('click', onCanvasClick)
      handlers()
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock()
      // dispose
      scene.traverse((o: any) => {
        if (o.geometry) o.geometry.dispose?.()
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m: any) => { m.map?.dispose?.(); m.dispose?.() })
          else { o.material.map?.dispose?.(); o.material.dispose?.() }
        }
      })
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div ref={mountRef} className="fixed inset-0 bg-[#fdfbf7]" />
  )
}
