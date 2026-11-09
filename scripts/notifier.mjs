// Alertes : trois canaux sur le Mac (notification avec son, fichier ALERTE-A-LIRE.txt sur le Bureau, issue dans le dépôt PRIVÉ scorro-etat), jamais dans le dépôt public.
// En mode serveur (SCORRO_CI) : une ligne dans out/notifications.jsonl, transformée en issue par le workflow.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export function notifier(titre, texte, fichier, { ci = !!process.env.SCORRO_CI, depot = process.env.ETAT_REPO || 'contactscorro-app/scorro-etat', test = false, sansIssue = false } = {}) {
  if (ci) { fs.mkdirSync('out', { recursive: true }); fs.appendFileSync('out/notifications.jsonl', JSON.stringify({ titre, texte, fichier: fichier ?? null }) + '\n'); return { canaux: ['jsonl'] }; }
  const canaux = [];
  const net = (s) => String(s).replace(/["\\]/g, "'");
  const r1 = spawnSync('osascript', ['-e', `display notification "${net(texte).slice(0, 220)}" with title "${net(titre)}" sound name "Sosumi"`]);
  if (r1.status === 0) canaux.push('notification');
  try {
    const bureau = path.join(os.homedir(), 'Desktop', 'ALERTE-A-LIRE.txt');
    fs.appendFileSync(bureau, `${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })} — ${titre}\n${texte}\n\n`);
    canaux.push('fichier-bureau');
  } catch {}
  if (sansIssue) return { canaux };
  const r3 = spawnSync('gh', ['issue', 'create', '--repo', depot, '--title', (test ? '[TEST] ' : '') + titre, '--body', texte], { encoding: 'utf8' });
  if (r3.status === 0) canaux.push('issue');
  return { canaux, issue: r3.status === 0 ? r3.stdout.trim() : null };
}

// Silence anormal : il y avait des vidéos prévues (programmées dans la fenêtre ou en attente de publication) mais rien n'est parti depuis `heures` h, en journée (8 h–23 h Paris).
export function silenceAnormal({ file = {}, maintenant, derniereSortie, heures = 3, heureParis }) {
  const h = heureParis(maintenant);
  if (h < 8 || h >= 23) return false;
  const seuil = maintenant - heures * 3600e3;
  if ((derniereSortie ?? 0) > seuil) return false;
  const prevues = Object.values(file).some((f) => (f.restants?.length ?? 0) > 0 && f.de <= seuil + 3600e3 && maintenant <= f.jusqu);
  return prevues;
}

// Série « fonctionnalités » (publiée à la main) : la veille à partir de 18 h (Paris), renvoie la vidéo du lendemain si elle est prête. `jourParis` fourni par l'appelant.
export function rappelDeLaVeille(calendrier = [], maintenant, { jourParis, heureParis, dejaFaits = {} }) {
  if (heureParis(maintenant) < 18) return null;
  const demain = jourParis(maintenant + 24 * 3600e3);
  return calendrier.find((c) => c.date === demain && !dejaFaits[c.id] && c.statut === 'prête') ?? null;
}
