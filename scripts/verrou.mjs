// Verrous anti-doublon pour la bascule Mac → cloud (plan du 24/11, § 4). Aucun envoi n'est fait ici : on dit seulement si un envoi est permis.
// 1. Un seul publieur : publieur.json dans le dépôt PRIVÉ d'état ({"actif":"mac"} ou {"actif":"cloud"}). Fichier absent = "mac" (situation d'aujourd'hui).
// 2. Variable SCORRO_ENVOIS : sur le serveur, il faut "on" écrit en toutes lettres (absente ou autre valeur = aucun envoi).
// 3. Idempotence : avant de créer un post, la vidéo ne doit être ni dans etat/publiees.json ni dans la file Buffer (lecture seule).
// Mac : rien ne change tant que data/auto-config.json n'a pas publieur.verifierSurMac = true (à activer au jour 1 du parallèle, avec l'accord de l'éditeur).
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

export const ici = (env = process.env) => (env.SCORRO_CI ? 'cloud' : 'mac');
const lireJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };

// Le verrou est-il appliqué de ce côté ? Serveur : toujours. Mac : seulement si la config le demande.
export function verrouApplique({ env = process.env, cfg = lireJson('data/auto-config.json', {}) } = {}) {
  return ici(env) === 'cloud' || cfg?.publieur?.verifierSurMac === true;
}

// Lecture de publieur.json dans le dépôt d'état, par l'API GitHub (lecture seule). `gh` injectable pour les tests.
// Renvoie { actif: 'mac'|'cloud'|null, source, erreur? }. Une erreur de lecture = actif null = AUCUN envoi (on ne devine pas).
export function lirePublieur({ env = process.env, gh = (args) => spawnSync('gh', args, { encoding: 'utf8' }) } = {}) {
  if (env.SCORRO_TEST_PUBLIEUR) return { actif: env.SCORRO_TEST_PUBLIEUR, source: 'test' }; // tests uniquement
  const depot = env.ETAT_REPO || 'contactscorro-app/scorro-etat';
  const r = gh(['api', `repos/${depot}/contents/publieur.json`, '--jq', '.content']);
  const sortie = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  if (r.status !== 0) {
    if (/HTTP 404|Not Found/i.test(sortie)) return { actif: 'mac', source: 'absent (défaut : mac)' };
    return { actif: null, source: 'erreur', erreur: sortie.trim().split('\n').pop()?.slice(0, 200) || `gh ${r.status}` };
  }
  try {
    const j = JSON.parse(Buffer.from(String(r.stdout).replace(/\s+/g, ''), 'base64').toString('utf8'));
    if (j.actif !== 'mac' && j.actif !== 'cloud') return { actif: null, source: 'invalide', erreur: `publieur.json : actif = ${JSON.stringify(j.actif)}` };
    return { actif: j.actif, source: `${depot}/publieur.json` };
  } catch (e) { return { actif: null, source: 'invalide', erreur: `publieur.json illisible : ${e.message}` }; }
}

// Décision : ce côté peut-il envoyer à Buffer maintenant ?
export function peutEnvoyer({ env = process.env, publieur }) {
  const moi = ici(env);
  if (moi === 'cloud' && env.SCORRO_ENVOIS !== 'on') return { ok: false, raison: `SCORRO_ENVOIS = ${JSON.stringify(env.SCORRO_ENVOIS ?? null)} (il faut "on")` };
  if (moi === 'mac' && env.SCORRO_ENVOIS === 'off') return { ok: false, raison: 'SCORRO_ENVOIS = "off"' };
  if (!publieur || publieur.actif === null) return { ok: false, raison: `publieur.json illisible (${publieur?.erreur ?? 'non lu'}) : aucun envoi par prudence` };
  if (publieur.actif !== moi) return { ok: false, raison: `le publieur actif est « ${publieur.actif} », pas « ${moi} »` };
  return { ok: true, raison: `publieur = ${moi}` };
}

// Une seule lecture de publieur.json toutes les 2 min par processus (une passe peut durer 20 min : on relit).
let cache = null;
export function controleEnvoi({ env = process.env, cfg, gh, maintenant = Date.now() } = {}) {
  if (!verrouApplique({ env, cfg })) return { ok: true, raison: 'verrou non appliqué (Mac, publieur.verifierSurMac absent)', applique: false };
  if (!cache || maintenant - cache.t > 2 * 60000) cache = { t: maintenant, p: lirePublieur({ env, gh }) };
  return { ...peutEnvoyer({ env, publieur: cache.p }), applique: true, publieur: cache.p };
}
export const _viderCache = () => { cache = null; };

// Verrou 3 (file Buffer) : un post existe-t-il déjà pour ce fichier sur ce canal ? `q` = requête GraphQL Buffer (injectée).
// Statuts lus : scheduled (programmé) et sent (envoyé), les deux vus dans les réponses de l'API. Lecture seule.
// Renvoie l'identifiant du post trouvé, ou null. Lève une erreur si la lecture échoue (l'appelant refuse alors l'envoi).
export async function dejaDansBuffer({ q, canal, nom, pages = 3 }) {
  const org = (await q('{ account { organizations { id } } }'))?.data?.account?.organizations?.[0]?.id;
  if (!org) throw new Error('VERROU : organisation Buffer introuvable');
  const enc = encodeURIComponent(nom);
  const trouve = (p) => (p.assets ?? []).some((a) => { const s = String(a?.source ?? ''); return s.endsWith(`/${nom}`) || s.endsWith(`/${enc}`); });
  for (const statut of ['scheduled', 'sent']) {
    let apres = null;
    for (let i = 0; i < pages; i++) {
      const r = await q(`query($o: OrganizationId!, $c:[ChannelId!], $a:String){ posts(first: 100, after:$a, input:{ organizationId:$o, filter:{ channelIds:$c, status:[${statut}] } }){ edges{ node{ id status assets{ source } } } pageInfo{ hasNextPage endCursor } } }`, { o: org, c: [canal], a: apres });
      if (r?.errors || !r?.data?.posts) throw new Error(`VERROU : lecture de la file Buffer impossible (${JSON.stringify(r?.errors ?? r).slice(0, 200)})`);
      const p = r.data.posts.edges.map((e) => e.node).find(trouve);
      if (p) return p.id;
      if (!r.data.posts.pageInfo?.hasNextPage) break;
      apres = r.data.posts.pageInfo.endCursor;
    }
  }
  return null;
}

// Verrou 3 (registre) : etat/publiees.json (fichier → réseau → id du post).
export const dejaDansRegistre = (registre, nom, reseau) => registre?.[nom]?.[reseau] ?? null;
