import React from 'react';
import { Audio, Sequence, interpolate, staticFile } from 'remotion';
// Mixage des effets sonores (AUCUNE musique). Actif seulement si les props contiennent `sons: true` : sans cela, les vidéos restent muettes.
export type Cue = { frame: number; fichier: string; volume: number; duree?: number; boucle?: boolean; entree?: number; sortie?: number; depart?: number };
const fondu = (volume: number, duree: number, fin = 12, debut = 4) => (f: number) =>
  volume * interpolate(f, [0, debut, Math.max(debut + 1, duree - fin), duree], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
export const Mixage: React.FC<{ cues: Cue[] }> = ({ cues }) => (
  <>
    {cues.map((c, i) => (
      <Sequence key={i} from={Math.max(0, c.frame)} durationInFrames={c.duree ?? 90}>
        <Audio src={staticFile(`sons/${c.fichier}.mp3`)} loop={c.boucle} startFrom={c.depart ?? 0} volume={fondu(c.volume, c.duree ?? 90, c.sortie ?? 12, c.entree ?? 4)} />
      </Sequence>
    ))}
  </>
);
const choisir = <T,>(liste: T[], graine: number) => liste[Math.abs(graine) % liste.length];
const WHOOSH = ['whoosh-2']; // le seul retenu après écoute
const FADE = 9; // 0,3 s : fondu court, calé sur le whoosh
// Durées des fichiers (images à 30 i/s) : sert à enchaîner deux sons si l'un est trop court.
const LONGUEUR: Record<string, number> = { 'clameur-victoire': 300, 'stade-joie': 450, 'clameur-courte': 120 };
// Un son d'ambiance qui couvre de `depart` à `fin` sans trou : si le fichier est trop court, le suivant arrive en fondu croisé (15 images).
function couvrir(fichiers: string[], depart: number, fin: number, volume: number, entree = 12): Cue[] {
  const out: Cue[] = [];
  let t = depart, k = 0;
  while (t < fin && k < 6) {
    const f = fichiers[k % fichiers.length], l = LONGUEUR[f] ?? 300, dernier = t + l >= fin;
    const duree = dernier ? fin - t : l;
    out.push({ frame: t, fichier: f, volume, duree, entree: k === 0 ? entree : 15, sortie: dernier ? FADE : 15 });
    t += l - 15; k++;
  }
  return out;
}
// Fond par défaut : A (foule filtrée). Variantes d'essai : B aucun, C pluie légère, D oiseaux.
const FONDS: Record<string, { fichier: string; volume: number } | null> = { A: { fichier: 'fond-a', volume: 0.09 }, B: null, C: { fichier: 'fond-c', volume: 0.07 }, D: { fichier: 'fond-d', volume: 0.07 } };
// Plan sonore d'un format. `total` = durée du contenu (sans l'écran de fin), `coupes` = images où la carte change.
// Règle : aucun son ne s'arrête au milieu d'un écran ; chacun finit sur une transition (fondu de 0,3 s calé sur le whoosh).
export function planSons(format: 'avant-match' | 'apres-match', id: number, total: number, coupes: number[], fond?: string): Cue[] {
  const f = FONDS[fond ?? 'A'];
  const cues: Cue[] = [];
  // Ambiance de foule continue : tout le contenu, puis fondu de 0,3 s sur la transition vers l'écran de fin.
  if (f) cues.push({ frame: 0, fichier: f.fichier, volume: f.volume, duree: total, depart: (id % 40) * 30, entree: 20, sortie: FADE });
  // Sifflet dès le début, posé sur l'ambiance déjà présente.
  if (sifflet) cues.push({ frame: 8, fichier: choisir(['sifflet-court', 'sifflet'], id), volume: 0.28, duree: 45 });
  // Whoosh à chaque changement de carte, y compris vers l'écran de fin.
  [...coupes, total].forEach((c, i) => cues.push({ frame: c - 6, fichier: choisir(WHOOSH, id + i), volume: 0.22, duree: 36 }));
  // Applaudissements courts sur l'écran de fin (qui dure 75 images).
  cues.push({ frame: total, fichier: 'applaudissements', volume: 0.2, duree: 75, entree: 6, sortie: 15 });
  if (format === 'apres-match' && coupes.length) {
    // Supporters dès le début, sans interruption jusqu'au swipe vers les stats, puis fondu de 0,3 s.
    // Une clameur plus forte se pose dessus quand le score apparaît (image 50), jusqu'au même swipe.
    const swipe = coupes[0];
    const duo = id % 2 === 0 ? ['stade-joie', 'clameur-victoire'] : ['clameur-victoire', 'stade-joie'];
    cues.push(...couvrir([duo[0], duo[1]], 0, swipe, 0.12));
    cues.push(...couvrir([duo[1], duo[0]], 50, swipe, 0.2, 6));
  }
  return cues;
}

// Mixage générique pour les autres formats (avant-journée, récap, joueurs de la journée, classements, fonctionnalités).
// `moments` = [début, fin] d'un moment fort : la clameur démarre au début et s'arrête à la fin, qui est une transition (fondu de 0,3 s).
const CLAMEURS = ['clameur-courte', 'clameur-victoire', 'stade-joie'];
export function planSonsGen(id: number, total: number, coupes: number[], moments: [number, number][] = [], fond?: string, sifflet = true): Cue[] {
  const f = FONDS[fond ?? 'A'];
  const cues: Cue[] = [];
  if (f) cues.push({ frame: 0, fichier: f.fichier, volume: f.volume, duree: total, depart: (id % 40) * 30, entree: 20, sortie: FADE });
  cues.push({ frame: 8, fichier: choisir(['sifflet-court', 'sifflet'], id), volume: 0.28, duree: 45 });
  [...coupes.filter((c) => c > 0 && c < total), total].forEach((c, i) => cues.push({ frame: c - 6, fichier: choisir(WHOOSH, id + i), volume: 0.22, duree: 36 }));
  cues.push({ frame: total, fichier: 'applaudissements', volume: 0.2, duree: 75, entree: 6, sortie: 15 });
  moments.forEach(([a, b], i) => { if (b - a >= 20) cues.push({ frame: a, fichier: choisir(CLAMEURS, id + i), volume: 0.2, duree: Math.min(b - a, LONGUEUR[choisir(CLAMEURS, id + i)] ?? 300), entree: 5, sortie: FADE }); });
  return cues;
}

// Vidéo de présentation : un fond calme et UNIFORME sur toute la durée (aucune ambiance de match), whoosh n°2 à chaque transition. Rien d'autre, aucune musique.
export function planSonsPresentation(nPlans: number, parPlan: number, fin: number, fichier: string, volume = 0.1): Cue[] {
  const total = nPlans * parPlan + fin;
  const cues: Cue[] = [{ frame: 0, fichier, volume, duree: total, entree: 24, sortie: 24 }];
  for (let i = 1; i <= nPlans; i++) cues.push({ frame: i * parPlan - 6, fichier: 'whoosh-2', volume: 0.22, duree: 36 });
  return cues;
}
