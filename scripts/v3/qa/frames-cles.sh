#!/usr/bin/env bash
# Contrôle qualité AVANT rendu final.
# 1) rend toutes les frames en petites JPEG (séquence, échelle réduite),
# 2) assemble une planche contact (1 image toutes les N frames) + planches
#    « image par image » sur les plages demandées (transitions) pour voir les saccades.
# 3) vérifie automatiquement : images quasi vides, plans figés, et CONTRASTE du sujet principal
#    (sujets déclarés « frames:x,y,largeur,hauteur » en px 1080x1920, séparés par « ; »).
# Usage : scripts/frames-cles.sh <entry.ts> <CompositionId> [pas=6] [dossier=out/qa] [plages="50-75,120-145"] [sujets="70-120:330,880,420,860;…"]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
ENTRY="${1:-src/index.ts}"; COMP="${2:-Demo}"; PAS="${3:-6}"; OUT="${4:-out/qa}"; PLAGES="${5:-}"; SUJETS="${6:-}"
# Mac : Chrome installé ; serveur (Linux) : navigateur fourni par Remotion.
NAVIGATEUR="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; [ -x "$NAVIGATEUR" ] || NAVIGATEUR=""
rm -rf "$OUT/seq"; mkdir -p "$OUT/seq"
for essai in 1 2 3; do
  if npx remotion render "$ENTRY" "$COMP" "$OUT/seq" --sequence --image-format=jpeg --scale=0.35 --concurrency=${CONCURRENCE:-3} --log=error ${PROPS:+--props=$PROPS} ${NAVIGATEUR:+--browser-executable="$NAVIGATEUR"}; then break; fi
  echo "Rendu interrompu (essai $essai), nouvelle tentative…"; sleep 2
done
python3 "$DIR/planche.py" "$OUT/seq" "$OUT" "$PAS" "$PLAGES" "${FPS:-30}" "$SUJETS"
