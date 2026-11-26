// Usage : node scripts/normaliser-son.mjs <video.mp4> [cible=-16] [--crete]
// --crete (Q60 = a, l'éditeur 25/11 20:44 ; récap, avant-journée, stories, qui ont le fond léger fond-a à 0,08) : PAS de cible LUFS. Les sons restent au
// niveau d'aujourd'hui : un seul gain LINÉAIRE qui met la crête vraie à −2 dBTP (aucune compression, aucun limiteur, aucun loudnorm dynamique).
// La vidéo mesure alors ≈ −21 LUFS intégrés (le fond bas entre dans la mesure EBU : c'est voulu). Avance AAC de 43 ms comme les autres formats.
// Règle de l'éditeur (22/11) : son final des nouvelles vidéos à −16 LUFS intégrés (crête vraie ≤ −1,5 dBTP). Image copiée telle quelle (aucun réencodage vidéo).
// Deux passes loudnorm (mesure, puis correction linéaire), puis une 3e mesure : écart > 1 LU → erreur, le fichier d'origine reste intact.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const argv = process.argv.slice(2), CRETE = argv.includes('--crete');
const [fichier, cibleArg] = argv.filter((a) => a !== '--crete');
const I = Number(cibleArg ?? -16), TP = -2, LRA = 11; // crête visée −2 dBTP : marge pour rester ≤ −1,5 après l’encodage AAC
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
if (!Number.isFinite(Number(m1.input_i))) throw new Error('piste son muette ou illisible');
if (CRETE) {
  // Gain linéaire seul, calculé sur la crête vraie ; refait depuis l'original (un seul encodage AAC) si l'AAC remonte la crête au-dessus de −1,5 dBTP.
  const tmpC = fichier.replace(/\.mp4$/, '.crete.mp4');
  const encoder = (G) => { const r = ff(['-y', '-i', fichier, '-c:v', 'copy', '-af', `${avance}volume=${G.toFixed(2)}dB`, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart+use_metadata_tags', ...tag, tmpC]); if (r.status !== 0 || !fs.existsSync(tmpC)) throw new Error(`gain : ${(r.stderr ?? '').slice(-300)}`); return mesurer(tmpC); };
  let G = TP - Number(m1.input_tp), mc = encoder(G);
  if (Number(mc.input_tp) > -1.5) { G -= Number(mc.input_tp) + 2.2; mc = encoder(G); }
  if (Number(mc.input_tp) > -1) { fs.rmSync(tmpC, { force: true }); throw new Error(`crête ${mc.input_tp} dBTP après gain linéaire : fichier d'origine gardé`); }
  fs.renameSync(tmpC, fichier);
  const hors = Number(mc.input_i) < -26 || Number(mc.input_i) > -16 ? ' ; AVERTISSEMENT : niveau hors de la plage attendue (≈ −21 LUFS)' : '';
  console.log(`LUFS ${m1.input_i} → ${mc.input_i} (crête ${mc.input_tp} dBTP ; mode crête : gain linéaire ${G.toFixed(2)} dB, sans compression ni limiteur)${AV ? ` ; son avancé de ${AV} échantillons (amorce AAC)` : dejaCale ? ' ; calage déjà fait' : ''}${hors}`);
  process.exit(0);
}
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
