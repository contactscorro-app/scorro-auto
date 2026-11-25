"""Planches contact + détection automatique des temps morts (Pillow).

Contrôles automatiques (sur images réduites, le grain est moyenné) :
  - QUASI VIDE : image sans détail net (que du fond / des aplats flous) → jamais plus de 4 images d'affilée.
  - FIGÉ       : l'image ne change presque pas sur 1 s (frame i vs i+fps) → interdit, fin comprise.
  - CONTRASTE  : (si des sujets sont déclarés) le sujet principal doit se détacher nettement du fond,
                 sur CHAQUE image de sa plage. Sujet = « a-b:x,y,l,h » (frames a à b, boîte en px de la composition (1080x1920 ou 1920x1080),
                 posée sur le CONTOUR du sujet ; tolérance de flottement ±4 %).
                 Suffixe « :texte » pour un sujet fait de lettres (« a-b:x,y,l,h:texte ») : on compare alors
                 les glyphes (2 % de pixels les plus clairs ou les plus foncés de la boîte) au fond autour.
                 Mesure (luminance relative WCAG, médianes → robuste au grain et au texte) :
                   fond   = médiane d'un anneau autour de la boîte (marge 7 % de la boîte) ;
                   sujet  = la plus contrastée de : médiane de la boîte (masse) / 1er ou 3e quartile de
                            la bande intérieure du bord (silhouette : cadre, liseré ; ≥ 25 % du contour) ;
                   ratio  = (Lclair + 0.05) / (Lfoncé + 0.05) ≥ 3.0 (seuil WCAG « grands éléments »).
Code de sortie 2 si un contrôle échoue.
Usage : planche.py <seq> <out> <pas> [plages] [fps] [sujets "a-b:x,y,l,h;…"]
"""
import sys, os, glob, re
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageStat

seq, out, pas = sys.argv[1], sys.argv[2], int(sys.argv[3])
plages = sys.argv[4] if len(sys.argv) > 4 else ""
fps = int(sys.argv[5]) if len(sys.argv) > 5 and sys.argv[5] else 30
sujets = sys.argv[6] if len(sys.argv) > 6 else ""
SEUIL_CONTRASTE = 3.0              # ratio WCAG minimal sujet / fond
SEUIL_VIDE, MAX_VIDE = 1.6, 4      # détail moyen (0-255) ; nb max d'images vides consécutives
SEUIL_FIGE = 1.2                   # différence moyenne (0-255) entre i et i+fps

fichiers = sorted(glob.glob(os.path.join(seq, "*.jpeg")) + glob.glob(os.path.join(seq, "*.jpg")) + glob.glob(os.path.join(seq, "*.png")))
num = lambda f: int(re.findall(r"(\d+)\D*$", os.path.basename(f))[0])
images = {num(f): f for f in fichiers}
toutes = sorted(images)

def planche(frames, chemin, cols=10, w=200, marques=()):
    frames = [f for f in frames if f in images]
    if not frames: return
    im0 = Image.open(images[frames[0]]); h = int(w * im0.height / im0.width)
    rows = (len(frames) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (w + 6) + 6, rows * (h + 6) + 6), "white")
    d = ImageDraw.Draw(sheet)
    for k, f in enumerate(frames):
        x, y = 6 + (k % cols) * (w + 6), 6 + (k // cols) * (h + 6)
        sheet.paste(Image.open(images[f]).resize((w, h)), (x, y))
        if f in marques: d.rectangle([x, y, x + w - 1, y + h - 1], outline="red", width=4)
        d.rectangle([x, y, x + 44, y + 20], fill="white"); d.text((x + 4, y + 4), str(f), fill="red")
    sheet.save(chemin); print("->", chemin, f"({len(frames)} images)")

# --- mesures ---------------------------------------------------------------
petit = {}
for f in toutes:
    im = Image.open(images[f]).convert("L")
    petit[f] = im.resize((180, 320), Image.BOX)
detail = {}
for f, im in petit.items():
    flou = im.filter(ImageFilter.GaussianBlur(6))
    detail[f] = ImageStat.Stat(ImageChops.difference(im, flou)).mean[0]

vides = [f for f in toutes if detail[f] < SEUIL_VIDE]
runs, cur = [], []
for f in toutes:
    if f in vides and (not cur or f == cur[-1] + 1): cur.append(f)
    else:
        if len(cur) > MAX_VIDE: runs.append((cur[0], cur[-1]))
        cur = [f] if f in vides else []
if len(cur) > MAX_VIDE: runs.append((cur[0], cur[-1]))

fige = []
for f in toutes:
    g = f + fps
    if g in petit:
        a, b = petit[f].resize((90, 160), Image.BOX), petit[g].resize((90, 160), Image.BOX)
        if ImageStat.Stat(ImageChops.difference(a, b)).mean[0] < SEUIL_FIGE: fige.append(f)

# --- contraste sujet / fond -------------------------------------------------
# Luminance relative (WCAG) en 8 bits : RGB → linéaire (LUT) → Rec.709.
LUT = [round(255 * ((v / 255) / 12.92 if v / 255 <= 0.04045 else ((v / 255 + 0.055) / 1.055) ** 2.4)) for v in range(256)] * 3
def luminance(im):
    return im.convert("RGB").point(LUT).convert("L", (0.2126, 0.7152, 0.0722, 0))

def quantile(lum, mk, q):
    h = lum.histogram(mk); n = sum(h); c = 0
    for v, k in enumerate(h):
        c += k
        if n and c >= q * n: return v / 255
    return 0.0

def ratio(a, b):
    a, b = max(a, b), min(a, b)
    return (a + 0.05) / (b + 0.05)

def contraste(lum, X0, Y0, X1, Y1, texte=False):
    W, H = X1 - X0, Y1 - Y0
    m, e = 0.07 * max(W, H), 0.06 * min(W, H)
    def masque(plein, vide=None):
        mk = Image.new("1", lum.size, 0); d = ImageDraw.Draw(mk)
        d.rectangle(plein, fill=1)
        if vide: d.rectangle(vide, fill=0)
        return mk
    fond = quantile(lum, masque([X0 - m, Y0 - m, X1 + m, Y1 + m], [X0, Y0, X1, Y1]), 0.5)
    boite = masque([X0, Y0, X1, Y1])
    if texte:  # sujet = des lettres : les 2 % de pixels les plus clairs / les plus foncés de la boîte (les glyphes)
        return max(ratio(quantile(lum, boite, 0.98), fond), ratio(quantile(lum, boite, 0.02), fond))
    masse = quantile(lum, boite, 0.5)
    band = masque([X0, Y0, X1, Y1], [X0 + e, Y0 + e, X1 - e, Y1 - e])
    return max(ratio(masse, fond), ratio(quantile(lum, band, 0.25), fond), ratio(quantile(lum, band, 0.75), fond))

DERIVE = 0.04   # tolérance de flottement : la boîte est aussi testée décalée de ±2 % / ±4 % (on garde la meilleure)
peu_contrastes, mesures = [], []
for spec in filter(None, sujets.split(";")):
    morceaux = spec.split(":")
    plage, boite = morceaux[0], morceaux[1]
    est_texte = len(morceaux) > 2 and morceaux[2] == "texte"
    a, b = map(int, plage.split("-"))
    x, y, l, h = map(float, boite.split(","))
    for f in range(a, b + 1):
        if f not in images: continue
        im = Image.open(images[f]); k = max(im.size) / 1920; lum = luminance(im)  # boîtes en px de la composition (grand côté = 1920)
        pas_d = [-1, -0.5, 0, 0.5, 1]
        r = max(contraste(lum, (x + dx * DERIVE * l) * k, (y + dy * DERIVE * h) * k,
                          (x + l + dx * DERIVE * l) * k, (y + h + dy * DERIVE * h) * k, est_texte)
                for dx in pas_d for dy in pas_d)
        mesures.append((f, r, spec))
        if r < SEUIL_CONTRASTE: peu_contrastes.append(f)

print(f"Détail : min {min(detail.values()):.2f} (frame {min(detail, key=detail.get)}), médiane {sorted(detail.values())[len(detail)//2]:.2f}")
ok = True
if runs:
    ok = False
    for a, b in runs: print(f"❌ QUASI VIDE frames {a}-{b} ({b - a + 1} images > {MAX_VIDE})")
else:
    print(f"✅ Aucune suite de plus de {MAX_VIDE} images quasi vides ({len(vides)} image(s) isolée(s) sous le seuil)")
if fige:
    ok = False
    print(f"❌ FIGÉ pendant 1 s à partir des frames : {fige[:20]}{' …' if len(fige) > 20 else ''}")
else:
    print("✅ Aucun plan figé plus de 1 s (fin comprise)")

if mesures:
    fmin, rmin, smin = min(mesures, key=lambda t: t[1])
    if peu_contrastes:
        ok = False
        print(f"❌ CONTRASTE sujet/fond < {SEUIL_CONTRASTE}:1 sur {len(peu_contrastes)} image(s) (min {rmin:.2f}:1 frame {fmin}, sujet {smin})")
    else:
        print(f"✅ Contraste sujet/fond ≥ {SEUIL_CONTRASTE}:1 partout (min {rmin:.2f}:1 frame {fmin}, sujet {smin})")
    for spec in filter(None, sujets.split(";")):
        rs = [r for _, r, s_ in mesures if s_ == spec]
        if rs: print(f"   {spec} : min {min(rs):.2f}:1, médiane {sorted(rs)[len(rs)//2]:.2f}:1")

marques = set(vides) | set(fige) | set(peu_contrastes)
planche(toutes[::pas], os.path.join(out, "planche.png"), marques=marques)
for p in filter(None, plages.split(",")):
    a, b = map(int, p.split("-"))
    planche(list(range(a, b + 1)), os.path.join(out, f"plage_{a}-{b}.png"), cols=8, w=240, marques=marques)
sys.exit(0 if ok else 2)
