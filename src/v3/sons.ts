/**
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
export type Bruitage = {f: number; src: string; volume: number; duree?: number};

/** Dossier des sons dans public/ (voir scripts/copier-sons.sh). */
export const DOSSIER_SONS = 'sons-fluide';

type Def = {fichiers: string[]; gain: number; marquant: boolean; duree?: number};
const v = (base: string, n: number) => Array.from({length: n}, (_, i) => `${base}-${i + 1}.wav`);

/** Actions → fichiers (relatifs à la bibliothèque), gain de base, son marquant ou secondaire. */
export const ACTIONS = {
  // texte (bas)
  frappe: {fichiers: v('texte/frappe-douce', 3), gain: 0.12, marquant: false},
  frappeMeca: {fichiers: v('texte/frappe-mecanique', 3), gain: 0.12, marquant: false},
  machineAEcrire: {fichiers: v('texte/machine-a-ecrire', 2), gain: 0.2, marquant: true},
  stylo: {fichiers: v('texte/stylo', 2), gain: 0.14, marquant: false, duree: 60},
  bulle: {fichiers: [...v('texte/bulle-pop', 2), ...v('texte/bulle-pop-douce', 2)], gain: 0.22, marquant: true},
  // interface
  tap: {fichiers: v('interface/tap', 3), gain: 0.16, marquant: false},
  clic: {fichiers: [...v('interface/clic', 2), 'interface/clic-souris.wav'], gain: 0.16, marquant: false},
  swipe: {fichiers: v('interface/swipe', 3), gain: 0.2, marquant: false},
  scroll: {fichiers: v('interface/scroll', 2), gain: 0.16, marquant: false},
  toggleOn: {fichiers: ['interface/toggle-on.wav'], gain: 0.22, marquant: false},
  toggleOff: {fichiers: ['interface/toggle-off.wav'], gain: 0.22, marquant: false},
  notification: {fichiers: ['interface/notification.wav', 'interface/notification-montante.wav', 'interface/notification-double.wav'], gain: 0.24, marquant: true},
  vibration: {fichiers: v('interface/vibration', 2), gain: 0.16, marquant: false},
  // mouvement
  carte: {fichiers: [...v('mouvement/whoosh-court', 3), ...v('mouvement/whoosh-vif', 2)], gain: 0.26, marquant: true},
  raccord: {fichiers: [...v('mouvement/whoosh-long', 2), 'mouvement/whoosh-air-2.wav', ...v('mouvement/glissement', 2)], gain: 0.3, marquant: true},
  zoomAvant: {fichiers: v('mouvement/zoom-avant', 2), gain: 0.28, marquant: true},
  zoomArriere: {fichiers: v('mouvement/zoom-arriere', 2), gain: 0.28, marquant: true},
  montee: {fichiers: [...v('mouvement/rise', 2), 'mouvement/rise-tonal.wav'], gain: 0.24, marquant: true, duree: 75},
  chute: {fichiers: [...v('mouvement/drop', 2), 'mouvement/chute-air.wav'], gain: 0.26, marquant: true},
  // impact (les plus forts)
  impact: {fichiers: [...v('impact/hit', 3), ...v('impact/hit-titre', 2)], gain: 0.34, marquant: true},
  boom: {fichiers: v('impact/boom', 2), gain: 0.36, marquant: true, duree: 50},
  stinger: {fichiers: [...v('impact/stinger', 2), 'impact/stinger-doux.wav'], gain: 0.3, marquant: true, duree: 70},
  // chiffres
  tic: {fichiers: [...v('chiffres/tic', 3), ...v('chiffres/tic-bois', 2)], gain: 0.12, marquant: false},
  compteur: {fichiers: v('chiffres/compteur', 2), gain: 0.2, marquant: false},
  ding: {fichiers: [...v('chiffres/ding', 2), 'chiffres/ding-clair.wav'], gain: 0.26, marquant: true},
  // foot (Scorro)
  sifflet: {fichiers: v('foot/sifflet', 3), gain: 0.26, marquant: true},
  ballon: {fichiers: v('foot/ballon-frappe', 3), gain: 0.3, marquant: true},
  but: {fichiers: ['foot/but-cri-1.mp3', 'foot/but-cri-2.mp3'], gain: 0.3, marquant: true, duree: 120},
  fouleJoie: {fichiers: ['foot/foule-joie.wav'], gain: 0.24, marquant: true, duree: 90},
  surprise: {fichiers: ['foot/souffle-surprise.wav'], gain: 0.2, marquant: true},
  // réussite
  cash: {fichiers: ['reussite/cash.wav', 'reussite/pieces.wav'], gain: 0.26, marquant: true},
  sparkle: {fichiers: [...v('reussite/sparkle', 2), 'reussite/sparkle-balaye.wav'], gain: 0.2, marquant: false},
  levelUp: {fichiers: ['reussite/level-up.wav', 'reussite/succes.wav'], gain: 0.24, marquant: true, duree: 75},
} satisfies Record<string, Def>;
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

export type BruitageFluide = Bruitage & {vitesse?: number};

/**
 * Transforme les actions clés en liste de bruitages dosée :
 *  - « texte » (frappe) : 3-4 frappes au début, puis plus rien (le clavier s'efface) ;
 *  - « compteur » : tic-tic jusqu'à `fin`, puis un ding ;
 *  - au plus un son marquant toutes les `ecartMarquant` images (défaut 60 = 2 s) : les autres passent en secondaire ;
 *  - jamais le même fichier deux fois de suite pour la même action.
 */
export const planBruitages = (evenements: Evenement[], {graine = 1, ecartMarquant = 60, gainGlobal = 1} = {}): BruitageFluide[] => {
  const rnd = alea(graine);
  const dernierFichier: Partial<Record<Action, string>> = {};
  const out: BruitageFluide[] = [];
  let dernierMarquant = -1e9;
  const poser = (f: number, action: Action, secondaire: boolean) => {
    const def: Def = ACTIONS[action];
    const choix = def.fichiers.filter((x) => x !== dernierFichier[action] || def.fichiers.length === 1);
    const fichier = choix[Math.floor(rnd() * choix.length)];
    dernierFichier[action] = fichier;
    let marquant = def.marquant && !secondaire;
    if (marquant && f - dernierMarquant < ecartMarquant) marquant = false; // dosage
    if (marquant) dernierMarquant = f;
    const varVol = 10 ** (((rnd() - 0.5) * 3) / 20); // ±1,5 dB
    const gain = def.gain * (marquant || !def.marquant ? 1 : 1 / 3) * varVol * gainGlobal;
    out.push({f, src: `${DOSSIER_SONS}/${fichier}`, volume: Math.min(0.9, gain), duree: def.duree ?? 45, vitesse: 1 + (rnd() - 0.5) * 0.06});
  };
  for (const e of [...evenements].sort((a, b) => a.f - b.f)) {
    if (e.action === 'frappe' || e.action === 'frappeMeca') {
      // quelques frappes au début du texte, puis le clavier s'efface
      const n = 3 + Math.floor(rnd() * 2);
      for (let k = 0; k < n; k++) poser(e.f + k * (3 + Math.floor(rnd() * 3)), e.action, true);
    } else if (e.action === 'compteur') {
      poser(e.f, 'compteur', true);
      if (e.fin !== undefined) poser(e.fin, 'ding', false);
    } else {
      poser(e.f, e.action, !!e.secondaire);
    }
  }
  return out;
};

/** Nappe de fond très discrète (jamais de silence total). */
export const NAPPES = {
  air: `${DOSSIER_SONS}/nappes/nappe-air.mp3`,
  chaude: `${DOSSIER_SONS}/nappes/nappe-chaude.mp3`,
  piece: `${DOSSIER_SONS}/nappes/ambiance-piece.mp3`,
  stade: `${DOSSIER_SONS}/foot/stade-ambiance-2.mp3`,
} as const;
/** Volume conseillé d'une nappe : à peine audible (≈ −30 dB sous la voix). */
export const VOLUME_NAPPE = 0.05;
