#!/usr/bin/env python3
"""track_sign.py — rastrea el cartel «LOCAL EN ALQUILER» del fondo en la toma final
(cámara en mano) por template matching y escribe signTrack.ts para Remotion.

Salida: remotion-studio/src/compositions/proyectos/<slug>/signTrack.ts
  export const SIGN_TRACK: [x0, y0, x1, y1][]  (píxeles 1080×1920, un item por frame)
"""
import json, sys
from pathlib import Path
import cv2, numpy as np

import os
SLUG = os.environ.get("CLOCKS_SLUG") or (sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("-") else None)
if not SLUG:
    raise SystemExit("falta el slug: CLOCKS_SLUG=<slug> o primer argumento")
WS = Path(os.environ.get("JAN_WORKSPACE", str(Path.home() / "Desktop/jan-workspace")))
P = WS / "negocios/contenido/proyectos-video" / SLUG
STUDIO = WS / "negocios/contenido/remotion-studio"
SRC = STUDIO / "public/proyectos" / SLUG / "video/take.mp4"
SCALE = 0.25  # 2160×3840 → 540×960

cap = cv2.VideoCapture(str(SRC))
n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
frames = []
while True:
    ok, fr = cap.read()
    if not ok:
        break
    frames.append(cv2.resize(fr, None, fx=SCALE, fy=SCALE, interpolation=cv2.INTER_AREA))
print(f"{len(frames)} frames leídos ({n} anunciados)")

# plantilla: el cartel en el frame 0 (medido a ojo en 540×960: x 0..120, y 190..260)
f0 = frames[0]
TX0, TY0, TX1, TY1 = [int(v) for v in (os.environ.get('SIGN_BOX') or '5,192,118,256').split(',')]  # caja del cartel en el frame 0 a 540×960 (SIGN_BOX=x0,y0,x1,y1)
tpl = f0[TY0:TY1, TX0:TX1].copy()
th, tw = tpl.shape[:2]

PAD = 140  # el cartel sale a medias por el borde izquierdo: se rellena el borde para poder casarlo
boxes = []
prev = None
for i, fr in enumerate(frames):
    padded = cv2.copyMakeBorder(fr[0:480, 0:360], 0, 0, PAD, 0, cv2.BORDER_REPLICATE)
    res = cv2.matchTemplate(padded, tpl, cv2.TM_CCOEFF_NORMED)
    if prev is not None:
        # prior: la cámara va en mano pero no salta; buscar cerca de la posición anterior
        px, py = prev[0] + PAD, prev[1]
        mask = np.zeros_like(res)
        y0, y1 = max(0, py - 60), min(res.shape[0], py + 61)
        x0, x1 = max(0, px - 60), min(res.shape[1], px + 61)
        mask[y0:y1, x0:x1] = 1
        res = res * mask + (mask - 1)  # fuera de la ventana: -1
    _, mx, _, loc = cv2.minMaxLoc(res)
    x, y = loc[0] - PAD, loc[1]
    if mx < 0.35 and prev is not None:
        x, y = prev
    prev = (x, y)
    boxes.append([x, y, x + tw, y + th, round(float(mx), 3)])

# suavizado temporal (mediana de 5) y paso a 1080×1920
arr = np.array([[b[0], b[1]] for b in boxes], dtype=float)
sm = arr.copy()
for i in range(len(arr)):
    a, b = max(0, i - 2), min(len(arr), i + 3)
    sm[i] = np.median(arr[a:b], axis=0)
K = 1080 / 540
track = [[round(sm[i][0] * K), round(sm[i][1] * K), round((sm[i][0] + tw) * K), round((sm[i][1] + th) * K)] for i in range(len(arr))]
conf = [b[4] for b in boxes]
low = sum(1 for c in conf if c < 0.35)
print(f"confianza media {np.mean(conf):.2f} · frames con confianza <0.35: {low}")
print("muestras:", {t: track[min(len(track) - 1, t * 30)] for t in [0, 5, 12, 20, 30, 40, 50, 59]})

out = STUDIO / "src/compositions/proyectos" / SLUG / "signTrack.ts"
out.write_text("// GENERADO por 07-montaje/track_sign.py (template matching sobre take.mp4). No editar a mano.\n"
               f"export const SIGN_TRACK: [number, number, number, number][] = {json.dumps(track)};\n")
(P / "03-beats/sign-track.json").write_text(json.dumps({"track": track, "conf": conf}))
print("→", out)
