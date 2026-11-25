// Sons Scorro Posts (méthode du 24/11, skill video-fluide), communs aux formats v3. AUCUNE musique : bruitages discrets + nappe de stade.
import { NAPPES } from './sonsFluide';
import type { Son } from './kit';

/** Images entre le départ d'un ressort `arrivee()` (damping 12, stiffness 140, mass 0.8) et son contact (première fois à 1) : 6 à 30 i/s. */
export const CONTACT = 6;
/** Nappe Mixkit « Ambient sports crowd » (−14,3 LUFS) : assez présente pour viser −16 LUFS sans saturer, sous les bruitages. */
export const VOLUME_NAPPE_SCORRO = 0.2;
/** Bruitages « discrets » : gains de la bibliothèque × 0,65 → l'écart crête-niveau reste ≤ 14,5 dB (−16 LUFS sans limiteur, crête ≤ −1,5 dBTP). */
export const GAIN_BRUITAGES = 0.65;
// Le fichier (20 s) a un fondu d'entrée (~0,6 s) et de sortie (~0,4 s) : une boucle laissait un trou de 0,45 s (earshot, 25/11).
// On enchaîne donc des segments qui sautent le fondu d'entrée et se recouvrent de 15 images (le suivant entre en fondu pendant que le précédent s'éteint).
const NAPPE_IMAGES = 600, SAUT = 18, RECOUVRE = 15;
export const nappeScorro = (total: number): Son[] => {
  const out: Son[] = [];
  for (let f = 0, k = 0; f < total; k++) {
    const duree = Math.min(NAPPE_IMAGES - SAUT, total - f);
    out.push({ f, src: NAPPES.stade, volume: VOLUME_NAPPE_SCORRO, duree, nappe: true, debutFichier: SAUT, fondu: k ? RECOUVRE : undefined });
    f += NAPPE_IMAGES - SAUT - RECOUVRE;
  }
  return out;
};
/** Graine tirée des données (ids des matchs) : chaque vidéo a ses variantes, et un même JSON redonne exactement le même son. */
export const graineDe = (d: any) => {
  const cle = (d.matchs ?? [d]).map((m: any) => m.id ?? '').join('-') || 'scorro';
  let h = 2166136261;
  for (const c of String(cle)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h || 7;
};
/** Liste finale d'un format : nappe + bruitages. Pas de variation de hauteur/vitesse (OPTIONS_SONS) : dans Remotion, playbackRate et toneFrequency
 *  passent par atempo, qui déforme l'onde (constaté le 25/11 : corrélation 0,03-0,2, calage non vérifiable). La variété vient des variantes + volume ±1,5 dB. */
export const sonsScorro = (total: number, liste: Son[], diag: { sansNappe?: boolean } = {}): Son[] => [...(diag.sansNappe ? [] : nappeScorro(total)), ...liste];
/** Options communes de planBruitages pour Scorro Posts : sons CC BY écartés (aucun crédit à ajouter), bruitages discrets, sans variation de vitesse. */
/** Sons PONCTUELS dont le choc arrive tard (mesuré le 25/11) : impact-forge 21-31 images de quasi-silence, hit-titre pic à +150 ms (earshot : « no hit »),
 *  sifflet-3 (pic à +6 images), whoosh-long 1-2 (attaque à +5-7 images, pic à +15 : calage introuvable sur la story après-match, 25/11), zoom-avant-1 (pic à +25 : « no hit » earshot sur le duel, 25/11), frappe-douce-1 et sparkle 2 / balayé lents. Ils tomberaient après le mouvement. */
export const ATTAQUE_TARDIVE = ['foot/sifflet-3.wav', 'mouvement/whoosh-long-1.wav', 'mouvement/whoosh-long-2.wav', 'mouvement/zoom-avant-1.wav', 'impact/hit-titre-1.wav', 'impact/hit-titre-2.wav', 'impact/impact-forge_01.wav', 'impact/impact-forge_02.wav', 'impact/impact-forge_03.wav', 'impact/impact-forge_04.wav', 'texte/frappe-douce-1.wav', 'reussite/sparkle-2.wav', 'reussite/sparkle-balaye.wav'];
export const OPTIONS_SONS = { sansCredit: true, gainGlobal: GAIN_BRUITAGES, varierHauteur: false, exclure: ATTAQUE_TARDIVE };
