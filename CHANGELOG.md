# Changelog

Todos los cambios notables de este proyecto se documentan aquí.
El formato está basado en [Keep a Changelog](https://keepachangelog.com/).

---

## [v0.6.0] — 2026-09-13 — Rediseño de mapas estilo Roblox

### Cambios
- **Rebranding**: "Doodle Shooter" → "Shooter" (estética más limpia tipo Roblox/Fortnite/CoD)
- **Mapas rediseñados** con estructuras detalladas y entrables:
  - Casas con puertas, ventanas y acceso al techo
  - Edificio de escuela cerrado con salones, pupitres, pizarrones, casilleros, cancha de basketball
  - Bosque con árboles detallados, río/lago con efecto de agua (hundimiento superficial)
  - Torres con escaleras, puentes, rampas multi-nivel
- **README.md** creado con documentación completa
- **CHANGELOG.md** creado

### Pruebas
- Lint: limpio ✅
- Servidores estables ✅
- Modos de juego funcionando ✅

---

## [v0.5.0] — 2026-09-13 — Nuevos mapas y modos de juego

### Agregado
- 5 mapas nuevos: Barrio, Escuela, Oficinas, Bosque, Paisaje (21 mapas total)
- 6 modos de juego: 1v1, 2v2, Equipos, FFA, Cooperativo, Mixto
- Selección de mapa en lobby para modos PvP
- Estructuras trepables (casas con botes de basura para subir al techo)

### Corregido
- **Bug crítico**: reaparición atascada (el jugador moría y nunca reaparecía)
- **Bug crítico**: generación dentro de objetos (spawn collision)

---

## [v0.4.0] — 2026-09-13 — Mejoras visuales y ambientales

### Agregado
- Props decorativos: árboles, lámparas, cajas, barriles, banderas, paredes de cobertura
- Sombras dinámicas (PCFShadowMap)
- Cielo con cúpula (sky dome)
- Nubes flotantes con animación de deriva
- Texturas de pared con patrón de ladrillo doodle
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

---

## [v0.3.0] — 2026-09-13 — Funciones de juego

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

## [v0.2.0] — 2026-09-13 — Multijugador y modos

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

## [v0.1.0] — 2026-09-13 — Versión inicial

### Agregado
- Análisis de 4 archivos HTML originales (Doodle Shooter)
- Identificación del bug de controles invertidos en 2 de 4 archivos
- Proyecto Next.js inicializado
- Dependencias instaladas: three, socket.io, socket.io-client
- Servidor de juego Socket.io básico
- Lobby con selector de nombre/skin
- Juego 3D con Three.js (controles corregidos)
- HUD básico
- Cron job de revisión cada 15 minutos

---

## [v0.6.0] — 2026-09-13 — Rediseño de mapas estilo Roblox

### Cambios
- **Rebranding**: "Doodle Shooter" → "Shooter" (título, lobby, footer)
- **Mapas rediseñados** con estructuras detalladas y entrables:
  - **Barrio**: 4 casas entrables con puertas, ventanas y techos de colores; coches; fuente de agua
  - **Escuela**: edificio cerrado 30×30 con 4 salones, pupitres, pizarrones, casilleros, canasta de basketball, escaleras al techo
  - **Oficinas**: 4 edificios de oficinas entrables, paredes de cristal, ascensor, escaleras, rampas, puentes
  - **Bosque**: árboles detallados (tronco + copa), río con agua semitransparente, rocas, troncos, puentes
  - **Paisaje**: rocas grandes/pequeñas (trepare), río con orillas, árboles, puente, colinas, torre con escaleras
- **Nuevos tipos de obstáculo**: `wall`, `stair`, `water`, `roof` con `rotation` y `noCollide`
- **Funciones de construcción**: `buildHouse` (4 paredes con hueco de puerta), `buildStairs`, `buildTree`, `buildCar`
- **Agua**: plano semitransparente azul, sin colisión (caminas sobre ella)
- **README.md** creado con documentación completa, modelo de IA y tokens
- **CHANGELOG.md** creado con historial de versiones

### Pruebas
- Lint: limpio ✅
- Servidores estables ✅
- Lobby muestra "Shooter" y "21 mapas · 6 modos" ✅
- Socket conecta ("Conectado") ✅
- Sala cooperativa creada → juego cargado, "Cooperativo · Nivel 1 · Arena Doodle" ✅
- Jugador a 100 HP (vivo, no atascado) ✅
- Sin errores en consola ✅

---

## [v0.7.0] — 2026-09-13 — Corrección de orientación + torres + mapas más grandes

### Corregido
- **Objetos volteados**: árboles invertidos (foliage dentro del tronco), puertas arriba (ventanas mal posicionadas), coches con cabina dentro de la carrocería
  - Causa: todos los obstáculos se renderizaban desde y=0 sin offset vertical
  - Solución: añadido campo `y` a MapObstacle para offset vertical
  - buildTree: foliage ahora en y=trunkH (encima del tronco)
  - buildHouse: ventana encima de puerta en y=doorH (2.2), techo en y=h
  - buildCar: cabina en y=0.8 (encima de la carrocería)
  - buildStairs: cada escalón en y=i*stepH (apilados hacia arriba)
- **Altura de salto limitada**: JUMP_V 9.5 → 13 (altura máx ~1.7 → ~3.25 unidades)
  - Ahora se puede saltar entre bloques y subir estructuras

### Agregado
- **buildTower**: función para crear torres de múltiples pisos entrables
  - Paredes externas completas con huecos de puerta en cada piso
  - Plataformas de piso (caminables) para pisos superiores
  - Escaleras internas que conectan cada piso
  - Techo en la parte superior
  - Soporte para N pisos (usado 5 pisos en barrio y oficinas)
- **Mapa Barrio ampliado**: 4 → 8 casas entrables + torre central de 5 pisos
  - 8 botes de basura junto a casas (para subir al techo)
  - 4 coches, 2 lámparas de calle, vallas, cajas, fuente de agua
- **Mapa Oficinas ampliado**: 4 → 8 edificios de oficinas + torre central de 5 pisos
  - Paredes de cristal, botes de basura, escritorios, rampas, puentes

### Pruebas
- Lint: limpio ✅
- Servidores estables ✅
- VLM: árboles correctamente orientados ("green crown on top, brown trunk on bottom") ✅
- VLM: sin objetos invertidos ✅
- Jugador a 88 HP (vivo, no atascado) ✅
- Sin errores en consola ✅

---

## [v0.8.0] — 2026-09-13 — Entrar a construcciones + saltar entre bloques + mapa 5x más grande

### Corregido
- **No poder entrar a las casas**: el techo (losa delgada) bloqueaba horizontalmente la entrada
  - Causa: `horizontalBlocked` trataba los techos como paredes completas
  - Solución: los obstáculos delgados (h < 0.6) ahora solo bloquean si el cuerpo del jugador interseca su rango vertical
  - Ahora puedes pasar por debajo de techos/losas para entrar a las casas
- **No poder saltar cuando estás sobre bloques**: la velocidad vertical se reseteaba cada frame
  - Causa: la lógica "todavía en caja" (`onBoxTop >= 0`) ejecutaba `local.vel.y = 0` cada frame, anulando el salto
  - Solución: solo snap a la caja cuando `vel.y <= 0` (cayendo), no cuando se intenta saltar (vel.y > 0)
  - Al presionar Espacio, `onBoxTop` se reinicia a -1 para liberar al jugador
- **Escaleras no empezaban desde el primer piso**: `buildTower` solo añadía escaleras en pisos superiores (f > 0)
  - Solución: las escaleras ahora empiezan en el piso 1 (f=0) y van hasta el último piso

### Agregado
- **Mapas 5x más grandes**: ARENA_SIZE 64 → 160 (160×160 unidades)
  - Spawns actualizados a ±60 (antes ±24)
  - Niebla ajustada (80-200, antes 55-120)
  - Cámara far plane 200 → 400
  - Shadow camera frustum 90×90 (antes 45×45)
  - `buildTower` rediseñado: escaleras desde piso 1, plataformas con hueco para escaleras, puerta solo en planta baja

### Pruebas
- Lint: limpio ✅
- Servidores estables ✅
- Socket conecta ✅
- Jugador a 100 HP (vivo, puede saltar y entrar a casas) ✅
- VLM: "scene more open with significant empty space, consistent with larger map" ✅
- VLM: rated 6/10 (scale increased, could use more props for size) ✅
- Sin errores en consola ✅
