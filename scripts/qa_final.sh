#!/bin/bash
# qa_final.sh — QA mecánico del render final (F11): duración, loudness, salto del drop, hook, hojas de contacto.
# Uso: bash qa_final.sh <render.mp4>
set -euo pipefail
R="$1"
P="${CLOCKS_PROJECT:-$(cd "$(dirname "$1")/.." && pwd)}"
QA="$P/08-final/qa"; mkdir -p "$QA"
echo "== archivo"; ffprobe -v error -show_entries format=duration:stream=width,height,codec_name,r_frame_rate -of csv=p=0 "$R"
echo "== loudness integrado (objetivo reels ~ -14 LUFS)"; ffmpeg -v info -i "$R" -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|LRA:|Peak:" | tail -3
echo "== hook: nivel por ventanas (0-6.2 s) y salto del drop en el break (5.87 s)"
ffmpeg -y -v error -i "$R" -vn -ac 1 -ar 48000 -c:a pcm_s16le "$QA/final.wav"
python3 - "$QA/final.wav" <<'EOF'
import sys, wave, struct, math
w=wave.open(sys.argv[1]); sr=w.getframerate(); n=w.getnframes(); d=struct.unpack(f"<{n}h", w.readframes(n))
def rms(a,b):
    s=d[int(a*sr):int(b*sr)]; return 20*math.log10(math.sqrt(sum(x*x for x in s)/max(1,len(s)))/32768+1e-9)
for a,b in [(0,0.3),(0.3,1.5),(1.5,3.0),(3.0,4.5),(4.5,5.87),(5.87,6.13),(6.13,7.4),(7.4,9.0)]:
    print(f"  {a:5.2f}-{b:5.2f}s  {rms(a,b):6.1f} dBFS")
pre=rms(4.4,5.87); sil=rms(5.87,6.13); post=rms(6.13,7.4)
print(f"  break: antes {pre:.1f} · silencio {sil:.1f} · después {post:.1f} → salto {post-pre:+.1f} dB (regla: >4 dB o no se nota)")
EOF
echo "== hojas de contacto (cada 2 s) y stills del hook 0/1/2/3 s"
ffmpeg -y -v error -i "$R" -vf "fps=1/2,scale=216:384,tile=8x4" -frames:v 1 "$QA/contact-2s.png"
for t in 0 1 2 3; do ffmpeg -y -v error -ss $t -i "$R" -frames:v 1 -vf scale=540:960 "$QA/hook-$t.png"; done
ffmpeg -y -v error -i "$QA/hook-0.png" -i "$QA/hook-1.png" -i "$QA/hook-2.png" -i "$QA/hook-3.png" -filter_complex "[0][1][2][3]hstack=4" "$QA/hook-0123.png"
echo "== stills de títulos y callouts (frames del plan)"
python3 - "$R" "$QA" "$P" <<'EOF'
import sys, json, subprocess
R, QA, P = sys.argv[1:4]
plan=json.load(open(f"{P}/04-plan-director/plan-director.json"))
frames=[]
for b in plan["beats"]:
    for t in b["titles"]: frames.append((t["at"]+10, "tit-"+"-".join(t["lines"]).replace(" ","_")[:18]))
    for c in b["callouts"]: frames.append((c["at"]+16, "call-"+c["label"].replace(" ","_")[:18]))
    if b.get("paper"): frames.append((b["paper"]["at_f"]+20, "paper"))
for fr, name in frames:
    subprocess.run(["ffmpeg","-y","-v","error","-i",R,"-vf",f"select=eq(n\\,{fr}),scale=405:720","-vsync","0","-frames:v","1",f"{QA}/f{fr:04d}-{name}.png"],check=True)
print("  ", len(frames), "stills →", QA)
EOF
ls "$QA" | head -40
