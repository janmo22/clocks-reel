/* CLOCKS BCN · reel 9:16 (skill clocks-reel)
 * v2: palabras clave centradas por detrás de la cabeza (matte), Roger a pantalla completa con
 * foco, callouts que persiguen el reloj (flujo óptico), díptico correa/brazalete, cajita de
 * seguir con el perfil real y la web en un móvil. Fuente única de tiempos: timeline.ts. */
import React from "react";
import {AbsoluteFill, Audio, Sequence, getInputProps, interpolate, staticFile, useCurrentFrame} from "remotion";
import {BEATS, CAPTIONS, FPS, TOTAL_FRAMES} from "./timeline";
import type {Beat} from "./timeline";
import {MUSIC, SFX_CUES, SFX_HOOK, MUSIC_HITS} from "./audioData";
import type {MusicSeg} from "./audioData";
import {BASE, Broll, Caption, CenterTitle, CLAMP, Diptych, Dip, FollowCard, Grain, Matte, SpotImage, Take, TrackedCallout, WebPhone, loadProjectFonts} from "./ui";
import type {Tone} from "./ui";

loadProjectFonts();

export const VIDEO_FINAL_DURATION = TOTAL_FRAMES;
const F = (s: number) => Math.round(s * FPS);

type Shot = {from_f: number; to_f: number; beats: Beat[]};
const SHOTS: Shot[] = (() => {
  const shots: Shot[] = [];
  for (const b of BEATS) {
    if (b.visual !== "take" || !b.take) continue;
    const last = shots[shots.length - 1];
    const own = b.take.own_clock;
    const lastOwn = last ? Boolean(last.beats[last.beats.length - 1].take?.own_clock) : false;
    if (last && last.to_f === b.from_f && !own && !lastOwn) {
      last.to_f = b.to_f;
      last.beats.push(b);
    } else {
      shots.push({from_f: b.from_f, to_f: b.to_f, beats: [b]});
    }
  }
  return shots;
})();

const musicVolume = (m: MusicSeg) => (f: number) => {
  const absS = m.from + f / FPS;
  const duck = interpolate(absS, m.env.map(([t]) => t), m.env.map(([, v]) => v), CLAMP);
  const attack = m.skip > 0 ? 0.02 : 0.25;
  const edge = interpolate(absS, [m.from, m.from + attack, m.to - 1.6, m.to], [0, 1, 1, 0], CLAMP);
  return duck * edge;
};

/* tono y altura del subtítulo según lo que hay debajo; null = no se muestra */
const captionAt = (f: number): {tone: Tone; y: number} | null => {
  const b = BEATS.find((x) => f >= x.from_f && f < x.to_f);
  if (!b) return null;
  if (b.spot && f >= b.spot.at_f) return {tone: "paper", y: 1230};
  if (b.diptych && f >= b.diptych.left.at) return null;
  if (b.web && f >= b.web.at) return null;
  if (b.follow && f >= b.follow.at && f < b.follow.out + 8) return null;
  if (b.visual === "broll") return {tone: "ink", y: 1540};
  return {tone: "paper", y: 1230};
};

const ShotScene: React.FC<{shot: Shot}> = ({shot}) => {
  const dur = shot.to_f - shot.from_f;
  const first = shot.beats[0].take!;
  const zbase = Math.max(...shot.beats.map((b) => b.take!.zbase));
  const punches = shot.beats.flatMap((b) => b.take!.punches.map((p) => ({at: p.at - shot.from_f, k: p.k})));
  const takeFrom = first.own_clock ? 0 : shot.from_f;
  return (
    <>
      <Take src={`${BASE}${first.src}`} from={takeFrom} dur={dur} zbase={zbase} origin={first.origin} cap={first.cap} punches={punches} mask={first.mask} />
      {shot.beats.map((b) => {
        const mStart = b.matte ? Math.max(b.matte.from_f, shot.from_f) : 0;
        return (
          <React.Fragment key={b.id}>
            {b.center.map((c, i) => (
              <CenterTitle key={i} words={c.words} wordsAt={c.wordsAt.map((a) => a - shot.from_f)} outAt={c.out !== null ? c.out - shot.from_f : b.to_f - shot.from_f - 4} tone={c.tone} size={c.size} cy={c.cy} lines={c.lines} />
            ))}
            {b.matte ? (
              <Sequence from={mStart - shot.from_f} durationInFrames={b.to_f - mStart} layout="none">
                <Matte src={`${BASE}${b.matte.src}`} webmFrom={b.matte.from_f} takeFrom={mStart} shotFrom={shot.from_f} dur={dur} zbase={zbase} origin={first.origin} cap={first.cap} punches={punches} />
              </Sequence>
            ) : null}
            {b.spot ? (
              <Sequence from={b.spot.at_f - shot.from_f} durationInFrames={b.to_f - b.spot.at_f} layout="none">
                <SpotImage img={`${BASE}${b.spot.img}`} iw={b.spot.iw} ih={b.spot.ih} focusX={b.spot.focusX} focusY={b.spot.focusY} spotX={b.spot.spotX} spotY={b.spot.spotY} spotR={b.spot.spotR} label={b.spot.label} source={b.spot.source} dur={b.to_f - b.spot.at_f} />
              </Sequence>
            ) : null}
            {b.diptych ? (
              <Diptych
                left={{...b.diptych.left, img: `${BASE}${b.diptych.left.img}`, at: b.diptych.left.at - shot.from_f}}
                right={{...b.diptych.right, img: `${BASE}${b.diptych.right.img}`, at: b.diptych.right.at - shot.from_f}}
                outAt={b.to_f - shot.from_f - 8}
                dur={b.to_f - b.diptych.left.at}
              />
            ) : null}
            {b.follow ? <FollowCard at={b.follow.at - shot.from_f} followAt={b.follow.followAt - shot.from_f} outAt={b.follow.out - shot.from_f} /> : null}
            {b.web ? <WebPhone at={b.web.at - shot.from_f} img={`${BASE}${b.web.img}`} iw={720} ih={1560} /> : null}
          </React.Fragment>
        );
      })}
    </>
  );
};

const BrollScene: React.FC<{beat: Beat}> = ({beat}) => {
  const f = useCurrentFrame();
  const br = beat.broll!;
  const dur = beat.to_f - beat.from_f;
  const cfg = {dur, zoom: br.zoom, push: br.push, fx: br.fx, fy: br.fy, iw: br.iw, ih: br.ih, cy: br.cy};
  return (
    <>
      <Broll src={`${BASE}video/${br.file}`} from={br.from_f} dur={dur} zoom={br.zoom} push={br.push} fx={br.fx} fy={br.fy} iw={br.iw} ih={br.ih} cy={br.cy} />
      {beat.tracked.map((c, i) => (
        <TrackedCallout key={i} trackId={c.track} clipFrame={br.from_f + f} cfg={cfg} dx={c.dx} dy={c.dy} label={c.label} at={c.at - beat.from_f} outAt={c.out !== null ? c.out - beat.from_f : dur - 4} tone="ink" align={c.align} />
      ))}
      {beat.center.map((c, i) => (
        <CenterTitle key={i} words={c.words} wordsAt={c.wordsAt.map((a) => a - beat.from_f)} outAt={c.out !== null ? c.out - beat.from_f : dur - 4} tone={c.tone} size={c.size} cy={c.cy} lines={c.lines} />
      ))}
    </>
  );
};

export const VideoFinal: React.FC = () => {
  const f = useCurrentFrame();
  const cap = CAPTIONS.find((c) => f >= c.from_f && f < c.to_f);
  const ct = captionAt(f);
  const audioOnly = Boolean((getInputProps() as {audioOnly?: boolean}).audioOnly);
  const endFade = interpolate(f, [TOTAL_FRAMES - 16, TOTAL_FRAMES - 1], [0, 1], CLAMP);
  return (
    <AbsoluteFill style={{backgroundColor: "#000"}}>
      <Audio src={staticFile(`${BASE}audio/voz-48k.wav`)} volume={1} />
      {MUSIC.map((m) => (
        <Sequence key={`mus-${m.from}`} from={F(m.from)} durationInFrames={F(m.to) - F(m.from)}>
          <Audio src={staticFile(`${BASE}audio/${m.file}`)} volume={musicVolume(m)} trimBefore={m.skip ? F(m.skip) : undefined} />
        </Sequence>
      ))}
      {[...SFX_CUES, ...(SFX_HOOK["A"] ?? []), ...MUSIC_HITS].map((c, i) => (
        <Sequence key={`sfx${i}`} from={F(c.at)} durationInFrames={c.dur ? Math.ceil(c.dur * FPS) + 2 : 75}>
          <Audio src={staticFile(`sfx/${c.file}`)} volume={c.vol} trimAfter={c.dur ? Math.ceil(c.dur * FPS) : undefined} />
        </Sequence>
      ))}
      {audioOnly
        ? null
        : SHOTS.map((s) => (
            <Sequence key={`shot-${s.from_f}`} from={s.from_f} durationInFrames={s.to_f - s.from_f} layout="none">
              <ShotScene shot={s} />
            </Sequence>
          ))}
      {audioOnly
        ? null
        : BEATS.filter((b) => b.visual === "broll").map((b) => (
            <Sequence key={b.id} from={b.from_f} durationInFrames={b.to_f - b.from_f} layout="none">
              <BrollScene beat={b} />
            </Sequence>
          ))}
      {cap && ct ? <Caption text={cap.text} tone={ct.tone} y={ct.y} /> : null}
      <Grain opacity={0.055} />
      <Dip at={BEATS.find((b) => b.id === "b04")!.from_f} len={3} />
      <div style={{position: "absolute", inset: 0, background: "#000", opacity: endFade, pointerEvents: "none"}} />
    </AbsoluteFill>
  );
};
