# Shooter

Multijugador en tiempo real, inspirado en juegos como Roblox, Fortnite y Call of Duty. Combate FPS con múltiples modos de juego, mapas detallados y estructuras complejas.

## Tecnologías

- **Framework**: Next.js 16 (App Router) + TypeScript 5
- **3D**: Three.js 0.186
- **Multijugador**: Socket.io 4.8 (servidor dedicado en puerto 3003)
- **Estilos**: Tailwind CSS 4 + shadcn/ui
- **Estado**: Zustand
- **Fuente**: Patrick Hand (handwritten)

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│  Cliente (Next.js :3000)                            │
│  ├─ Lobby (selector de modo/mapa/skin)             │
│  ├─ GameCanvas (Three.js renderer)                 │
│  └─ HUD (salud, munición, minimapa, marcador)      │
│         │                                            │
│         ▼ socket.io (/socket.io via gateway)        │
│  Servidor de juego (Bun :3003)                      │
│  ├─ Salas con 6 modos de juego                     │
│  ├─ Sync de estado (20Hz)                          │
│  ├─ IA de mobs (PvE)                               │
│  └─ Items, killstreaks, respawn                    │
└─────────────────────────────────────────────────────┘
```

## Modos de juego

| Modo | Descripción | Máx. jugadores |
|------|-------------|----------------|
| 1v1 | Azul vs Rojo | 2 |
| 2v2 | 2 Azul vs 2 Rojo | 4 |
| Equipos | Hasta 6 Azul vs 6 Rojo | 12 |
| FFA | Todos contra todos | 8 |
| Cooperativo | Jugadores vs Mobs (sin fuego amigo) | 12 |
| Mixto | Jugadores vs Mobs + vs otros jugadores | 12 |

## Mapas (21)

Arena, Patios, Bunkers, Torres, Crucero, Espinas, Fortaleza, Laberinto, Puentes, Cráter, Zigzag, Diamante, Colmena, Ruinas, Estadio, Núcleo, **Barrio**, **Escuela**, **Oficinas**, **Bosque**, **Paisaje**.

## Controles

| Tecla | Acción |
|-------|--------|
| W A S D | Moverse |
| Ratón | Mirar |
| Click | Disparar |
| R | Recargar |
| 1 2 3 4 | Cambiar arma |
| Shift | Sprint |
| Espacio | Saltar |
| Tab | Marcador |
| Esc | Pausa |

## Cómo ejecutar

```bash
# Instalar dependencias
bun install

# Iniciar (lanza Next.js + servidor de juego)
bun run dev          # o: bash .zscripts/dev.sh

# El servidor de juego se inicia automáticamente
# Next.js: http://localhost:3000
# Socket.io: http://localhost:3003
```

## Modelo de IA

- **Modelo**: GLM-4.5 (Z.ai)
- **Tokens aproximados de uso**: ~500,000 tokens (prompt + completion) durante todo el desarrollo
- **Agente**: Z.ai Code (CLI tool para desarrollo asistido por IA)

## Estructura del proyecto

```
src/
├─ app/                    # Next.js App Router
│  ├─ layout.tsx          # Layout raíz con fuente Patrick Hand
│  ├─ page.tsx            # Página principal (lobby + juego)
│  └─ globals.css         # Estilos globales + tema
├─ components/
│  ├─ game/
│  │  ├─ Lobby.tsx        # Pantalla de lobby
│  │  ├─ GameCanvas.tsx   # Renderizado 3D Three.js
│  │  └─ Hud.tsx          # Interfaz del juego
│  └─ ui/                 # Componentes shadcn/ui
├─ lib/
│  ├─ game/
│  │  ├─ constants.ts     # Mapas, armas, skins, modos
│  │  ├─ types.ts         # Tipos compartidos
│  │  ├─ store.ts         # Estado Zustand
│  │  └─ sound.ts         # Efectos de sonido sintetizados
│  └─ socket.ts           # Cliente Socket.io
└─ mini-services/
   └─ game-server/        # Servidor Socket.io (puerto 3003)
      └─ index.ts
```

## Licencia

Proyecto educativo. Uso libre.
