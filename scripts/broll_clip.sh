#!/bin/bash
# broll_clip.sh — recorta un tramo de la toma del reloj (1620×2880) para Remotion y saca su hoja.
#   bash broll_clip.sh <slug> <nombre> <inicio_s> <duracion_s>     → public/proyectos/<slug>/video/b-<nombre>.mp4
set -euo pipefail
SLUG="$1"; NAME="$2"; SS="$3"; T="$4"
WS="${JAN_WORKSPACE:-$HOME/Desktop/jan-workspace}"; P="$WS/negocios/contenido/proyectos-video/$SLUG"; ST="$WS/negocios/contenido/remotion-studio"
OUT="$ST/public/proyectos/$SLUG/video/b-$NAME.mp4"
ffmpeg -y -v error -ss "$SS" -t "$T" -i "$P/01-tomas/toma-B-1620.mp4" -an -c:v libx264 -crf 17 -preset fast -g 15 -pix_fmt yuv420p "$OUT"
ffmpeg -y -v error -i "$OUT" -vf "fps=2,scale=180:320,tile=8x2" -frames:v 1 "$P/05-brolls/b-$NAME-sheet.png"
ffmpeg -y -v error -ss 0.5 -i "$OUT" -frames:v 1 -vf "scale=540:960,drawgrid=width=54:height=96:thickness=1:color=red@0.5" "$P/04-plan-director/referencia/grid-b-$NAME.png"
echo "✅ b-$NAME.mp4 ($(ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 "$OUT" | tr -d ',') frames) · hoja: 05-brolls/b-$NAME-sheet.png · rejilla (54 px = 162 px del clip): 04-plan-director/referencia/grid-b-$NAME.png"
