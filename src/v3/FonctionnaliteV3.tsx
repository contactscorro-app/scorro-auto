import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { planBruitages, NAPPES, VOLUME_NAPPE, type Evenement } from './sons';
import { FinV3, FondV3, Grain, Mots, PALETTES, Sons, arrivee, doux, flouVitesse, taillePourLargeur, usePolice, vitesse, POLICE, type Mot, type Pal, type Son } from './kit';

// Série « Fonctionnalités de l'app » (décision de l'éditeur du 23/11), style v3. UNE fonctionnalité par vidéo, 10-20 s, sans voix ni musique.
// VRAIES captures de l'app (version disponible sur l'App Store), dans un téléphone bien cadré : l'écran a exactement les proportions des
// captures (1320×2868 ≈ 1206×2622), coins concentriques, rien de coupé ni de zoomé dans l'écran.
// Image 0 = vignette → accroche mot par mot (« TU RATES / ENCORE / LES BUTS ? ») → le soulignement devient le téléphone → 1 à 3 plans
// (capture + phrase courte) → un disque sombre devient le fond : « SCORRO / GRATUIT SUR L'APP STORE ».
export type Plan = { src: string; video?: boolean; depuis?: number; cam?: { s: number; fy: number }; lignes: string[]; cle?: string; duree: number; ry?: number; notif?: { titre: string; corps: string; a: number } };
export type Fonc = { id: string; titre: string; accroche: string[]; motCle: string; vignette: string; plans: Plan[] };
export const P: Pal = PALETTES.fonctionnalite;
const SOMBRE: Pal = { fond: '#0B0E14', encre: '#F4F6FA', accent: '#3E8BFF', clair: false };
const V = 12, H0 = 12, R1 = 62, P0 = R1 + 14, CTA = 96;
export const tempsFonc = (d: Fonc) => { const debuts: number[] = []; let x = P0; for (const p of d.plans) { debuts.push(x); x += p.duree; } return { debuts, C: x, total: x + CTA }; };
// Téléphone : écran 470 px de large aux proportions exactes des captures.
const EW = 470, EH = Math.round((EW * 2868) / 1320), BORD = 14, RE = Math.round(EW * 0.125), TW = EW + 2 * BORD, TH = EH + 2 * BORD, TY = 1190;

const Ecran: React.FC<{ p: Plan; debut: number }> = ({ p, debut }) => {
  const s: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: EW, height: EH };
  return p.video ? <Sequence from={debut} layout="none"><OffthreadVideo src={staticFile(p.src)} muted style={s} startFrom={Math.round((p.depuis ?? 0) * 30)} /></Sequence> : <Img src={staticFile(p.src)} style={s} />;
};
// Notification (texte de l'app, données réelles du proxy) : carte de verre qui tombe en haut de l'écran, avec léger dépassement.
const Notif: React.FC<{ n: { titre: string; corps: string }; debut: number }> = ({ n, debut }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const q = (x: number) => arrivee(x, fps, debut), v = vitesse(q, f) * 160;
  return (
    <div style={{ position: 'absolute', left: 14, right: 14, top: 58, transform: `translateY(${(1 - q(f)) * -160}px)`, opacity: Math.min(1, q(f) * 2), filter: flouVitesse(v, 10),
      borderRadius: 26, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(250,251,255,0.82)', backdropFilter: 'blur(20px)', boxShadow: '0 14px 36px -10px rgba(0,0,0,0.35)', fontFamily: POLICE }}>
      <Img src={staticFile('scorro-icon.png')} style={{ width: 46, height: 46, borderRadius: 11 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={{ fontWeight: 800, fontSize: 19, color: '#0B0E14' }}>{n.titre}</span><span style={{ fontWeight: 600, fontSize: 14, color: '#6B7280' }}>maintenant</span></div>
        <div style={{ fontWeight: 600, fontSize: 16, color: '#1F2430', lineHeight: 1.2 }}>{n.corps}</div>
      </div>
    </div>
  );
};
// Le téléphone : il naît du soulignement (raccord 1), puis tourne doucement d'un plan à l'autre ; l'écran passe d'une capture à l'autre en fondu flou.
const Telephone: React.FC<{ d: Fonc; t: ReturnType<typeof tempsFonc> }> = ({ d, t }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  if (f < R1 - 2) return null;
  const k = arrivee(f, fps, R1, { damping: 15, stiffness: 100, mass: 0.9 }), kk = Math.min(1, k);
  const v = vitesse((x) => arrivee(x, fps, R1, { damping: 15, stiffness: 100, mass: 0.9 }), f);
  // de la barre du soulignement (≈ 420 × 16 px vers y=1010) au téléphone entier
  const l = (a: number, b: number) => a + (b - a) * kk;
  const w = l(420, TW), h = l(16, TH), y = l(1010, TY), r = l(8, RE + BORD);
  let i = 0; t.debuts.forEach((x, j) => { if (f >= x - 6) i = j; });
  const ry = (d.plans[i]?.ry ?? (i % 2 ? -12 : 12)) * kk + Math.sin(f / 50) * 2, rx = 5 * kk;
  const derive = 1 + 0.04 * doux(f, P0, t.C), flotte = Math.sin(f / 34) * 8 * kk;
  // Caméra (comme la présentation validée) : on zoome le TÉLÉPHONE ENTIER vers une zone de l'écran (fy), jamais dans l'écran.
  const camDe = (j: number) => d.plans[j]?.cam ?? { s: 1, fy: 0.5 };
  let cs = 1, cfy = 0.5;
  d.plans.forEach((p, j) => { const a = j === 0 ? { s: 1, fy: 0.5 } : camDe(j - 1), b = camDe(j), k2 = doux(f, t.debuts[j] - 6, t.debuts[j] + 18); if (f >= t.debuts[j] - 6) { cs = a.s + (b.s - a.s) * k2; cfy = a.fy + (b.fy - a.fy) * k2; } });
  cs = 1 + (cs - 1) * (1 - doux(f, t.C - 10, t.C)); cfy = 0.5 + (cfy - 0.5) * (1 - doux(f, t.C - 10, t.C));
  // jamais au-dessus de y = 500 : la phrase du haut reste lisible
  const decal = Math.max(-(cfy - 0.5) * EH * cs, 500 - TY + (TH * derive * cs) / 2);
  const sortie = doux(f, t.C - 4, t.C + 10);
  const remplissage = interpolate(kk, [0.35, 0.6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }); // barre bleue → boîtier sombre, vite (pas de gris terne)
  const contenu = interpolate(kk, [0.3, 0.55], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ perspective: 2400 }}>
      <div style={{ position: 'absolute', left: 540 - w / 2, top: y - h / 2 + flotte + decal, width: w, height: h, boxSizing: 'border-box', borderRadius: r, padding: BORD * kk, transform: `scale(${derive * cs * (1 - 0.6 * sortie)}) rotateY(${ry}deg) rotateX(${rx}deg)`, opacity: 1 - sortie, filter: flouVitesse(v * 900 + sortie * 30, 14),
        background: remplissage < 1 ? `rgba(14,17,24,${remplissage})` : '#0E1118', boxShadow: `0 60px 120px -30px rgba(0,0,0,${0.55 * kk}), 0 0 0 2px rgba(255,255,255,0.08)` }}>
        {remplissage < 1 && <div style={{ position: 'absolute', inset: 0, borderRadius: r, background: P.accent, opacity: 1 - remplissage, boxShadow: `0 0 34px ${P.accent}` }} />}
        {kk > 0.3 && (
          <div style={{ position: 'relative', width: EW, height: EH, borderRadius: RE, overflow: 'hidden', background: '#F4F6FA', opacity: contenu }}>
            {d.plans.map((p, j) => {
              const de = t.debuts[j], o = j === 0 ? 1 : doux(f, de - 6, de + 6), fin = j < d.plans.length - 1 ? doux(f, t.debuts[j + 1] - 6, t.debuts[j + 1] + 6) : 0;
              if (f < de - 8 || (j < d.plans.length - 1 && f > t.debuts[j + 1] + 8)) return null;
              return <div key={j} style={{ position: 'absolute', inset: 0, opacity: o, filter: fin > 0.02 ? `blur(${fin * 12}px)` : o < 1 ? `blur(${(1 - o) * 12}px)` : undefined }}><Ecran p={p} debut={Math.max(0, de - 6)} /></div>;
            })}
            {d.plans.map((p, j) => (p.notif && f >= t.debuts[j] + p.notif.a - 2 && f < (t.debuts[j + 1] ?? t.C) + 6 ? <Notif key={`n${j}`} n={p.notif} debut={t.debuts[j] + p.notif.a} /> : null))}
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(115deg, rgba(255,255,255,0) ${20 + (f % 240) / 4}%, rgba(255,255,255,0.16) ${28 + (f % 240) / 4}%, rgba(255,255,255,0) ${36 + (f % 240) / 4}%)` }} />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
const Accroche: React.FC<{ d: Fonc }> = ({ d }) => {
  const f = useCurrentFrame(); const pret = usePolice();
  if (!pret || f > R1 + 12) return null;
  const tailles = d.accroche.map((l) => taillePourLargeur(l, l.length <= 6 ? 560 : 860, 900, 220));
  const k = doux(f, R1 - 6, R1 + 8);
  const lignes: Mot[][] = d.accroche.map((l, i) => l.split(' ').map((m, j) => ({ t: m, f: H0 + i * 6 + j * 3, ...(m.replace(/[?!]/g, '') === d.motCle ? { souligne: H0 + 26 } : {}) })));
  return <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - k, filter: k > 0.02 ? `blur(${k * 14}px)` : undefined, transform: `translateY(${-k * 120}px) scale(${1 - 0.15 * k})` }}><Mots p={P} tailles={tailles} lignes={lignes} /></AbsoluteFill>;
};
// Phrase de chaque plan, en haut (zone 3:4), mot par mot avec soulignement du mot-clé.
const Phrase: React.FC<{ p: Plan; dur: number }> = ({ p, dur }) => {
  const f = useCurrentFrame(); const pret = usePolice();
  if (!pret) return null;
  const tailles = p.lignes.map((l) => taillePourLargeur(l, 880, 900, 150));
  const sortie = doux(f, dur - 6, dur + 4);
  const lignes: Mot[][] = p.lignes.map((l, i) => l.split(' ').map((m, j) => ({ t: m, f: 2 + i * 5 + j * 3, ...(p.cle && m === p.cle ? { souligne: 22 } : {}) })));
  return <div style={{ position: 'absolute', top: 270, left: 0, right: 0, opacity: 1 - sortie, filter: sortie > 0.02 ? `blur(${sortie * 10}px)` : undefined }}><Mots p={P} tailles={tailles} lignes={lignes} /></div>;
};
// Disque sombre qui naît du téléphone et devient le fond, puis l'appel à l'action.
const Disque: React.FC<{ debut: number }> = ({ debut }) => {
  const f = useCurrentFrame();
  if (f < debut) return null;
  const k = doux(f, debut, debut + 22), r = 30 + k * 2300;
  return <div style={{ position: 'absolute', left: 540 - r, top: TY - r, width: 2 * r, height: 2 * r, borderRadius: r, background: SOMBRE.fond }} />;
};
const AppelAction: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const pret = usePolice();
  if (!pret) return null;
  const a = arrivee(f, fps, 0), z = 1 + 0.05 * doux(f, 0, CTA);
  const t1 = taillePourLargeur('SCORRO', 700, 900, 220), t2 = taillePourLargeur('GRATUIT SUR', 820, 900, 120), t3 = taillePourLargeur("L'APP STORE", 820, 900, 120);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', transform: `scale(${z})`, fontFamily: POLICE }}>
      <Img src={staticFile('scorro-icon.png')} style={{ width: 200, height: 200, borderRadius: 46, transform: `scale(${0.4 + 0.6 * a})`, opacity: Math.min(1, a * 2) * doux(f, 8, 14), filter: flouVitesse((1 - a) * 40), marginBottom: 40 }} />
      <Mots p={SOMBRE} tailles={[t1, t2, t3]} lignes={[[{ t: 'SCORRO', f: 10 }], [{ t: 'GRATUIT', f: 16 }, { t: 'SUR', f: 19 }], [{ t: "L'APP", f: 23 }, { t: 'STORE', f: 26, souligne: 38 }]]} />
    </AbsoluteFill>
  );
};
// Vignette (image 0) : titre, téléphone avec la 1re capture (image fixe), logo Scorro ; tout dans le centre 3:4.
export const VignetteFonc: React.FC<{ d: Fonc }> = ({ d }) => {
  const pret = usePolice();
  const lignes = d.titre.split('\n'), tailles = pret ? lignes.map((l) => taillePourLargeur(l, 860, 900, 180)) : lignes.map(() => 140);
  const ew = 330, eh = Math.round((ew * 2868) / 1320);
  return (
    <AbsoluteFill style={{ fontFamily: POLICE }}>
      <FondV3 p={P} />
      <div style={{ position: 'absolute', top: 290, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {lignes.map((l, i) => <div key={i} style={{ fontWeight: 900, fontSize: tailles[i], lineHeight: 1, letterSpacing: '-0.03em', color: P.encre, whiteSpace: 'nowrap' }}>{l}</div>)}
      </div>
      <div style={{ position: 'absolute', left: 540 - ew / 2 - 12, top: 700, width: ew + 24, height: eh + 24, borderRadius: 52, padding: 12, boxSizing: 'border-box', background: '#0E1118', transform: 'rotate(-4deg)', boxShadow: '0 40px 90px -20px rgba(0,0,0,0.45)' }}>
        <div style={{ width: ew, height: eh, borderRadius: 40, overflow: 'hidden' }}><Img src={staticFile(d.vignette)} style={{ width: ew, height: eh }} /></div>
      </div>
      <div style={{ position: 'absolute', top: 1500, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18 }}>
        <Img src={staticFile('scorro-icon.png')} style={{ width: 84, height: 84, borderRadius: 20 }} /><span style={{ fontWeight: 900, fontSize: 54, color: P.encre }}>Scorro</span>
      </div>
    </AbsoluteFill>
  );
};
const Ouverture: React.FC<{ d: Fonc }> = ({ d }) => {
  const f = useCurrentFrame();
  if (f > V + 16) return null;
  const k = doux(f, V, V + 14);
  return <AbsoluteFill style={{ opacity: 1 - k, transform: `scale(${1 + 0.18 * k})`, filter: k > 0.02 ? `blur(${k * 18}px)` : undefined }}><VignetteFonc d={d} /></AbsoluteFill>;
};
// Ancienne banque (vidéo n° 1 du 23/11, gardée pour l'avant/après).
export const sonsFoncAncien = (d: Fonc): Son[] => {
  const t = tempsFonc(d);
  return [
    { f: 0, src: 'sons/fond-a.mp3', volume: 0.4, duree: t.C + 10 },
    { f: V, src: 'sons/v3/pop-1.wav', volume: 0.16 },
    { f: H0 + 26, src: 'sons/v3/clic-1.wav', volume: 0.16 },
    { f: R1, src: 'sons/whoosh-2.mp3', volume: 0.2, duree: 30 },
    { f: R1 + 16, src: 'sons/v3/impact-1.wav', volume: 0.16 },
    ...t.debuts.slice(1).map((x, i) => ({ f: x - 6, src: i % 2 ? 'sons/v3/clic-2.wav' : 'sons/v3/pop-2.wav', volume: 0.15 })),
    ...d.plans.flatMap((p, j) => (p.notif ? [{ f: t.debuts[j] + p.notif.a + 4, src: 'sons/v3/impact-2.wav', volume: 0.16 }] : [])),
    { f: t.C, src: 'sons/v3/souffle-1.wav', volume: 0.18 },
    { f: t.C + 40, src: 'sons/v3/reussite-1.wav', volume: 0.16, duree: 56 },
  ];
};
// Nouvelle banque (skill video-fluide/sons, 24/11) et ses règles (planBruitages) : un son par action CLÉ à l'image exacte du mouvement,
// au plus ~1 son marquant toutes les 2 s (les suivants sont baissés automatiquement), frappes très basses, nappe de stade à 0,05, variantes par graine.
export const sonsFonc = (d: Fonc): Son[] => {
  const t = tempsFonc(d);
  const graine = [...d.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const ev: Evenement[] = [
    { f: V, action: 'carte' },                      // la vignette part
    { f: H0 + 1, action: 'frappe' },                // accroche : 3-4 frappes au début, puis le clavier s'efface
    { f: R1, action: 'raccord' },                   // le soulignement devient le téléphone
    { f: R1 + 16, action: 'impact', secondaire: true }, // il se pose
    ...t.debuts.map((x) => ({ f: x + 3, action: 'frappe' as const })),
    ...t.debuts.slice(1).map((x) => ({ f: x - 6, action: 'swipe' as const })), // l'écran change
    ...d.plans.flatMap((p, j) => (p.notif ? [
      { f: t.debuts[j] + p.notif.a + 2, action: 'notification' as const },
      { f: t.debuts[j] + p.notif.a + 4, action: 'vibration' as const, secondaire: true },
      { f: t.debuts[j] + p.notif.a + 24, action: 'sifflet' as const },
      { f: t.debuts[j] + p.notif.a + 30, action: 'fouleJoie' as const },
    ] : [])),
    { f: t.C, action: 'zoomArriere' },              // le disque sombre envahit l'écran
    { f: t.C + 44, action: 'levelUp' },             // « L'APP STORE » souligné
  ];
  // Nappe un peu au-dessus du 0,05 conseillé et bruitages à 90 % : moins d'écart crête/niveau, donc −16 LUFS avec une crête ≤ −1,5 dBTP.
  // mix (optionnel, par vidéo) : nappe et gain global, si le mixage par défaut est trop « pointu » pour −16 LUFS sans saturer.
  const mix = (d as any).mix ?? {};
  return [{ f: 0, src: NAPPES.stade, volume: mix.nappe ?? VOLUME_NAPPE * 1.6, duree: t.total }, ...planBruitages(ev, { graine, gainGlobal: mix.gain ?? 0.9 })];
};
export const FonctionnaliteV3: React.FC<any> = (props) => {
  const d = props as Fonc & { sons?: boolean };
  const t = tempsFonc(d);
  return (
    <AbsoluteFill style={{ fontFamily: POLICE }}>
      <FondV3 p={P} />
      {d.plans.map((p, j) => <Sequence key={j} from={t.debuts[j]} durationInFrames={p.duree}><Phrase p={p} dur={p.duree} /></Sequence>)}
      <Telephone d={d} t={t} />
      <Accroche d={d} />
      <Disque debut={t.C} />
      <Sequence from={t.C}><AppelAction /></Sequence>
      <Ouverture d={d} />
      {d.sons && <Sons liste={sonsFoncAncien(d)} />}
      <Grain />
    </AbsoluteFill>
  );
};
export { FinV3 };
