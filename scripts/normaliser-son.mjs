// Usage : node scripts/normaliser-son.mjs <video.mp4> [ponctuel (défaut) | cible LUFS, ex. -16 pour l'ancien mixage avec fond]
// FOND EN SILENCE (25/11 15:50, l'éditeur) : mode « ponctuel » par défaut. Le son n'est plus qu'une suite de quelques bruitages courts sur du silence :
// on ne le remonte JAMAIS à −16 LUFS (les effets restent nettement sous le niveau global). Gain linéaire seul (aucun limiteur, aucune compression,
// donc aucun pompage) : −24 LUFS intégrés au plus (silence exclu par le portail EBU), crête vraie ≤ −6 dBTP. Vidéo muette : seulement le calage.
// Règle de l'éditeur (22/11) : son final des nouvelles vidéos à −16 LUFS intégrés (crête vraie ≤ −1,5 dBTP). Image copiée telle quelle (aucun réencodage vidéo).
// Deux passes loudnorm (mesure, puis correction linéaire), puis une 3e mesure : écart > 1 LU → erreur, le fichier d'origine reste intact.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const [fichier, cibleArg] = process.argv.slice(2);
const PONCTUEL = cibleArg === undefined || cibleArg === 'ponctuel';
const CIBLE_PONCTUEL = -24, CRETE_PONCTUEL = -6;
const I = PONCTUEL ? CIBLE_PONCTUEL : Number(cibleArg), TP = -2, LRA = 11; // crête visée −2 dBTP : marge pour rester ≤ −1,5 après l’encodage AAC
if (!fichier || !fs.existsSync(fichier)) throw new Error('vidéo introuvable');
// Calage (25/11) : la piste AAC écrite par Remotion arrive 2048 échantillons (≈ 1,28 image à 30 i/s) en retard sur l'image (amorce AAC sans liste
// d'édition ; mesuré par corrélation sur le récap 424599 publié et sur les essais). On avance donc le son de AVANCE échantillons, une seule fois :
// le fichier corrigé est marqué (métadonnée scorro_avance) et un 2e passage ne décale plus rien. SCORRO_AVANCE_AAC=0 pour désactiver.
const AVANCE = Number(process.env.SCORRO_AVANCE_AAC ?? 2048);
const ff = (args) => spawnSync('npx', ['remotion', 'ffmpeg', '-hide_banner', '-nostats', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 });
const mesurer = (f) => {
  const r = ff(['-i', f, '-vn', '-af', `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:print_format=json`, '-f', 'null', '-']);
  const m = /\{[^{}]*"input_i"[^{}]*\}/s.exec(`${r.stdout}${r.stderr}`);
  if (!m) throw new Error(`mesure impossible : ${(r.stderr ?? '').slice(-300)}`);
  return JSON.parse(m[0]);
};
const dejaCale = /scorro_avance/.test(`${spawnSync('npx', ['remotion', 'ffprobe', '-v', 'error', '-show_entries', 'stream_tags:format_tags', fichier], { encoding: 'utf8' }).stdout ?? ''}`);
const AV = dejaCale ? 0 : AVANCE;
const avance = AV > 0 ? `atrim=start_sample=${AV},asetpts=PTS-STARTPTS,` : '';
const tag = ['-metadata', `scorro_avance=${dejaCale ? 'deja' : AV}`];
const m1 = mesurer(fichier);
if (PONCTUEL) {
  // gain = le plus petit de (cible − niveau) et (crête max − crête) ; muet : 0 dB (seul le calage AAC est fait)
  const muet = !Number.isFinite(Number(m1.input_i));
  const G = muet ? 0 : Math.min(CIBLE_PONCTUEL - Number(m1.input_i), CRETE_PONCTUEL - Number(m1.input_tp));
  const tmpP = fichier.replace(/\.mp4$/, '.ponctuel.mp4');
  const rp = ff(['-y', '-i', fichier, '-c:v', 'copy', '-af', `${avance}volume=${G.toFixed(2)}dB`, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart+use_metadata_tags', ...tag, tmpP]);
  if (rp.status !== 0 || !fs.existsSync(tmpP)) throw new Error(`gain ponctuel : ${(rp.stderr ?? '').slice(-300)}`);
  const mp = mesurer(tmpP);
  if (!muet && (Number(mp.input_i) > CIBLE_PONCTUEL + 1.5 || Number(mp.input_tp) > CRETE_PONCTUEL + 1)) { fs.rmSync(tmpP, { force: true }); throw new Error(`après gain : ${mp.input_i} LUFS, crête ${mp.input_tp} dBTP (attendu ≤ ${CIBLE_PONCTUEL + 1.5} LUFS, ≤ ${CRETE_PONCTUEL + 1} dBTP) : fichier d'origine gardé`); }
  fs.renameSync(tmpP, fichier);
  console.log(`PONCTUEL ${muet ? 'muet' : `${m1.input_i} → ${mp.input_i} LUFS (crête ${mp.input_tp} dBTP, gain ${G.toFixed(1)} dB, linéaire)`}${AV ? ` ; son avancé de ${AV} échantillons (amorce AAC)` : dejaCale ? ' ; calage déjà fait' : ''}`);
  process.exit(0);
}
if (!Number.isFinite(Number(m1.input_i))) throw new Error('piste son muette ou illisible');
const tmp = fichier.replace(/\.mp4$/, '.lufs.mp4');
const r = ff(['-y', '-i', fichier, '-c:v', 'copy', '-af', `${avance}loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:measured_I=${m1.input_i}:measured_TP=${m1.input_tp}:measured_LRA=${m1.input_lra}:measured_thresh=${m1.input_thresh}:offset=${m1.target_offset}:linear=true`, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart+use_metadata_tags', ...tag, tmp]);
if (r.status !== 0 || !fs.existsSync(tmp)) throw new Error(`normalisation : ${(r.stderr ?? '').slice(-300)}`);
let m2 = mesurer(tmp);
// Repli 1 : loudnorm DYNAMIQUE (limiteur intégré) si le mode linéaire laisse une crête > −1,5 dBTP ou rate la cible (mixage « pointu »).
if (Number(m2.input_tp) > -1.5 || Math.abs(Number(m2.input_i) - I) > 1) {
  const tmpD = fichier.replace(/\.mp4$/, '.dyn.mp4');
  const rd = ff(['-y', '-i', fichier, '-c:v', 'copy', '-af', `${avance}loudnorm=I=${I}:TP=${TP}:LRA=${LRA}`, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart+use_metadata_tags', ...tag, tmpD]);
  if (rd.status === 0 && fs.existsSync(tmpD)) { const md = mesurer(tmpD); if (Math.abs(Number(md.input_i) - I) <= 1 && Number(md.input_tp) <= -1.5) { fs.renameSync(tmpD, tmp); m2 = md; } else fs.rmSync(tmpD, { force: true }); }
}
// Repli 2 : gain simple (volume), possible seulement si la crête reste ≤ −1 dBTP après le gain. Sinon le mixage est trop « pointu » : on le dit.
if (Math.abs(Number(m2.input_i) - I) > 1) {
  const G = I - Number(m1.input_i);
  if (Number(m1.input_tp) + G > -2) { fs.rmSync(tmp, { force: true }); throw new Error(`mixage trop pointu : ${m1.input_i} LUFS, crête ${m1.input_tp} dBTP (écart ${(Number(m1.input_tp) - Number(m1.input_i)).toFixed(1)} dB > ${(-1 - I).toFixed(0)}) : baisser les bruitages ou monter l'ambiance`); }
  const r2 = ff(['-y', '-i', fichier, '-c:v', 'copy', '-af', `${avance}volume=${G.toFixed(2)}dB`, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart+use_metadata_tags', ...tag, tmp]);
  if (r2.status !== 0) throw new Error(`gain : ${(r2.stderr ?? '').slice(-300)}`);
  m2 = mesurer(tmp);
}
if (Math.abs(Number(m2.input_i) - I) > 1.5 || Number(m2.input_tp) > -1) { fs.rmSync(tmp, { force: true }); throw new Error(`après correction : ${m2.input_i} LUFS au lieu de ${I} (±1) : fichier d'origine gardé`); }
// Crête vraie > −1,5 dBTP (skill video-fluide) : on baisse le volume juste assez (marge 0,2 dB), si le niveau reste dans ±1 LU.
if (Number(m2.input_tp) > -1.5) {
  const baisse = Number(m2.input_tp) + 2.2, tmp2 = fichier.replace(/\.mp4$/, '.tp.mp4');
  const r3 = ff(['-y', '-i', tmp, '-c:v', 'copy', '-af', `volume=-${baisse.toFixed(2)}dB`, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart+use_metadata_tags', '-map_metadata', '0', tmp2]);
  if (r3.status !== 0) throw new Error(`crête : ${(r3.stderr ?? '').slice(-300)}`);
  const m3 = mesurer(tmp2);
  // Dernier recours : si la baisse sort de ±1 LU, on garde la version précédente (crête un peu haute) plutôt qu'un son à −32 LUFS ; avertissement.
  if (Math.abs(Number(m3.input_i) - I) > 1 || Number(m3.input_tp) > -1.5) { fs.rmSync(tmp2, { force: true }); console.log(`AVERTISSEMENT : crête ${m2.input_tp} dBTP (cible ≤ −1,5) gardée pour rester à ${m2.input_i} LUFS`); }
  else { fs.renameSync(tmp2, tmp); m2 = m3; }
}
fs.renameSync(tmp, fichier);
console.log(`LUFS ${m1.input_i} → ${m2.input_i} (crête ${m2.input_tp} dBTP)${AV ? ` ; son avancé de ${AV} échantillons (amorce AAC)` : dejaCale ? ' ; calage déjà fait' : ''}`);
