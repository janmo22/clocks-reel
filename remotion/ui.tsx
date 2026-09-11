/* CLOCKS BCN · kit visual de los reels (skill clocks-reel, nacido del Tudor Oyster Prince del 11-sep-2026)
 * Identidad Clocks BCN (sistema Grafik + heist-out cerrado por Jan el 11-sep):
 *   una sola grotesk (Inter), titulares en mayúsculas con punto final, líneas
 *   finas de 1 px como estructura, paleta ink / bone / paper sin color de acento.
 * Todo determinista por frame. Sin CSS transitions, sin springs, sin pops. */
import React from "react";
import {Easing, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame} from "remotion";
import {continueRender, delayRender} from "remotion";
import {INTER_WOFF2_DATA_URI} from "./interFont";
import {SIGN_TRACK} from "./signTrack";
import {TRACKS} from "./callouts";

export const W = 1080;
export const H = 1920;
export const FPS = 30;
export const BASE = "proyectos/__SLUG__/";
export const CLAMP = {extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const};
export const OUT = Easing.out(Easing.cubic);
export const INOUT = Easing.inOut(Easing.cubic);
export const F = (s: number) => Math.round(s * FPS);

export const C = {
  ink: "#000000",
  bone: "#F0EEEB",
  paper: "#FFFFFF",
  grey: "#6F6B66",
  line: "rgba(0,0,0,0.9)",
};
export const FONT = `"Inter", "Helvetica Neue", Arial, sans-serif`;
export const MARGIN = 62; // margen heist-out
export const CAPTION_Y = 1230; // subtítulo a la altura del pecho, no abajo del todo (regla Jan)

let loaded = false;
export const loadProjectFonts = () => {
  if (loaded) return;
  loaded = true;
  // Solo Inter (variable 400-900) y desde un data URI: sin petición de red, el FontFace resuelve al instante.
  // Guardia: si algo fallara, se continúa igualmente a los 12 s en vez de colgar el render.
  if (typeof document === "undefined" || typeof FontFace === "undefined") return;
  const handle = delayRender("Inter data URI");
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    continueRender(handle);
  };
  try {
    const face = new FontFace("Inter", `url(${INTER_WOFF2_DATA_URI})`, {weight: "400 900", style: "normal"});
    face
      .load()
      .then((f) => {
        document.fonts.add(f);
        finish();
      })
      .catch(finish);
  } catch {
    finish();
  }
  setTimeout(finish, 12000);
};

export type Tone = "paper" | "ink"; // paper = texto blanco (sobre la toma), ink = texto negro (sobre el fondo blanco del b-roll)

/* ─────────────────────────── PUNCH push+hold (spec canónica, ref 07) ─────────────────────────── */
export type Punch = {at: number; k: number};
export const punchAt = (f: number, punches: Punch[]): number => {
  let z = 1;
  for (const p of punches) {
    const start = p.at - 4;
    z *= 1 + p.k * interpolate(f, [start, start + 10], [0, 1], {...CLAMP, easing: OUT});
  }
  return z;
};

/* Cartel naranja del local de enfrente: la cámara va en mano, así que su caja viene rastreada
 * frame a frame (signTrack.ts, píxeles del vídeo a 1080×1920). `signBox(frameDeLaToma)` devuelve
 * la caja con margen para el parche de desenfoque. */
export const signBox = (takeFrame: number, margin = 46): {x: number; y: number; w: number; h: number} => {
  const i = Math.min(SIGN_TRACK.length - 1, Math.max(0, takeFrame));
  const [x0, y0, x1, y1] = SIGN_TRACK[i];
  // el rótulo negro «Busquets Gálvez» cuelga a la izquierda del cartel: margen extra por ese lado
  return {x: x0 - margin - 70, y: y0 - margin, w: x1 - x0 + margin * 2 + 70, h: y1 - y0 + margin * 2};
};

/* ─────────────────────────── TOMA (presentador) ───────────────────────────
 * Vídeo 1080×1920 (proxy) o 2160×3840 (4K): siempre a cover del lienzo.
 * Deriva constante hacia dentro (LEY 3): 1.0 → zbase durante el plano, reset en cada corte.
 * Punches push+hold multiplicados encima. Cap total 1.10 salvo `cap` explícito para un detalle 4K. */
export const Take: React.FC<{
  src: string;
  from: number; // frame de la fuente en el que empieza este plano
  dur: number; // duración del plano en frames
  zbase?: number;
  punches?: Punch[];
  origin?: string;
  cap?: number;
  grade?: boolean;
  mask?: boolean;
  zfrom?: number; // encuadre inicial (1 = plano entero; un detalle 4K arranca ya cerrado)
}> = ({src, from, dur, zbase = 1.05, punches = [], origin = "50% 30%", cap = 1.1, grade = true, mask = true, zfrom = 1}) => {
  const f = useCurrentFrame();
  const box = mask ? signBox(from + f) : null;
  const drift = interpolate(f, [0, Math.max(1, dur)], [zfrom, zbase], {...CLAMP, easing: Easing.inOut(Easing.quad)});
  const z = Math.min(cap, drift * punchAt(f, punches));
  return (
    <div style={{position: "absolute", inset: 0, overflow: "hidden", background: "#0a0a0a"}}>
      <div style={{position: "absolute", inset: 0, transform: `scale(${z})`, transformOrigin: origin}}>
        <OffthreadVideo
          src={staticFile(src)}
          trimBefore={from}
          muted
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: W,
            height: H,
            objectFit: "cover",
            filter: grade ? "contrast(1.05) saturate(0.9) brightness(0.985)" : undefined,
          }}
        />
        {box ? (
          /* cartel «local en alquiler» del edificio de enfrente: fuera de foco y sin color, como si la óptica lo dejara atrás */
          <div
            style={{
              position: "absolute",
              left: box.x,
              top: box.y,
              width: box.w,
              height: box.h,
              backdropFilter: "blur(20px) saturate(0.1) brightness(1.06)",
              WebkitBackdropFilter: "blur(20px) saturate(0.1) brightness(1.06)",
              maskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 62%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 62%, transparent 100%)",
            }}
          />
        ) : null}
      </div>
      {grade ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: "radial-gradient(ellipse 95% 75% at 50% 42%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.28) 100%)",
          }}
        />
      ) : null}
    </div>
  );
};

/* ─────────────────────────── B-ROLL 4K (el reloj) ───────────────────────────
 * Fuente 2160×3840. Se coloca a ancho del lienzo (×0.5) y se amplía `zoom` sobre
 * un punto de foco (fx, fy en píxeles de la fuente). Empuje lento durante el plano. */
export const Broll: React.FC<{
  src: string;
  from?: number;
  dur: number;
  zoom?: number;
  push?: number;
  fx?: number;
  fy?: number;
  iw?: number;
  ih?: number;
  cy?: number; // dónde cae el punto de foco en el lienzo (por defecto el centro)
  children?: React.ReactNode;
}> = ({src, from = 0, dur, zoom = 1, push = 0.05, fx = 1080, fy = 1920, iw = 2160, ih = 3840, cy = H / 2, children}) => {
  const f = useCurrentFrame();
  const k = W / iw;
  const z = k * zoom * interpolate(f, [0, Math.max(1, dur)], [1, 1 + push], {...CLAMP, easing: Easing.linear});
  let tx = W / 2 - fx * z;
  let ty = cy - fy * z;
  tx = Math.min(0, Math.max(W - iw * z, tx));
  ty = Math.min(0, Math.max(H - ih * z, ty));
  return (
    <div style={{position: "absolute", inset: 0, overflow: "hidden", background: C.paper}}>
      <div style={{position: "absolute", left: 0, top: 0, width: iw, height: ih, transform: `translate(${tx}px, ${ty}px) scale(${z})`, transformOrigin: "0 0"}}>
        <OffthreadVideo src={staticFile(src)} trimBefore={from} muted style={{width: iw, height: ih, display: "block"}} />
        {children}
      </div>
    </div>
  );
};

/* Convierte un punto de la fuente 4K a coordenadas del lienzo para un Broll dado (mismo cálculo). */
export const brollPoint = (
  f: number,
  p: {sx: number; sy: number},
  cfg: {dur: number; zoom?: number; push?: number; fx?: number; fy?: number; iw?: number; ih?: number; cy?: number},
): {x: number; y: number} => {
  const {dur, zoom = 1, push = 0.05, fx = 1080, fy = 1920, iw = 2160, ih = 3840, cy = H / 2} = cfg;
  const k = W / iw;
  const z = k * zoom * interpolate(f, [0, Math.max(1, dur)], [1, 1 + push], {...CLAMP, easing: Easing.linear});
  let tx = W / 2 - fx * z;
  let ty = cy - fy * z;
  tx = Math.min(0, Math.max(W - iw * z, tx));
  ty = Math.min(0, Math.max(H - ih * z, ty));
  return {x: tx + p.sx * z, y: ty + p.sy * z};
};

/* ─────────────────────────── MATTE del presentador (rembg → webm con alpha) ───────────────────────────
 * Se apila ENCIMA del titular centrado con el mismo transform que la toma (mismo zoom y origen),
 * para que la cabeza tape el texto (LEY 1). `from` = frame de la toma en el que empieza el webm. */
export const Matte: React.FC<{src: string; webmFrom: number; takeFrom: number; shotFrom: number; dur: number; zbase: number; origin: string; punches?: Punch[]; cap?: number; zfrom?: number}> = ({
  src,
  webmFrom,
  takeFrom,
  shotFrom,
  dur,
  zbase,
  origin,
  punches = [],
  cap = 1.1,
  zfrom = 1,
}) => {
  const f = useCurrentFrame(); // frame local de esta Sequence (arranca en takeFrom)
  const shotF = f + (takeFrom - shotFrom); // frame dentro del plano, para replicar su zoom
  const drift = interpolate(shotF, [0, Math.max(1, dur)], [zfrom, zbase], {...CLAMP, easing: Easing.inOut(Easing.quad)});
  const z = Math.min(cap, drift * punchAt(shotF, punches));
  const offset = takeFrom - webmFrom; // frames del webm que hay que saltar
  return (
    <div style={{position: "absolute", inset: 0, transform: `scale(${z})`, transformOrigin: origin, pointerEvents: "none"}}>
      <OffthreadVideo src={staticFile(src)} trimBefore={offset > 0 ? offset : 0} muted transparent style={{position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover"}} />
    </div>
  );
};

/* ─────────────────────────── TITULAR CENTRADO (palabra a palabra) ───────────────────────────
 * Inter 700, mayúsculas, punto final, centrado en el lienzo a la altura `cy`. Cada palabra aparece
 * en su word-timestamp (`wordsAt`), en seco (opacity 0→1 en 3 f), sin springs. */
export const CenterTitle: React.FC<{
  words: string[];
  wordsAt: number[];
  outAt?: number;
  tone?: Tone;
  size?: number;
  cy?: number;
  maxWidth?: number;
  lines?: number[]; // índices de palabra donde empieza una línea nueva
}> = ({words, wordsAt, outAt, tone = "paper", size = 150, cy = 560, maxWidth = 960, lines = []}) => {
  const f = useCurrentFrame();
  if (f < wordsAt[0]) return null;
  const outP = outAt !== undefined ? interpolate(f, [outAt, outAt + 6], [1, 0], CLAMP) : 1;
  if (outP <= 0) return null;
  const color = tone === "paper" ? C.paper : C.ink;
  const rows: string[][] = [[]];
  const rowsAt: number[][] = [[]];
  words.forEach((w, i) => {
    if (lines.includes(i) && i > 0) {
      rows.push([]);
      rowsAt.push([]);
    }
    rows[rows.length - 1].push(i === words.length - 1 && !/[.!?]$/.test(w) ? `${w}.` : w);
    rowsAt[rowsAt.length - 1].push(wordsAt[Math.min(i, wordsAt.length - 1)]);
  });
  return (
    <div style={{position: "absolute", left: 0, right: 0, top: cy, transform: "translateY(-50%)", textAlign: "center", pointerEvents: "none", opacity: outP}}>
      {rows.map((row, r) => (
        <div key={r} style={{fontFamily: FONT, fontWeight: 700, fontSize: size, lineHeight: 0.95, letterSpacing: -size * 0.03, textTransform: "uppercase", color, maxWidth, margin: "0 auto", whiteSpace: "nowrap", textShadow: tone === "paper" ? "0 2px 10px rgba(0,0,0,0.25)" : "none"}}>
          {row.map((w, i) => (
            <span key={i} style={{opacity: interpolate(f, [rowsAt[r][i], rowsAt[r][i] + 3], [0, 1], CLAMP), marginRight: i < row.length - 1 ? size * 0.22 : 0}}>
              {w}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────── CALLOUT RASTREADO ───────────────────────────
 * El punto sigue el reloj (TRACKS del flujo óptico, píxeles del clip) y la etiqueta viaja con él a
 * un desfase fijo `dx, dy` (px lienzo). Línea de 1.5 px, punto pequeño, etiqueta en versalitas. */
export const TrackedCallout: React.FC<{
  trackId: string;
  clipFrame: number; // frame del clip en este instante
  cfg: {dur: number; zoom?: number; push?: number; fx?: number; fy?: number; iw?: number; ih?: number; cy?: number};
  dx: number;
  dy: number;
  label: string;
  at: number;
  outAt?: number;
  tone?: Tone;
  align?: "left" | "right";
}> = ({trackId, clipFrame, cfg, dx, dy, label, at, outAt, tone = "ink", align = "left"}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const outP = outAt !== undefined ? interpolate(f, [outAt, outAt + 6], [1, 0], CLAMP) : 1;
  if (outP <= 0) return null;
  const tr = TRACKS[trackId];
  const soft = TRACKS[trackId + "@soft"] ?? tr;
  const i = Math.min(tr.length - 1, Math.max(0, clipFrame));
  const [sx, sy] = tr[i];
  const [ax, ay] = soft[i];
  const p = brollPoint(f, {sx, sy}, cfg);
  const a = brollPoint(f, {sx: ax, sy: ay}, cfg);
  const est = label.length * 19 + 70; // ancho estimado de la etiqueta + cola
  const lx = align === "left" ? Math.min(W - est - 40, Math.max(60, a.x + dx)) : Math.min(W - 60, Math.max(est + 40, a.x + dx));
  const ly = Math.min(H - 200, Math.max(120, a.y + dy));
  const color = tone === "ink" ? C.ink : C.paper;
  const draw = interpolate(f, [at, at + 12], [0, 1], {...CLAMP, easing: OUT});
  const dot = interpolate(f, [at, at + 5], [0, 1], {...CLAMP, easing: OUT});
  const lab = interpolate(f, [at + 9, at + 15], [0, 1], CLAMP);
  const ex = p.x + (lx - p.x) * draw;
  const ey = p.y + (ly - p.y) * draw;
  const tail = 64 * interpolate(f, [at + 9, at + 16], [0, 1], {...CLAMP, easing: OUT});
  return (
    <div style={{position: "absolute", inset: 0, pointerEvents: "none", opacity: outP}}>
      <svg width={W} height={H} style={{position: "absolute", left: 0, top: 0}}>
        <circle cx={p.x} cy={p.y} r={8 * dot} fill="none" stroke={color} strokeWidth={1.5} />
        <circle cx={p.x} cy={p.y} r={2.5 * dot} fill={color} />
        <line x1={p.x} y1={p.y} x2={ex} y2={ey} stroke={color} strokeWidth={1.5} />
        <line x1={lx} y1={ly} x2={align === "left" ? lx + tail : lx - tail} y2={ly} stroke={color} strokeWidth={1.5} />
      </svg>
      <div
        style={{
          position: "absolute",
          left: align === "left" ? lx : "auto",
          right: align === "left" ? "auto" : W - lx,
          top: ly - 40,
          fontFamily: FONT,
          fontWeight: 500,
          fontSize: 26,
          letterSpacing: 3.5,
          textTransform: "uppercase",
          color,
          whiteSpace: "nowrap",
          opacity: lab,
        }}
      >
        {label}
      </div>
    </div>
  );
};

/* ─────────────────────────── IMAGEN A PANTALLA COMPLETA CON FOCO ───────────────────────────
 * La imagen cubre el lienzo (recorte centrado en `focus` 0..1) con empuje lento; un velo oscuro se
 * cierra sobre el punto de luz (`spot`) para señalar al personaje. Etiqueta pequeña abajo. */
export const SpotImage: React.FC<{
  img: string;
  iw: number;
  ih: number;
  focusX?: number;
  focusY?: number;
  spotX: number; // 0..1 del lienzo
  spotY: number;
  spotR?: number; // radio del foco en px
  label: string;
  source: string;
  dur: number;
  push?: number;
}> = ({img, iw, ih, focusX = 0.5, focusY = 0.5, spotX, spotY, spotR = 420, label, source, dur, push = 0.10}) => {
  const f = useCurrentFrame();
  const scale = Math.max(W / iw, H / ih) * interpolate(f, [0, Math.max(1, dur)], [1, 1 + push], {...CLAMP, easing: Easing.linear});
  const dw = iw * scale;
  const dh = ih * scale;
  const ox = Math.min(0, Math.max(W - dw, -(dw - W) * focusX));
  const oy = Math.min(0, Math.max(H - dh, -(dh - H) * focusY));
  const fade = interpolate(f, [0, 6], [0, 1], CLAMP);
  // el velo se cierra: de un radio enorme (todo iluminado) al foco, en 22 f desde el frame 8
  const r = interpolate(f, [8, 30], [1600, spotR], {...CLAMP, easing: INOUT});
  const veil = interpolate(f, [8, 30], [0, 0.62], {...CLAMP, easing: INOUT});
  const lab = interpolate(f, [26, 34], [0, 1], CLAMP);
  return (
    <div style={{position: "absolute", inset: 0, overflow: "hidden", background: C.ink, opacity: fade}}>
      <Img src={staticFile(img)} style={{position: "absolute", left: ox, top: oy, width: dw, height: dh, display: "block"}} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle ${r}px at ${spotX * 100}% ${spotY * 100}%, rgba(0,0,0,0) 55%, rgba(0,0,0,${veil}) 100%)`,
        }}
      />
      <div style={{position: "absolute", left: 0, right: 0, bottom: 300, textAlign: "center", opacity: lab, fontFamily: FONT, color: C.paper}}>
        <div style={{fontSize: 30, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", textShadow: "0 2px 12px rgba(0,0,0,0.6)"}}>{label}</div>
        <div style={{marginTop: 8, fontSize: 19, fontWeight: 400, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(255,255,255,0.7)", textShadow: "0 2px 10px rgba(0,0,0,0.6)"}}>{source}</div>
      </div>
    </div>
  );
};

/* ─────────────────────────── DÍPTICO DE REFERENCIA ───────────────────────────
 * Dos fotos a sangre, media pantalla cada una, con etiqueta en versalitas. Cada mitad entra en su
 * palabra deslizándose desde su lado (12 f, ease-out). Fondo: la toma sigue debajo. */
export const Diptych: React.FC<{
  left: {img: string; iw: number; ih: number; label: string; at: number; focusX?: number; focusY?: number};
  right: {img: string; iw: number; ih: number; label: string; at: number; focusX?: number; focusY?: number};
  outAt?: number;
  dur: number;
}> = ({left, right, outAt, dur}) => {
  const f = useCurrentFrame();
  const outP = outAt !== undefined ? interpolate(f, [outAt, outAt + 8], [1, 0], CLAMP) : 1;
  if (outP <= 0) return null;
  const half = W / 2;
  const panel = (p: typeof left, side: "l" | "r") => {
    const enter = interpolate(f, [p.at, p.at + 12], [0, 1], {...CLAMP, easing: OUT});
    if (enter <= 0) return null;
    const scale = Math.max(half / p.iw, H / p.ih) * interpolate(f, [p.at, p.at + dur], [1.04, 1.1], CLAMP);
    const dw = p.iw * scale;
    const dh = p.ih * scale;
    const ox = Math.min(0, Math.max(half - dw, -(dw - half) * (p.focusX ?? 0.5)));
    const oy = Math.min(0, Math.max(H - dh, -(dh - H) * (p.focusY ?? 0.5)));
    const shift = (1 - enter) * half * (side === "l" ? -1 : 1);
    return (
      <div style={{position: "absolute", left: side === "l" ? 0 : half, top: 0, width: half, height: H, overflow: "hidden", transform: `translateX(${shift}px)`, background: C.ink}}>
        <Img src={staticFile(p.img)} style={{position: "absolute", left: ox, top: oy, width: dw, height: dh, display: "block"}} />
        <div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: 420, background: "linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)"}} />
        <div style={{position: "absolute", left: 36, right: 36, bottom: 430, fontFamily: FONT, fontWeight: 700, fontSize: 34, letterSpacing: 2, textTransform: "uppercase", color: C.paper, lineHeight: 1.05, opacity: interpolate(f, [p.at + 8, p.at + 16], [0, 1], CLAMP)}}>{p.label}</div>
      </div>
    );
  };
  return (
    <div style={{position: "absolute", inset: 0, pointerEvents: "none", opacity: outP}}>
      {panel(left, "l")}
      {panel(right, "r")}
      <div style={{position: "absolute", left: half - 1, top: 0, width: 2, height: H, background: C.paper, opacity: interpolate(f, [right.at, right.at + 12], [0, 1], CLAMP)}} />
    </div>
  );
};

/* ─────────────────────────── CAJITA DE SEGUIR (perfil real de Instagram) ───────────────────────────
 * Datos leídos del perfil el 11-sep-2026. Entra deslizándose desde abajo; a los `followAt` f el botón
 * pasa de «Seguir» a «Siguiendo» con una pulsación breve. */
export const FollowCard: React.FC<{at: number; followAt: number; outAt?: number; cy?: number}> = ({at, followAt, outAt, cy = 1180}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const outP = outAt !== undefined ? interpolate(f, [outAt, outAt + 8], [1, 0], CLAMP) : 1;
  if (outP <= 0) return null;
  const enter = interpolate(f, [at, at + 14], [0, 1], {...CLAMP, easing: OUT});
  const pressed = interpolate(f, [followAt - 3, followAt, followAt + 6], [1, 0.96, 1], CLAMP);
  const followed = f >= followAt;
  const cw = 900;
  return (
    <div style={{position: "absolute", left: (W - cw) / 2, width: cw, top: cy, transform: `translate(0, ${(1 - enter) * 60 - 50}%)`, opacity: enter * outP, fontFamily: FONT, color: "#111"}}>
      <div style={{background: "#fff", borderRadius: 28, padding: "30px 34px", boxShadow: "0 30px 70px rgba(0,0,0,0.28), 0 4px 14px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", gap: 26}}>
        <Img src={staticFile(`${BASE}referencias/ig-avatar.png`)} style={{width: 132, height: 132, borderRadius: 999, display: "block", flex: "0 0 auto"}} />
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{display: "flex", alignItems: "center", gap: 10, fontSize: 40, fontWeight: 700, letterSpacing: -0.5}}>
            clocksbcn_
            <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden>
              <path fill="#0095F6" d="M12 1.5l2.4 2.1 3.2-.4.9 3.1 2.8 1.6-1.2 3 1.2 3-2.8 1.6-.9 3.1-3.2-.4L12 22.5l-2.4-2.1-3.2.4-.9-3.1-2.8-1.6 1.2-3-1.2-3 2.8-1.6.9-3.1 3.2.4z" />
              <path fill="#fff" d="M10.3 15.6l-2.9-2.9 1.3-1.3 1.6 1.6 4.3-4.3 1.3 1.3z" />
            </svg>
          </div>
          <div style={{marginTop: 6, fontSize: 26, fontWeight: 400, color: "#444"}}>ClocksBcn | Watch Geeks</div>
          <div style={{marginTop: 8, fontSize: 25, fontWeight: 400, color: "#111"}}>
            <b style={{fontWeight: 700}}>21,2 mil</b> seguidores
          </div>
        </div>
        <div
          style={{
            flex: "0 0 auto",
            transform: `scale(${pressed})`,
            background: followed ? "#EFEFEF" : "#0095F6",
            color: followed ? "#111" : "#fff",
            borderRadius: 14,
            padding: "18px 30px",
            fontSize: 28,
            fontWeight: 600,
          }}
        >
          {followed ? "Siguiendo" : "Seguir"}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────── LA WEB EN UN MÓVIL ───────────────────────────
 * Captura móvil real de clocksbcn.com dentro de un marco de teléfono, subiendo desde abajo. */
export const WebPhone: React.FC<{at: number; img: string; iw: number; ih: number; outAt?: number}> = ({at, img, iw, ih, outAt}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const outP = outAt !== undefined ? interpolate(f, [outAt, outAt + 10], [1, 0], CLAMP) : 1;
  if (outP <= 0) return null;
  const enter = interpolate(f, [at, at + 16], [0, 1], {...CLAMP, easing: OUT});
  const pw = 700;
  const ph = Math.round((pw * ih) / iw);
  const scroll = interpolate(f, [at + 20, at + 140], [0, 0.18], {...CLAMP, easing: Easing.inOut(Easing.quad)});
  return (
    <>
      <div style={{position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", opacity: enter * outP, pointerEvents: "none"}} />
      <div style={{position: "absolute", left: (W - pw) / 2, top: 560 + (1 - enter) * 260, width: pw, height: ph, borderRadius: 54, overflow: "hidden", border: "10px solid #111", boxShadow: "0 40px 90px rgba(0,0,0,0.45)", opacity: enter * outP, background: "#fff"}}>
        <Img src={staticFile(img)} style={{position: "absolute", left: 0, top: -scroll * ph, width: pw, height: ph, display: "block"}} />
      </div>
    </>
  );
};

/* ─────────────────────────── TITULAR heist-out ───────────────────────────
 * Inter 700, mayúsculas, punto final, dos líneas máximo, interlineado 0.95.
 * Entra por barrido de máscara línea a línea (8 f); sale por fundido corto. */
export const Title: React.FC<{
  lines: string[];
  at: number;
  outAt?: number;
  tone?: Tone;
  pos?: "tl" | "bl" | "br" | "tr";
  size?: number;
  scrim?: boolean;
}> = ({lines, at, outAt, tone = "paper", pos = "tl", size = 88, scrim = true}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const outP = outAt !== undefined ? interpolate(f, [outAt, outAt + 6], [1, 0], CLAMP) : 1;
  if (outP <= 0) return null;
  const color = tone === "paper" ? C.paper : C.ink;
  const isTop = pos === "tl" || pos === "tr";
  const isLeft = pos === "tl" || pos === "bl";
  const text = lines.map((l, i) => (i === lines.length - 1 && !/[.!?]$/.test(l) ? `${l}.` : l));
  return (
    <div style={{position: "absolute", inset: 0, pointerEvents: "none", opacity: outP}}>
      {scrim && tone === "paper" ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: isTop ? 0 : "auto",
            bottom: isTop ? "auto" : 0,
            height: 560,
            background: isTop
              ? "linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0) 100%)"
              : "linear-gradient(0deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0) 100%)",
            opacity: interpolate(f, [at, at + 10], [0, 1], CLAMP),
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: isLeft ? MARGIN : "auto",
          right: isLeft ? "auto" : MARGIN,
          top: isTop ? 150 : "auto",
          bottom: isTop ? "auto" : 300,
          textAlign: isLeft ? "left" : "right",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: size,
          lineHeight: 0.95,
          letterSpacing: -size * 0.03,
          textTransform: "uppercase",
          color,
          maxWidth: W - MARGIN * 2,
        }}
      >
        {text.map((l, i) => {
          const p = interpolate(f, [at + i * 4, at + i * 4 + 8], [0, 1], {...CLAMP, easing: OUT});
          return (
            <div key={i} style={{overflow: "hidden", paddingBottom: size * 0.06}}>
              <div style={{transform: `translateY(${(1 - p) * 100}%)`}}>{l}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─────────────────────────── CALLOUT (señalización Grafik) ───────────────────────────
 * Punto sobre la pieza + línea de 1.5 px hasta una etiqueta pequeña en mayúsculas.
 * Coordenadas en píxeles del lienzo. La línea se dibuja en 10 f; la etiqueta aparece al llegar. */
export const Callout: React.FC<{
  x: number;
  y: number;
  lx: number;
  ly: number;
  label: string;
  at: number;
  outAt?: number;
  tone?: Tone;
  align?: "left" | "right";
}> = ({x, y, lx, ly, label, at, outAt, tone = "ink", align = "left"}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const outP = outAt !== undefined ? interpolate(f, [outAt, outAt + 6], [1, 0], CLAMP) : 1;
  if (outP <= 0) return null;
  const color = tone === "ink" ? C.ink : C.paper;
  const p = interpolate(f, [at, at + 10], [0, 1], {...CLAMP, easing: OUT});
  const dot = interpolate(f, [at, at + 5], [0, 1], {...CLAMP, easing: OUT});
  const lab = interpolate(f, [at + 8, at + 14], [0, 1], CLAMP);
  const ex = x + (lx - x) * p;
  const ey = y + (ly - y) * p;
  const tail = 70 * interpolate(f, [at + 8, at + 14], [0, 1], {...CLAMP, easing: OUT});
  return (
    <div style={{position: "absolute", inset: 0, pointerEvents: "none", opacity: outP}}>
      <svg width={W} height={H} style={{position: "absolute", left: 0, top: 0}}>
        <circle cx={x} cy={y} r={7 * dot} fill="none" stroke={color} strokeWidth={1.5} />
        <circle cx={x} cy={y} r={2.5 * dot} fill={color} />
        <line x1={x} y1={y} x2={ex} y2={ey} stroke={color} strokeWidth={1.5} />
        <line x1={lx} y1={ly} x2={align === "left" ? lx + tail : lx - tail} y2={ly} stroke={color} strokeWidth={1.5} />
      </svg>
      <div
        style={{
          position: "absolute",
          left: align === "left" ? lx : "auto",
          right: align === "left" ? "auto" : W - lx,
          top: ly - 40,
          fontFamily: FONT,
          fontWeight: 500,
          fontSize: 26,
          letterSpacing: 3.5,
          textTransform: "uppercase",
          color,
          whiteSpace: "nowrap",
          opacity: lab,
        }}
      >
        {label}
      </div>
    </div>
  );
};

/* ─────────────────────────── PÁGINA DE PAPEL (Grafik) ───────────────────────────
 * Fondo bone, cabecera con wordmark pequeño + etiqueta, línea, imagen en marco de 1 px,
 * pie a dos columnas (etiqueta gris / título y texto). Entra por fundido de 8 f. */
export const PaperPage: React.FC<{
  img: string;
  iw: number;
  ih: number;
  eyebrow: string;
  label: string;
  title: string;
  text?: string;
  source: string;
  at?: number;
  imgH?: number;
  focusY?: number; // 0..1, qué parte de la imagen se ve si hay que recortar
  push?: number;
  dur?: number;
}> = ({img, iw, ih, eyebrow, label, title, text, source, at = 0, imgH = 1180, focusY = 0.5, push = 0.04, dur = 120}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + 8], [0, 1], {...CLAMP, easing: OUT});
  const boxW = W - MARGIN * 2;
  const scale = Math.max(boxW / iw, imgH / ih) * interpolate(f, [at, at + dur], [1, 1 + push], {...CLAMP, easing: Easing.linear});
  const dw = iw * scale;
  const dh = ih * scale;
  const ox = (boxW - dw) / 2;
  const oy = Math.min(0, Math.max(imgH - dh, -(dh - imgH) * focusY));
  const lineY1 = 178;
  const imgY = 206;
  const footY = imgY + imgH + 26;
  return (
    <div style={{position: "absolute", inset: 0, background: C.bone, opacity: p, fontFamily: FONT, color: C.ink}}>
      <Img src={staticFile(`${BASE}wordmark-negro.png`)} style={{position: "absolute", left: MARGIN, top: 130, width: 140, height: "auto"}} />
      <div style={{position: "absolute", right: MARGIN, top: 130, fontSize: 20, fontWeight: 400, letterSpacing: 3, textTransform: "uppercase"}}>{eyebrow}</div>
      <div style={{position: "absolute", left: MARGIN, right: MARGIN, top: lineY1, height: 1, background: C.line}} />
      <div style={{position: "absolute", left: MARGIN, top: imgY, width: boxW, height: imgH, overflow: "hidden", border: `1px solid ${C.line}`, background: "#DDD9D3"}}>
        <Img src={staticFile(img)} style={{position: "absolute", left: ox, top: oy, width: dw, height: dh, display: "block"}} />
      </div>
      <div style={{position: "absolute", left: MARGIN, right: MARGIN, top: footY, height: 1, background: C.line}} />
      <div style={{position: "absolute", left: MARGIN, top: footY + 22, width: 316, fontSize: 19, fontWeight: 400, letterSpacing: 2, textTransform: "uppercase", color: C.grey, lineHeight: 1.35}}>
        {label}
        <div style={{marginTop: 10, fontSize: 17, letterSpacing: 1.5, textTransform: "none", color: C.grey}}>{source}</div>
      </div>
      <div style={{position: "absolute", left: MARGIN + 330, right: MARGIN, top: footY + 18, fontSize: 40, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.2, textTransform: "uppercase"}}>
        {title}
        {text ? <div style={{marginTop: 14, fontSize: 24, fontWeight: 400, lineHeight: 1.3, letterSpacing: -0.2, textTransform: "none"}}>{text}</div> : null}
      </div>
      <div style={{position: "absolute", left: MARGIN, right: MARGIN, bottom: 140, height: 1, background: C.line}} />
    </div>
  );
};

/* ─────────────────────────── SUBTÍTULO ─────────────────────────── */
export const Caption: React.FC<{text: string; tone: Tone; y?: number}> = ({text, tone, y = CAPTION_Y}) => (
  <div style={{position: "absolute", left: 0, right: 0, top: y, display: "flex", justifyContent: "center", pointerEvents: "none"}}>
    <div
      style={{
        maxWidth: "82%",
        textAlign: "center",
        fontFamily: FONT,
        fontWeight: 500,
        fontSize: 42,
        lineHeight: 1.15,
        letterSpacing: -0.6,
        color: tone === "paper" ? C.paper : C.ink,
        textShadow: tone === "paper" ? "0 2px 4px rgba(0,0,0,0.7), 0 8px 26px rgba(0,0,0,0.45)" : "none",
      }}
    >
      {text}
    </div>
  </div>
);

/* ─────────────────────────── CIERRE ─────────────────────────── */
export const EndCard: React.FC<{at: number}> = ({at}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + 10], [0, 1], {...CLAMP, easing: OUT});
  const p2 = interpolate(f, [at + 10, at + 18], [0, 1], CLAMP);
  const p3 = interpolate(f, [at + 16, at + 24], [0, 1], CLAMP);
  if (p <= 0) return null;
  return (
    <div style={{position: "absolute", inset: 0, background: C.ink, opacity: p, fontFamily: FONT, color: C.paper}}>
      <Img src={staticFile(`${BASE}wordmark-blanco.png`)} style={{position: "absolute", left: (W - 640) / 2, top: 820, width: 640, height: "auto", opacity: p}} />
      <div style={{position: "absolute", left: MARGIN, right: MARGIN, top: 960, height: 1, background: "rgba(255,255,255,0.5)", transform: `scaleX(${p2})`, transformOrigin: "50% 50%"}} />
      <div style={{position: "absolute", left: 0, right: 0, top: 990, textAlign: "center", fontSize: 24, fontWeight: 400, letterSpacing: 4, textTransform: "uppercase", opacity: p3}}>
        clocksbcn.com
      </div>
      <div style={{position: "absolute", left: 0, right: 0, top: 1036, textAlign: "center", fontSize: 19, fontWeight: 400, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.62)", opacity: p3}}>
        Passeig de Gràcia · Barcelona · con cita previa
      </div>
    </div>
  );
};

/* ─────────────────────────── GRANO ─────────────────────────── */
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.06}) => {
  const f = useCurrentFrame();
  const gx = (f * 37) % 512;
  const gy = (f * 53) % 512;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage: `url(${staticFile(`${BASE}grain-512.png`)})`,
        backgroundSize: "512px 512px",
        backgroundPosition: `${gx}px ${gy}px`,
        opacity,
        mixBlendMode: "overlay",
      }}
    />
  );
};

/* Fundido negro breve entre bloques (6 f) */
export const Dip: React.FC<{at: number; len?: number}> = ({at, len = 6}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [at - len, at, at + len], [0, 1, 0], CLAMP);
  if (o <= 0) return null;
  return <div style={{position: "absolute", inset: 0, background: C.ink, opacity: o, pointerEvents: "none"}} />;
};
