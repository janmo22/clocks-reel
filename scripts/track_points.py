#!/usr/bin/env python3
"""track_points.py — sigue puntos del reloj en los clips de B-roll (flujo óptico
Lucas-Kanade piramidal + suavizado) para que los callouts persigan la pieza con
movimiento continuo y suave. Escribe callouts.ts para Remotion.

Entrada: 03-beats/track-points.json  →  {"<clip>": [{"id":..., "sx":..., "sy":..., "from_f":...}]}
  sx, sy en píxeles del clip (1620×2880); from_f = frame del clip donde arranca el seguimiento.
Salida: src/compositions/proyectos/<slug>/callouts.ts
  export const TRACKS: Record<string, [number, number][]>  (por frame del CLIP, píxeles del clip)
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
VID = STUDIO / "public/proyectos" / SLUG / "video"
SCALE = 0.5  # 1620×2880 → 810×1440 para el flujo óptico

spec = json.load(open(P / "03-beats/track-points.json"))
LK = dict(winSize=(41, 41), maxLevel=4, criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 40, 0.01))


def read_gray(path):
    cap = cv2.VideoCapture(str(path))
    out = []
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        g = cv2.cvtColor(cv2.resize(fr, None, fx=SCALE, fy=SCALE, interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
        out.append(g)
    return out


def smooth(xy, win=7):
    """media móvil centrada + un segundo pase ligero: quita el temblor de mano sin retrasar el seguimiento."""
    arr = np.array(xy, dtype=float)
    for _ in range(2):
        sm = arr.copy()
        for i in range(len(arr)):
            a, b = max(0, i - win // 2), min(len(arr), i + win // 2 + 1)
            sm[i] = arr[a:b].mean(axis=0)
        arr = sm
    return arr


tracks = {}
for clip, points in spec.items():
    frames = read_gray(VID / clip)
    n = len(frames)
    for pt in points:
        f0 = int(pt["from_f"])
        p = np.array([[[pt["sx"] * SCALE, pt["sy"] * SCALE]]], dtype=np.float32)
        pos = [None] * n
        pos[f0] = (float(p[0][0][0]), float(p[0][0][1]))
        # hacia delante
        cur = p.copy()
        for i in range(f0, n - 1):
            nxt, st, err = cv2.calcOpticalFlowPyrLK(frames[i], frames[i + 1], cur, None, **LK)
            back, st2, _ = cv2.calcOpticalFlowPyrLK(frames[i + 1], frames[i], nxt, None, **LK)
            drift = float(np.linalg.norm(back - cur))
            if st[0][0] == 1 and drift < 1.5:
                cur = nxt
            # si el punto se pierde (dedo encima, desenfoque) se mantiene la última posición buena
            pos[i + 1] = (float(cur[0][0][0]), float(cur[0][0][1]))
        # hacia atrás (para frames anteriores a from_f, por si el callout entra antes)
        cur = p.copy()
        for i in range(f0, 0, -1):
            nxt, st, err = cv2.calcOpticalFlowPyrLK(frames[i], frames[i - 1], cur, None, **LK)
            if st[0][0] == 1:
                cur = nxt
            pos[i - 1] = (float(cur[0][0][0]), float(cur[0][0][1]))
        sm = smooth(pos, win=9)          # el punto: fiel al reloj, sin temblor de mano
        soft = smooth(pos, win=27)       # el ancla de la etiqueta: viaja con el reloj pero sin vibrar
        tracks[pt["id"]] = [[round(x / SCALE), round(y / SCALE)] for x, y in sm]
        tracks[pt["id"] + "@soft"] = [[round(x / SCALE), round(y / SCALE)] for x, y in soft]
        d = np.linalg.norm(sm[-1] - sm[f0])
        print(f"{clip} · {pt['id']}: {n} frames · desplazamiento total {d / SCALE:.0f} px (clip) · inicio {tracks[pt['id']][f0]} fin {tracks[pt['id']][-1]}")

out = STUDIO / "src/compositions/proyectos" / SLUG / "callouts.ts"
out.write_text("// GENERADO por 07-montaje/track_points.py (flujo óptico LK sobre los clips de b-roll). No editar a mano.\n"
               f"export const TRACKS: Record<string, [number, number][]> = {json.dumps(tracks)};\n")
(P / "03-beats/tracks.json").write_text(json.dumps(tracks))
print("→", out)
