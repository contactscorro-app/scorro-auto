// Usage : node scripts/preparer-fonctionnalite.mjs <id>
// Série « Fonctionnalités de l'app » : écrit data/format-fonc-<id>.json depuis data/fonctionnalites-v3.json. Aucune donnée inventée :
// chaque capture doit exister (vraies captures de la version App Store) ; sinon, aucun fichier (erreur).
import fs from 'node:fs';
const id = process.argv[2];
const serie = JSON.parse(fs.readFileSync('data/fonctionnalites-v3.json', 'utf8'));
const v = serie.videos.find((x) => x.id === id);
if (!v) throw new Error(`fonctionnalité « ${id} » non définie dans data/fonctionnalites-v3.json`);
// --video-prete (serveur seulement, passé par auto.mjs) : la vidéo est déjà rendue et contrôlée ; les captures, absentes du dépôt public, ne servent pas.
const prete = process.argv.includes('--video-prete') && !!process.env.SCORRO_CI;
if (!prete) for (const p of v.plans) if (!fs.existsSync(`public/${p.src}`)) throw new Error(`capture absente : public/${p.src}`);
if (!prete && !fs.existsSync(`public/${v.vignette}`)) throw new Error(`capture de vignette absente : public/${v.vignette}`);
fs.writeFileSync(`data/format-fonc-${id}.json`, JSON.stringify(v, null, 1));
console.log(`data/format-fonc-${id}.json`);
