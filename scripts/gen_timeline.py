#!/usr/bin/env python3
"""gen_timeline.py — PLAN DIRECTOR de un reel Clocks BCN (plantilla de la skill clocks-reel).

Copiar a <proyecto>/07-montaje/, rellenar BEATS con las palabras y tiempos del vídeo nuevo y ejecutar
con el slug. El ejemplo que queda abajo es el del Tudor Oyster Prince (11-sep-2026).

v2 (feedback de Jan, 11-sep tarde): palabras clave centradas y por detrás de la cabeza
(matte), Roger a pantalla completa con foco, callouts que persiguen el reloj (tracking),
díptico de referencia para correa/brazalete, cajita de seguir y la web en un móvil.

Fuente única de tiempos. Beats en segundos de la TOMA ORIGINAL (toma-A.words.json),
remapeados con 01-tomas/toma-A-final.cuts.json. Genera timeline.ts, plan-director.{json,md},
06-audio/{sfx,music}-plan.json y 02-transcripciones/final.words.json.
"""
import json, sys
from pathlib import Path

FPS = 30
import os
SLUG = os.environ.get("CLOCKS_SLUG") or (sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("-") else None)
if not SLUG:
    raise SystemExit("falta el slug: CLOCKS_SLUG=<slug> o primer argumento")
WS = Path(os.environ.get("JAN_WORKSPACE", str(Path.home() / "Desktop/jan-workspace")))
P = WS / "negocios/contenido/proyectos-video" / SLUG
STUDIO = WS / "negocios/contenido/remotion-studio"
F = lambda s: int(round(s * FPS))

words_src = json.load(open(P / "02-transcripciones/toma-A.words.json"))["words"]
cuts = sorted(json.load(open(P / "01-tomas/toma-A-final.cuts.json"))["cuts"])
cuts_q = [(round(a * FPS) / FPS, round(b * FPS) / FPS) for a, b in cuts]


def to_final(t: float) -> float:
    removed = 0.0
    for a, b in cuts_q:
        if b <= t:
            removed += b - a
        elif a < t < b:
            removed += t - a
    return t - removed


TOTAL_SRC = float(os.environ.get("TAKE_DURATION_S", "67.774"))  # duración de la toma ORIGINAL (ffprobe); TAKE_DURATION_S en el entorno
SRC_SCALE = 0.75  # b-roll 4K → 1620×2880
TAKE_LEN = to_final(TOTAL_SRC)

GLOSS = {"Primes,": "Prince,", "Primes": "Prince"}
words = []
for w in words_src:
    t0, t1 = to_final(w["start"]), to_final(w["end"])
    if t1 - t0 < 0.02:
        t1 = t0 + 0.05
    words.append({"word": GLOSS.get(w["word"], w["word"]), "start": round(t0, 3), "end": round(t1, 3)})
for i in range(len(words) - 2):
    if words[i]["word"] == "la" and words[i + 1]["word"] == "de" and words[i + 2]["word"].startswith("movimiento"):
        words[i]["word"] = "el"
        words[i + 1]["word"] = ""


def wstart(text: str, near: float) -> float:
    best = None
    for w in words_src:
        if w["word"].strip(".,¿?¡!").lower() == text.lower():
            if best is None or abs(w["start"] - near) < abs(best["start"] - near):
                best = w
    if best is None:
        raise SystemExit(f"palabra no encontrada: {text} ~{near}")
    return best["start"]


def W(text, near):
    return (text.upper(), wstart(text, near))


REF = "referencias/"
# ═══════════════════════════ PLAN DIRECTOR (tiempos ORIGINALES) ═══════════════════════════
# ▼▼▼ RELLENAR PARA CADA VÍDEO: es el ejemplo del Tudor. Reglas en SKILL.md §F5. ▼▼▼
BEATS = [
    dict(id="b01", block="hook", t=[1.30, 3.00], text="¿Has visto nunca la serie de Mad Men?", visual="take",
         take=dict(zbase=1.06, origin="50% 30%", punches=[(wstart("Mad", 2.5), 0.06)]),
         center=[dict(words=[W("Mad", 2.5), W("Men", 2.7)], out=wstart("Roger", 4.1), tone="ink", size=190, cy=330, lines=[])],
         matte=dict(src="video/matte-madmen.mov", start_final=0.85),
         events={"hook-open": 1.30, "kw-madmen": wstart("Mad", 2.5)}),
    dict(id="b02", block="hook", t=[3.00, 6.38], text="Porque si la has visto sabrás que Roger, el actor protagonista, llevaba", visual="take",
         take=dict(zbase=1.06, origin="50% 30%", punches=[]),
         spot=dict(at=wstart("Roger", 4.1), img=REF + "bamf-roger-watch.jpg", iw=3360, ih=1882, focusX=0.64, focusY=0.5,
                   spotX=0.52, spotY=0.36, spotR=540, label="Roger Sterling", source="Mad Men, temporada 5 · AMC"),
         events={"spot-in": wstart("Roger", 4.1)}),
    dict(id="b03", block="hook", t=[6.38, 7.40], text="este reloj de aquí", visual="take",
         take=dict(zbase=1.08, origin="52% 34%", punches=[(wstart("reloj", 6.9), 0.07)]),
         events={"kw-reloj": wstart("reloj", 6.9), "break": 7.40}),
    dict(id="b04", block="pieza", t=[7.40, 12.36], text="y se trata de un Tudor Oyster Prince, uno de los primeros relojes de la línea de Tudor.", visual="broll",
         broll=dict(file="b-full.mp4", from_s=0.6, zoom=1.32, push=0.06, fx=1100, fy=1980, cy=1290),
         center=[dict(words=[W("Tudor", 8.3), W("Oyster", 8.4), ("PRINCE", wstart("Primes", 9.2))], out=None, tone="ink", size=132, cy=500, lines=[1])],
         events={"broll-full": 7.40, "kw-tudor": wstart("Tudor", 8.3), "kw-oyster": wstart("Oyster", 8.4), "kw-prince": wstart("Primes", 9.2)}),
    dict(id="b05", block="pieza", t=[12.36, 14.26], text="En concreto es un reloj de 1956", visual="broll",
         broll=dict(file="b-perfil.mp4", from_s=1.5, zoom=1.2, push=0.05, fx=1150, fy=2300, cy=1300),
         center=[dict(words=[("1956", wstart("1956", 13.3))], out=None, tone="ink", size=200, cy=520, lines=[])],
         events={"broll-perfil": 12.36, "kw-1956": wstart("1956", 13.3)}),
    dict(id="b06", block="pieza", t=[14.26, 17.02], text="y si nos fijamos tiene unos", visual="take",
         take=dict(zbase=1.05, origin="50% 30%", punches=[]), events={}),
    dict(id="b07", block="pieza", t=[17.02, 21.34], text="índices arábigos que lo hacen bastante distintivo.", visual="broll",
         broll=dict(file="b-esfera.mp4", from_s=1.6, zoom=1.3, push=0.05, fx=1080, fy=2180, cy=960),
         tracked=[dict(track="esfera-12", dx=70, dy=-330, label="Índices arábigos", at=wstart("arábigos", 17.5), align="left"),
                  dict(track="esfera-6", dx=-90, dy=330, label="A las 3, 6, 9 y 12", at=wstart("distintivo", 20.2), align="right")],
         events={"broll-esfera": 17.02, "call-indices": wstart("arábigos", 17.5), "call-3-6-9": wstart("distintivo", 20.2)}),
    dict(id="b08", block="estado", t=[21.34, 24.32], text="Si nos fijamos también en la condición del reloj es espectacular, es un reloj que tiene", visual="take",
         take=dict(zbase=1.06, origin="50% 30%", punches=[(wstart("espectacular", 23.0), 0.07)]),
         events={"kw-espectacular": wstart("espectacular", 23.0)}),
    dict(id="b09", block="estado", t=[24.32, 28.36], text="más de 70 años y luce como nuevo.", visual="broll",
         broll=dict(file="b-corona.mp4", from_s=3.0, zoom=1.15, push=0.06, fx=1200, fy=2200, cy=1260),
         center=[dict(words=[W("70", 25.3), W("años", 25.8)], out=None, tone="ink", size=170, cy=520, lines=[])],
         events={"broll-corona-1": 24.32, "kw-70": wstart("70", 25.3)}),
    dict(id="b10", block="brazalete", t=[28.36, 34.64], text="Nosotros no hemos querido poner este brazalete Oysterflex, pero vosotros podéis poner una correa de piel o un brazalete original de Rolex,", visual="take",
         take=dict(zbase=1.06, origin="50% 32%", punches=[(wstart("brazalete", 29.9), 0.05)]),
         diptych=dict(left=dict(img=REF + "ref-correa-piel.jpg", iw=2000, ih=3000, label="Correa de piel", at=wstart("correa", 32.7), focusX=0.5, focusY=0.45),
                      right=dict(img=REF + "ref-brazalete-oyster.jpg", iw=996, ih=1774, label="Brazalete original Rolex", at=wstart("brazalete", 33.5), focusX=0.5, focusY=0.5)),
         events={"kw-brazalete": wstart("brazalete", 29.9), "dip-correa": wstart("correa", 32.7), "dip-brazalete": wstart("brazalete", 33.5)}),
    dict(id="b11", block="rolex", t=[34.64, 39.36], text="porque de hecho este mismo reloj comparte los componentes con los relojes de Rolex.", visual="take",
         take=dict(zbase=1.06, origin="50% 30%", punches=[(wstart("componentes", 36.9), 0.06)]),
         center=[dict(words=[W("componentes", 36.9), W("de", 38.6), W("Rolex", 38.8)], out=None, tone="ink", size=118, cy=520, lines=[1])],
         matte=dict(src="video/matte-componentes.mov", start_final=33.15),
         events={"kw-componentes": wstart("componentes", 36.9), "kw-rolex-2": wstart("Rolex", 38.8)}),
    dict(id="b12", block="rolex", t=[39.36, 42.94], text="Esta caja es una caja Oyster de Rolex, la corona también lo es,", visual="broll",
         broll=dict(file="b-corona.mp4", from_s=2.8, zoom=1.4, push=0.05, fx=1240, fy=1900, cy=960),
         tracked=[dict(track="caja", dx=-330, dy=290, label="Caja Oyster de Rolex", at=wstart("Oyster", 40.2), align="left"),
                  dict(track="corona", dx=-460, dy=-300, label="Corona firmada Rolex", at=wstart("corona", 41.3), align="left")],
         events={"broll-corona-2": 39.36, "call-caja": wstart("Oyster", 40.2), "call-corona": wstart("corona", 41.3)}),
    dict(id="b13", block="rolex", t=[42.94, 46.58], text="y la tapa trasera, si lo vemos, está firmada por Rolex.", visual="take",
         take=dict(zbase=1.06, origin="50% 50%", punches=[(wstart("firmada", 44.5), 0.05)], cap=1.1, src="video/take-tapa.mp4", own_clock=True, mask=False),
         center=[dict(words=[W("tapa", 43.1), W("firmada", 44.5), W("por", 45.0), W("Rolex", 45.3)], out=None, tone="ink", size=118, cy=520, lines=[2])],
         events={"kw-firmada": wstart("firmada", 44.5)}),
    dict(id="b14", block="tudor", t=[46.58, 50.62], text="El único detalle que lo diferencia de un Rolex es la esfera y el movimiento,", visual="take",
         take=dict(zbase=1.06, origin="50% 30%", punches=[(wstart("único", 46.8), 0.06)]),
         events={"kw-unico": wstart("único", 46.8)}),
    dict(id="b15", block="tudor", t=[50.62, 56.74], text="ya que la esfera pone Tudor y estaba hecha por el mismo fabricante de Rolex que era Singer en su momento", visual="broll",
         broll=dict(file="b-esfera.mp4", from_s=3.4, zoom=1.7, push=0.04, fx=1180, fy=2000, cy=960),
         tracked=[dict(track="esfera-tudor", dx=-420, dy=-320, label="Tudor · Oyster Prince 34", at=wstart("Tudor", 52.4), align="left")],
         events={"broll-esfera-2": 50.62, "call-tudor": wstart("Tudor", 52.4), "kw-singer": wstart("Singer", 55.5)}),
    dict(id="b16", block="tudor", t=[56.74, 61.00], text="y el movimiento es de Tudor, no de Rolex, pero es igual de eficiente.", visual="take",
         take=dict(zbase=1.06, origin="50% 30%", punches=[(wstart("eficiente", 60.7), 0.05)]),
         events={"kw-eficiente": wstart("eficiente", 60.7)}),
    dict(id="b17", block="cta", t=[61.00, 65.86], text="Síguenos aquí abajo por si quieres ver más relojes como este y mira nuestra", visual="take",
         take=dict(zbase=1.06, origin="50% 30%", punches=[(wstart("Síguenos", 62.4), 0.06)]),
         follow=dict(at=wstart("Síguenos", 62.4), follow_delay=0.9, out=wstart("mira", 65.5)),
         events={"kw-siguenos": wstart("Síguenos", 62.4), "follow-tap": wstart("Síguenos", 62.4) + 0.9}),
    dict(id="b18", block="cta", t=[65.86, TOTAL_SRC], text="página web que está publicado.", visual="take", tail=2.4,
         take=dict(zbase=1.06, origin="50% 30%", punches=[]),
         web=dict(at=65.86, img=REF + "web-movil.png"),
         events={"web-in": 65.86}),
]

# ═══════════════════════════ REMAPEO ═══════════════════════════
out_beats = []
cursor = 0
for b in BEATS:
    f0 = F(to_final(b["t"][0]))
    f1 = F(to_final(b["t"][1]))
    if b is BEATS[0]:
        f0 = 0
    f0 = max(f0, cursor)
    if b.get("tail"):
        f1 = F(TAKE_LEN + b["tail"])
    ev = {k: F(to_final(v)) for k, v in b.get("events", {}).items()}
    ob = dict(id=b["id"], block=b["block"], from_f=f0, to_f=f1, text=b["text"], visual=b["visual"], events=ev)
    if b["visual"] == "take":
        t = b["take"]
        ob["take"] = dict(src=t.get("src", "video/take.mp4"), src_from_f=(0 if t.get("own_clock") else f0), own_clock=bool(t.get("own_clock")),
                          mask=t.get("mask", True), zbase=t["zbase"], origin=t["origin"], cap=t.get("cap", 1.10),
                          punches=[dict(at=F(to_final(pt)), k=k) for pt, k in t["punches"]])
    if b["visual"] == "broll":
        br = dict(b["broll"])
        br["from_f"] = F(br.pop("from_s"))
        br["fx"] = round(br["fx"] * SRC_SCALE)
        br["fy"] = round(br["fy"] * SRC_SCALE)
        br["iw"], br["ih"] = 1620, 2880
        ob["broll"] = br
    ob["center"] = [dict(words=[w for w, _ in c["words"]], wordsAt=[F(to_final(t)) for _, t in c["words"]],
                         out=(F(to_final(c["out"])) if c.get("out") else None), tone=c["tone"], size=c["size"], cy=c["cy"], lines=c["lines"])
                    for c in b.get("center", [])]
    ob["tracked"] = [dict(track=c["track"], dx=c["dx"], dy=c["dy"], label=c["label"], at=F(to_final(c["at"])),
                          out=(F(to_final(c["out"])) if c.get("out") else None), align=c["align"]) for c in b.get("tracked", [])]
    if b.get("matte"):
        ob["matte"] = dict(src=b["matte"]["src"], from_f=F(b["matte"]["start_final"]))
    if b.get("spot"):
        sp = dict(b["spot"])
        sp["at_f"] = F(to_final(sp.pop("at")))
        ob["spot"] = sp
    if b.get("diptych"):
        d = b["diptych"]
        ob["diptych"] = dict(left=dict(d["left"], at=F(to_final(d["left"]["at"]))), right=dict(d["right"], at=F(to_final(d["right"]["at"]))))
    if b.get("follow"):
        fo = b["follow"]
        ob["follow"] = dict(at=F(to_final(fo["at"])), followAt=F(to_final(fo["at"]) + fo["follow_delay"]), out=F(to_final(fo["out"])))
    if b.get("web"):
        ob["web"] = dict(at=F(to_final(b["web"]["at"])), img=b["web"]["img"])
    out_beats.append(ob)
    cursor = f1
TOTAL = out_beats[-1]["to_f"]

# ── subtítulos ──
caps = []
chunk = []
for w in words:
    if not w["word"]:
        continue
    chunk.append(w)
    if len(chunk) >= 4 or w["word"].endswith((".", ",", "?", "!")):
        caps.append(chunk)
        chunk = []
if chunk:
    caps.append(chunk)
CAPTIONS = []
for i, ch in enumerate(caps):
    f0 = F(ch[0]["start"])
    f1 = F(caps[i + 1][0]["start"]) if i + 1 < len(caps) else F(ch[-1]["end"] + 0.4)
    f1 = min(f1, F(ch[-1]["end"] + 0.9))
    CAPTIONS.append(dict(from_f=f0, to_f=max(f1, f0 + 8), text=" ".join(w["word"] for w in ch)))

# ═══════════════════════════ AUDIO ═══════════════════════════
BREAK = to_final(7.40)
tail_s = TOTAL / FPS
music_plan = {
    "_doc": "A Little More Shine to That (Auxjack, 72 bpm, Epidemic). HOOK_IN skip 0 desde 0:00; el romper del track (11.3 s, +16.9 dB) cae en el break del hook; cuerpo contiguo un punto por debajo. Ducking suave y ancho (ref 11, LEY 4: un escalón por debajo).",
    "ducking": {"voz": [0.07], "huecos": [0.10], "attack_s": 0.5, "release_s": 0.8},
    "tracks": [
        {"id": "HOOK_IN", "file": "shine-72.mp3", "titulo": "Shine — entrada natural bajo el hook", "from": 0.0, "to": round(BREAK, 3), "skip": 0.0, "gain": 1.6, "vol": 0.11},
        {"id": "HOOK_DROP", "file": "shine-72.mp3", "titulo": "Shine — el drop entra con el reloj y sigue contiguo", "from": round(BREAK + 0.26, 3), "to": round(tail_s, 3), "skip": 11.3, "gain": 1.0, "vol": 0.07,
         "boosts": [{"at": round(BREAK + 0.26, 3), "dur": 1.2, "vol": 0.22}, {"at": round(BREAK + 1.46, 3), "dur": 6.0, "vol": 0.11}]},
    ],
}
ev = {}
for b in out_beats:
    for k, v in b["events"].items():
        ev[k] = v / FPS
cues = [
    {"cat": "boom-deep", "at": 0.0, "vol": 0.10},
    {"cat": "swoosh", "at": 0.0, "vol": 0.16},
    {"cat": "snap", "at": ev["kw-madmen"], "vol": 0.22},
    {"cat": "swoosh-deep", "at": ev["spot-in"] - 0.05, "vol": 0.15},
    {"cat": "shimmer", "at": ev["spot-in"] + 0.30, "vol": 0.09},
    {"cat": "riser", "at": max(0.0, ev["break"] - 1.4), "vol": 0.16, "cut_at": ev["break"]},
    {"cat": "sub-drop", "at": ev["break"], "vol": 0.24},
    {"cat": "swoosh-deep", "at": ev["break"] + 0.20, "vol": 0.16},
    {"cat": "click-soft", "at": ev["kw-tudor"], "vol": 0.10},
    {"cat": "click-soft", "at": ev["kw-oyster"], "vol": 0.09},
    {"cat": "snap", "at": ev["kw-prince"], "vol": 0.16},
    {"cat": "swoosh", "at": ev["broll-perfil"], "vol": 0.11},
    {"cat": "snap", "at": ev["kw-1956"], "vol": 0.18},
    {"cat": "swoosh", "at": ev["broll-esfera"], "vol": 0.11},
    {"cat": "click-soft", "at": ev["call-indices"], "vol": 0.09},
    {"cat": "click-soft", "at": ev["call-3-6-9"], "vol": 0.09},
    {"cat": "swoosh", "at": ev["broll-corona-1"], "vol": 0.11},
    {"cat": "snap", "at": ev["kw-70"], "vol": 0.18},
    {"cat": "swoosh", "at": ev["dip-correa"], "vol": 0.13},
    {"cat": "swoosh", "at": ev["dip-brazalete"], "vol": 0.13},
    {"cat": "click-soft", "at": ev["kw-componentes"], "vol": 0.10},
    {"cat": "snap", "at": ev["kw-rolex-2"], "vol": 0.16},
    {"cat": "swoosh", "at": ev["broll-corona-2"], "vol": 0.11},
    {"cat": "click-soft", "at": ev["call-caja"], "vol": 0.09},
    {"cat": "click-soft", "at": ev["call-corona"], "vol": 0.09},
    {"cat": "snap", "at": ev["kw-firmada"], "vol": 0.16},
    {"cat": "swoosh", "at": ev["broll-esfera-2"], "vol": 0.11},
    {"cat": "click-soft", "at": ev["call-tudor"], "vol": 0.09},
    {"cat": "pop", "at": ev["kw-siguenos"], "vol": 0.12},
    {"cat": "click", "at": ev["follow-tap"], "vol": 0.12},
    {"cat": "swoosh-deep", "at": ev["web-in"], "vol": 0.15},
]
for c in cues:
    c["at"] = round(c["at"], 3)
    if "cut_at" in c:
        c["cut_at"] = round(c["cut_at"], 3)
sfx_plan = {"_doc": "Cues derivados de los eventos del plan (una sola fuente de tiempos). Volúmenes un escalón por debajo (LEY 4).", "cues": cues}

# ═══════════════════════════ SALIDAS ═══════════════════════════
(P / "02-transcripciones/final.words.json").write_text(json.dumps({"text": " ".join(w["word"] for w in words if w["word"]), "words": [w for w in words if w["word"]]}, ensure_ascii=False, indent=1))
(P / "06-audio/music-plan.json").write_text(json.dumps(music_plan, ensure_ascii=False, indent=1))
(P / "06-audio/sfx-plan.json").write_text(json.dumps(sfx_plan, ensure_ascii=False, indent=1))
plan = {"project": SLUG, "format": "clocks-reel-v2", "fps": FPS, "resolution": [1080, 1920], "take_len_s": round(TAKE_LEN, 3), "total_frames": TOTAL,
        "cuts_applied": len(cuts), "beats": out_beats, "captions": CAPTIONS}
(P / "04-plan-director/plan-director.json").write_text(json.dumps(plan, ensure_ascii=False, indent=1))

ts = ["// GENERADO por 07-montaje/gen_timeline.py (v2). No editar a mano.",
      f"export const FPS = {FPS};", f"export const TOTAL_FRAMES = {TOTAL};", f"export const TAKE_LEN_F = {F(TAKE_LEN)};",
      "export type Punch = {at:number; k:number};",
      "export type CenterT = {words:string[]; wordsAt:number[]; out:number|null; tone:'paper'|'ink'; size:number; cy:number; lines:number[]};",
      "export type TrackedT = {track:string; dx:number; dy:number; label:string; at:number; out:number|null; align:'left'|'right'};",
      "export type Beat = {id:string; block:string; from_f:number; to_f:number; text:string; visual:'take'|'broll'; events:Record<string,number>;",
      "  take?:{src:string; src_from_f:number; own_clock:boolean; mask:boolean; zbase:number; origin:string; cap:number; punches:Punch[]};",
      "  broll?:{file:string; from_f:number; zoom:number; push:number; fx:number; fy:number; iw:number; ih:number; cy:number};",
      "  matte?:{src:string; from_f:number};",
      "  spot?:{at_f:number; img:string; iw:number; ih:number; focusX:number; focusY:number; spotX:number; spotY:number; spotR:number; label:string; source:string};",
      "  diptych?:{left:{img:string; iw:number; ih:number; label:string; at:number; focusX:number; focusY:number}; right:{img:string; iw:number; ih:number; label:string; at:number; focusX:number; focusY:number}};",
      "  follow?:{at:number; followAt:number; out:number};",
      "  web?:{at:number; img:string};",
      "  center:CenterT[]; tracked:TrackedT[]};",
      f"export const BEATS: Beat[] = {json.dumps(out_beats, ensure_ascii=False)};",
      f"export const CAPTIONS: {{from_f:number; to_f:number; text:string}}[] = {json.dumps(CAPTIONS, ensure_ascii=False)};",
      "export const B = (id: string): Beat => { const b = BEATS.find((x) => x.id === id); if (!b) throw new Error('beat ' + id); return b; };"]
(STUDIO / "src/compositions/proyectos" / SLUG / "timeline.ts").write_text("\n".join(ts) + "\n")

md = [f"# Plan director v2 · Clocks BCN · Tudor Oyster Prince ({SLUG})", "",
      f"Toma apretada: {TAKE_LEN:.2f} s ({len(cuts)} cortes) · total {TOTAL/FPS:.2f} s · 1080×1920 @30", "",
      "| # | t final | visual | qué se ve | texto / callout | sfx |", "|---|---|---|---|---|---|"]
for b in out_beats:
    what = b.get("broll", {}).get("file", "") or (b["take"]["src"] + (" (matte)" if b.get("matte") else ""))
    extra = []
    if b.get("spot"): extra.append("Roger a pantalla completa con foco")
    if b.get("diptych"): extra.append("díptico correa / brazalete")
    if b.get("follow"): extra.append("cajita de seguir")
    if b.get("web"): extra.append("web en móvil")
    tt = " · ".join(" ".join(c["words"]) + "." for c in b["center"]) + (" · " if b["center"] and b["tracked"] else "") + " · ".join("↗ " + c["label"] for c in b["tracked"])
    sf = ", ".join(sorted({c["cat"] for c in cues if b["from_f"] / FPS - 0.05 <= c["at"] < b["to_f"] / FPS}))
    md.append(f"| {b['id']} | {b['from_f']/FPS:.2f}–{b['to_f']/FPS:.2f} | {b['visual']} | {what}{(' + ' + ', '.join(extra)) if extra else ''} | {tt} | {sf} |")
(P / "04-plan-director/plan-director.md").write_text("\n".join(md) + "\n")
print(f"timeline v2: {TOTAL} f ({TOTAL/FPS:.2f} s) · {len(out_beats)} beats · {len(CAPTIONS)} subtítulos · {len(cues)} cues · break {BREAK:.2f}s")
for b in out_beats:
    print(f"  {b['id']} {b['from_f']:4d}-{b['to_f']:4d} {b['visual']:5s} {b['text'][:52]}")
