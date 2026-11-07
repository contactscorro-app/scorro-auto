// Usage : node scripts/supprimer-buffer.mjs <postId> [--simulation]
// Supprime UNE publication programmée dans Buffer (jamais la vidéo hébergée sur scorro-videos). --simulation : n'appelle rien.
import fs from 'node:fs';
const id = process.argv[2];
if (!/^[0-9a-f]{20,}$/.test(id ?? '')) throw new Error('identifiant de post Buffer invalide');
if (process.argv.includes('--simulation')) { console.log(`SIMULATION : supprimerait le post ${id}`); process.exit(0); }
const env = Object.fromEntries((fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()]; }));
const cle = process.env.BUFFER_API_KEY ?? env.BUFFER_API_KEY;
if (!cle) throw new Error('BUFFER_API_KEY manquant');
const r = await fetch('https://api.buffer.com', { method: 'POST', headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: `mutation { deletePost(input:{id:"${id}"}) { __typename ... on DeletePostSuccess { id } ... on MutationError { message } } }` }) });
const j = await r.json().catch(() => ({}));
if (j?.data?.deletePost?.__typename !== 'DeletePostSuccess') throw new Error(`suppression : ${j?.data?.deletePost?.message ?? j?.errors?.[0]?.message ?? r.status}`);
console.log(`SUPPRIME ${id}`);
