// Une passe : calendrier, vidéos dues, contrôle, rendu, dépôt dans a-publier/ avec légende, puis publication (Instagram, YouTube, TikTok) si mode « auto ». Sans IA.
// Usage : node scripts/auto.mjs [--maintenant=ISO] [--sans-rendu] [--seulement=cle] [--force]
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { faireLecture, jourParis, heureParis, hhmmParis, taches, permis, creneau, choisirADecaler, planifier, capDuJour, HEURE, MIN } from './decider.mjs';
const jourPlusJ = (jour, n) => jourParis(Date.parse(`${jour}T12:00:00Z`) + n * 24 * HEURE);
import { attacherClassements } from './classements.mjs';
import { controler } from './controler.mjs';
import { legende } from './legende.mjs';
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
const drapeau = (n) => process.argv.includes(`--${n}`);
let maintenant = arg('maintenant') ? Date.parse(arg('maintenant')) : Date.now();
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
const dossier = `${RACINE}/${ouvert ? '' : 'TEST-'}${jourParis(maintenant)}`;
fs.mkdirSync(RACINE, { recursive: true });
const erreur = (cle, texte) => { fs.appendFileSync(`${RACINE}/ERREURS.txt`, `${horo()} | ${cle} | ${texte}\n`); console.log(`🔴 ${cle} : ${texte}`); };
const FORMATS = {
  'apres-match': { script: 'preparer-score-final', comp: 'ApresMatch', data: (t) => `data/score-final-${t.id}.json` },
  'apres-journee': { script: 'preparer-apres-journee', comp: 'ApresJournee', data: (t) => `data/apres-journee-${t.id}${t.jour ? `-${t.jour}` : ''}.json` },
  'joueurs-journee': { script: 'preparer-joueurs-journee', comp: 'JoueursJournee', data: (t) => `data/joueurs-journee-${t.id}.json` },
  'avant-journee': { script: 'preparer-avant-journee', comp: 'AvantJournee', data: (t) => `data/avant-journee-${t.id}${t.jour ? `-${t.jour}` : ''}.json` },
  'avant-match': { script: 'preparer-avant-match', comp: 'AvantMatch', data: (t) => `data/avant-match-${t.id}.json` },
  classement: { script: 'preparer-classement', comp: 'ClassementJoueurs', data: (t) => `data/classement-${t.id}.json` },
};
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
  const LIBS = ['libnss3', 'libdbus-1-3', 'libatk1.0-0', 'libgbm-dev', 'libasound2t64', 'libxrandr2', 'libxkbcommon-dev', 'libxfixes3', 'libxcomposite1', 'libxdamage1', 'libatk-bridge2.0-0', 'libpango-1.0-0', 'libcairo2', 'libcups2'];
  for (const [cmd, args] of [['npm', ['ci', '--no-audit', '--no-fund']], ['sudo', ['apt-get', 'install', '-y', '--no-install-recommends', ...LIBS]], [process.execPath, ['scripts/preparer-assets.mjs']]]) {
    const r = lancer(cmd, args);
    if (!r.ok) throw new Error(`préparation du rendu (${cmd}) : ${dernier(r.sortie)}`);
  }
  rendu_pret = true;
}
async function traiter(t) {
  const F = FORMATS[t.format];
  // 1. Préparer. Une journée pas finie n'est pas une erreur : on réessaiera dans 6 h.
  const p = lancer(process.execPath, [`scripts/${F.script}.mjs`, String(t.id), ...(t.prono ? ['--prono'] : []), ...(t.jour ? [`--jour=${t.jour}`] : [])]);
  if (!p.ok) {
    if (/non finie|déjà commencé/.test(p.sortie)) { etat.essais[t.cle] = { ...etat.essais[t.cle], attente: maintenant + 6 * HEURE }; return 'attente'; }
    throw new Error(dernier(p.sortie));
  }
  const data = lireJson(F.data(t));
  if (!data) throw new Error('fichier de données absent');
  // 2. Contrôler. Le moindre défaut : pas de vidéo.
  const defauts = controler(t.format, data);
  if (defauts.length) throw new Error(defauts.join(' ; '));
  for (const n of data.controle?.absentsRetires ?? []) erreur(t.cle, `absent retiré, vidéo gardée : ${n}`);
  if (drapeau('sans-rendu')) return 'contrôlée';
  preparerRendu();
  // 3. Rendre puis déposer. Le fichier n'apparaît qu'une fois complet.
  fs.mkdirSync(dossier, { recursive: true });
  const nom = `${t.format}-${slug(data.accroche ?? data.ligue?.texte ?? String(t.id))}-${t.id}${t.jour ? `-${t.jour}` : ''}`;
  const temp = `out/${nom}.mp4`;
  fs.mkdirSync('out', { recursive: true });
  const chrome = process.env.CHROME_PATH ?? (fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : null);
  // Effets sonores (aucune musique) sur TOUS les formats, mixage validé par l'éditeur le 06/11 (foule en fond, sifflet, whoosh, clameurs, applaudissements).
  let props = F.data(t);
  if (true) { props = `out/props-${nom}.json`; fs.writeFileSync(props, JSON.stringify({ ...data, sons: true, ...(cfg.couvertures ? { couverture: true } : {}) })); }
  const r = lancer('npx', ['remotion', 'render', 'src/index.ts', F.comp, temp, `--props=${props}`, '--concurrency=1', '--log=error', ...QUALITE, ...(chrome ? [`--browser-executable=${chrome}`] : [])]);
  if (props !== F.data(t)) fs.rmSync(props, { force: true });
  if (!r.ok || !fs.existsSync(temp)) throw new Error(`rendu : ${dernier(r.sortie)}`);
  // Couverture (miniature de la grille) : image + 5 premières images de la vidéo. Active seulement si data/auto-config.json a « couvertures: true » (validation de l'éditeur).
  if (cfg.couvertures && FORMATS[t.format]) {
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
  fs.writeFileSync(`${dossier}/${nom}.txt`, `${ouvert ? '' : '⚠️ TEST : NE PAS PUBLIER\n\n'}${legende(t.format, data, pub)}`);
  fs.renameSync(temp, `${dossier}/${nom}.mp4`);
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
// Notification : notification macOS sur le Mac ; sur le serveur, une ligne dans out/notifications.jsonl que le workflow transforme en issue GitHub (donc en e-mail).
function notifier(titre, texte, fichier) {
  if (CI) { fs.mkdirSync('out', { recursive: true }); fs.appendFileSync('out/notifications.jsonl', JSON.stringify({ titre, texte, fichier: fichier ?? null }) + '\n'); return; }
  spawnSync('osascript', ['-e', `display notification "${texte.replace(/"/g, "'")}" with title "${titre.replace(/"/g, "'")}"`]);
}
// SCORRO_ENVOIS=off : aucun envoi (essai à blanc sur le serveur). SCORRO_CI=1 : mode GitHub Actions (vidéos mises en ligne dès le rendu, légendes gardées dans l'état).
const CI = !!process.env.SCORRO_CI;
const auto = ouvert && pub.mode === 'auto' && process.env.SCORRO_ENVOIS !== 'off';
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
// Publication : les plus gros d'abord, un réseau à la fois, avec les garde-fous (nuit, 30 min, plafond du jour). Appelée entre deux rendus pour ne jamais attendre la fin de la passe.
const publierFile = () => {
if (auto && !drapeau('sans-rendu')) {
  if (!arg('maintenant')) maintenant = Date.now(); // une passe peut durer plusieurs minutes : l'heure est relue avant de publier
  const attente = Object.entries(etat.file).sort(([, a], [, b]) => b.poids - a.poids || a.de - b.de);
  for (const [cle, f] of attente) {
    for (const reseau of [...f.restants]) {
      if (maintenant > f.jusqu) { erreur(cle, `${reseau} : trop tard, non publié`); f.restants = f.restants.filter((x) => x !== reseau); continue; }
      const p = /^avant-/.test(f.format ?? '') ? { ok: true } : permis(f, reseau, etat.pubs, maintenant, cfg);
      if (!p.ok) {
        if (p.raison === 'plafond') { erreur(cle, `${reseau} : plafond de ${capDuJour(cfg, jourParis(maintenant))} vidéos atteint aujourd'hui, non publié`); f.restants = f.restants.filter((x) => x !== reseau); }
        continue;
      }
      if (etat.stopEnvois) { console.log('envois arrêtés (échecs Buffer répétés) : voir ERREURS.txt'); break; }
      // Avant-matchs et avant-journées : programmés dans Buffer à l'heure voulue (--quand), la vidéo reste chez Buffer : le Mac peut être éteint ensuite.
      let quand = null;
      if (/^avant-/.test(f.format ?? '')) {
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
      const b = lancer(process.execPath, ['scripts/publier-buffer.mjs', f.fichier, `--reseaux=${reseau}`, ...extra]);
      if (b.ok) { etat.echecsBuffer = 0; etat.publiees ??= {}; etat.publiees[cle] ??= maintenant; }
      if (b.ok) { etat.pubs.push({ t: quand ?? maintenant, reseau, video: f.fichier, cle, poids: f.poids, format: f.format, prioritaire: !!f.prioritaire, de: f.de, jusqu: f.jusqu, ...(quand ? { programme: true } : {}) }); journal(reseau, f.fichier, quand ? `${cle} (PROGRAMMÉ pour ${horodate(quand)})` : cle); if (quand) { const l = (b.sortie.split('\n').find((x) => x.startsWith('PROGRAMME')) ?? '').slice(0, 300); if (l) fs.appendFileSync('publications.log', `    vérification Buffer : ${l}\n`); } f.restants = f.restants.filter((x) => x !== reseau); console.log(`📤 ${reseau} : ${f.fichier}`); }
      else { etat.echecsBuffer = (etat.echecsBuffer ?? 0) + 1; if (etat.echecsBuffer >= 3) { etat.stopEnvois = maintenant; erreur('buffer', `3 échecs d'envoi de suite : envois ARRÊTÉS (aucun nouvel essai). Remettre etat.stopEnvois à null dans etat/auto.json après vérification.`); fs.appendFileSync('publications.log', `${horodate(maintenant)} (Paris) | STOP | échecs Buffer répétés, envois arrêtés | -\n`); notifier('Scorro : ENVOIS ARRÊTÉS', `3 échecs Buffer de suite : plus aucun envoi tant que tu n'as pas vérifié (voir a-publier/ERREURS.txt). Remettre etat.stopEnvois à null ensuite.`, 'a-publier/ERREURS.txt'); } f.echecs[reseau] = (f.echecs[reseau] ?? 0) + 1; erreur(cle, `Buffer ${reseau} (essai ${f.echecs[reseau]}/3) : ${dernier(b.sortie)}`); if (f.echecs[reseau] >= 3) f.restants = f.restants.filter((x) => x !== reseau); }
      garder();
    }
    if (!f.restants.length) delete etat.file[cle];
  }
  etat.pubs = etat.pubs.filter((p) => maintenant - p.t < 3 * 24 * HEURE);
}
};
const paris = (t) => permis(t, 'instagram', [], maintenant, cfg).ok || (t.format === 'apres-match' && t.gros);
for (const t of dues) {
  if (t.format.startsWith('avant-')) etat.vusDue[t.cle] ??= maintenant;
  if (etat.faites[t.cle] && !drapeau('force')) continue;
  if (maintenant > t.jusqu) { etat.faites[t.cle] = { quand: maintenant, resultat: 'expiré' }; erreur(t.cle, 'trop tard : plus utile, pas de vidéo'); continue; }
  if (!paris(t)) continue; // nuit : on attend 8 h
  const es = etat.essais[t.cle] ?? { n: 0 };
  if (es.attente && maintenant < es.attente) continue;
  if (es.prochain && maintenant < es.prochain) continue;
  try {
    const r = await traiter(t);
    if (r === 'attente') { console.log(`… ${t.cle} : journée pas finie`); garder(); continue; }
    console.log(`✅ ${t.cle} → ${r}`);
    if (drapeau('sans-rendu')) continue; // essai à blanc : ne compte pas comme fait
    if (auto) etat.file[t.cle] = { fichier: r, ...(CI ? miseEnLigne(r) : {}), format: t.format, gros: t.gros, poids: t.poids, prioritaire: !!t.prioritaire, de: t.de, jusqu: t.jusqu, restants: [...RESEAUX], echecs: {} };
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
  if (alertes.length) notifier('Scorro : ALERTE', `${alertes.length} vidéo(s) de grand championnat non parties : voir resume-du-jour.txt`, 'resume-du-jour.txt');
  const lignes = [`Résumé du ${j} (écrit à ${hhmmParis(maintenant)}, heure de Paris)`, '', ...(alertes.length ? ['ALERTES GRANDS CHAMPIONNATS', ...alertes, ''] : ['Grands championnats : aucune alerte.', '']), `PUBLICATIONS : ${du.length}`, ...du.map((p) => `  ${hhmmParis(p.t)} | ${p.reseau} | ${p.video}`), '', `ERREURS / RETARDS / PLAFONDS : ${err.length}`, ...err.map((l) => `  ${l}`),
    ...(etat.stopEnvois ? ['', '⚠️ ENVOIS ARRÊTÉS après des échecs Buffer répétés. Rien ne repart tant que etat/auto.json n\'a pas stopEnvois = null.'] : []), '', 'PROGRAMME DES 2 PROCHAINS JOURS (paires avant + après)', ...prog,
    '', 'EN ATTENTE DE TON AVIS', '  - Vidéo « Ligues + pronos » v2 : brouillons/TEST-FONCTIONNALITE-ligues-pronos-v2.mp4', '  - Tests son (avant-journée, récap) : brouillons/TEST-SONS-avant-journee.mp4 et TEST-SONS-recap-journee.mp4 (le son est déjà actif sur tous les formats)',
    '  - Export qualité réseaux : brouillons/TEST-QUALITE-apres-match.mp4 (16 Mb/s, yuv420p, grain) ; à comparer à la version TikTok publiée', '', `En file d'attente : ${Object.keys(etat.file).length}`, `Mode : ${pub.mode}`];
  fs.writeFileSync('resume-du-jour.txt', lignes.join('\n') + '\n');
  etat.resume = j;
}
// Ménage des vidéos en ligne : les MP4 de la publication « videos » (≈ 45 Mo chacun) sont supprimés après 4 jours, une fois par jour. Buffer les a lus depuis longtemps.
if (etat.nettoyage !== jourParis(maintenant) && !drapeau('sans-rendu')) {
  try {
    const envFichier = fs.existsSync('.env') ? Object.fromEntries(fs.readFileSync('.env', 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()]; })) : {};
    const depot = process.env.VIDEOS_REPO ?? envFichier.VIDEOS_REPO;
    if (depot) {
      const v = lancer('gh', ['release', 'view', 'videos', '--repo', depot, '--json', 'assets']);
      if (v.ok) {
        // Règle de l'éditeur : jamais supprimer une vidéo dont la publication programmée n'est pas passée (ni dans l'heure qui suit), ni une vidéo encore en file.
        const base = (f) => String(f ?? '').split('/').pop();
        const protegees = new Set([...etat.pubs.filter((p) => p.t > maintenant - HEURE).map((p) => base(p.video)), ...Object.values(etat.file ?? {}).map((f) => base(f.fichier ?? f.url))]);
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
if (!ouvert) menageTest();
garder();
