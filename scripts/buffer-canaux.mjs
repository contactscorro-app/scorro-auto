// Usage : node scripts/buffer-canaux.mjs — affiche les ID de canaux Buffer à recopier dans .env. Lecture seule. N'affiche jamais la clé.
import fs from 'node:fs';
const env = Object.fromEntries((fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()]; }));
const cle = process.env.BUFFER_API_KEY ?? env.BUFFER_API_KEY;
if (!cle) throw new Error('BUFFER_API_KEY manquant dans .env');
const q = async (query) => {
  const r = await fetch('https://api.buffer.com', { method: 'POST', headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  const j = await r.json();
  if (j.errors) throw new Error(j.errors[0].message);
  return j.data;
};
const { account } = await q('query { account { organizations { id name } } }');
for (const o of account.organizations) {
  const { channels } = await q(`query { channels(input: { organizationId: "${o.id}" }) { id name service } }`);
  for (const c of channels) console.log(`${c.service} | ${c.name} | ${c.id}`);
}
