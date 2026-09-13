# Task ID: i-weapons — New weapons (sniper, rocket), right-click aim, rare drops

**Agent:** main (weapons + aiming)
**Date:** 2026-09-13
**Status:** ✅ Completed
**Depends on:** existing weapon system (constants.ts, GameCanvas.tsx, game-server/index.ts)

## Summary

Added two new weapons (sniper + rocket launcher) and a right-click aim/scope
mechanic, plus rare weapon drops from mobs and from players who die on a streak.
Each weapon got a more distinctive 3D mesh; the HUD now shows 6 weapon slots;
sniper zooms to FOV 30 and shows a full-screen scope overlay.

## Files changed

1. `src/lib/game/types.ts` — `ItemType` now includes `'weapon'`; `ItemPublic`
   has an optional `weaponId?: string` field (used to render the correct
   weapon pickup avatar and to know which weapon a `'weapon'` item grants).
2. `src/lib/game/constants.ts` — added `sniper` and `rocket` entries to
   `WEAPONS` with the exact stats from the spec; appended both ids to
   `WEAPON_ORDER`; updated the local `ItemType` to include `'weapon'`;
   added a `weapon` entry to `ITEMS` (`{ name: 'Arma especial', color: '#9b59b6', icon: 'weapon' }`);
   also exported `RARE_WEAPONS` and `AMMO_PICKUP_POOL` helper arrays.
3. `src/lib/game/store.ts` — added `aiming: boolean` to the HUD store +
   initial state (used by `ScopeOverlay` and `CrosshairHUD`).
4. `src/lib/socket.ts` — `onItemPicked` payload now carries an optional
   `weaponId?: string`.
5. `src/components/game/GameCanvas.tsx`
   - Rewrote `buildWeaponMesh` for all 6 weapons; each is more detailed and
     distinct (slide, frame, barrel, grip, trigger guard, sights for pistol;
     body, barrel, curved magazine, stock, foregrip for SMG; body, handguard,
     long barrel, stock, magazine, scope for rifle; double barrel, pump, stock
     for shotgun; very long barrel, large scope, bipod, cheek-rest for sniper;
     tube, warhead, grips for rocket).
   - Extended `buildItemAvatar(type, weaponId?)` with a new `'weapon'` branch
     that builds the actual weapon mesh, scales it 1.2×, rotates sideways, and
     sits it on a purple glowing aura ring + small base box.
   - Added `local.aiming` flag, `effectiveSpread()` (sniper ×0.15, rifle ×0.4
     when aiming), and `targetFov()` (sniper → 30, rifle → 50, rocket → 65,
     sprint → 85, default 75) helpers.
   - `shoot()` now uses `effectiveSpread()` instead of `w.spread`.
   - `onMouseDown` handles `button === 2` → `toggleAim()`; `onContextMenu`
     prevents the browser context menu.
   - Aim is cancelled on weapon switch, on pointer-lock loss, on death, and
     while dead/unlocked (FOV eases back to 75 in the animate loop).
   - Added `Digit5` (sniper) and `Digit6` (rocket) keybinds; `setViewmodel`
     has per-weapon scale + Z-offset so the long guns don't clip through the
     camera.
   - `spawnItem` and the `onItemPicked` handler accept / pass through
     `weaponId`; `onItemPicked` syncs `local.weapon` + viewmodel from
     `d.weaponId` for both `'weapon'` and `'ammo'` pickups.
6. `src/components/game/Hud.tsx`
   - New `ScopeOverlay` component (z-40) rendered only when `aiming && alive
     && weapon === 'sniper'`: dark radial vignette + black scope ring + thin
     glass ring + black crosshair lines + mil-dot ticks + red center dot +
     range markings. Mounted in the `Hud` root.
   - `CrosshairHUD` now tightens its gap when aiming (matches
     `effectiveSpread`) and is hidden when scoped in with the sniper (the
     `ScopeOverlay` draws its own crosshair).
   - `PickupToast` includes `weapon` color (`#9b59b6`).
   - `Minimap` item dot color includes `weapon` (`#9b59b6`) and is slightly
     larger with a purple glow for weapon pickups.
   - Weapon slot strip at the bottom shows all 6 weapons with 3-letter
     labels (Pst/Smg/Rfl/Shg/Snp/Rck); rare weapons have a purple border.
   - Pause overlay's controls hint now mentions right-click aim + 1-6 weapon
     keys.
7. `mini-services/game-server/index.ts`
   - Added `sniper` and `rocket` to the server `WEAPONS` dict (identical
     stats to the client).
   - Added `RARE_WEAPONS` and `AMMO_PICKUP_POOL` constants.
   - `Item` interface: `type` widened to include `'weapon'`; new
     `weaponId?: string` field.
   - `spawnItem(r, type, pos?, weaponId?)` signature widened; `weaponId`
     is included in every `items:state` and `room:joined` payload (6 places
     updated).
   - New `maybeDropRareWeapon(r, pos)` helper: 2% rocket, +3% sniper
     (5% total rare drop). Called from `killMob` (PvE modes only, in
     addition to the existing `dropItemOnMobKill` regular drop).
   - `killPlayer` now captures `streakAtDeath` + `weaponAtDeath` BEFORE
     resetting them; if `streakAtDeath >= 5` and the victim's weapon is not
     `pistol`, spawns a `'weapon'` item with that `weaponId` at the victim's
     position (works in any mode, not just PvP).
   - `item:pickup` handler: `'ammo'` rolls from `AMMO_PICKUP_POOL`
     (`['smg','rifle','shotgun']` — NOT sniper/rocket); `'weapon'` switches
     to the specific `it.weaponId` (defaults to `'sniper'` if missing);
     `grantedWeapon` is included in the `item:picked` emit so the client
     can sync its viewmodel; also broadcasts a `player:state` to other
     players so they see the new gun in the victim's hand.
   - Periodic item spawns (`itemSpawnTimer` tick) still only roll
     `ammo/heal/shield` — `'weapon'` items come exclusively from mob drops
     and player-death drops.

## Spec compliance checklist

- ✅ Improved `buildWeaponMesh` for pistol / smg / rifle / shotgun with extra
  detail (slide, barrel, grip, trigger guard, sights, magazine, stock, scope,
  handguard, pump, double barrel, etc.).
- ✅ Added `sniper` (long body, very long barrel, large scope, bipod, stock)
  and `rocket` (tube body, warhead, grip, trigger) weapon meshes.
- ✅ `constants.ts` WEAPONS dict has `sniper` and `rocket` with the exact
  stats from the spec.
- ✅ `WEAPON_ORDER` includes `'sniper'` and `'rocket'`.
- ✅ Right-click (`button === 2`) toggles aim mode; `onContextMenu` calls
  `preventDefault()` so the browser menu never appears.
- ✅ Aiming with sniper → `camera.fov` → 30 + scope overlay; aim with rifle
  → fov 50 + spread reduction; other weapons barely zoom.
- ✅ Not aiming → fov restores to 75 (eased in animate loop).
- ✅ Only sniper and rifle get a spread reduction when aiming
  (`effectiveSpread()`); sniper ×0.15, rifle ×0.4.
- ✅ Mob kill: 5% rare drop (2% rocket + 3% sniper), in addition to the
  existing ammo/heal/shield drop.
- ✅ Player death with `streak >= 5`: drops their current weapon as a
  `'weapon'` item (skipped if it's the default pistol).
- ✅ `'ammo'` pickup pool = `['smg','rifle','shotgun']` — sniper/rocket are
  NOT obtainable from ammo pickups (per the "Important" note).
- ✅ New `'weapon'` item type grants a specific weapon (from `weaponId`),
  not random.
- ✅ `constants.ts` `ITEMS` has a `weapon` entry
  (`{ name: 'Arma especial', color: '#9b59b6', icon: 'weapon' }`).
- ✅ `types.ts` `ItemType` is `'ammo' | 'heal' | 'shield' | 'weapon'`.
- ✅ `buildItemAvatar` has a `'weapon'` branch that builds a distinctive
  floating-gun pickup.
- ✅ Rocket launcher is very rare (2% drop chance from mobs).
- ✅ Sniper scope overlay = dark vignette + crosshair lines.
- ✅ HUD weapon slot strip shows all 6 weapons.

## Verification

- `bun run lint` → exit 0, no errors/warnings.
- `bun build mini-services/game-server/index.ts --target bun` → bundles OK
  (61 modules, 0.54 MB) — no syntax errors.
- Dev server (`dev.log`): clean `GET / 200` responses continue.
- Game-server (port 3003): running, `socket.io/?EIO=4&transport=polling`
  returns HTTP 200.

## Approach notes

- The `aiming` state lives in the local Three.js closure AND in the Zustand
  store. The closure drives `camera.fov` and `effectiveSpread()`; the store
  drives the React `ScopeOverlay` and `CrosshairHUD` (so the scope overlay
  appears/disappears without re-rendering the canvas).
- Spread reduction is purely client-side: the client decides the bullet
  direction (with reduced spread) and sends the resulting `dir` to the
  server. The server's `WEAPONS[shooter.weapon].damage` validation still
  works (the damage caps are unchanged), so aim doesn't affect server-side
  damage validation.
- The `item:picked` event now carries `weaponId` for both `'ammo'` (the
  random weapon the server chose) and `'weapon'` (the specific weapon the
  pickup grants). The client uses this to sync its local viewmodel
  immediately, instead of waiting for the next `player:ammo` / `player:state`
  broadcast.
- The `killPlayer` function captures `streakAtDeath` and `weaponAtDeath`
  BEFORE resetting them — without this, the streak/weapon would always be
  0 / 'pistol' by the time we tried to drop them.
- `bun --hot` had issues reloading after a transient syntax error during
  development; the server was restarted without `--hot` for stability.
  All edits are verified-clean by `bun build` + `bun run lint`.
