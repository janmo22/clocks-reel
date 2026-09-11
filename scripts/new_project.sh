#!/bin/bash
# new_project.sh — F1 de /clocks-reel: crea el proyecto a partir de los DOS vídeos (persona + reloj).
#   bash new_project.sh <slug> <video-persona.MOV> <video-reloj.MOV>
# Deja: 01-tomas (toma-A 1080 apretada por energía + wav 16k/48k, toma-B en 1620×2880),
#       02-transcripciones (Whisper original y final, diff palabra a palabra), hojas de contacto,
#       la composición copiada en remotion-studio con el slug, el entrypoint aislado y public-<slug>/.
set -euo pipefail
SLUG="$1"; PERSONA="$2"; RELOJ="$3"
WS="${JAN_WORKSPACE:-$HOME/Desktop/jan-workspace}"
K="$WS/.claude/skills/clocks-reel"; EJ="$WS/.claude/skills/editor-jan/scripts"
P="$WS/negocios/contenido/proyectos-video/$SLUG"; ST="$WS/negocios/contenido/remotion-studio"
PUB="$ST/public/proyectos/$SLUG"
mkdir -p "$P"/{00-input,01-tomas/contact-sheet,02-transcripciones,03-beats,04-plan-director/referencia,05-brolls/referencias,06-audio/candidatos,07-montaje,08-final/qa} "$PUB"/{video,audio,referencias}
cp "$PERSONA" "$P/00-input/persona.MOV"; cp "$RELOJ" "$P/00-input/reloj.MOV"
echo "▶ toma A (persona) → 1080×1920 H.264 g=15"
ffmpeg -y -v error -i "$P/00-input/persona.MOV" -vf "scale=1080:1920" -c:v libx264 -crf 17 -preset fast -g 15 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "$P/01-tomas/toma-A-h264.mp4"
ffmpeg -y -v error -i "$P/01-tomas/toma-A-h264.mp4" -vn -ac 1 -ar 16000 -c:a pcm_s16le "$P/01-tomas/toma-A.wav"
echo "▶ toma B (reloj) → 1620×2880 sin audio (más de 1620 px congela el render, ver memoria)"
ffmpeg -y -v error -i "$P/00-input/reloj.MOV" -vf "scale=1620:2880" -an -c:v libx264 -crf 17 -preset fast -g 15 -pix_fmt yuv420p "$P/01-tomas/toma-B-1620.mp4"
echo "▶ transcripción word-level (Groq Whisper)"
python3 "$EJ/transcribe.py" "$P/01-tomas/toma-A.wav" "$P/02-transcripciones/toma-A.words.json" | tail -1
echo "▶ pausas reales por energía (≥0,30 s) → cortes en rejilla de frames"
python3 "$EJ/silence_lint.py" "$P" --audio "$P/01-tomas/toma-A-h264.mp4" --words "$P/02-transcripciones/toma-A.words.json" > "$P/01-tomas/lint-original.txt" 2>&1 || true
python3 - "$P" <<'EOF'
import json, re, sys
P=sys.argv[1]; FPS=30; q=lambda t: round(t*FPS)/FPS
words=json.load(open(f"{P}/02-transcripciones/toma-A.words.json"))["words"]
tramos=[]
for line in open(f"{P}/01-tomas/lint-original.txt"):
    m=re.match(r"\s*❌\s+([\d.]+)\s+([\d.]+)s", line)
    if m: tramos.append((float(m.group(1)), float(m.group(2))))
tramos.sort(); cuts=[]
for t0,dur in tramos:
    prev=None
    for w in words:
        if w["start"] < t0+0.02: prev=w
        else: break
    head=0.10 if (prev and prev["word"].strip().endswith((".","!","?"))) else 0.04
    a=0.0 if t0<0.05 else q(t0+head); b=q(t0+dur-0.03)
    if b-a>=0.30 or (t0<0.05 and b-a>=0.12): cuts.append([a,b])
m=[]
for a,b in cuts:
    if m and a<=m[-1][1]+0.02: m[-1][1]=max(m[-1][1],b)
    else: m.append([a,b])
json.dump({"cuts":m}, open(f"{P}/01-tomas/toma-A-final.cuts.json","w"), indent=1)
print(f"  {len(m)} cortes · quitan {sum(b-a for a,b in m):.2f} s")
EOF
python3 "$EJ/frame_cut.py" "$P/01-tomas/toma-A-h264.mp4" "$P/01-tomas/toma-A-final.cuts.json" "$P/01-tomas/toma-A-final.mp4"
python3 "$EJ/transcribe.py" "$P/01-tomas/toma-A-final.wav" "$P/02-transcripciones/toma-A-final.words.json" | tail -1
python3 - "$P" <<'EOF'
import json, difflib, sys
P=sys.argv[1]
a=json.load(open(f"{P}/02-transcripciones/toma-A.words.json"))["words"]; b=json.load(open(f"{P}/02-transcripciones/toma-A-final.words.json"))["words"]
sa=[w["word"].strip(".,¿?¡!").lower() for w in a]; sb=[w["word"].strip(".,¿?¡!").lower() for w in b]
diffs=[op for op in difflib.SequenceMatcher(None,sa,sb).get_opcodes() if op[0]!="equal"]
print(f"  GATE palabras: original {len(a)} · final {len(b)} · diferencias {len(diffs)} → {'✅' if abs(len(a)-len(b))<=2 else '⛔ REVISAR: se han comido palabras'}")
EOF
cp "$P/01-tomas/toma-A-final.mp4" "$PUB/video/take.mp4"
ffmpeg -y -v error -i "$P/01-tomas/toma-A-final.mp4" -vn -ac 1 -ar 48000 -c:a pcm_s16le "$PUB/audio/voz-48k.wav"
echo "▶ hojas de contacto"
ffmpeg -y -v error -i "$P/01-tomas/toma-A-final.mp4" -vf "fps=1/3,scale=270:480,tile=6x4" -frames:v 1 "$P/01-tomas/contact-sheet/toma-A-cada3s.png"
ffmpeg -y -v error -i "$P/01-tomas/toma-B-1620.mp4" -vf "fps=1/2,scale=270:480,tile=6x4" -frames:v 1 "$P/01-tomas/contact-sheet/toma-B-cada2s.png"
echo "▶ composición Remotion + entrypoint + public-$SLUG"
COMP="$ST/src/compositions/proyectos/$SLUG"; mkdir -p "$COMP"
sed "s#__SLUG__#$SLUG#g" "$K/remotion/ui.tsx" > "$COMP/ui.tsx"
cp "$K/remotion/VideoFinal.tsx" "$K/remotion/interFont.ts" "$COMP/"
cp "$K/remotion/grain-512.png" "$PUB/grain-512.png"; cp "$K/reference/ig-avatar.png" "$PUB/referencias/ig-avatar.png"
echo "export const TRACKS: Record<string, [number, number][]> = {};" > "$COMP/callouts.ts"
echo "export const SIGN_TRACK: [number, number, number, number][] = [];" > "$COMP/signTrack.ts"
cp "$K/scripts/gen_timeline.py" "$P/07-montaje/gen_timeline.py"
SAFE=$(echo "$SLUG" | sed 's/[^a-zA-Z0-9]//g')
cat > "$ST/src/Root-$SAFE.tsx" <<EOF
/* Entrypoint aislado de $SLUG (skill clocks-reel): no arrastra fuentes ni composiciones ajenas. */
import React from "react";
import {Composition} from "remotion";
import {VideoFinal, VIDEO_FINAL_DURATION} from "./compositions/proyectos/$SLUG/VideoFinal";
export const RootClocks: React.FC = () => (
  <Composition id="VideoFinal-$SLUG" component={VideoFinal} durationInFrames={VIDEO_FINAL_DURATION} fps={30} width={1080} height={1920} defaultProps={{}} />
);
EOF
printf 'import {registerRoot} from "remotion";\nimport {RootClocks} from "./Root-%s";\nregisterRoot(RootClocks);\n' "$SAFE" > "$ST/src/index-$SAFE.ts"
mkdir -p "$ST/public-$SLUG/proyectos"; cp -R "$ST/public/fonts" "$ST/public-$SLUG/fonts"; cp -R "$ST/public/sfx" "$ST/public-$SLUG/sfx"
grep -q "public-$SLUG" "$ST/.gitignore" 2>/dev/null || echo "public-$SLUG/" >> "$ST/.gitignore"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$P/00-input/persona.MOV")
echo "TAKE_DURATION_S=$DUR" > "$P/07-montaje/.env"
echo "✅ proyecto listo: $P · toma original ${DUR%.*}s · siguiente: leer las hojas de contacto y las transcripciones, elegir tramos del reloj (broll_clip.sh) y rellenar 07-montaje/gen_timeline.py"
