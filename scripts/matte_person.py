#!/usr/bin/env python3
"""matte_person.py — matte del presentador SOLO persona (MediaPipe selfie segmentation),
sin la silla ni la mesa que rembg arrastraba. Escribe un ProRes 4444 con alpha para Remotion.
Uso: matte_person.py <take.mp4> <out.mov> <start_s> <end_s>"""
import sys, subprocess, tempfile
from pathlib import Path
import cv2, numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mptasks
from mediapipe.tasks.python import vision

src, out, t0, t1 = Path(sys.argv[1]), Path(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
FPS = 30
f0, f1 = round(t0 * FPS), round(t1 * FPS)
cap = cv2.VideoCapture(str(src))
cap.set(cv2.CAP_PROP_POS_FRAMES, f0)
MODEL = str(Path(__file__).resolve().parent.parent / "models/selfie_multiclass_256x256.tflite")
seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(base_options=mptasks.BaseOptions(model_asset_path=MODEL), running_mode=vision.RunningMode.IMAGE, output_category_mask=False, output_confidence_masks=True))
# clases del modelo multiclass: 0 fondo, 1 pelo, 2 piel cuerpo, 3 piel cara, 4 ropa, 5 accesorios
tmp = Path(tempfile.mkdtemp())
prev = None
n = 0
for i in range(f0, f1):
    ok, fr = cap.read()
    if not ok:
        break
    rgb = cv2.cvtColor(fr, cv2.COLOR_BGR2RGB)
    res = seg.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
    cm = [c.numpy_view() for c in res.confidence_masks]
    m = np.clip(cm[1] + cm[2] + cm[3] + cm[4] + cm[5], 0, 1)  # persona = todo menos fondo
    m = cv2.resize(m, (fr.shape[1], fr.shape[0]), interpolation=cv2.INTER_LINEAR)
    # suavizado temporal (media con el frame anterior) + bordes limpios
    if prev is not None:
        m = 0.65 * m + 0.35 * prev
    prev = m
    a = np.clip((m - 0.35) / 0.3, 0, 1)  # umbral suave
    a = cv2.GaussianBlur(a, (0, 0), 1.2)
    alpha = (a * 255).astype(np.uint8)
    bgra = cv2.cvtColor(fr, cv2.COLOR_BGR2BGRA)
    bgra[..., 3] = alpha
    cv2.imwrite(str(tmp / f"m{n:05d}.png"), bgra)
    n += 1
subprocess.run(["ffmpeg", "-y", "-v", "error", "-framerate", str(FPS), "-i", str(tmp / "m%05d.png"), "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", str(out)], check=True)
print(f"✅ {out.name}: {n} frames ({t0}-{t1} s)")
