#!/usr/bin/env bash
# Monte la séquence « Comment l'eau devient douce » à partir des vidéos Veo (Gemini) de sources-v3/veo/.
# Plan 1 : ouverture de l'adoucisseur, gardé de 0 à 6 s (après, une vanne inventée apparaît).
# Plan 2 : l'eau circule, caméra fixe, image de départ = dernière image propre du plan 1.
# Fondu de 0,3 s au raccord, noirs approfondis (fond quasi noir de la section), son retiré.
# Nombre d'images : WIDE_N (ordinateur, 1280 × 720) et TALL_N (téléphone, recadré 540 × 720).
# Usage : bash scripts/veo-sequence.sh   (nécessite ffmpeg et node ; sortie dans public/sequences/softener/)
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=sources-v3/veo; OUT=public/sequences/softener; TMP=$(mktemp -d)
WIDE_N=${WIDE_N:-180}; TALL_N=${TALL_N:-110}
ffmpeg -v error -y -i "$SRC/plan1-essai1.mp4" -i "$SRC/plan2-essai4-eau-retenu.mp4" -filter_complex \
  "[0:v]trim=0:6,setpts=PTS-STARTPTS,fps=24,format=yuv420p[a];[1:v]fps=24,format=yuv420p[b];[a][b]xfade=transition=fade:duration=0.3:offset=5.7,curves=all='0/0 0.06/0.02 0.5/0.5 1/1'[o]" \
  -map "[o]" -an -c:v libx264 -crf 14 "$TMP/seq.mp4"
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TMP/seq.mp4")
mkdir -p "$TMP/w" "$TMP/t"
ffmpeg -v error -i "$TMP/seq.mp4" -vf "fps=$WIDE_N/$D" "$TMP/w/f%03d.png"
ffmpeg -v error -i "$TMP/seq.mp4" -vf "fps=$TALL_N/$D,crop=540:720:355:0" "$TMP/t/f%03d.png"
WIDE_N=$WIDE_N TALL_N=$TALL_N node -e '
const sharp=require("sharp"),fs=require("fs"),p=require("path");
const [w,t,out]=process.argv.slice(1);
(async()=>{for(const [src,dir] of [[w,"wide"],[t,"tall"]]){const d=p.join(out,dir);fs.rmSync(d,{recursive:true,force:true});fs.mkdirSync(d,{recursive:true});
const files=fs.readdirSync(src).sort();for(const [i,f] of files.entries())await sharp(p.join(src,f)).webp({quality:dir==="wide"?52:52,effort:5}).toFile(p.join(d,"f"+String(i).padStart(3,"0")+".webp"));}
const W=+process.env.WIDE_N,T=+process.env.TALL_N;fs.copyFileSync(p.join(out,"wide","f"+String(Math.round(W*0.78)).padStart(3,"0")+".webp"),p.join(out,"fallback.webp"));
fs.writeFileSync(p.join(out,"manifest.json"),JSON.stringify({wide:{count:W,width:1280,height:720},tall:{count:T,width:540,height:720}})+"\n");})();' "$TMP/w" "$TMP/t" "$OUT"
rm -rf "$TMP"; echo "Séquence écrite dans $OUT"
