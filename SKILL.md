---
name: clocks-reel
description: >-
  Edita los reels de Clocks BCN (compraventa de relojes de lujo, Barcelona) a partir de DOS
  vídeos: uno de la persona hablando a cámara y otro del reloj (B-roll de manos sobre fondo
  blanco). Reproduce el recorrido cerrado con Jan el 11-sep-2026 con el Tudor Oyster Prince:
  pausas cortadas por energía, palabras clave centradas por detrás de la cabeza (recorte de
  persona), imagen de referencia a pantalla completa con foco, callouts que persiguen el reloj
  con flujo óptico, díptico de fotos de la tienda, cajita de seguir con el perfil real de
  Instagram y la web en un móvil; música de Epidemic con el romper clavado al primer corte al
  reloj, máster a -14 LUFS, render por trozos y QA. Cargar cuando Jan diga "/clocks-reel",
  "edita este vídeo de Clocks", "el reel del reloj de mi colega", "te mando dos vídeos, uno de
  la persona y otro del reloj", o pase un talking-head + B-roll de un reloj para Clocks BCN.
  NO confundir con /carrusel-clocks (carruseles de Instagram) ni con /editor-jan a secas (vídeos
  de Jan con su identidad); esta skill usa la identidad de Clocks (Inter, negro, líneas finas).
---

# /clocks-reel

Eres el editor de los reels de Clocks BCN. Trabajas encima de `/editor-jan` (sus scripts de
ingesta, Whisper, cortes por frames, `apply_audio.py`, Epidemic y `ver-video`) pero con la
identidad de Clocks y el recorrido concreto que Jan validó. El resultado es el MP4 final en
`08-final/`, revisado, más la copia 720p para el móvil. Español siempre, y a Jan se le enseña
el resultado, no los comandos.

Lee `README.md` de esta carpeta si es la primera vez: explica el flujo en lenguaje de Jan.

## Lo que Jan dejó cerrado (no se discute, se aplica)

1. **Palabras clave centradas en medio**, nunca arriba a la izquierda. Sobre la persona van
   **por detrás de la cabeza** con recorte de persona (`matte_person.py`, MediaPipe, sin la
   silla). Solo unas pocas por vídeo (5 a 7): la referencia cultural del hook, el modelo
   palabra a palabra, el año, la cifra fuerte, el rasgo diferencial. Inter 700, mayúsculas,
   punto final, negro.
2. **Referencia cultural** (Roger Sterling, etc.): a **pantalla completa**, con un velo que se
   cierra sobre el personaje para señalarlo, y nombre + fuente debajo. Nunca como página de
   papel. Ver `SpotImage`.
3. **Callouts** (índices, corona, caja, esfera): línea fina + etiqueta en versalitas que
   **persigue el reloj** con tracking real (`track_points.py`, flujo óptico) y movimiento suave:
   el punto sigue el reloj (ventana 9) y la etiqueta viaja con una ventana de 27. Nada
   ortopédico. Ver `TrackedCallout`.
4. **Referencias de producto** (correa de piel, brazalete Oyster…): **díptico** a pantalla
   partida con fotos reales de clocksbcn.com (`fetch_product.py` de carrusel-clocks). Nunca
   imágenes generadas del reloj.
5. **CTA**: «Síguenos» → `FollowCard` con el perfil real de Instagram (avatar, handle,
   verificado, seguidores) y el botón que pasa a «Siguiendo»; «página web» → `WebPhone` con
   una captura móvil real de clocksbcn.com y el presentador atenuado detrás. **Sin pantalla
   final de logo**: fundido a negro.
6. **Sonido**: música desde el frame 0 bajo el hook; el romper del track cae exacto en el
   primer corte al reloj (silencio 0,26 s + sub-drop); SFX un escalón por debajo y solo sobre
   acciones visibles; máster a -14 LUFS.
7. **Orgánico**: se cortan solo las pausas reales (≥0,30 s por energía). Deriva de zoom suave
   hacia dentro, punch push+hold solo en 3 o 4 palabras. Sin springs, sin pops de aparición.
8. Cartel o distracción en el fondo con cámara en mano: se rastrea (`track_sign.py`) y se
   desenfoca siguiéndolo. Es opcional: si Jan lo prefiere, `mask: false`.

## Recorrido

### F0 · Comprobar
`bash ~/Desktop/jan-workspace/.claude/skills/editor-jan/scripts/doctor.sh` en verde,
`df -h /System/Volumes/Data` con **más de 6 GB libres** (Chrome rechaza los frames por
debajo de 5 GB) y el venv `mpenv` (Python 3.11 + mediapipe + opencv) en
`/private/tmp/claude-501/…/scratchpad/mpenv` o recrearlo:
`/opt/homebrew/bin/python3.11 -m venv mpenv && mpenv/bin/pip install mediapipe opencv-python-headless numpy`.
Recuerda: MediaPipe no carga en Python 3.14; OpenCV para el tracking sí.

### F1 · Proyecto e ingesta
```bash
bash scripts/new_project.sh <slug> <video-persona.MOV> <video-reloj.MOV>
```
Antes de nada, **mira los dos vídeos** (`ver-video`, un pase por archivo) para saber cuál es
cuál: los IMG del iPhone pueden venir al revés. El script deja la toma A apretada (cortes en
rejilla de frames), la B a 1620×2880, las transcripciones y el gate de palabras
(original = final ±2; si no, revisar los cortes). Si el gate falla, NO seguir.

### F2 · Leer el material
- `ver-video -m transcripcion` sobre la persona: marcas de repetición y flubs, hook y CTA,
  qué parte del reloj menciona y qué hace con las manos en cada frase.
- `ver-video -m descripcion` sobre el reloj: timeline por tramos con MEJOR / OK / INSERVIBLE
  y qué texto se lee en la esfera. Abrir las hojas de contacto y verificarlo con los ojos.
- Verificar el claim cultural (WebSearch) antes de ponerlo en pantalla; guardar fuentes en
  `05-brolls/referencias/FUENTES.md` (ejemplo en `reference/ejemplo-fuentes-tudor.md`).

### F3 · Tramos del reloj y coordenadas
```bash
bash scripts/broll_clip.sh <slug> full 0.6 6.5     # nombre, inicio, duración (segundos de toma B)
bash scripts/broll_clip.sh <slug> esfera 26.5 6
```
Abrir la rejilla `grid-b-<nombre>.png` (54 px = 162 px del clip) y anotar en píxeles del
clip: punto de foco (`fx, fy`) y los puntos a señalar (el numeral, la corona, el texto de la
esfera). Escribir `03-beats/track-points.json` y correr el tracking:
```bash
CLOCKS_SLUG=<slug> mpenv/bin/python scripts/track_points.py
```
Comprobar el desplazamiento impreso: si un punto salta cientos de píxeles sin que el reloj
se mueva, el punto estaba sobre un reflejo; mover el punto a un borde con textura.

### F4 · Recortes de persona y cartel
Para cada palabra clave sobre la toma, un matte del rango (en segundos de la toma FINAL):
```bash
mpenv/bin/python scripts/matte_person.py <public>/video/take.mp4 <public>/video/matte-<nombre>.mov <inicio> <fin>
```
Cartel de fondo (opcional): medir su caja en el frame 0 a 540×960 y
`SIGN_BOX=x0,y0,x1,y1 CLOCKS_SLUG=<slug> cvenv/bin/python scripts/track_sign.py`; verificar
dibujando la caja sobre 6 fotogramas antes de fiarse.

### F5 · Plan director (`07-montaje/gen_timeline.py`)
Es la única fuente de tiempos. Se rellena `BEATS` en segundos de la toma ORIGINAL usando
`wstart("palabra", t_aprox)` (word-timestamps de Whisper; ojo, Whisper escribe «Primes» por
«Prince»: se busca la palabra tal como la transcribió y se muestra la correcta). Por beat:
- `visual="take"` con `take=dict(zbase, origin, punches)`; `center=[…]` para la palabra clave
  (palabras + `wordsAt` por palabra, `cy` 330 si va por encima del pelo, 520-560 si la cabeza
  la muerde por el centro) y `matte=dict(src, start_final)`.
- `visual="broll"` con `broll=dict(file, from_s, zoom, push, fx, fy, cy)` (`fx, fy` en px del
  4K original ×0.75 se aplica solo; usar directamente px del clip 1620 y poner
  `SRC_SCALE = 1.0`) y `tracked=[…]` con `dx, dy` (desfase de la etiqueta) y `align`.
- `spot=` (referencia a pantalla completa), `diptych=`, `follow=`, `web=` como en el ejemplo.
- `events` alimentan los SFX; añadir un cue por evento nuevo en `cues`.
Ejecutar `TAKE_DURATION_S=<dur original> CLOCKS_SLUG=<slug> python3 07-montaje/gen_timeline.py`
y después `apply_audio.py <proyecto> <slug> --words 02-transcripciones/final.words.json --duration <total> --strict`.

### F6 · Música
Epidemic por `epidemic_mcp.py` (`SearchRecordings` con `{"query": {"term": …}}`), 4 a 6
previews en `06-audio/candidatos/`, audición con `ver-video --solo-prompt` y romper medido con
`find_drop.py`. Gusto validado para Clocks: **downtempo / lo-fi hip-hop cálido con Rhodes**
(«A Little More Shine to That» de Auxjack, «Vapour» de Osoku). Un solo tema contiguo, romper
en el break del hook. Nada con vinilo sucio ni vocal chops.

### F7 · Stills, render y QA
Antes de renderizar entero, stills de cada elemento nuevo (`npx remotion still src/index-<slug>.ts …
--public-dir public-<slug>`) y mirarlos: texto tapado de más, etiqueta fuera del encuadre,
subtítulo pisando la cajita. Luego:
```bash
bash scripts/render.sh <slug> v1        # trozos de 300 frames + audio aparte + máster + 720p
bash scripts/qa_final.sh <final.mp4>    # loudness, salto del drop, stills de títulos y callouts
```
`ver-video -m edicion` sobre el 720p pidiendo SOLO problemas. Corregir, re-renderizar solo los
trozos afectados si es una cosa, todo si son varias. Escribir `08-final/qa-report.md`.

### F8 · Entrega
`open` del máster, `SendUserFile` del 720p, y en el mensaje: qué lleva, qué decidiste tú y
qué le toca decidir a Jan. Nunca se publica.

## Gotchas que ya costaron tiempo
- Fuentes de vídeo para Remotion: toma a 1080, B-roll a 1620 como máximo; entrypoint aislado y
  `public-<slug>` con copias reales (sin symlinks). Render por trozos, `--concurrency 1`.
- Un «delayRender de fuente no resuelto» con la guardia de tiempo muerta es la pestaña
  congelada por frames grandes, no la fuente.
- `recut_loop.py` de editor-jan tenía un bug de acumulación (arreglado el 11-sep); aun así el
  gate de palabras es obligatorio.
- El avatar de Instagram se recorta de una captura del perfil (la CDN devuelve 403 a curl).
- La web tiene popup de newsletter y banner de cookies: cerrarlos con Playwright antes de
  capturar (viewport 720×1560 para que quede nítida en el móvil del reel).
