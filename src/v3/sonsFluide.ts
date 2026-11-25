/**
 * [25/11] Version « méthode du 24/11 » (table actions.json du skill, 138 sons), utilisée par le récap et l'avant-journée v3.
 * Les autres formats gardent ./sons.ts (inchangé : mêmes sons qu'avant).
 *
 * Bruitages v3 — choisir et doser les sons de la bibliothèque du skill (~/.claude/skills/video-fluide/sons/).
 *
 * Usage :
 *   1) copier la bibliothèque dans le projet : `scripts/copier-sons.sh <projet>` → <projet>/public/sons-fluide/
 *   2) décrire les ACTIONS clés de la vidéo (image + action), puis :
 *        const liste = planBruitages([{f: 12, action: 'carte'}, {f: 40, action: 'chiffre', fin: 70}, …], {graine: 7});
 *        <Bruitages liste={liste} />   et, une fois :   <Nappe duree={DUREE} />
 *
 * Règles appliquées (décisions de l'éditeur du 24/11/2026) :
 *  - chaque action clé a son son ; on ne répète jamais le même fichier deux fois de suite pour une action
 *    (variantes + hauteur ±3 % et volume ±1,5 dB tirés par graine → rendu reproductible) ;
 *  - DOSAGE : au plus ~1 son MARQUANT toutes les 2 s ; un son marquant trop proche du précédent passe en « secondaire »
 *    (volume ÷ 3) ; les actions secondaires restent très bas ; une nappe très discrète en fond ;
 *  - mixage : texte plus bas que les impacts ; le total est normalisé à −16 LUFS au rendu final (finaliser.py).
 */
import type {Son as Bruitage} from './kit';

/** Dossier des sons dans public/ (voir scripts/copier-sons.sh). */
export const DOSSIER_SONS = 'sons-fluide';

type Def = {fichiers: string[]; gain: number; marquant: boolean; duree?: number};
// TABLE UNIQUE actions → sons : actions.json de la bibliothèque (copiée par scripts/copier-sons.sh dans public/sons-fluide/).
// Le mixeur Python (sons/mixer_bruitages.py) lit le même fichier : une seule source de vérité.
import CFG from '../../public/sons-fluide/actions.json';
// Scorro Posts (25/11) : bibliothèque copiée du skill le 25/11 (138 sons) ; licences par fichier dans public/sons-fluide/index.json et LICENCES.md.
/** Actions → fichiers (relatifs à la bibliothèque), gain de base, son marquant ou secondaire. */
export const ACTIONS = CFG.actions as Record<keyof typeof CFG.actions, Def>;
/** Crédits obligatoires (sons CC BY) : fichier → texte à mettre dans la description de la vidéo. */
export const CREDITS = CFG.credits as Record<string, string>;

/**
 * GARDE LICENCE (décision de l'éditeur, 24/11/2026) : un son non commercial (CC BY-NC, dossier perso-non-commercial/)
 * est REFUSÉ sauf si la vidéo est explicitement marquée « cours perso » (privée, jamais publiée ni payante).
 * Sans licence claire : interdit partout (aucun fichier hors bibliothèque n'est accepté).
 */
export const estNonCommercial = (fichier: string) => (CFG.nc_prefixes as string[]).some((p) => fichier.startsWith(p));
export const verifierLicences = (fichiers: string[], {coursPerso = false} = {}) => {
  for (const f of fichiers) {
    if (estNonCommercial(f) && !coursPerso) throw new Error(`Son non commercial refusé : ${f} (autorisé seulement avec coursPerso: true)`);
  }
};
export type Action = keyof typeof ACTIONS;

export type Evenement = {
  /** image de l'action (le son démarre à l'image exacte du mouvement : contact, apparition…) */
  f: number;
  action: Action;
  /** pour `chiffre` / `texte` : image de fin (compteur jusqu'à la fin puis ding ; frappes au début seulement) */
  fin?: number;
  /** forcer secondaire (très bas) */
  secondaire?: boolean;
};

/** Pseudo-aléatoire déterministe (mulberry32). */
const alea = (graine: number) => {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export type BruitageFluide = Bruitage & {vitesse?: number; action?: Action; fichier?: string; marquant?: boolean};
/** Sons CC BY (crédit obligatoire dans la description). Scorro Posts les écarte par défaut (sansCredit) : aucune légende à modifier. */
export const demandeCredit = (fichier: string) => fichier in CREDITS;

/**
 * Transforme les actions clés en liste de bruitages dosée :
 *  - « texte » (frappe) : 3-4 frappes au début, puis plus rien (le clavier s'efface) ;
 *  - « compteur » : tic-tic jusqu'à `fin`, puis un ding ;
 *  - au plus un son marquant toutes les `ecartMarquant` images (défaut 60 = 2 s) : les autres passent en secondaire ;
 *  - jamais le même fichier deux fois de suite pour la même action.
 */
export const planBruitages = (evenements: Evenement[], {graine = 1, ecartMarquant = 60, gainGlobal = 1, coursPerso = false, sansCredit = true, varierHauteur = true, exclure = [] as string[]} = {}): BruitageFluide[] => {
  const rnd = alea(graine);
  const dernierFichier: Partial<Record<Action, string>> = {};
  const out: BruitageFluide[] = [];
  let dernierMarquant = -1e9;
  const poser = (f: number, action: Action, secondaire: boolean) => {
    const def: Def = ACTIONS[action];
    const pool = def.fichiers.filter((x) => !(sansCredit && demandeCredit(x)) && !exclure.includes(x));
    if (!pool.length) throw new Error(`aucun son sans crédit pour l'action ${String(action)}`);
    const choix = pool.filter((x) => x !== dernierFichier[action] || pool.length === 1);
    const fichier = choix[Math.floor(rnd() * choix.length)];
    dernierFichier[action] = fichier;
    let marquant = def.marquant && !secondaire;
    if (marquant && f - dernierMarquant < ecartMarquant) marquant = false; // dosage
    if (marquant) dernierMarquant = f;
    const varVol = 10 ** (((rnd() - 0.5) * 3) / 20); // ±1,5 dB
    const gain = def.gain * (marquant || !def.marquant ? 1 : 1 / 3) * varVol * gainGlobal;
    out.push({f, src: `${DOSSIER_SONS}/${fichier}`, volume: Math.min(0.9, gain), duree: def.duree ?? 45, vitesse: ((h) => (varierHauteur ? h : 1))(1 + (rnd() - 0.5) * 0.06), action, fichier, marquant}); // tirage gardé même sans hauteur : mêmes variantes
  };
  for (const e of [...evenements].sort((a, b) => a.f - b.f)) {
    if (e.action === 'frappe' || e.action === 'frappeMeca') {
      // quelques frappes au début du texte, puis le clavier s'efface
      const n = 3 + Math.floor(rnd() * 2);
      for (let k = 0, g = e.f; k < n; k++, g += 3 + Math.floor(rnd() * 3)) poser(g, e.action, true); // écart de 3 à 5 images entre deux frappes (Scorro, 25/11)
    } else if (e.action === 'compteur') {
      poser(e.f, 'compteur', true);
      if (e.fin !== undefined) poser(e.fin, 'ding', false);
    } else {
      poser(e.f, e.action, !!e.secondaire);
    }
  }
  verifierLicences(out.map((b) => b.fichier ?? ''), {coursPerso});
  return out;
};

/** Nappes de fond très discrètes (jamais de silence total). `stade` = vraies tribunes (Openverse, CC0). */
export const NAPPES = Object.fromEntries(Object.entries(CFG.nappes).map(([k, v]) => [k, `${DOSSIER_SONS}/${v}`])) as Record<keyof typeof CFG.nappes, string>;
// RÈGLE SCORRO POSTS (24/11) : l'ambiance de tribunes reste la nappe Mixkit validée (stade-ambiance-2), pas « tribunes-ambiance »
// (vraie foule, chants lointains possibles). NAPPES.stade est donc redirigée ici ; la bibliothèque, elle, n'est pas modifiée.
NAPPES.stade = NAPPES.stadeMixkit;

/** Crédits à mettre dans la description pour une liste de bruitages (sons CC BY utilisés). */
export const creditsPour = (liste: {src: string}[]) =>
  [...new Set(liste.map((b) => CREDITS[b.src.replace(`${DOSSIER_SONS}/`, '')]).filter(Boolean))];
/** Volume conseillé d'une nappe : à peine audible (≈ −30 dB sous la voix). */
export const VOLUME_NAPPE = 0.05;
