# /clocks-reel — cómo se hace un reel de Clocks BCN con dos vídeos

Esto es lo que salió del Tudor Oyster Prince (11-sep-2026), empaquetado para repetirlo con
cualquier reloj. Tú mandas dos vídeos y Claude hace el resto con esta skill.

## Qué tienes que mandar

1. **El vídeo de la persona** hablando a cámara (iPhone, vertical, con micro de solapa). Una sola
   toma continua; los silencios y repeticiones se cortan solos. Que diga el nombre del modelo,
   el año y las partes que quiere que se señalen (índices, corona, caja, esfera…), y que acabe
   con el «síguenos» y «mira la web».
2. **El vídeo del reloj** (B-roll): manos con el reloj sobre fondo blanco, plano frontal, perfil
   con corona, macro de la esfera, brazalete o correa. Mejor tramos de 4 a 6 segundos quietos;
   los borrosos se descartan solos. Si quieres que salga la tapa trasera, grábala: si no está
   en el B-roll se resuelve con un recorte de la toma de la persona.

Los dos por AirDrop a la carpeta Descargas o directamente a
`negocios/contenido/proyectos-video/<slug>/00-input/`. Ojo: los nombres IMG_xxxx del iPhone
pueden venir al revés; Claude mira los dos antes de decidir cuál es cuál.

## Qué le dices a Claude

`/clocks-reel` y los dos archivos. Si quieres, añade:
- La referencia cultural del hook (la serie, la persona famosa) y si hay que verificarla.
- Qué partes del reloj quieres señaladas.
- Qué palabras clave quieres en pantalla (si no, Claude elige 5 a 7: modelo, año, cifra,
  rasgo, referencia).
- Si en este vídeo NO quieres el desenfoque de fondo, la cajita de seguir o la web.

## Qué hace la skill, en orden

1. **Ingesta**: la toma de la persona a 1080, sin las pausas largas (solo las de más de 0,3 s,
   para que quede natural), y el B-roll a 1620 px. Transcribe con Whisper y comprueba que no se
   ha comido ninguna palabra al cortar.
2. **Lectura**: Gemini «ve» los dos vídeos: qué dice, qué muestra con las manos, qué tramos del
   reloj son buenos, qué pone en la esfera. Verifica en internet el dato cultural del hook.
3. **Tramos del reloj**: recorta los 4 o 5 buenos y localiza en píxeles lo que hay que señalar.
   Un tracking por flujo óptico hace que las etiquetas persigan el reloj aunque la mano se
   mueva.
4. **Recortes**: separa a la persona del fondo (MediaPipe) en los momentos donde la palabra
   clave va por detrás de su cabeza. Si hay un cartel molesto en el fondo, lo rastrea y lo
   desenfoca.
5. **Plan director**: un solo archivo con todos los tiempos (`07-montaje/gen_timeline.py`):
   qué se ve en cada frase, qué palabra sale y cuándo, qué señalización, qué efecto. De ahí
   salen el timeline de Remotion y los planes de música y efectos.
6. **Música**: busca en Epidemic, audiciona 4 o 6 candidatos, mide dónde «rompe» cada uno y
   clava ese romper al primer corte al reloj. Estilo Clocks: lo-fi cálido con Rhodes.
7. **Assets reales**: fotos de vuestra tienda para el díptico (correa / brazalete), captura móvil
   de clocksbcn.com y datos del perfil de Instagram para la cajita de seguir.
8. **Render**: por trozos (el Mac no aguanta el vídeo entero de una), audio aparte, máster a
   -14 LUFS, MP4 1080×1920 y copia 720p para el móvil.
9. **Revisión**: stills de cada elemento, loudness, salto del drop, lectura crítica de Gemini
   con lista de problemas. Se corrige y se vuelve a renderizar lo tocado.

## Qué te llega

- `08-final/<SLUG>-v1.mp4` (1080×1920) y `-720p.mp4`, abiertos en el reproductor y enviados
  al chat.
- `08-final/qa-report.md` con lo comprobado y lo que te toca decidir a ti.
- Todo reproducible: el plan director, los trackings, los mattes y los planes de audio. Un
  cambio (otra palabra, otra música, quitar un callout) es tocar el plan y re-renderizar.

## Cómo pedir cambios

Di el momento y el cambio: «en el 0:15 la etiqueta más arriba», «quita el título del 0:44»,
«pon Vapour en vez de Shine», «el cartel del fondo déjalo». Claude toca el plan director y
re-renderiza solo los trozos afectados (un par de minutos por trozo).

## Lo que la skill NO hace

- No inventa imágenes del reloj: solo B-roll real, fotos de la tienda y referencias con fuente.
- No publica: el vídeo se entrega, lo subes tú.
- No se sostiene con menos de 6 GB libres en el Mac: si el disco está lleno, Chrome rechaza
  los frames y el render se cae. Limpiar antes.

## Si algo falla

- «Se han comido palabras» al cortar: revisar `01-tomas/toma-A-final.cuts.json` y la
  transcripción final; casi siempre es un corte dentro de una palabra mal marcada por Whisper.
- Render que muere con «delayRender de fuente»: es memoria (frames demasiado grandes), no la
  fuente. B-roll a 1620 máximo y `--concurrency 1`.
- Etiqueta que se sale o pisa algo: `dx, dy` del callout en el plan.
- Tracking que salta: el punto estaba sobre un reflejo; ponerlo sobre un borde con textura.

Carpeta de la skill: `.claude/skills/clocks-reel/` (scripts, kit de Remotion, modelo de
segmentación y ejemplos del Tudor en `reference/`).
