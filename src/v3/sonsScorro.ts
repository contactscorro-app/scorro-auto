// Sons Scorro Posts, communs aux formats v3. AUCUNE musique, AUCUN fond continu (25/11 15:50) : silence + quelques sons ponctuels doux.
import { NAPPES } from './sonsFluide';
import type { Son } from './kit';

/** Images entre le départ d'un ressort `arrivee()` (damping 12, stiffness 140, mass 0.8) et son contact (première fois à 1) : 6 à 30 i/s. */
export const CONTACT = 6;
/** [RETIRÉE le 25/11 15:50 : plus aucun fond continu ; gardée pour les rendus d'archive `sonsAnciens` seulement] Nappe Mixkit « Ambient sports crowd » (−14,3 LUFS) : assez présente pour viser −16 LUFS sans saturer, sous les bruitages. */
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
// ───────── FOND EN SILENCE (décision de l'éditeur, 25/11 15:50) ─────────
// Le fond continu (nappe, ambiance de stade, tout son continu) « fait mal à la tête » : il est SUPPRIMÉ de tous les formats.
// Le fond est en silence ; seuls restent quelques sons PONCTUELS, doux et courts, aux moments forts. Un son douteux est coupé.
/** Actions gardées en production (tout le reste est coupé) : le raccord d'accroche (souffle d'air ou glissement), la révélation
 *  (score ou chiffre qui se pose), la bulle feutrée, la notification (fonctionnalités) et le « ding » léger de fin. */
export const ACTIONS_GARDEES = ['raccord', 'impact', 'bulle', 'notification', 'ding'] as const;
/** Fichiers gardés par action (mesurés le 25/11 : courts, sans aigu agressif, choc dans les 2 premières images, fin propre).
 *  Écartés : sifflets (aigus, stridents), whoosh vifs et longs, clics et frappes (secs), sparkle et machine à écrire (aigus),
 *  boom, thump et stinger (lourds ou tardifs), foules et cris (continus), zooms (souffle long, trop de sons). */
export const SONS_DOUX: Record<string, string[]> = {
  raccord: ['mouvement/whoosh-air-2.wav', 'mouvement/glissement-1.wav', 'mouvement/glissement-2.wav'],
  impact: ['impact/hit-1.wav', 'impact/hit-2.wav', 'impact/hit-3.wav'],
  bulle: ['texte/bulle-pop-douce-1.wav', 'texte/bulle-pop-douce-2.wav'],
  notification: ['interface/notification.wav', 'interface/notification-montante.wav'],
  ding: ['chiffres/ding-1.wav', 'chiffres/ding-2.wav', 'chiffres/ding-clair.wav'],
};
/** Au plus un son toutes les 3 s (90 images) : 5 au plus par 15 s. En cas de conflit, la priorité décide (révélation > fin > accroche). */
export const ECART_SONS = 90;
const PRIORITE: Record<string, number> = { impact: 0, notification: 0, ding: 1, bulle: 2, raccord: 3 };
/** Filtre de production : supprime tout son continu et tout son douteux, garde au plus 1 son / 3 s, priorité aux moments forts. */
export const sonsPonctuels = (liste: Son[]): Son[] => {
  const ok = (liste as (Son & { action?: string; fichier?: string; marquant?: boolean })[]).filter((b) => !b.nappe && b.action && (ACTIONS_GARDEES as readonly string[]).includes(b.action) && b.marquant !== false && SONS_DOUX[b.action].includes(b.fichier ?? ''));
  const gardes: typeof ok = [];
  for (const b of [...ok].sort((a, z) => PRIORITE[a.action!] - PRIORITE[z.action!] || a.f - z.f)) if (gardes.every((g) => Math.abs(g.f - b.f) >= ECART_SONS)) gardes.push(b);
  // jamais le même fichier deux fois de suite (le filtre a pu rapprocher deux tirages identiques) : on prend la variante douce suivante
  const out = gardes.sort((a, z) => a.f - z.f).map((b) => ({ ...b }));
  for (let i = 1; i < out.length; i++) if (out[i].src === out[i - 1].src) {
    const v = SONS_DOUX[out[i].action!], k = v.indexOf(out[i].fichier!), alt = v[(k + 1) % v.length];
    if (alt !== out[i].fichier) Object.assign(out[i], { fichier: alt, src: out[i].src.replace(out[i].fichier!, alt) });
  }
  return out;
};
/** Liste finale d'un format : SANS nappe (fond en silence), sons ponctuels doux seulement. Pas de variation de hauteur/vitesse (OPTIONS_SONS) :
 *  dans Remotion, playbackRate et toneFrequency passent par atempo, qui déforme l'onde (25/11). `total` reste dans la signature (appels existants). */
export const sonsScorro = (_total: number, liste: Son[], _diag: { sansNappe?: boolean } = {}): Son[] => sonsPonctuels(liste);
/** Options communes de planBruitages pour Scorro Posts : sons CC BY écartés (aucun crédit à ajouter), bruitages discrets, sans variation de vitesse. */
/** Sons PONCTUELS dont le choc arrive tard (mesuré le 25/11) : impact-forge 21-31 images de quasi-silence, hit-titre pic à +150 ms (earshot : « no hit »),
 *  sifflet-3 (pic à +6 images), whoosh-long 1-2 (attaque à +5-7 images, pic à +15 : calage introuvable sur la story après-match, 25/11), zoom-avant-1 (pic à +25 : « no hit » earshot sur le duel, 25/11), frappe-douce-1 et sparkle 2 / balayé lents. Ils tomberaient après le mouvement. */
export const ATTAQUE_TARDIVE = ['foot/sifflet-3.wav', 'mouvement/whoosh-long-1.wav', 'mouvement/whoosh-long-2.wav', 'mouvement/zoom-avant-1.wav', 'impact/hit-titre-1.wav', 'impact/hit-titre-2.wav', 'impact/impact-forge_01.wav', 'impact/impact-forge_02.wav', 'impact/impact-forge_03.wav', 'impact/impact-forge_04.wav', 'texte/frappe-douce-1.wav', 'reussite/sparkle-2.wav', 'reussite/sparkle-balaye.wav'];
/** Tous les fichiers de la table qui ne sont pas dans SONS_DOUX sont exclus du tirage (calculé dans sonsFluide.planBruitages via `seulement`). */
export const OPTIONS_SONS = { sansCredit: true, gainGlobal: GAIN_BRUITAGES, varierHauteur: false, exclure: ATTAQUE_TARDIVE, seulement: SONS_DOUX, ecartMarquant: 0 };
// ecartMarquant 0 : plus de baisse automatique (÷ 3) ; l'espacement (1 son / 3 s) est fait par sonsPonctuels, qui coupe au lieu de baisser.
