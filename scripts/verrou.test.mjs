// Tests à blanc des verrous anti-doublon et de la lecture des médias privés : aucun réseau, aucun envoi (gh et Buffer simulés).
// node --test scripts/verrou.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ici, verrouApplique, lirePublieur, peutEnvoyer, controleEnvoi, _viderCache, dejaDansBuffer, dejaDansRegistre } from './verrou.mjs';
import { depotMedias, fonctionnalite, sonsMixkit, carrousel } from './preparer-medias.mjs';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64');
const ghRep = (status, stdout = '', stderr = '') => () => ({ status, stdout, stderr });

test('côté : cloud si SCORRO_CI, sinon mac', () => {
  assert.equal(ici({ SCORRO_CI: '1' }), 'cloud');
  assert.equal(ici({}), 'mac');
});

test('verrou appliqué : serveur toujours ; Mac seulement avec publieur.verifierSurMac = true', () => {
  assert.equal(verrouApplique({ env: { SCORRO_CI: '1' }, cfg: {} }), true);
  assert.equal(verrouApplique({ env: {}, cfg: {} }), false);
  assert.equal(verrouApplique({ env: {}, cfg: { publieur: { verifierSurMac: false } } }), false);
  assert.equal(verrouApplique({ env: {}, cfg: { publieur: { verifierSurMac: true } } }), true);
});

test('publieur.json : absent = mac, contenu lu, erreur = null (aucun envoi)', () => {
  assert.equal(lirePublieur({ env: {}, gh: ghRep(1, '', 'gh: Not Found (HTTP 404)') }).actif, 'mac');
  assert.equal(lirePublieur({ env: {}, gh: ghRep(0, b64({ actif: 'cloud' })) }).actif, 'cloud');
  assert.equal(lirePublieur({ env: {}, gh: ghRep(0, b64({ actif: 'mac' }) + '\n') }).actif, 'mac');
  assert.equal(lirePublieur({ env: {}, gh: ghRep(1, '', 'HTTP 502: Bad Gateway') }).actif, null);
  assert.equal(lirePublieur({ env: {}, gh: ghRep(0, b64({ actif: 'les-deux' })) }).actif, null);
  assert.equal(lirePublieur({ env: {}, gh: ghRep(0, 'pas du base64 json') }).actif, null);
});

test('publieur.json lu dans le dépôt ETAT_REPO', () => {
  let vu;
  lirePublieur({ env: { ETAT_REPO: 'x/etat' }, gh: (a) => { vu = a; return { status: 0, stdout: b64({ actif: 'mac' }) }; } });
  assert.deepEqual(vu.slice(0, 2), ['api', 'repos/x/etat/contents/publieur.json']);
});

test('serveur : envoi seulement avec SCORRO_ENVOIS=on ET publieur = cloud', () => {
  const C = (envois, actif) => peutEnvoyer({ env: { SCORRO_CI: '1', ...(envois === undefined ? {} : { SCORRO_ENVOIS: envois }) }, publieur: { actif } }).ok;
  assert.equal(C('on', 'cloud'), true);
  assert.equal(C('on', 'mac'), false);
  assert.equal(C('on', null), false);
  assert.equal(C('off', 'cloud'), false);
  assert.equal(C(undefined, 'cloud'), false); // variable absente : aucun envoi
  assert.equal(C('ON', 'cloud'), false);
  assert.equal(C('', 'cloud'), false);
});

test('Mac (verrou activé) : envoi seulement si publieur = mac', () => {
  const M = (actif, envois) => peutEnvoyer({ env: envois ? { SCORRO_ENVOIS: envois } : {}, publieur: { actif } }).ok;
  assert.equal(M('mac'), true);
  assert.equal(M('cloud'), false);
  assert.equal(M(null), false);
  assert.equal(M('mac', 'off'), false);
});

test('Mac sans drapeau : comportement inchangé (aucune lecture, envoi permis)', () => {
  _viderCache();
  let appels = 0;
  const v = controleEnvoi({ env: {}, cfg: {}, gh: () => { appels++; return { status: 0, stdout: b64({ actif: 'cloud' }) }; } });
  assert.equal(v.ok, true); assert.equal(v.applique, false); assert.equal(appels, 0);
});

test('serveur : lecture mise en cache 2 min, relue ensuite', () => {
  _viderCache();
  let appels = 0, actif = 'cloud';
  const gh = () => { appels++; return { status: 0, stdout: b64({ actif }) }; };
  const env = { SCORRO_CI: '1', SCORRO_ENVOIS: 'on' };
  assert.equal(controleEnvoi({ env, cfg: {}, gh, maintenant: 0 }).ok, true);
  actif = 'mac'; // bascule de retour pendant la passe
  assert.equal(controleEnvoi({ env, cfg: {}, gh, maintenant: 60000 }).ok, true); // encore en cache
  assert.equal(controleEnvoi({ env, cfg: {}, gh, maintenant: 3 * 60000 }).ok, false); // relu : le Mac a repris la main
  assert.equal(appels, 2);
  _viderCache();
});

test('registre etat/publiees.json', () => {
  const reg = { 'a.mp4': { instagram: 'id1' } };
  assert.equal(dejaDansRegistre(reg, 'a.mp4', 'instagram'), 'id1');
  assert.equal(dejaDansRegistre(reg, 'a.mp4', 'tiktok'), null);
  assert.equal(dejaDansRegistre({}, 'b.mp4', 'tiktok'), null);
});

const fauxBuffer = (pages) => {
  const requetes = [];
  const q = async (query, variables) => {
    requetes.push({ query, variables });
    if (query.includes('organizations')) return { data: { account: { organizations: [{ id: 'org1' }] } } };
    assert.ok(!/mutation/i.test(query), 'aucune mutation');
    const statut = /status:\[(\w+)\]/.exec(query)[1];
    const liste = pages[statut] ?? [[]];
    const i = variables.a ? Number(variables.a) : 0;
    return { data: { posts: { edges: (liste[i] ?? []).map((node) => ({ node })), pageInfo: { hasNextPage: i + 1 < liste.length, endCursor: String(i + 1) } } } };
  };
  return { q, requetes };
};

test('file Buffer : vidéo déjà programmée trouvée par son nom de fichier', async () => {
  const { q } = fauxBuffer({ scheduled: [[{ id: 'p9', status: 'scheduled', assets: [{ source: 'https://github.com/o/v/releases/download/videos/apres-match-x-1.mp4' }] }]] });
  assert.equal(await dejaDansBuffer({ q, canal: 'c1', nom: 'apres-match-x-1.mp4' }), 'p9');
});

test('file Buffer : nom encodé et 2e page des envoyés', async () => {
  const nom = 'f-fonc-où-2.mp4';
  const { q } = fauxBuffer({ sent: [[{ id: 'a', assets: [{ source: 'https://x/autre.mp4' }] }], [{ id: 'b', assets: [{ source: `https://x/${encodeURIComponent(nom)}` }] }]] });
  assert.equal(await dejaDansBuffer({ q, canal: 'c1', nom }), 'b');
});

test('file Buffer : rien trouvé = null ; pas de faux positif sur un nom qui en contient un autre', async () => {
  const { q, requetes } = fauxBuffer({ scheduled: [[{ id: 'p1', assets: [{ source: 'https://x/xapres-match-1.mp4' }] }]] });
  assert.equal(await dejaDansBuffer({ q, canal: 'c1', nom: 'apres-match-1.mp4' }), null);
  assert.ok(requetes.every((r) => !/mutation/i.test(r.query)));
  assert.ok(requetes.filter((r) => r.variables?.c).every((r) => r.variables.c[0] === 'c1'));
});

test('file Buffer illisible : erreur (l\'appelant n\'envoie rien)', async () => {
  await assert.rejects(dejaDansBuffer({ q: async (x) => (x.includes('organizations') ? { data: { account: { organizations: [{ id: 'o' }] } } } : { errors: [{ message: 'bad' }] }), canal: 'c', nom: 'a.mp4' }), /VERROU/);
  await assert.rejects(dejaDansBuffer({ q: async () => ({}), canal: 'c', nom: 'a.mp4' }), /VERROU/);
});

test('médias privés : MEDIAS_REPO, sinon ETAT_REPO (cas Q42 non)', () => {
  assert.equal(depotMedias({ MEDIAS_REPO: 'o/medias', ETAT_REPO: 'o/etat' }), 'o/medias');
  assert.equal(depotMedias({ ETAT_REPO: 'o/etat' }), 'o/etat');
  assert.equal(depotMedias({}), null);
});

test('médias privés : téléchargement d\'une fonctionnalité (motifs exacts, dépôt privé)', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'medias-'));
  let vu;
  const r = fonctionnalite('fan-zone', { dir: d, env: { ETAT_REPO: 'o/etat' }, run: (c, a) => { vu = [c, ...a]; return { ok: true, sortie: '' }; } });
  assert.equal(r.ok, true);
  assert.deepEqual(vu.slice(0, 6), ['gh', 'release', 'download', 'fonctionnalites', '--repo', 'o/etat']);
  assert.ok(vu.includes('*-fan-zone.mp4') && vu.includes('*-fan-zone.duree') && vu.includes('*-fan-zone.vignette.png'));
  assert.equal(fonctionnalite('../x', { env: { ETAT_REPO: 'o/etat' }, run: () => assert.fail('pas d\'appel') }).ok, false);
  assert.equal(carrousel('pas-une-date', { env: { ETAT_REPO: 'o/etat' }, run: () => assert.fail('pas d\'appel') }).ok, false);
});

test('médias privés : sons Mixkit déjà là = aucun téléchargement ; absents et dépôt inconnu = échec', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'sons-'));
  for (const f of ['foot/but-cri-1.mp3', 'foot/but-cri-2.mp3', 'foot/stade-ambiance-1.mp3', 'foot/stade-ambiance-2.mp3']) { fs.mkdirSync(path.dirname(`${d}/${f}`), { recursive: true }); fs.writeFileSync(`${d}/${f}`, 'x'); }
  assert.equal(sonsMixkit({ dir: d, env: {}, run: () => assert.fail('pas d\'appel') }).ok, true);
  assert.equal(sonsMixkit({ dir: fs.mkdtempSync(path.join(os.tmpdir(), 'vide-')), env: {} }).ok, false);
});

// publier-buffer.mjs de bout en bout, à blanc : le verrou refuse AVANT tout réseau (pas de clé Buffer, pas de gh dans le PATH de test).
const lancerPublier = (env) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pub-'));
  fs.mkdirSync(`${d}/data`); fs.mkdirSync(`${d}/scripts`); fs.mkdirSync(`${d}/bin`);
  for (const f of ['publier-buffer.mjs', 'verrou.mjs', 'controle-video.mjs']) fs.copyFileSync(`scripts/${f}`, `${d}/scripts/${f}`);
  fs.writeFileSync(`${d}/data/publication.json`, JSON.stringify({ sportmonksOk: true, appEnLigne: true, mode: 'auto' }));
  fs.writeFileSync(`${d}/data/marque.json`, JSON.stringify({ appStore: 'https://apps.apple.com/x' }));
  fs.writeFileSync(`${d}/data/auto-config.json`, JSON.stringify(env.CFG ?? {}));
  fs.writeFileSync(`${d}/legende.txt`, 'Légende de test\nLien dans la bio 👆');
  // Faux gh : toute utilisation est notée (le test vérifie qu'il n'y en a aucune quand le verrou refuse).
  fs.writeFileSync(`${d}/bin/gh`, `#!/bin/sh\necho "$@" >> "${d}/gh-appels.log"\nexit 1\n`); fs.chmodSync(`${d}/bin/gh`, 0o755);
  const { CFG, ...e } = env;
  const r = spawnSync(process.execPath, ['scripts/publier-buffer.mjs', 'a-publier/2026-11-26/apres-match-test-1.mp4', '--reseaux=instagram', '--duree=20', '--url=https://exemple.invalid/v.mp4', `--legende-fichier=${d}/legende.txt`], { cwd: d, encoding: 'utf8', env: { PATH: `${d}/bin:/usr/bin:/bin`, HOME: d, ...e } });
  return { code: r.status, sortie: `${r.stdout}${r.stderr}`, gh: fs.existsSync(`${d}/gh-appels.log`) ? fs.readFileSync(`${d}/gh-appels.log`, 'utf8') : '' };
};

test('publier-buffer (serveur, SCORRO_ENVOIS absent) : VERROU, code 4, aucun appel gh', () => {
  const r = lancerPublier({ SCORRO_CI: '1', SCORRO_TEST_PUBLIEUR: 'cloud' });
  assert.equal(r.code, 4, r.sortie); assert.match(r.sortie, /^VERROU : SCORRO_ENVOIS/m); assert.equal(r.gh, '');
});

test('publier-buffer (serveur, envois on, publieur = mac) : VERROU, code 4', () => {
  const r = lancerPublier({ SCORRO_CI: '1', SCORRO_ENVOIS: 'on', SCORRO_TEST_PUBLIEUR: 'mac' });
  assert.equal(r.code, 4, r.sortie); assert.match(r.sortie, /^VERROU : le publieur actif est « mac »/m); assert.equal(r.gh, '');
});

test('publier-buffer (serveur, publieur.json illisible) : VERROU, code 4', () => {
  const r = lancerPublier({ SCORRO_CI: '1', SCORRO_ENVOIS: 'on' }); // faux gh en échec
  assert.equal(r.code, 4, r.sortie); assert.match(r.sortie, /^VERROU : publieur\.json illisible/m);
});

test('publier-buffer (serveur, envois on, publieur = cloud) : le verrou laisse passer (arrêt ensuite faute de VIDEOS_REPO, rien d\'envoyé)', () => {
  const r = lancerPublier({ SCORRO_CI: '1', SCORRO_ENVOIS: 'on', SCORRO_TEST_PUBLIEUR: 'cloud' });
  assert.notEqual(r.code, 0); assert.doesNotMatch(r.sortie, /VERROU/); assert.match(r.sortie, /VIDEOS_REPO manquant/);
});

test('publier-buffer (Mac, sans drapeau) : comme avant, aucun verrou', () => {
  const r = lancerPublier({ SCORRO_TEST_PUBLIEUR: 'cloud' }); // même si le cloud était actif : Mac inchangé tant que verifierSurMac est faux
  assert.doesNotMatch(r.sortie, /VERROU/); assert.match(r.sortie, /VIDEOS_REPO manquant/);
});

test('publier-buffer (Mac, drapeau activé, publieur = cloud) : VERROU', () => {
  const r = lancerPublier({ SCORRO_TEST_PUBLIEUR: 'cloud', CFG: { publieur: { verifierSurMac: true } } });
  assert.equal(r.code, 4, r.sortie); assert.match(r.sortie, /^VERROU : le publieur actif est « cloud », pas « mac »/m);
});
