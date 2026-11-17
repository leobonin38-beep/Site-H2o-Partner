#!/usr/bin/env bash
# Monte la séquence « Comment l'eau devient douce » à partir des vidéos Veo (Gemini) de sources-v3/veo/.
# Plan 1 : ouverture de l'adoucisseur, gardé de 0 à 6 s (après, une vanne inventée apparaît).
# Plan 2 : l'eau circule, caméra fixe, image de départ = dernière image propre du plan 1.
# Fondu de 0,3 s au raccord, noirs relevés vers le bleu ardoise du site (#0F1D24), son retiré.
# Usage : bash scripts/veo-sequence.sh   (nécessite ffmpeg et node ; sortie dans public/sequences/softener/)
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=sources-v3/veo; OUT=public/sequences/softener; TMP=$(mktemp -d)
ffmpeg -v error -y -i "$SRC/plan1-essai1.mp4" -i "$SRC/plan2-essai4-eau-retenu.mp4" -filter_complex \
  "[0:v]trim=0:6,setpts=PTS-STARTPTS,fps=24,format=yuv420p[a];[1:v]fps=24,format=yuv420p[b];[a][b]xfade=transition=fade:duration=0.3:offset=5.7,colorlevels=romin=0.059:gomin=0.114:bomin=0.141[o]" \
  -map "[o]" -an -c:v libx264 -crf 14 "$TMP/seq.mp4"
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TMP/seq.mp4")
mkdir -p "$TMP/w" "$TMP/t"
ffmpeg -v error -i "$TMP/seq.mp4" -vf "fps=160/$D" "$TMP/w/f%03d.png"
ffmpeg -v error -i "$TMP/seq.mp4" -vf "fps=100/$D,crop=540:720:355:0" "$TMP/t/f%03d.png"
node -e '
const sharp=require("sharp"),fs=require("fs"),p=require("path");
const [w,t,out]=process.argv.slice(1);
(async()=>{for(const [src,dir] of [[w,"wide"],[t,"tall"]]){const d=p.join(out,dir);fs.rmSync(d,{recursive:true,force:true});fs.mkdirSync(d,{recursive:true});
const files=fs.readdirSync(src).sort();for(const [i,f] of files.entries())await sharp(p.join(src,f)).webp({quality:dir==="wide"?60:58,effort:5}).toFile(p.join(d,"f"+String(i).padStart(3,"0")+".webp"));}
fs.copyFileSync(p.join(out,"wide","f125.webp"),p.join(out,"fallback.webp"));
fs.writeFileSync(p.join(out,"manifest.json"),JSON.stringify({wide:{count:160,width:1280,height:720},tall:{count:100,width:540,height:720}})+"\n");})();' "$TMP/w" "$TMP/t" "$OUT"
rm -rf "$TMP"; echo "Séquence écrite dans $OUT"
