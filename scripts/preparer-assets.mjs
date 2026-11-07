// Prépare les médias qui NE SONT PAS dans le dépôt : effets sonores (Mixkit, licence « Sound Effects Free License », téléchargés ici, jamais redistribués) et grain anti-bandes.
// Usage : node scripts/preparer-assets.mjs   (ASSETS_DIR pour un autre dossier que « public »). Idempotent : ce qui existe déjà est conservé.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
const DIR = process.env.ASSETS_DIR ?? 'public';
fs.mkdirSync(`${DIR}/sons`, { recursive: true });
const SONS = { 'clameur-victoire': 462, 'stade-joie': 3022, 'clameur-courte': 459, applaudissements: 362, 'sifflet-court': 615, sifflet: 614, 'whoosh-2': 1492 };
const telecharger = async (url, f) => { const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }); if (!r.ok) throw new Error(`${url} : ${r.status}`); fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); };
const mixkit = (id) => `https://assets.mixkit.co/active_storage/sfx/${id}/${id}-preview.mp3`;
for (const [nom, id] of Object.entries(SONS)) if (!fs.existsSync(`${DIR}/sons/${nom}.mp3`)) await telecharger(mixkit(id), `${DIR}/sons/${nom}.mp3`);
const ffmpeg = (args) => { const r = spawnSync('npx', ['remotion', 'ffmpeg', '-y', ...args], { encoding: 'utf8' }); if (r.status !== 0) throw new Error(`ffmpeg : ${(r.stderr ?? '').slice(-200)}`); };
// Fond « foule » (A) : « City downtown crowd ambience » filtré (passe-haut 140 Hz, passe-bas 4,5 kHz ×2, crête normalisée à 0,7).
if (!fs.existsSync(`${DIR}/sons/fond-a.mp3`)) {
  const brut = `${DIR}/sons/_fond-a-brut.mp3`, wav = `${DIR}/sons/_fond-a.wav`, wav2 = `${DIR}/sons/_fond-a2.wav`;
  await telecharger(mixkit(361), brut);
  ffmpeg(['-i', brut, '-ac', '1', '-ar', '44100', wav]);
  const b = fs.readFileSync(wav), off = b.indexOf('data') + 8, n = (b.length - off) >> 1, fe = 44100;
  const x = new Float64Array(n); for (let i = 0; i < n; i++) x[i] = b.readInt16LE(off + 2 * i) / 32768;
  const biquad = (type, f0, Q = Math.SQRT1_2) => { const w = 2 * Math.PI * f0 / fe, c = Math.cos(w), a = Math.sin(w) / (2 * Q); const [b0, b1, b2] = type === 'lp' ? [(1 - c) / 2, 1 - c, (1 - c) / 2] : [(1 + c) / 2, -(1 + c), (1 + c) / 2]; const a0 = 1 + a; return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: -2 * c / a0, a2: (1 - a) / a0 }; };
  const passer = (s, f) => { const y = new Float64Array(s.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < s.length; i++) { const v = f.b0 * s[i] + f.b1 * x1 + f.b2 * x2 - f.a1 * y1 - f.a2 * y2; x2 = x1; x1 = s[i]; y2 = y1; y1 = v; y[i] = v; } return y; };
  let y = passer(passer(passer(x, biquad('hp', 140)), biquad('lp', 4500)), biquad('lp', 4500));
  let m = 0; for (const v of y) m = Math.max(m, Math.abs(v));
  const g = 0.7 / (m || 1), out = Buffer.alloc(44 + n * 2);
  out.write('RIFF', 0); out.writeUInt32LE(36 + n * 2, 4); out.write('WAVEfmt ', 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(fe, 24); out.writeUInt32LE(fe * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(y[i] * g * 32767))), 44 + 2 * i);
  fs.writeFileSync(wav2, out);
  ffmpeg(['-i', wav2, '-b:a', '128k', `${DIR}/sons/fond-a.mp3`]);
  for (const f of [brut, wav, wav2]) fs.rmSync(f, { force: true });
}
// Grain : bruit blanc à alpha aléatoire (0–14/255), 1080×1920.
if (!fs.existsSync(`${DIR}/grain.png`)) {
  const W = 1080, H = 1920, raw = Buffer.alloc((W * 4 + 1) * H); let seed = 12345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let yy = 0; yy < H; yy++) { const o = yy * (W * 4 + 1); raw[o] = 0; for (let xx = 0; xx < W; xx++) { const p = o + 1 + xx * 4, v = Math.floor(rnd() * 256); raw[p] = v; raw[p + 1] = v; raw[p + 2] = v; raw[p + 3] = Math.floor(rnd() * 15); } }
  const crcT = new Int32Array(256).map((_, k) => { let c = k; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (bb) => { let c = -1; for (const v of bb) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  fs.writeFileSync(`${DIR}/grain.png`, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}
console.log('médias prêts dans', DIR);
