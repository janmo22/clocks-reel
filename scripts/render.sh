#!/bin/bash
# render.sh — render final de /clocks-reel: vídeo por trozos de 300 frames (memoria limpia por trozo),
# audio en una pasada (audioOnly), máster a -14 LUFS, mux y copia 720p.   bash render.sh <slug> [v2]
set -uo pipefail
SLUG="$1"; VER="${2:-v1}"
WS="${JAN_WORKSPACE:-$HOME/Desktop/jan-workspace}"; P="$WS/negocios/contenido/proyectos-video/$SLUG"; ST="$WS/negocios/contenido/remotion-studio"
SAFE=$(echo "$SLUG" | sed 's/[^a-zA-Z0-9]//g'); ENTRY="src/index-$SAFE.ts"; COMP="VideoFinal-$SLUG"; OUT="$ST/out/$SLUG"; TMP=/private/var/folders/wn/*/T
cd "$ST"; mkdir -p "$OUT/chunks"; rm -f "$OUT"/chunks/*.mp4 2>/dev/null
rm -rf "$ST/public-$SLUG/proyectos/$SLUG"; cp -R "$ST/public/proyectos/$SLUG" "$ST/public-$SLUG/proyectos/"
FREE=$(df -g /System/Volumes/Data | tail -1 | awk '{print $4}'); [ "$FREE" -lt 6 ] && echo "⛔ solo ${FREE} GB libres: Chrome rechaza el proxy por debajo de ~5 GB. Libera disco antes." && exit 1
TOTAL=$(python3 -c "import json;print(json.load(open('$P/04-plan-director/plan-director.json'))['total_frames'])")
LAST=$((TOTAL-1)); s=0
while [ $s -le $LAST ]; do e=$((s+299)); [ $e -gt $LAST ] && e=$LAST
  echo "== trozo $s-$e $(date +%H:%M:%S)"
  npx remotion render "$ENTRY" "$COMP" "$OUT/chunks/v-$(printf %04d $s).mp4" --codec=h264 --crf=18 --muted --public-dir "public-$SLUG" --timeout 180000 --concurrency 1 --frames=$s-$e --log=error 2>&1 | grep -v "^Rendered\|^Encoded\|^Bundling\|^Copying\|^$" | head -2
  [ -s "$OUT/chunks/v-$(printf %04d $s).mp4" ] || { echo "⛔ FALLO en el trozo $s (mirar disco y memoria)"; exit 1; }
  rm -rf $TMP/remotion-webpack-bundle-* $TMP/react-motion-render* 2>/dev/null; s=$((s+300)); done
echo "== audio"; npx remotion render "$ENTRY" "$COMP" "$OUT/audio.wav" --codec=wav --props='{"audioOnly":true}' --public-dir "public-$SLUG" --timeout 180000 --concurrency 2 --log=error 2>&1 | grep -v "^Rendered\|^Encoded\|^Bundling\|^Copying\|^$" | head -2
rm -rf $TMP/remotion-webpack-bundle-* 2>/dev/null
(for f in "$OUT"/chunks/v-*.mp4; do echo "file '$f'"; done) > "$OUT/chunks/list.txt"
ffmpeg -y -v error -f concat -safe 0 -i "$OUT/chunks/list.txt" -c copy "$OUT/video.mp4"
ffmpeg -v info -i "$OUT/audio.wav" -af "loudnorm=I=-14:TP=-1.0:LRA=8:print_format=json" -f null - 2>&1 | grep -A12 '"input_i"' | tr -d '\n' > "$OUT/loudnorm.json"
python3 - "$OUT" <<'EOF'
import re, subprocess, sys
O=sys.argv[1]; raw=open(f"{O}/loudnorm.json").read(); kv=dict(re.findall(r'"(\w+)" : "([-\d.]+)"', raw))
af=f"loudnorm=I=-14:TP=-1.0:LRA=8:measured_I={kv['input_i']}:measured_TP={kv['input_tp']}:measured_LRA={kv['input_lra']}:measured_thresh={kv['input_thresh']}:offset={kv['target_offset']}:linear=true"
subprocess.run(["ffmpeg","-y","-v","error","-i",f"{O}/audio.wav","-af",af,"-ar","48000",f"{O}/master.wav"],check=True); print("máster -14 LUFS ok")
EOF
FINAL="$P/08-final/$(echo "$SLUG" | tr a-z A-Z)-$VER.mp4"
ffmpeg -y -v error -i "$OUT/video.mp4" -i "$OUT/master.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -movflags +faststart -shortest "$FINAL"
ffmpeg -y -v error -i "$FINAL" -vf scale=720:1280 -c:v libx264 -crf 24 -preset fast -c:a aac -b:a 128k -movflags +faststart "${FINAL%.mp4}-720p.mp4"
cp "$OUT/master.wav" "$P/08-final/master-audio-$VER.wav"
echo "✅ $FINAL ($(ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 "$FINAL" | tr -d ',') frames) · 720p al lado · QA: bash qa_final.sh $FINAL"
