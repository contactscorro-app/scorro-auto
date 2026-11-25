// Une passe : calendrier, vidéos dues, contrôle, rendu, dépôt dans a-publier/ avec légende, puis publication (Instagram, YouTube, TikTok) si mode « auto ». Sans IA.
// Usage : node scripts/auto.mjs [--maintenant=ISO] [--sans-rendu] [--seulement=cle] [--force]
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { faireLecture, jourParis, heureParis, hhmmParis, taches, permis, creneau, choisirADecaler, planifier, capDuJour, rythmeActif, joursDeMatch, parisA, HEURE, MIN } from './decider.mjs';
const jourPlusJ = (jour, n) => jourParis(Date.parse(`${jour}T12:00:00Z`) + n * 24 * HEURE);
import { attacherClassements } from './classements.mjs';
import { echecLecture } from './decider.mjs';
import { notifier as notifierCanaux, silenceAnormal, rappelDeLaVeille } from './notifier.mjs';
import { controler } from './controler.mjs';
import { legende } from './legende.mjs';
import { controleEnvoi } from './verrou.mjs';
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
const drapeau = (n) => process.argv.includes(`--${n}`);
let maintenant = arg('maintenant') ? Date.parse(arg('maintenant')) : Date.now();
// SCORRO_ENVOIS=off : aucun envoi (essai à blanc sur le serveur). SCORRO_CI=1 : mode GitHub Actions (vidéos mises en ligne dès le rendu, légendes gardées dans l'état).
const CI = !!process.env.SCORRO_CI;
const debutPasse = Date.now();
// Verrou : une seule passe à la fois (évite les doubles envois si deux passes se chevauchent). Périmé après 20 min.
{
  const LOCK = 'etat/auto.lock';
  fs.mkdirSync('etat', { recursive: true });
  try { const t = Number(fs.readFileSync(LOCK, 'utf8')); if (Date.now() - t < 20 * 60000) { console.log('passe déjà en cours'); process.exit(0); } } catch {}
  fs.writeFileSync(LOCK, String(Date.now()));
  const rendre = () => { try { fs.rmSync(LOCK, { force: true }); } catch {} };
  process.on('exit', rendre); process.on('SIGINT', () => process.exit(1)); process.on('SIGTERM', () => process.exit(1));
}
const lireJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const cfg = lireJson('data/auto-config.json');
const pub = lireJson('data/publication.json');
const ETAT = 'etat/auto.json';
const etat = lireJson(ETAT, { calendrier: null, faites: {}, essais: {} });
etat.finis ??= {}; etat.pubs ??= []; etat.file ??= {};
const RESEAUX = ['instagram', 'youtube', 'tiktok'];
const garder = () => { fs.mkdirSync('etat', { recursive: true }); fs.writeFileSync(ETAT, JSON.stringify(etat, null, 1)); };
const horo = () => new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
// Tant que la publication n'est pas ouverte, tout tombe dans un dossier TEST, qu'on ne peut pas prendre pour un brouillon à publier.
const ouvert = pub.sportmonksOk === true && pub.appEnLigne === true;
const RACINE = 'a-publier';
const dossierJour = `${RACINE}/${ouvert ? '' : 'TEST-'}${jourParis(maintenant)}`;
fs.mkdirSync(RACINE, { recursive: true });
const erreur = (cle, texte) => { fs.appendFileSync(`${RACINE}/ERREURS.txt`, `${horo()} | ${cle} | ${texte}\n`); console.log(`🔴 ${cle} : ${texte}`); };
const FORMATS = {
  'apres-match': { v3: true, script: 'preparer-score-final', comp: 'V3ApresMatch', data: (t) => `data/score-final-${t.id}.json` },
  // Style v3 (décision du 22/11, basculé le 23/11) : v3 = vignette en image 0 + PNG de la vignette à côté du MP4. Retour arrière : remettre l'ancien comp et retirer v3.
  'apres-journee': { v3: true, script: 'preparer-apres-journee', comp: 'V3Recap', data: (t) => `data/apres-journee-${t.id}${t.jour ? `-${t.jour}` : ''}.json` },
  'joueurs-journee': { script: 'preparer-joueurs-journee', comp: 'JoueursJournee', data: (t) => `data/joueurs-journee-${t.id}.json` },
  'avant-journee': { v3: true, script: 'preparer-avant-journee', comp: 'V3AvantJournee', data: (t) => `data/avant-journee-${t.id}${t.jour ? `-${t.jour}` : ''}.json` },
  'avant-match': { script: 'preparer-avant-match', comp: 'AvantMatch', data: (t) => `data/avant-match-${t.id}.json` },
  'classement-equipes': { script: 'preparer-attaques-defenses', comp: 'ClassementJoueurs', data: (t) => `data/classement-equipes-${t.id}.json` },
  classement: { script: 'preparer-classement', comp: 'ClassementJoueurs', data: (t) => `data/classement-${t.id}.json` },
  // Stories (22/11) : mêmes données et mêmes contrôles que la vidéo de base, rendues dans a-publier/<jour>/stories/.
  'story-avant': { v3: true, script: 'preparer-avant-match', comp: 'V3StoryAvant', data: (t) => `data/avant-match-${t.id}.json`, base: 'avant-match' },
  'story-apres': { v3: true, script: 'preparer-score-final', comp: 'V3StoryApres', data: (t) => `data/score-final-${t.id}.json`, base: 'apres-match' },
  // Formats du planning du 22/11 (preparer-format.mjs). La capture de l'appli se tourne à la main.
  'f-top5': { v3: true, script: 'preparer-format', args: (t) => ['top5', String(t.id)], comp: 'V3Top5', data: (t) => `data/format-top5-${t.id}.json` },
  'f-duel': { v3: true, script: 'preparer-format', args: (t) => ['duel', String(t.id)], comp: 'V3Duel', data: (t) => `data/format-duel-${t.id}.json` },
  'f-serie': { script: 'preparer-format', args: (t) => ['serie', String(t.id)], comp: 'FormatSerie', data: (t) => `data/format-serie-${t.id}.json` },
  'f-trois': { script: 'preparer-format', args: (t) => ['trois', String(t.id)], comp: 'FormatTrois', data: (t) => `data/format-trois-${t.id}.json` },
  // Série « Fonctionnalités de l'app » (23/11) : données = data/fonctionnalites-v3.json (vraies captures), composition v3.
  // pret : vidéo déjà rendue ET contrôlée (QA image par image) dans brouillons/fonctionnalites-v3/NN-<id>.mp4 (+ .duree, .vignette.png) : l'auto la réutilise, sans nouveau rendu.
  'f-fonc': { v3: true, qa: true, pret: (t) => { const d = 'brouillons/fonctionnalites-v3'; const f = fs.existsSync(d) ? fs.readdirSync(d).find((x) => x.endsWith(`-${t.fid}.mp4`)) : null; return f && fs.existsSync(`${d}/${f.replace(/\.mp4$/, '.duree')}`) ? `${d}/${f}` : null; }, script: 'preparer-fonctionnalite', args: (t) => [t.fid], comp: 'V3Fonctionnalite', data: (t) => `data/format-fonc-${t.fid}.json` },
  'f-carte': { script: 'preparer-format', args: () => ['carte'], comp: 'FormatCarte', data: () => 'data/format-carte-maghreb.json' },
};
// Serveur : brouillons/ n'existe pas. La vidéo de fonctionnalité déjà rendue est lue dans le dépôt PRIVÉ de médias (scripts/preparer-medias.mjs),
// une seule tentative par passe et seulement dans les heures de rendu (pas de téléchargement de 40 Mo toutes les 5 min).
if (CI) {
  const pret0 = FORMATS['f-fonc'].pret, tentes = new Set();
  FORMATS['f-fonc'].pret = (t) => {
    const p = pret0(t);
    if (p || tentes.has(t.fid)) return p;
    const h = heureParis(maintenant), [a, b] = cfg.fonctionnalites?.rendu?.heures ?? [14, 21];
    if (!(h >= a && h < b)) return null;
    tentes.add(t.fid);
    const d = lancer(process.execPath, ['scripts/preparer-medias.mjs', 'fonc', t.fid]);
    if (!d.ok) erreur(`format-fonc-${t.fid}`, `vidéo prête introuvable dans le dépôt de médias : ${dernier(d.sortie)}`);
    return pret0(t);
  };
  FORMATS['f-fonc'].args = (t) => [t.fid, ...(FORMATS['f-fonc'].pret(t) ? ['--video-prete'] : [])];
}
// Export pour les réseaux (06/11) : images PNG, H.264 High yuv420p BT.709, 1080×1920 à 30 i/s, 16 Mb/s, AAC 48 kHz 192 kb/s, faststart ; grain léger dans les compositions.
const QUALITE = ['--image-format=png', '--video-bitrate=16M', '--x264-preset=medium', '--pixel-format=yuv420p', '--color-space=bt709', '--audio-bitrate=192K', '--enforce-audio-track'];
const PROXY = (process.env.SCORRO_PROXY ?? 'https://proxy-non-configure.invalid');
async function lireCalendrier() {
  const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
  const ligues = [...cfg.championnats, ...(cfg.coupesEurope ?? [cfg.c1]), ...(cfg.liguesNiveau2 ?? []), ...(cfg.liguesGrosSeulement ?? [])].join(',');
  const lignes = [];
  for (let page = 1; page <= 14; page++) {
    const r = await fetch(`${PROXY}/api/sportmonks/fixtures/between/${iso(maintenant - 7 * 24 * HEURE)}/${iso(maintenant + 7 * 24 * HEURE)}?filters=fixtureLeagues:${ligues}&include=participants;state&per_page=50&page=${page}`);
    if (!r.ok) throw new Error(`calendrier ${r.status}`);
    const j = await r.json();
    lignes.push(...(j.data ?? []));
    if (!j.pagination?.has_more) break;
    if (page === 14) throw new Error('calendrier : plus de 14 pages');
  }
  return lignes.map((f) => ({ id: f.id, ligue: f.league_id, round: f.round_id, season: f.season_id, debut: Date.parse(`${f.starting_at.replace(' ', 'T')}Z`), nom: (f.participants ?? []).map((p) => p.name).join(' – '), etat: f.state?.state, dom: f.participants?.find((p) => p.meta?.location === 'home')?.id, ext: f.participants?.find((p) => p.meta?.location === 'away')?.id }));
}
const lancer = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 26 });
  return { ok: r.status === 0, sortie: `${r.stdout ?? ''}${r.stderr ?? ''}` };
};
const dernier = (s) => (s.split('\n').find((l) => /^Error:|Error: /.test(l)) ?? s.trim().split('\n').pop() ?? '').replace(/^.*?Error: /, '').replace(/[\]\s{]+$/, '').slice(0, 300);
const slug = (t) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
// Mode serveur : le MP4 est envoyé sur la publication « videos » du dépôt de vidéos dès le rendu ; l'état garde l'URL et la légende.
function miseEnLigne(fichier) {
  const depot = process.env.VIDEOS_REPO;
  if (!depot) throw new Error('VIDEOS_REPO manquant');
  const up = lancer('gh', ['release', 'upload', 'videos', fichier, '--repo', depot, '--clobber']);
  if (!up.ok) throw new Error(`mise en ligne : ${dernier(up.sortie)}`);
  const nom = fichier.split('/').pop();
  return { url: `https://github.com/${depot}/releases/download/videos/${encodeURIComponent(nom)}`, legende: fs.readFileSync(fichier.replace(/\.mp4$/, '.txt'), 'utf8') };
}
// Serveur : installation paresseuse (seulement quand un rendu est nécessaire) des dépendances, des bibliothèques de Chrome et des médias non versionnés.
let rendu_pret = false;
function preparerRendu() {
  if (!CI || rendu_pret) return;
  const LIBS = ['libnss3', 'libdbus-1-3', 'libatk1.0-0', 'libgbm-dev', 'libasound2t64', 'libxrandr2', 'libxkbcommon-dev', 'libxfixes3', 'libxcomposite1', 'libxdamage1', 'libatk-bridge2.0-0', 'libpango-1.0-0', 'libcairo2', 'libcups2', 'python3-pil'];
  // preparer-medias sons : les 4 sons Mixkit de sons-fluide (nappe de stade, cris de but), jamais dans le dépôt public. Absents = pas de rendu.
  for (const [cmd, args] of [['npm', ['ci', '--no-audit', '--no-fund']], ['sudo', ['apt-get', 'install', '-y', '--no-install-recommends', ...LIBS]], [process.execPath, ['scripts/preparer-assets.mjs']], [process.execPath, ['scripts/preparer-medias.mjs', 'sons']]]) {
    const r = lancer(cmd, args);
    if (!r.ok) throw new Error(`préparation du rendu (${cmd}) : ${dernier(r.sortie)}`);
  }
  rendu_pret = true;
}
async function traiter(t) {
  const F = FORMATS[t.format];
  // 1. Préparer. Une journée pas finie n'est pas une erreur : on réessaiera dans 6 h.
  const p = lancer(process.execPath, [`scripts/${F.script}.mjs`, ...(F.args ? F.args(t) : [String(t.id), ...(t.prono ? ['--prono'] : []), ...(t.jour ? [`--jour=${t.jour}`] : [])])]);
  if (!p.ok) {
    if (/non finie|déjà commencé/.test(p.sortie)) { etat.essais[t.cle] = { ...etat.essais[t.cle], attente: maintenant + 6 * HEURE }; return 'attente'; }
    throw new Error(dernier(p.sortie));
  }
  const data = lireJson(F.data(t));
  if (!data) throw new Error('fichier de données absent');
  // 2. Contrôler. Le moindre défaut : pas de vidéo.
  const defauts = controler(F.base ?? t.format, data);
  if (defauts.length) throw new Error(defauts.join(' ; '));
  for (const n of data.controle?.absentsRetires ?? []) erreur(t.cle, `absent retiré, vidéo gardée : ${n}`);
  if (drapeau('sans-rendu')) return 'contrôlée';
  if (!F.pret?.(t)) preparerRendu(); // vidéo déjà prête (simple copie) : aucune installation sur le serveur ; sans effet sur le Mac
  // 3. Rendre puis déposer. Le fichier n'apparaît qu'une fois complet.
  // Stories : sous-dossier stories/ ; formats : dossier du JOUR DE PUBLICATION, sous-dossier formats/.
  const dossier = t.datePub ? `${RACINE}/${ouvert ? '' : 'TEST-'}${t.datePub}/formats` : F.base ? `${dossierJour}/stories` : dossierJour;
  fs.mkdirSync(dossier, { recursive: true });
  // Classements : la date dans le nom, sinon la vidéo de la semaine suivante porte le même nom et publier-buffer la croit déjà envoyée (bug du 16/11).
  const nom = `${t.format}-${slug([].concat(data.accroche ?? data.ligue?.texte ?? String(t.id)).join(' '))}-${t.id}${t.jour ? `-${t.jour}` : ''}${t.fid ? `-${t.fid}` : ''}${/^classement/.test(t.format) ? `-${jourParis(maintenant)}` : t.datePub ? `-${t.datePub}` : ''}`;
  const temp = `out/${nom}.mp4`;
  // Vidéo préparée (déjà rendue et contrôlée) : copiée telle quelle avec sa vignette et sa durée ; aucun rendu.
  const pre = F.pret?.(t);
  if (pre) {
    for (const [a, b] of [[pre, `${dossier}/${nom}.mp4`], [pre.replace(/\.mp4$/, '.vignette.png'), `${dossier}/${nom}.vignette.png`], [pre.replace(/\.mp4$/, '.duree'), `${dossier}/${nom}.duree`]]) if (fs.existsSync(a)) fs.copyFileSync(a, b);
    fs.writeFileSync(`${dossier}/${nom}.txt`, legende(F.base ?? t.format, data, pub));
    return `${dossier}/${nom}.mp4`;
  }
  fs.mkdirSync('out', { recursive: true });
  const chrome = process.env.CHROME_PATH ?? (fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : null);
  // Effets sonores (aucune musique) sur TOUS les formats, mixage validé par l'éditeur le 06/11 (foule en fond, sifflet, whoosh, clameurs, applaudissements).
  let props = F.data(t);
  if (true) { props = `out/props-${nom}.json`; fs.writeFileSync(props, JSON.stringify({ ...data, sons: true, ...(cfg.couvertures ? { couverture: true } : {}) })); }
  // Garde-fou n°1 : la durée PRÉVUE vient de la composition (avant rendu) ; le fichier rendu doit la respecter à ±1 s.
  const dp = lancer(process.execPath, ['scripts/duree-prevue.mjs', F.comp, props, ...(chrome ? [chrome] : [])]);
  const dureePrevue = Number(dp.sortie.trim().split('\n').pop());
  if (!dp.ok || !(dureePrevue > 0)) throw new Error(`GARDE-FOU : durée prévue introuvable (${dernier(dp.sortie)})`);
  const r = lancer('npx', ['remotion', 'render', 'src/index.ts', F.comp, temp, `--props=${props}`, '--concurrency=1', '--log=error', ...QUALITE, ...(chrome ? [`--browser-executable=${chrome}`] : [])]);
  // QA image par image AVANT toute programmation (série fonctionnalités, décision du 23/11) : images quasi vides, plans figés, contraste du titre de la vignette.
  // Un échec : pas de vidéo (nouvel essai plus tard), rien n'est programmé.
  if (F.qa && r.ok && fs.existsSync(temp)) {
    const qa = spawnSync(CI ? 'bash' : 'zsh', ['scripts/v3/qa/frames-cles.sh', 'src/index.ts', F.comp, '6', `out/qa-${nom}`, '', '0-11:90,290,900,330:texte'], { encoding: 'utf8', env: { ...process.env, PROPS: props, CONCURRENCE: '2' }, maxBuffer: 1 << 26 });
    const bilan = `${qa.stdout ?? ''}`.split('\n').filter((l) => /^(❌|✅)/.test(l));
    if (qa.status !== 0 || bilan.some((l) => l.startsWith('❌'))) { fs.rmSync(temp, { force: true }); if (props !== F.data(t)) fs.rmSync(props, { force: true }); throw new Error(`QA image par image refusée : ${bilan.filter((l) => l.startsWith('❌')).join(' ; ') || dernier(`${qa.stdout}${qa.stderr}`)}`); }
  }
  // Vignette (image 0) en PNG à côté de la vidéo : <nom>.vignette.png (jamais <nom>.png, que publier-buffer enverrait comme couverture refusée).
  if (F.v3 && r.ok) { const v = lancer('npx', ['remotion', 'still', 'src/index.ts', F.comp, `out/${nom}.vignette.png`, '--frame=0', `--props=${props}`, '--log=error', ...(chrome ? [`--browser-executable=${chrome}`] : [])]); if (!v.ok) erreur(t.cle, `vignette PNG : ${dernier(v.sortie)}`); }
  if (props !== F.data(t)) fs.rmSync(props, { force: true });
  if (!r.ok || !fs.existsSync(temp)) throw new Error(`rendu : ${dernier(r.sortie)}`);
  // Son final à −16 LUFS (règle de l'éditeur du 22/11), image copiée telle quelle. En cas d'échec : la vidéo garde son son d'origine, une ligne dans ERREURS.txt.
  if (cfg.lufs !== false) { const n = lancer(process.execPath, ['scripts/normaliser-son.mjs', temp, String(cfg.lufs ?? -16)]); if (!n.ok) erreur(t.cle, `son non normalisé : ${dernier(n.sortie)}`); }
  const { dureeFichier } = await import('./controle-video.mjs');
  const dureeRendue = dureeFichier(temp);
  if (!(Math.abs(dureeRendue - dureePrevue) <= 1)) { fs.rmSync(temp, { force: true }); throw new Error(`GARDE-FOU : fichier rendu de ${dureeRendue} s au lieu de ${dureePrevue.toFixed(2)} s prévues (±1 s), vidéo jetée`); }
  // Couverture (miniature de la grille) : image + 5 premières images de la vidéo. Active seulement si data/auto-config.json a « couvertures: true » (validation de l'éditeur).
  if (cfg.couvertures && FORMATS[t.format] && !F.base) {
    const cp = `out/couv-${nom}.json`;
    fs.writeFileSync(cp, JSON.stringify({ ...data, format: t.format }));
    const c = lancer('npx', ['remotion', 'still', 'src/index.ts', 'Couverture', `${dossier}/${nom}.png`, `--props=${cp}`, '--log=error', ...(chrome ? [`--browser-executable=${chrome}`] : [])]);
    fs.rmSync(cp, { force: true });
    if (!c.ok) erreur(t.cle, `couverture : ${dernier(c.sortie)}`);
  }
  // X reste à la main : pour un gros match, une image (carte du score ou de l'avant-match) et un texte court prêts à copier dans a-publier/x/<jour>/.
  if (t.gros && ['apres-match', 'avant-match'].includes(t.format)) {
    try {
      const dx = `${RACINE}/x/${ouvert ? '' : 'TEST-'}${jourParis(maintenant)}`;
      fs.mkdirSync(dx, { recursive: true });
      const marque = lireJson('data/marque.json', {});
      const img = lancer('npx', ['remotion', 'still', 'src/index.ts', F.comp, `${dx}/${nom}.png`, `--props=${F.data(t)}`, `--frame=${t.format === 'apres-match' ? 130 : 200}`, '--log=error', ...(chrome ? [`--browser-executable=${chrome}`] : [])]);
      const premiere = legende(t.format, data, pub).split('\n')[0];
      fs.writeFileSync(`${dx}/${nom}.txt`, `${premiere}\n\nScorro, dispo sur l'App Store : ${marque.appStore ?? ''}\n`);
      if (!img.ok) erreur(t.cle, `image X : ${dernier(img.sortie)}`);
    } catch (e) { erreur(t.cle, `dépôt X : ${e.message}`); }
  }
  fs.writeFileSync(`${dossier}/${nom}.txt`, `${ouvert ? '' : '⚠️ TEST : NE PAS PUBLIER\n\n'}${legende(F.base ?? t.format, data, pub)}`);
  fs.writeFileSync(`${dossier}/${nom}.duree`, String(dureePrevue));
  fs.renameSync(temp, `${dossier}/${nom}.mp4`);
  if (fs.existsSync(`out/${nom}.vignette.png`)) fs.renameSync(`out/${nom}.vignette.png`, `${dossier}/${nom}.vignette.png`);
  return `${dossier}/${nom}.mp4`;
}
// Mode test : on ne garde que 7 jours de dossiers TEST, pour ne pas remplir le disque. Jamais un dossier de vraies vidéos.
function menageTest() {
  for (const d of fs.readdirSync(RACINE)) {
    const m = /^TEST-(\d{4}-\d{2}-\d{2})$/.exec(d);
    if (m && maintenant - Date.parse(`${m[1]}T12:00:00Z`) > 7 * 24 * HEURE) fs.rmSync(`${RACINE}/${d}`, { recursive: true });
  }
}
try {
  if (faireLecture(etat.calendrier, maintenant)) {
    etat.calendrier = { lu: maintenant, matchs: await lireCalendrier() };
    garder();
    console.log(`calendrier : ${etat.calendrier.matchs.length} matchs`);
  }
} catch (e) { erreur('calendrier', e.message); }
// Fin de match vue : l'instant où le calendrier le dit fini pour la première fois (sert aux horaires d'après-match).
for (const m of etat.calendrier?.matchs ?? []) if (['FT', 'AET', 'FT_PEN'].includes(m.etat) && !etat.finis[m.id]) etat.finis[m.id] = maintenant;
// Rythme (22/11) : plafond de 2 les jours de match (Ligue 1, Ligue des champions), 1 sinon.
if (cfg.rythme) cfg.rythme.joursMatch = joursDeMatch(etat.calendrier?.matchs ?? [], cfg);
try { cfg.ordreFonctionnalites = lireJson('data/fonctionnalites-v3.json', {}).ordre ?? []; } catch {}
// Notification : notification macOS sur le Mac ; sur le serveur, une ligne dans out/notifications.jsonl que le workflow transforme en issue GitHub (donc en e-mail).
const notifier = (titre, texte, fichier, o) => notifierCanaux(titre, texte, fichier, { ci: CI, ...o });
// Serveur : envois seulement avec SCORRO_ENVOIS = "on" écrit en toutes lettres (variable absente = aucun envoi). Mac : inchangé.
const auto = ouvert && pub.mode === 'auto' && (CI ? process.env.SCORRO_ENVOIS === 'on' : process.env.SCORRO_ENVOIS !== 'off');
// Serveur, parallèle de 3 jours (plan du 24/11) : envois coupés mais rendus faits et déposés dans la publication « essais » du dépôt PRIVÉ d'état.
const essais = CI && !auto && process.env.SCORRO_ESSAIS === 'on';
const horodate = (ms) => `${jourParis(ms)} ${hhmmParis(ms)}`;
const journal = (reseau, video, cle) => fs.appendFileSync('publications.log', `${horodate(maintenant)} (Paris) | ${reseau} | ${video} | ${cle}\n`);
// Positions au classement (score d'importance des matchs), mises en cache 12 h.
etat.classements ??= {};
try { await attacherClassements(etat.calendrier?.matchs ?? [], etat.classements, maintenant); } catch (e) { erreur('classements', e.message); }
// Règle de cohérence : chaque avant a son après. `engages` = paires dont l'avant est publié (gardées quoi qu'il arrive) ; `avantOk` = l'après peut sortir.
etat.publiees ??= {};
const reel = (c) => !!etat.publiees[c]; // un avant compte seulement s'il est VRAIMENT parti sur au moins un réseau (pas seulement rendu)
const engages = new Set();
for (const c of Object.keys(etat.faites)) {
  if (!reel(c)) continue;
  let m;
  if ((m = /^avant-match-(\d+)$/.exec(c))) engages.add(`match-${m[1]}`);
  else if ((m = /^avant-journee-(\d+)-(\d{4}-\d\d-\d\d)$/.exec(c))) engages.add(`soiree-${m[1]}-${m[2]}`);
  else if ((m = /^avant-journee-(\d+)$/.exec(c))) engages.add(`journee-${m[1]}`);
}
etat.vusDue ??= {};
const avantOk = (c) => (etat.faites[c] ? reel(c) : !etat.vusDue[c]);
const dues = taches(etat.calendrier?.matchs ?? [], cfg, maintenant, { vusFinis: etat.finis, engages, avantOk }).filter((t) => (arg('seulement') ? t.cle === arg('seulement') : true)).sort((a, b) => b.poids - a.poids || a.de - b.de);
// Envois YouTube refusés plus tard par Buffer (à l'heure prévue) : lus en LECTURE SEULE au plus toutes les 30 min, quand une vidéo attend YouTube ; marqués echec pour ne pas compter dans la limite des 24 h.
async function marquerEchecsYoutube() {
  if (!Object.values(etat.file).some((f) => f.restants?.includes('youtube')) || maintenant - (etat.syncEchecsYt ?? 0) < 30 * MIN) return;
  etat.syncEchecsYt = maintenant;
  try {
    // Serveur : clés dans les variables d'environnement (secrets GitHub). Mac : .env, comme avant.
    const env = CI ? process.env : Object.fromEntries((fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()]; }));
    const q = async (query, variables) => (await (await fetch('https://api.buffer.com', { method: 'POST', headers: { Authorization: `Bearer ${env.BUFFER_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json());
    const org = (await q('{ account { organizations { id } } }')).data?.account?.organizations?.[0]?.id;
    const r = await q('query($o: OrganizationId!, $c:[ChannelId!]){ posts(first: 50, input:{ organizationId:$o, filter:{ channelIds:$c, status:[error] } }){ edges{ node{ dueAt } } } }', { o: org, c: [env.BUFFER_CHANNEL_YOUTUBE] });
    const dus = (r.data?.posts?.edges ?? []).map((e) => Date.parse(e.node.dueAt));
    for (const p of etat.pubs) if (p.reseau === 'youtube' && !p.echec && dus.some((d) => Math.abs(d - p.t) < 3 * MIN)) p.echec = true;
  } catch (e) { erreur('echecs-youtube', e.message); }
}
await marquerEchecsYoutube();
// Publication : les plus gros d'abord, un réseau à la fois, avec les garde-fous (nuit, 30 min, plafond du jour). Appelée entre deux rendus pour ne jamais attendre la fin de la passe.
let verrouNote = false;
const publierFile = () => {
if (auto && !drapeau('sans-rendu')) {
  if (!arg('maintenant')) maintenant = Date.now(); // une passe peut durer plusieurs minutes : l'heure est relue avant de publier
  // Verrou anti-doublon n° 1 et 2 (scripts/verrou.mjs) : serveur toujours ; Mac seulement si publieur.verifierSurMac = true. Refus = rien n'est tenté, la file attend.
  if (Object.keys(etat.file).length) {
    const v = controleEnvoi({ cfg });
    if (!v.ok) { if (!verrouNote) { console.log(`🔒 aucun envoi : ${v.raison}`); if (v.publieur?.actif === null) erreur('verrou', v.raison); verrouNote = true; } return; }
  }
  const attente = Object.entries(etat.file).sort(([, a], [, b]) => b.poids - a.poids || a.de - b.de);
  for (const [cle, f] of attente) {
    for (const reseau of [...f.restants]) {
      if (maintenant > f.jusqu) { erreur(cle, `${reseau} : trop tard, non publié`); f.restants = f.restants.filter((x) => x !== reseau); continue; }
      const programme = /^avant-/.test(f.format ?? '') || !!f.datePub; // avant-match, avant-journée et formats : programmés dans Buffer à leur créneau
      const p = programme ? { ok: true } : permis(f, reseau, etat.pubs, maintenant, cfg);
      if (!p.ok) {
        if (p.raison === 'plafond') { erreur(cle, `${reseau} : plafond de ${capDuJour(cfg, jourParis(maintenant))} vidéos atteint aujourd'hui, non publié`); f.restants = f.restants.filter((x) => x !== reseau); }
        continue;
      }
      if ((f.reessaiApres?.[reseau] ?? 0) > maintenant) continue;
      if (etat.stopEnvois) { console.log('envois arrêtés (échecs Buffer répétés) : voir ERREURS.txt'); break; }
      // Avant-matchs et avant-journées : programmés dans Buffer à l'heure voulue (--quand), la vidéo reste chez Buffer : le Mac peut être éteint ensuite.
      let quand = null;
      if (programme) {
        quand = creneau(f, reseau, etat.pubs, maintenant, cfg);
        // Contenu de niveau 1 sans créneau : on déplace (ou retire) l'avant-match programmé le moins important, puis on retente.
        if (quand === null && f.prioritaire) {
          const c = choisirADecaler(f, reseau, etat.pubs, maintenant, cfg);
          if (c) {
            const nomV = String(c.video).split('/').pop();
            const reg = lireJson('etat/publiees.json', {});
            const idPost = reg[nomV]?.[reseau];
            const sup = idPost ? lancer(process.execPath, ['scripts/supprimer-buffer.mjs', idPost]) : { ok: false, sortie: 'identifiant Buffer introuvable' };
            if (sup.ok) {
              etat.pubs = etat.pubs.filter((p) => p !== c);
              delete reg[nomV][reseau]; fs.writeFileSync('etat/publiees.json', JSON.stringify(reg, null, 1));
              const ex = etat.file[c.cle];
              if (ex) ex.restants = [...new Set([...ex.restants, reseau])];
              else etat.file[c.cle] = { fichier: c.video, format: c.format ?? 'avant-match', gros: false, poids: c.poids ?? 2, prioritaire: false, de: maintenant, jusqu: c.jusqu ?? c.t + 3 * HEURE, restants: [reseau], echecs: {} };
              fs.appendFileSync('publications.log', `${horodate(maintenant)} (Paris) | ${reseau} | DÉPLACÉ pour faire place à ${cle} : ${nomV} (était ${horodate(c.t)}) | ${c.cle}\n`);
              quand = creneau(f, reseau, etat.pubs, maintenant, cfg);
            } else erreur(cle, `${reseau} : déplacement de ${nomV} impossible : ${dernier(sup.sortie)}`);
          }
        }
        if (quand === null) { erreur(cle, `${reseau} : aucun créneau libre avant la limite, non programmé`); f.restants = f.restants.filter((x) => x !== reseau); continue; }
      }
      let extra = quand ? [`--quand=${new Date(quand).toISOString()}`] : [];
      if (f.url) { fs.mkdirSync('out', { recursive: true }); const lf = `out/legende-${cle}.txt`; fs.writeFileSync(lf, f.legende ?? ''); extra = [...extra, `--url=${f.url}`, `--legende-fichier=${lf}`]; }
      // Durée prévue : gardée dans l'entrée de file (serveur) ou à côté de la vidéo (Mac). Sans elle, le garde-fou refuse l'envoi.
      const dureeP = f.duree ?? Number(fs.existsSync(f.fichier.replace(/\.mp4$/, '.duree')) ? fs.readFileSync(f.fichier.replace(/\.mp4$/, '.duree'), 'utf8') : NaN);
      const b = lancer(process.execPath, ['scripts/publier-buffer.mjs', f.fichier, `--reseaux=${reseau}`, `--duree=${dureeP}`, ...extra]);
      if (b.ok && /^DEJA /m.test(b.sortie)) {
        // Rien n'a été envoyé : ce nom de fichier est déjà dans etat/publiees.json. Ne pas le noter publié.
        erreur(cle, `${reseau} : NON ENVOYÉ, nom déjà présent dans etat/publiees.json (${f.fichier})`);
        fs.appendFileSync('publications.log', `${horodate(maintenant)} (Paris) | NON ENVOYÉ | ${reseau} ${f.fichier} : nom déjà dans etat/publiees.json | ${cle}\n`);
        f.restants = f.restants.filter((x) => x !== reseau); garder(); continue;
      }
      if (b.ok) { etat.echecsBuffer = 0; etat.publiees ??= {}; etat.publiees[cle] ??= maintenant; }
      if (b.ok) { etat.pubs.push({ t: quand ?? maintenant, reseau, video: f.fichier, cle, poids: f.poids, format: f.format, ...(f.story ? { story: true } : {}), prioritaire: !!f.prioritaire, de: f.de, jusqu: f.jusqu, ...(quand ? { programme: true } : {}) }); journal(reseau, f.fichier, quand ? `${cle} (PROGRAMMÉ pour ${horodate(quand)})` : cle); if (quand) { const l = (b.sortie.split('\n').find((x) => x.startsWith('PROGRAMME')) ?? '').slice(0, 300); if (l) fs.appendFileSync('publications.log', `    vérification Buffer : ${l}\n`); } f.restants = f.restants.filter((x) => x !== reseau); console.log(`📤 ${reseau} : ${f.fichier}`); }
      else if (/^VERROU/m.test(b.sortie)) {
        // Verrou anti-doublon (publieur, SCORRO_ENVOIS ou file Buffer illisible) : rien n'a été envoyé ; nouvel essai dans 10 min, sans disjoncteur.
        f.reessaiApres ??= {}; f.reessaiApres[reseau] = maintenant + 10 * MIN;
        erreur(cle, `${reseau} : ${(b.sortie.split('\n').find((x) => x.startsWith('VERROU')) ?? 'VERROU').slice(0, 200)}`);
      }
      else if (/ATTENTE-HEBERGEMENT/.test(b.sortie)) {
        // Vidéo en ligne depuis moins de 5 min : on attend, sans erreur ni disjoncteur.
        f.reessaiApres ??= {}; f.reessaiApres[reseau] = maintenant + 5 * MIN;
      }
      else if (/daily posting limit|daily video upload limit/i.test(b.sortie)) {
        // Limite quotidienne de la chaîne (YouTube : 2 envois par 24 h glissantes). Pas une panne : ni disjoncteur ni nouvel essai, on note la vraie raison.
        const motif = dernier(b.sortie).slice(0, 200);
        f.restants = f.restants.filter((x) => x !== reseau);
        erreur(cle, `${reseau} : NON ENVOYÉ, limite quotidienne de la chaîne atteinte (Buffer : ${motif})`);
        fs.appendFileSync('publications.log', `${horodate(maintenant)} (Paris) | LIMITE | ${reseau} ${f.fichier} : limite quotidienne de la chaîne (${motif}) | ${cle}\n`);
      }
      // Garde-fou : seulement une vraie ligne de refus (« GARDE-FOU : OK » veut dire que le contrôle est passé ; l'échec vient alors d'ailleurs).
      else if (/^GARDE-FOU(?! : OK)/m.test(b.sortie)) {
        // Garde-fou : fichier hébergé incomplet, illisible ou de mauvaise durée → AUCUN envoi, alerte immédiate, pas de nouvel essai automatique, disjoncteur non touché.
        const motif = (b.sortie.split('\n').find((x) => x.startsWith('GARDE-FOU') && !x.startsWith('GARDE-FOU : OK')) ?? 'GARDE-FOU').slice(0, 300);
        f.restants = f.restants.filter((x) => x !== reseau);
        erreur(cle, `${reseau} : ENVOI REFUSÉ. ${motif}`);
        fs.appendFileSync('publications.log', `${horodate(maintenant)} (Paris) | REFUSÉ | ${reseau} ${f.fichier} : ${motif} | ${cle}\n`);
        notifier('Scorro : vidéo NON envoyée', `${reseau} : ${motif}`, 'a-publier/ERREURS.txt');
      }
      else if (echecLecture(b.sortie) && (f.lectures?.[reseau] ?? 0) < 4) {
        // « Video could not be read » : souvent passager (fichier pas encore servi par GitHub). Nouvelle tentative dans 10 min, sans compter pour le disjoncteur ; après 4 essais, échec normal.
        f.lectures ??= {}; f.lectures[reseau] = (f.lectures[reseau] ?? 0) + 1; f.reessaiApres ??= {}; f.reessaiApres[reseau] = maintenant + 10 * MIN;
        erreur(cle, `Buffer ${reseau} : vidéo illisible côté Buffer, nouvelle tentative dans 10 min (${f.lectures[reseau]}/4)`);
      }
      else { if (Object.values(f.echecs).reduce((s, n) => s + n, 0) === 0) etat.echecsBuffer = (etat.echecsBuffer ?? 0) + 1; if (etat.echecsBuffer >= 3) { etat.stopEnvois = maintenant; erreur('buffer', `3 échecs d'envoi de suite : envois ARRÊTÉS (aucun nouvel essai). Remettre etat.stopEnvois à null dans etat/auto.json après vérification.`); fs.appendFileSync('publications.log', `${horodate(maintenant)} (Paris) | STOP | échecs Buffer répétés, envois arrêtés | -\n`); notifier('Scorro : ENVOIS ARRÊTÉS', `3 échecs Buffer de suite : plus aucun envoi tant que tu n'as pas vérifié (voir a-publier/ERREURS.txt). Remettre etat.stopEnvois à null ensuite.`, 'a-publier/ERREURS.txt'); } f.echecs[reseau] = (f.echecs[reseau] ?? 0) + 1; erreur(cle, `Buffer ${reseau} (essai ${f.echecs[reseau]}/3) : ${dernier(b.sortie)}`); if (f.echecs[reseau] >= 3) f.restants = f.restants.filter((x) => x !== reseau); }
      garder();
    }
    if (!f.restants.length) delete etat.file[cle];
  }
  etat.pubs = etat.pubs.filter((p) => maintenant - p.t < 3 * 24 * HEURE);
}
};
// Règle du 17/11 (le Mac chauffe) : jamais de rendu pendant celui d'un autre projet (ou d'un test lancé à la main). Les rendus de cette passe sont séquentiels : tout processus Remotion présent n'est pas à nous.
// Seuls les PROCESSUS node qui lancent « remotion render/still » comptent (pas le texte d'une consigne qui contient ces mots).
const autreRendu = () => { const r = spawnSync('ps', ['-axo', 'comm=,args='], { encoding: 'utf8' }); return (r.stdout ?? '').split('\n').some((l) => /^\S*node\s/.test(l) && /\bremotion\s+(render|still|benchmark)\b/.test(l)); };
const parisAvant = (t) => permis(t, 'instagram', [], maintenant, cfg).ok || (t.format === 'apres-match' && t.gros);
// Rythme : on ne rend une vidéo que si elle peut partir (créneau du matin ou du soir libre, plafond du jour non atteint) : pas de rendu pour rien.
const reseauxDe = (t) => t.reseaux ?? RESEAUX;
const paris = (t) => (!rythmeActif(cfg, maintenant) ? parisAvant(t) : /^avant-/.test(t.format) ? reseauxDe(t).some((r) => creneau(t, r, etat.pubs, maintenant, cfg) !== null) : reseauxDe(t).some((r) => permis(t, r, etat.pubs, maintenant, cfg).ok));
const ecarteRythme = (t) => rythmeActif(cfg, maintenant) && !/^avant-/.test(t.format) && reseauxDe(t).every((r) => permis(t, r, etat.pubs, maintenant, cfg).raison === 'plafond');
// Serveur : les récaps (après-journée) en tête de passe, puis l'ordre habituel. Mac : ordre inchangé.
if (CI) dues.sort((a, b) => (b.format === 'apres-journee') - (a.format === 'apres-journee'));
const BUDGET_CI = 25 * MIN;
for (const t of dues) {
  if (CI && Date.now() - debutPasse > BUDGET_CI) { console.log(`⏱️ budget de passe atteint (${Math.round((Date.now() - debutPasse) / MIN)} min) : la suite à la passe suivante`); break; }
  if (t.format.startsWith('avant-')) etat.vusDue[t.cle] ??= maintenant;
  if (etat.faites[t.cle] && !drapeau('force')) continue;
  if (maintenant > t.jusqu) { etat.faites[t.cle] = { quand: maintenant, resultat: 'expiré' }; erreur(t.cle, 'trop tard : plus utile, pas de vidéo'); continue; }
  // Un fichier déjà prêt (fonctionnalité rendue et contrôlée) n'est qu'une copie : il n'attend pas les rendus des autres projets.
  if (autreRendu() && !FORMATS[t.format]?.pret?.(t)) { console.log(`… ${t.cle} : un autre rendu tourne sur le Mac, on attend`); continue; }
  if (t.datePub && !FORMATS[t.format]?.v3) continue; // format pas encore en v3 : rien (décision du 22/11)
  // Décision du 22/11 : plus rien dans l'ancien style. Un format automatique pas encore basculé en v3 (classements…) est écarté, noté une fois.
  if (!FORMATS[t.format]?.v3) { if (!etat.faites[t.cle]) { etat.faites[t.cle] = { quand: maintenant, resultat: 'écarté : pas encore en v3' }; erreur(t.cle, 'format pas encore en v3 : pas de vidéo (décision du 22/11)'); garder(); } continue; }
  if (t.format === 'f-fonc' && cfg.fonctionnalites?.renduAuto === false && !FORMATS['f-fonc'].pret?.(t)) continue; // 24/11 : vidéos préparées à la main (nouveaux bruitages) ; l'auto ne fait que programmer
  if (t.rendeJour) { const h = heureParis(maintenant), [a, b] = cfg.fonctionnalites?.rendu?.heures ?? [14, 21]; if (!(h >= a && h < b)) continue; } // fonctionnalités : rendu de jour (nuits : lot cours-videos)
  else if (t.depot || t.datePub) { const h = heureParis(maintenant), [n0, n1] = cfg.formats?.nuit ?? [22, 7]; if (!(h >= n0 || h < n1)) continue; }
  else if (ecarteRythme(t)) { etat.faites[t.cle] = { quand: maintenant, resultat: 'écarté (rythme : plafond du jour atteint)' }; garder(); continue; }
  if (!t.datePub && !paris(t)) continue; // nuit (ou, avec le rythme, hors créneau) : on attend
  if (CI && !essais && ((t.story && !cfg.stories?.envoi) || t.depot)) continue; // serveur : rendu « à poster à la main » perdu à la fin du job
  const es = etat.essais[t.cle] ?? { n: 0 };
  if (es.attente && maintenant < es.attente) continue;
  if (es.prochain && maintenant < es.prochain) continue;
  try {
    const r = await traiter(t);
    if (r === 'attente') { console.log(`… ${t.cle} : journée pas finie`); garder(); continue; }
    console.log(`✅ ${t.cle} → ${r}`);
    if (drapeau('sans-rendu')) continue; // essai à blanc : ne compte pas comme fait
    if (essais) {
      const depotE = process.env.ETAT_REPO;
      const fich = [r, r.replace(/\.mp4$/, '.txt'), r.replace(/\.mp4$/, '.vignette.png')].filter((x) => fs.existsSync(x));
      const up = depotE ? lancer('gh', ['release', 'upload', 'essais', ...fich, '--repo', depotE, '--clobber']) : { ok: false, sortie: 'ETAT_REPO manquant' };
      fs.appendFileSync('publications.log', `${horodate(maintenant)} (Paris) | ESSAI | ${up.ok ? 'déposé dans « essais »' : `dépôt « essais » impossible : ${dernier(up.sortie)}`} : ${r.split('/').pop()} (rendu en ${Math.round((Date.now() - debutPasse) / 1000)} s depuis le début de la passe) | ${t.cle}\n`);
      if (!up.ok) erreur(t.cle, `essai : dépôt impossible : ${dernier(up.sortie)}`);
    }
    // Stories : envoi automatique (story Instagram par Buffer) seulement si data/auto-config.json a stories.envoi = true ; sinon le fichier attend dans stories/ (TikTok : toujours à la main).
    if (t.depot) { notifier('Scorro : nouveau format prêt', `${r.split('/').pop()} — à publier à la main le ${t.datePub} (créneau ${t.creneau === 'matin' ? '12 h' : '19 h'}). Légende dans le .txt à côté.`, null, { sansIssue: true }); fs.appendFileSync('publications.log', `${horodate(maintenant)} (Paris) | DÉPOSÉ | ${r} : à publier à la main le ${t.datePub} (${t.creneau}) | ${t.cle}\n`); }
    if (t.story) { notifier('Scorro : story prête', `${r.split('/').pop()} — à poster à la main sur TikTok${cfg.stories?.envoi ? '' : ' (et Instagram)'} : dossier ${r.split('/').slice(0, -1).join('/')}`, null, { sansIssue: true }); }
    const slot = t.datePub ? (cfg.rythme?.[t.creneau] ?? (t.creneau === 'matin' ? ['12:00', '14:00'] : ['19:00', '24:00'])) : null;
    const fenetre = slot ? { de: parisA(t.datePub, Number(slot[0].split(':')[0])), jusqu: parisA(t.datePub, Math.min(23, Number(slot[1].split(':')[0]))) + (slot[1] === '24:00' ? 59 * MIN : 0) } : {};
    if (auto && !t.depot && (!t.story || cfg.stories?.envoi)) etat.file[t.cle] = { ...(t.datePub ? { datePub: t.datePub } : {}), fichier: r, duree: Number(fs.readFileSync(r.replace(/\.mp4$/, '.duree'), 'utf8')), ...(CI ? miseEnLigne(r) : {}), format: t.format, ligue: t.ligue, jour: t.jour, story: !!t.story, gros: t.gros, poids: t.poids, prioritaire: !!t.prioritaire, de: t.de, jusqu: t.jusqu, ...fenetre, restants: [...(t.reseaux ?? RESEAUX)], echecs: {} };
    etat.faites[t.cle] = { quand: maintenant, resultat: r };
    delete etat.essais[t.cle];
  } catch (e) {
    // Une donnée peut se corriger toute seule après le match : plusieurs essais espacés, chacun noté.
    const rapide = t.format === 'apres-match';
    const max = rapide ? 4 : 3;
    es.n++;
    es.prochain = maintenant + (rapide ? 8 : 30) * MIN;
    etat.essais[t.cle] = es;
    erreur(t.cle, `pas de vidéo (essai ${es.n}/${max}) : ${e.message}`);
    if (es.n >= max) etat.faites[t.cle] = { quand: maintenant, resultat: 'abandon' };
  }
  garder();
  publierFile();
}
// Publication : voir publierFile(), appelée après chaque vidéo rendue puis une dernière fois ici.
publierFile();
// Veille : (1) rappel toutes les 30 min tant que les envois sont arrêtés ; (2) alerte si rien n'est parti depuis 3 h en journée alors que des vidéos attendaient.
try {
  if (etat.stopEnvois && maintenant - (etat.rappelStop ?? 0) >= (CI ? 6 * HEURE : 30 * MIN)) { notifier('Scorro : ENVOIS TOUJOURS ARRÊTÉS', `Arrêtés depuis ${hhmmParis(etat.stopEnvois)} : rien ne part. Voir a-publier/ERREURS.txt.`, null, { sansIssue: !CI }); etat.rappelStop = maintenant; }
  const derniere = Math.max(0, ...etat.pubs.filter((p) => p.t <= maintenant).map((p) => p.t));
  if (auto && silenceAnormal({ file: etat.file, maintenant, derniereSortie: derniere, heureParis }) && maintenant - (etat.alerteSilence ?? 0) >= 3 * HEURE) { notifier('Scorro : RIEN PUBLIÉ depuis 3 h', `Des vidéos attendent (${Object.keys(etat.file).length}) mais aucune n'est partie depuis 3 h. Voir resume-du-jour.txt et a-publier/ERREURS.txt.`, 'a-publier/ERREURS.txt'); etat.alerteSilence = maintenant; }
} catch (e) { erreur('veille', e.message); }
// Série « fonctionnalités » (à la main) : la veille à 18 h, le Mac dépose la vidéo du lendemain (avec et sans son) + les légendes sur le Bureau et notifie.
try {
  const fonc = lireJson('data/fonctionnalites.json', { calendrier: [] });
  etat.rappelsFonc ??= {};
  const r = rappelDeLaVeille(fonc.calendrier, maintenant, { jourParis, heureParis, dejaFaits: etat.rappelsFonc });
  if (r && !CI) {
    const dest = `${process.env.HOME}/Desktop/Scorro-demain`;
    fs.mkdirSync(dest, { recursive: true });
    for (const f of fs.readdirSync('a-publier/fonctionnalites').filter((x) => x.startsWith(`${r.id}-`))) fs.copyFileSync(`a-publier/fonctionnalites/${f}`, `${dest}/${f}`);
    notifier('Scorro : vidéo de demain à publier', `Demain ${r.date} à ${r.heure} : « ${r.id} ». Vidéos (avec et sans son) et légendes dans le dossier Scorro-demain, sur le Bureau.`, null, { sansIssue: false });
    etat.rappelsFonc[r.id] = maintenant;
  }
} catch (e) { erreur('rappel-fonctionnalite', e.message); }
// Alerte d'expiration du jeton GitHub (DEPOTS_TOKEN) : 7 jours avant la date de data/jeton.json, puis chaque jour jusqu'à l'expiration. Notification macOS, ou issue dans le dépôt PRIVÉ d'état en mode serveur.
try {
  const jt = lireJson('data/jeton.json', null);
  if (jt?.expire && etat.alerteJeton !== jourParis(maintenant)) {
    const reste = Math.round((Date.parse(`${jt.expire}T12:00:00Z`) - Date.parse(`${jourParis(maintenant)}T12:00:00Z`)) / (24 * HEURE));
    if (reste <= (jt.alerteJoursAvant ?? 7)) { notifier('Scorro : renouveler le jeton GitHub', `Le jeton DEPOTS_TOKEN expire le ${jt.expire} (dans ${reste} jour(s)). Renouvelle-le sur https://github.com/settings/personal-access-tokens puis mets à jour le secret DEPOTS_TOKEN.`, 'data/jeton.json'); etat.alerteJeton = jourParis(maintenant); }
  }
} catch (e) { erreur('jeton', e.message); }
// Résumé du jour : chaque soir à partir de 22 h 30 (Paris), une fois : ce qui est parti, les erreurs, le programme des 2 jours suivants, ce qui attend l'avis de l'éditeur.
if (hhmmParis(maintenant) >= '22:30' && etat.resume !== jourParis(maintenant) && !drapeau('sans-rendu')) {
  const j = jourParis(maintenant);
  const du = etat.pubs.filter((p) => jourParis(p.t) === j).sort((a, b) => a.t - b.t);
  const iso = new Date(maintenant).toISOString().slice(0, 10);
  const err = fs.existsSync(`${RACINE}/ERREURS.txt`) ? fs.readFileSync(`${RACINE}/ERREURS.txt`, 'utf8').split('\n').filter((l) => l.includes(j) || l.startsWith(iso)) : [];
  const demain = jourPlusJ(j, 1), apres = jourPlusJ(j, 2);
  const plan = planifier(etat.calendrier?.matchs ?? [], cfg, engages);
  const prog = [demain, apres].flatMap((jj) => {
    const paires = [...plan.liste].filter((p) => p.jours.includes(jj)).sort((x, y) => (x.m?.debut ?? x.avantDe) - (y.m?.debut ?? y.avantDe));
    const nom = (p) => (p.type === 'match' ? `${hhmmParis(p.m.debut)} ${p.m.nom ?? p.m.id} [importance ${p.score}]` : `${p.type === 'soiree' ? 'Soirée' : 'Journée'} ${p.round}${p.avecAvant ? ' (avant + récap)' : ' (récap seul)'}`);
    return [`-- ${jj} (${plan.usage.get(jj) ?? 0} vidéos par réseau sur ${capDuJour(cfg, jj)}) --`, ...paires.map((p) => `  ${nom(p)}`)];
  });
  // Alerte : une vidéo d'un grand championnat (avant-journée / récap) n'est pas partie.
  const NOMS_G = { 301: 'Ligue 1', 8: 'Premier League', 564: 'Liga', 384: 'Serie A', 82: 'Bundesliga' };
  const alertes = [];
  const rondes = new Map();
  for (const m of etat.calendrier?.matchs ?? []) if ((cfg.grandsChampionnats ?? []).includes(m.ligue) && m.round) rondes.set(m.round, [...(rondes.get(m.round) ?? []), m]);
  for (const [round, ms] of rondes) {
    const F = Math.min(...ms.map((m) => m.debut)), L = Math.max(...ms.map((m) => m.debut));
    if (maintenant < F - 24 * HEURE || maintenant > L + 36 * HEURE || jourParis(F) < (cfg.debutPublication ?? '0')) continue;
    const nom = `${NOMS_G[ms[0].ligue]} journée ${round}`;
    const fini = ms.every((m) => ['FT', 'AET', 'FT_PEN', 'POSTPONED', 'CANCELLED'].includes(m.etat));
    const raison = (cle) => (etat.faites[cle]?.resultat === 'abandon' ? 'abandon après plusieurs échecs (voir ERREURS.txt)' : etat.faites[cle]?.resultat === 'expiré' ? 'trop tard' : etat.faites[cle] ? 'rendue mais pas envoyée (file ou erreur Buffer)' : maintenant > F ? 'journée déjà commencée au moment du lancement' : 'pas encore due');
    if (maintenant > F - 12 * HEURE && !etat.publiees?.[`avant-journee-${round}`] && ms.some((m) => m.etat === 'NS')) alertes.push(`⚠️ ALERTE ${nom} : avant-journée NON partie — ${raison(`avant-journee-${round}`)}`);
    if (fini && !etat.publiees?.[`apres-journee-${round}`]) alertes.push(`⚠️ ALERTE ${nom} : récap NON parti — ${raison(`apres-journee-${round}`)}`);
  }
  if (alertes.length && auto) notifier('Scorro : ALERTE', `${alertes.length} vidéo(s) de grand championnat non parties : voir resume-du-jour.txt`, 'resume-du-jour.txt');
  // Rythme actif : le programme vient de la simulation (scripts/apercu-rythme.mjs), pas de l'ancien calcul par paires.
  if (rythmeActif(cfg, maintenant)) {
    try {
      const { apercu } = await import('./apercu-rythme.mjs');
      const { sortie } = apercu({ matchs: etat.calendrier?.matchs ?? [], cfg, pubs: etat.pubs, faites: etat.faites, finis: etat.finis, de: maintenant, a: parisA(jourPlusJ(j, 3), 0) });
      prog.splice(0, prog.length, '(rythme : 1 vidéo par jour, 2 les jours de match ; simulation, heures approximatives)', ...sortie.filter((x) => x.quand).map((x) => `  ${jourParis(x.quand)} ${hhmmParis(x.quand)} | ${x.cle} | ${x.reseaux.join('+')}`));
    } catch (e) { prog.push(`(aperçu du rythme impossible : ${e.message})`); }
  }
  const lignes = [`Résumé du ${j} (écrit à ${hhmmParis(maintenant)}, heure de Paris)`, '', ...(alertes.length ? ['ALERTES GRANDS CHAMPIONNATS', ...alertes, ''] : ['Grands championnats : aucune alerte.', '']), `PUBLICATIONS : ${du.length}`, ...du.map((p) => `  ${hhmmParis(p.t)} | ${p.reseau} | ${p.video}`), '', `ERREURS / RETARDS / PLAFONDS : ${err.length}`, ...err.map((l) => `  ${l}`),
    ...(etat.stopEnvois ? ['', '⚠️ ENVOIS ARRÊTÉS après des échecs Buffer répétés. Rien ne repart tant que etat/auto.json n\'a pas stopEnvois = null.'] : []), '', 'PROGRAMME DES 2 PROCHAINS JOURS (paires avant + après)', ...prog,
    '', 'EN ATTENTE DE TON AVIS', '  - Vidéo « Ligues + pronos » v2 : brouillons/TEST-FONCTIONNALITE-ligues-pronos-v2.mp4', '  - Tests son (avant-journée, récap) : brouillons/TEST-SONS-avant-journee.mp4 et TEST-SONS-recap-journee.mp4 (le son est déjà actif sur tous les formats)',
    '  - Export qualité réseaux : brouillons/TEST-QUALITE-apres-match.mp4 (16 Mb/s, yuv420p, grain) ; à comparer à la version TikTok publiée', '', `En file d'attente : ${Object.keys(etat.file).length}`, `Mode : ${pub.mode}`];
  fs.writeFileSync('resume-du-jour.txt', lignes.join('\n') + '\n');
  etat.resume = j;
}
// Ménage des vidéos en ligne : les MP4 de la publication « videos » (≈ 45 Mo chacun) sont supprimés après 4 jours, une fois par jour. Buffer les a lus depuis longtemps.
if (auto && etat.nettoyage !== jourParis(maintenant) && !drapeau('sans-rendu')) { // jamais en essai à blanc (SCORRO_ENVOIS=off) : l'état peut y être vide, donc ne protègerait rien
  try {
    const envFichier = fs.existsSync('.env') ? Object.fromEntries(fs.readFileSync('.env', 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()]; })) : {};
    const depot = process.env.VIDEOS_REPO ?? envFichier.VIDEOS_REPO;
    if (depot) {
      const v = lancer('gh', ['release', 'view', 'videos', '--repo', depot, '--json', 'assets']);
      if (v.ok) {
        // Règle de l'éditeur : jamais supprimer une vidéo dont la publication programmée n'est pas passée (ni dans l'heure qui suit), ni une vidéo encore en file.
        const base = (f) => String(f ?? '').split('/').pop();
        // Carrousels (24/11) : leurs images restent en ligne jusqu'à 1 h après la publication programmée.
        const carrousels = Object.values(lireJson('etat/carrousels.json', {})).filter((c) => !c.dueAt || Date.parse(c.dueAt) > maintenant - HEURE).flatMap((c) => c.fichiers ?? []);
        const protegees = new Set([...etat.pubs.filter((p) => p.t > maintenant - HEURE).map((p) => base(p.video)), ...Object.values(etat.file ?? {}).map((f) => base(f.fichier ?? f.url)), ...carrousels]);
        const vieux = (JSON.parse(v.sortie).assets ?? []).filter((x) => maintenant - Date.parse(x.createdAt) > 4 * 24 * HEURE && !protegees.has(x.name) && !protegees.has(decodeURIComponent(x.name)));
        for (const x of vieux) lancer('gh', ['release', 'delete-asset', 'videos', x.name, '--repo', depot, '--yes']);
        if (vieux.length) fs.appendFileSync('publications.log', `${horodate(maintenant)} (Paris) | MENAGE | ${vieux.length} vidéo(s) de plus de 4 jours supprimée(s) de la publication « videos » | -\n`);
      }
    }
    etat.nettoyage = jourParis(maintenant);
  } catch (e) { erreur('menage', e.message); etat.nettoyage = jourParis(maintenant); }
}
// Rapport de la semaine : chaque dimanche à partir de 21 h (Paris), une fois. Fichier rapports/semaine-AAAA-MM-JJ.md + notification macOS.
if (new Date(`${jourParis(maintenant)}T12:00:00Z`).getUTCDay() === 0 && hhmmParis(maintenant) >= '21:00' && etat.rapport !== jourParis(maintenant) && !drapeau('sans-rendu')) {
  const r = lancer(process.execPath, ['scripts/rapport-semaine.mjs']);
  if (r.ok) {
    etat.rapport = jourParis(maintenant);
    const f = r.sortie.trim().split('\n').pop();
    notifier('Scorro : rapport de la semaine prêt', `${f} — À me donner en une fois : abonnés début/fin de semaine + gagnés/perdus (TikTok : Profil et Analyses ; Instagram : Insights, Audience ; YouTube Studio : Analytics, Audience) ; partages et enregistrements YouTube (Analytics, Engagement) ; enregistrements TikTok (Analyses, Aperçu). Liste complète en bas du rapport.`, f);
    fs.appendFileSync('publications.log', `${horodate(maintenant)} (Paris) | RAPPORT | ${f} | -\n`);
  } else erreur('rapport', `rapport de la semaine : ${dernier(r.sortie)}`);
}
// Carrousel du lundi (24/11) : thème « auto » (top5) préparé avec les données du week-end entre 14 h et 18 h, puis programmé à 19 h (Instagram + TikTok).
// Un seul essai par lundi ; jamais pendant un autre rendu ; erreur = notification, rien de programmé.
try {
  const CR = cfg.carrousels, j = jourParis(maintenant), theme = CR?.calendrier?.[j], h = heureParis(maintenant);
  etat.carrouselsFaits ??= {};
  if (CR?.actif && auto && theme && !etat.carrouselsFaits[j] && h >= (CR.preparation?.[0] ?? 14) && h < (CR.preparation?.[1] ?? 18) && !autreRendu()) {
    const dossierC = `brouillons/carrousel/${j}-${theme}`;
    // Serveur : verrou publieur d'abord (sinon rien, et on réessaie à la passe suivante) ; un thème préparé à la main est lu dans le dépôt privé de médias.
    const vC = CI ? controleEnvoi({ cfg }) : { ok: true };
    if (CI && !vC.ok) console.log(`🔒 carrousel : ${vC.raison}`);
    else if (fs.existsSync(`etat/carrousels.json`) && lireJson('etat/carrousels.json', {})[`${j}-${theme}`]) etat.carrouselsFaits[j] = 'déjà programmé';
    else if (CI && !(CR.auto ?? []).includes(theme) && !fs.existsSync(`${dossierC}/legende.txt`) && !lancer(process.execPath, ['scripts/preparer-medias.mjs', 'carrousel', `${j}-${theme}`]).ok) { etat.carrouselsFaits[j] = 'non préparé'; erreur(`carrousel-${j}`, `thème « ${theme} » absent du dépôt de médias (publication « carrousels ») : pas de carrousel ce lundi`); notifier('Scorro : carrousel non préparé', `Le carrousel « ${theme} » de ce soir n'est pas dans le dépôt de médias : rien n'est programmé.`, null); }
    else if (!(CR.auto ?? []).includes(theme) && !fs.existsSync(`${dossierC}/legende.txt`)) { etat.carrouselsFaits[j] = 'non préparé'; erreur(`carrousel-${j}`, `thème « ${theme} » pas encore préparé : pas de carrousel ce lundi`); notifier('Scorro : carrousel non préparé', `Le carrousel « ${theme} » de ce soir n'est pas prêt : rien n'est programmé.`, null, { sansIssue: true }); }
    else {
      etat.carrouselsFaits[j] = 'en cours'; garder();
      if (theme === 'top5') {
        preparerRendu(); // serveur : dépendances, Chrome, Pillow (sans effet sur le Mac)
        const p1 = lancer(process.execPath, ['scripts/preparer-format.mjs', 'top5', '301']);
        if (!p1.ok) throw new Error(`données top 5 : ${dernier(p1.sortie)}`);
        const p2 = lancer(process.execPath, ['scripts/v3/rendre-carrousel.mjs', 'top5', j]);
        if (!p2.ok) throw new Error(`images : ${dernier(p2.sortie)}`);
        const d5 = lireJson('data/format-top5-301.json', {});
        fs.writeFileSync(`${dossierC}/legende.txt`, `Top 5 des buteurs de Ligue 1 (${d5.sousTitre?.split(' · ')[1] ?? ''}) 👇 Le n°1 va te surprendre.\nDonnées fournies par Sportmonks.\nScorro, gratuit sur l'App Store.\n\n#Ligue1 #foot #football #Scorro\n`);
      }
      const p3 = lancer(process.execPath, ['scripts/publier-carrousel.mjs', dossierC, '--reseaux=instagram,tiktok', `--quand=${new Date(parisA(j, CR.heure ?? 19)).toISOString()}`]);
      if (!p3.ok) throw new Error(`Buffer : ${dernier(p3.sortie)}`);
      etat.carrouselsFaits[j] = 'programmé';
      for (const r of ['instagram', 'tiktok']) fs.appendFileSync('publications.log', `${horodate(maintenant)} (Paris) | ${r} | ${dossierC} | carrousel-${j}-${theme} (PROGRAMMÉ pour ${j} ${String(CR.heure ?? 19).padStart(2, '0')}:00)\n`);
    }
  }
} catch (e) { erreur('carrousel', e.message); etat.carrouselsFaits[jourParis(maintenant)] = `échec : ${e.message.slice(0, 120)}`; notifier('Scorro : carrousel NON programmé', e.message.slice(0, 200), 'a-publier/ERREURS.txt'); }
// Suivi des vues (lecture seule, aucune mutation Buffer) : toutes les 4 h → rapports/suivi-vues.csv (vues à J+1 et J+3).
if (!drapeau('sans-rendu') && (CI ? !!process.env.BUFFER_API_KEY : fs.existsSync('.env')) && maintenant - (etat.suiviVues ?? 0) >= 4 * HEURE - 5 * MIN) {
  const r = lancer(process.execPath, ['scripts/suivi-vues.mjs']);
  if (!r.ok) erreur('suivi-vues', dernier(r.sortie));
  etat.suiviVues = maintenant;
}
if (!ouvert) menageTest();
garder();
