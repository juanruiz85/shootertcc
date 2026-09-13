# Changelog

Todos los cambios notables de este proyecto se documentan aquí.
El formato está basado en [Keep a Changelog](https://keepachangelog.com/).

---

## [v0.16.0] — 2026-09-13 — Arma invertida + escuela 2 pisos + bosque denso + GitHub

### Corregido
- **Arma del jugador remoto al revés**: el modelo de arma tenía el cañón apuntando hacia -z, pero se colocaba en z=+0.28 (frente al jugador que mira +z). Rotada 180° en Y.

### Agregado
- **Escuela rediseñada (2 pisos, 197 obstáculos)**: edificio 70×70 de 2 pisos, 4 salones con pizarrón/escritorio del maestro/6 pupitres/6 sillas, 8 casilleros, 2 baños, biblioteca, laboratorio, cancha de basketball, patio con fuente
- **Bosque rediseñado (163 obstáculos)**: 27 árboles, lago + río + estanque, 3 puentes, cabaña entrable, torre de vigilancia de 3 pisos, fogata, hongos, letreros, peñascos, troncos
- **Push a GitHub**: repositorio subido a https://github.com/juanruiz85/shootertcc.git

### Pruebas
- Lint: limpio ✅ | Servidores estables ✅ | Socket conecta ✅ | Jugador 100 HP ✅ | GitHub push ✅

---

## [v0.15.0] — 2026-09-13 — Techos no bloquean + mapas más detallados

### Corregido
- **Techos bloqueando movimiento**: añadido campo `isRoof` a ObstacleBox. Los techos NUNCA bloquean movimiento horizontal.
- **No poder entrar a la escuela**: el techo del edificio bloqueaba la entrada. Con el fix de techos, ahora se puede entrar.

### Agregado
- Escuela rediseñada: 4 salones con paredes interiores, 16 pupitres, 3 pizarrones, 8 casilleros, cancha de basketball
- Barrio rediseñado: 8 casas entrables, torre central de 5 pisos, 4 coches, lámparas, vallas, fuente

### Pruebas
- Lint: limpio ✅ | 2 jugadores en sala cooperativa ✅ | VLM: "no overhead obstructions" ✅

---

## [v0.14.0] — 2026-09-13 — Mapas reescalados + puertas desbloqueadas

### Corregido
- **Obstáculos amontonados en el centro**: multiplicadas todas las coordenadas x/z por 2.5x para llenar arena 160×160
- **No poder entrar a la escuela**: pizarrón sur bloqueaba la puerta, divisores interiores bloqueaban el paso. Eliminados y reubicados.
- **Puertas bloqueadas**: verificado que ningún obstáculo bloquee las entradas

### Agregado
- 21 mapas reescalados a 160×160
- Escuela ampliada a 60×60 con 16 pupitres
- Servidor sincronizado con cliente

### Pruebas
- Lint: limpio ✅ | VLM: "obstacles distributed across arena" ✅ | VLM: rated 7/10 ✅

---

## [v0.13.0] — 2026-09-13 — Entrar a construcciones + saltar entre bloques + mapa 5x más grande

### Corregido
- **No poder entrar a las casas**: `horizontalBlocked` trataba techos como paredes. Losas delgadas ahora solo bloquean si el cuerpo del jugador interseca su rango vertical.
- **No poder saltar sobre bloques**: la lógica "todavía en caja" reseteaba `vel.y = 0` cada frame. Ahora solo hace snap cuando `vel.y <= 0` (cayendo).
- **Escaleras no empezaban desde el primer piso**: `buildTower` rediseñado, escaleras desde planta baja.

### Agregado
- **Mapas 5x más grandes**: ARENA_SIZE 64 → 160, spawns ±60, niebla 80-200, cámara far 400, shadow frustum 90×90

### Pruebas
- Lint: limpio ✅ | VLM: "scene more open, consistent with larger map" ✅ | rated 6/10 ✅

---

## [v0.12.0] — 2026-09-13 — Corrección de orientación + torres + mapas más grandes

### Corregido
- **Objetos volteados**: árboles invertidos, puertas arriba, coches con cabina dentro de carrocería. Añadido campo `y` a MapObstacle para offset vertical.
- **Altura de salto limitada**: JUMP_V 9.5 → 13

### Agregado
- **buildTower**: torres de múltiples pisos entrables con escaleras internas
- Barrio ampliado: 8 casas + torre de 5 pisos
- Oficinas ampliado: 8 edificios + torre de 5 pisos

### Pruebas
- Lint: limpio ✅ | VLM: "trees correctly oriented" ✅ | Jugador 88 HP ✅

---

## [v0.11.0] — 2026-09-13 — Rediseño de mapas estilo Roblox + README + CHANGELOG

### Cambios
- **Rebranding**: "Doodle Shooter" → "Shooter"
- **5 mapas rediseñados**: Barrio (casas entrables), Escuela (edificio cerrado), Oficinas (edificios+ascensor), Bosque (árboles+río), Paisaje (rocas+río+torre)
- **Nuevos tipos de obstáculo**: `wall`, `stair`, `water`, `roof` con `rotation` y `noCollide`
- **Funciones de construcción**: `buildHouse`, `buildStairs`, `buildTree`, `buildCar`
- **README.md** y **CHANGELOG.md** creados

### Pruebas
- Lint: limpio ✅ | Lobby muestra "Shooter · 21 mapas · 6 modos" ✅ | Socket conecta ✅

---

## [v0.10.0] — 2026-09-13 — Nuevos mapas y modos de juego

### Agregado
- 5 mapas nuevos: Barrio, Escuela, Oficinas, Bosque, Paisaje (21 mapas total)
- 6 modos de juego: 1v1, 2v2, Equipos, FFA, Cooperativo, Mixto
- Selección de mapa en lobby para modos PvP
- Estructuras trepables (casas con botes de basura para subir al techo)

### Corregido
- **Bug crítico**: reaparición atascada (el jugador moría y nunca reaparecía)
- **Bug crítico**: generación dentro de objetos (spawn collision)

### Pruebas
- Lint: limpio ✅ | 6 modos visibles en lobby ✅ | Socket conecta ✅

---

## [v0.9.0] — 2026-09-13 — Diverse arena props + pause menu + death screen

### Agregado
- Props diversos: 5 barriles, 4 banderas, 4 paredes de cobertura baja
- Menú de pausa con estadísticas en vivo (K/D, racha, puntos)
- Pantalla de muerte con info del asesino ("Eliminado por [killer]")

### Pruebas
- Lint: limpio ✅ | VLM: "trees, red barrels, low cover walls visible" ✅ | VLM: pause menu "clearly displays all stats" ✅

---

## [v0.8.0] — 2026-09-13 — Sombras + cielo + props + crosshair feedback

### Agregado
- Sombras dinámicas (PCFShadowMap), cielo con cúpula, nubes flotantes
- Texturas de pared con patrón de ladrillo
- Numeraciones de daño flotantes en 3D
- Confirmación de baja con puntos ganados
- Orientación de spawn hacia el centro de la arena
- FOV que se ensancha al hacer sprint
- Cono de FOV en el minimapa
- Indicador direccional de daño
- Vignette + overlay de HP baja
- Barra de aguante (stamina)
- Sistema de chat rápido
- Sonidos sintetizados (disparo, impacto, muerte, pickup, etc.)

### Corregido
- Sombras no visibles (ambient light demasiado fuerte)
- Niebla demasiado densa
- Texto del minimapa cortado
- Overlapping overlays (muerte + click para jugar)
- Dificultad PvE demasiado alta en nivel 1

### Pruebas
- Lint: limpio ✅ | VLM: "shadows visible" ✅ | VLM: "HUD very clear" ✅

---

## [v0.7.0] — 2026-09-13 — Visual environment improvements

### Agregado
- Props decorativos: árboles, lámparas, cajas, barriles, banderas
- Sombras dinámicas, cielo con cúpula, nubes flotantes
- Crosshair que se pone rojo al acertar
- Indicador de munición baja
- Vignette + overlay de HP baja
- Texturas de pared con patrón de ladrillo doodle
- Procedural cover blocks (10 por mapa)

### Corregido
- Runtime error: C_WOOD/C_STONE constants no definidas en GameCanvas

### Pruebas
- Lint: limpio ✅ | VLM: "wall textures visible" ✅ | VLM: "shadows visible" ✅

---

## [v0.6.0] — 2026-09-13 — Bug fixes + sound effects + sprint stamina

### Corregido
- Overlapping overlays (¡Eliminado! + Haz clic para jugar)
- PvE difficulty too high (player died in ~2s at level 1)
- Excessive blur on click-to-play overlay

### Agregado
- Sound effects (12 synthesized sounds via Web Audio API)
- Sprint stamina system (0-100, depletes at 35/sec)
- Enhanced BannerOverlay with mini-scoreboard
- allowedDevOrigins config fix

### Pruebas
- Lint: limpio ✅ | Player survives at 100 HP after 5s ✅ | VLM: HUD "very clear" ✅

---

## [v0.5.0] — 2026-09-13 — QA fixes + health regen + drone + killstreaks

### Corregido
- allowedDevOrigins warning in next.config.ts
- Missing round/level transition banner

### Agregado
- Health regen in PvE (6 HP/sec after 5s without damage)
- Directional damage indicators
- Visual drone model (3D, follows player)
- Killstreak progress bar
- Impact particles
- Quick chat system
- Better minimap with obstacle outlines + map name

### Pruebas
- Lint: limpio ✅ | VLM: "minimap shows grid with red dots and grey shapes" ✅

---

## [v0.4.0] — 2026-09-13 — Funciones de juego

### Agregado
- Modelos de jugador humano (cabeza, torso, brazos, piernas, pelo, ojos)
- Armas visibles distintas por tipo (pistola, SMG, rifle, escopeta)
- Estructuras trepables (cajas con colisión de techo)
- Items dropeados (cartucho, cruz, bebida) con modelos 3D
- Killstreaks: Dron (3), Bomba (5), Ráfaga (7)
- Dron 3D visual que sigue al jugador
- Partículas de impacto
- Banner de transición de nivel/ronda con mini-marcador
- Regeneración de vida en PvE
- Indicador de munición baja
- Crosshair que se pone rojo al acertar
- Menú de pausa con estadísticas en vivo (K/D, racha, puntos)
- Pantalla de muerte con info del asesino

---

## [v0.3.0] — 2026-09-13 — Multijugador y modos

### Agregado
- Servidor Socket.io (puerto 3003) con salas, sync de estado, IA de mobs
- 2 modos de juego: PvP (1v1 azul vs rojo) y PvE (niveles)
- 16 mapas con temas
- Items: munición, cura, escudo
- Sistema de killstreaks
- Limpieza de salas vacías (8s TTL)
- Lobby con selector de modo, skins, lista de salas
- HUD completo: salud, escudo, munición, minimapa, kill feed, marcador
- Arreglo del bug de controles invertidos (de los archivos originales)

---

## [v0.2.0] — 2026-09-13 — Lobby + game server + HUD básico

### Agregado
- Lobby con selector de nombre/skin
- Servidor de juego Socket.io básico
- Juego 3D con Three.js (controles corregidos)
- HUD básico (salud, munición, minimapa)

---

## [v0.1.0] — 2026-09-13 — Versión inicial

### Agregado
- Análisis de 4 archivos HTML originales (Doodle Shooter)
- Identificación del bug de controles invertidos en 2 de 4 archivos
- Proyecto Next.js inicializado
- Dependencias instaladas: three, socket.io, socket.io-client
- Cron job de revisión cada 15 minutos

---

## [v0.17.0] — 2026-09-13 — Oficinas rediseñado como edificio de 6 pisos

### Agregado
- **Mapa Oficinas completamente rediseñado** (308 obstáculos) como edificio de 40×40 de 6 pisos (h=24):
  - **Piso 1 (Lobby)**: recepción con escritorio y computadora, sofa, mesa de café, 4 plantas, escritorio de seguridad, botes de basura
  - **Piso 2 (Oficinas abiertas)**: 6 escritorios con computadoras y sillas, 3 archivadores, dispensador de agua, impresora
  - **Piso 3 (Salas de reuniones)**: 4 salas divididas por paredes, cada una con mesa grande, 4 sillas, proyector, pizarra blanca
  - **Piso 4 (Cubículos)**: 9 cubículos con particiones en L, cada uno con escritorio, monitor, silla, teléfono
  - **Piso 5 (Sala de servidores)**: 6 racks con LEDs verdes/rojos, bandejas de cables, 2 unidades de enfriamiento, 2 baterías UPS
  - **Piso 6 (Terraza/Azotea)**: barandillas perimetrales, jacuzzi con agua, bar con botellas, 3 sillones, mesa con sombrilla, parrilla, plantas
  - **Escaleras**: 7 escalones por piso + landing, conectan los 6 pisos desde planta baja
  - **Plataformas de piso**: cada piso tiene hueco para escaleras (techos de piso N = piso de piso N+1)
  - **Exterior**: estacionamiento con 6 coches, 4 lámparas de calle, 4 árboles, 2 botes de basura en entrada

### Corregido
- Mapa Oficinas era casi idéntico al Barrio (solo casas pequeñas). Ahora es un edificio único de 6 pisos.
- Escaleras ahora empiezan desde el primer piso y conectan todos los pisos

### Pruebas
- Lint: limpio ✅ | Servidores estables ✅ | Server sincronizado (308 obstáculos) ✅ | Push GitHub ✅

---

## [v0.18.0] — 2026-09-13 — Fix escaleras + plataformas de piso + paredes fantasmas

### Corregido
- **Escaleras no se podían usar**: las plataformas de piso tenían huecos enormes (10+ unidades) donde el jugador se caía. Las escaleras estaban flotando sin piso debajo.
  - Solución: `buildFloor()` crea 4 piezas sólidas alrededor de un hueco de 4×4 para el hueco de escalera, con cobertura completa
- **Paredes fantasmas**: espacios que se veían vacíos pero bloqueaban el paso. Causado por colisiones de obstáculos con `noCollide: false` incorrectos.
  - Solución: revisados todos los obstáculos, los que no deben bloquear tienen `noCollide: true`
- **Caerse al subir de piso**: 7 escalones × 0.55 = 3.85, pero el piso estaba a 4.0. Había un hueco de 0.15.
  - Solución: stepH cambiado a 0.57 (7 × 0.57 = 3.99 ≈ 4.0)

### Agregado
- **Escaleras en distintos lugares por piso**:
  - Piso 0→1: esquina NW, yendo N
  - Piso 1→2: esquina NE, yendo N
  - Piso 2→3: esquina SE, yendo S
  - Piso 3→4: esquina SW, yendo S
  - Piso 4→5: esquina NW, yendo N
- **`buildFloor(y, hx, hz)`**: genera 4 piezas de piso sólidas alrededor de un hueco de escalera
- **`buildStaircase(sx, sz, dir, baseY)`**: genera 7 escalones en dirección N/S/E/W
- **`getHolePos()`**: calcula la posición del hueco según la dirección de las escaleras

### Pruebas
- Lint: limpio ✅ | Servidores estables ✅ | Server sincronizado ✅ | Push GitHub ✅
