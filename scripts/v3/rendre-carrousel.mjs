// Usage : node scripts/v3/rendre-carrousel.mjs <theme: top5|fonc> [date AAAA-MM-JJ]
// Carrousel (images fixes, aucun rendu vidéo) : 5 slides Instagram 1080×1350 + 5 TikTok 1080×1920, en PNG et en JPG (envoi), + planches.
// Sortie : brouillons/carrousel/<date>-<theme>/. Refuse si un autre rendu tourne.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
const [theme = 'top5', date = 'exemple'] = process.argv.slice(2);
const ps = spawnSync('ps', ['-axo', 'comm=,args='], { encoding: 'utf8' }).stdout;
if (ps.split('\n').some((l) => /^\S*node\s/.test(l) && /\bremotion\s+(render|still|benchmark)\b/.test(l))) throw new Error('un autre rendu tourne : on attend');
// Mac : Chrome installé. Serveur (Linux) : le navigateur fourni par Remotion (undefined = celui de Remotion).
const CH = fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined;
const COMPS = { top5: ['CarrouselIG', 'CarrouselTT'], fonc: ['CarrouselFoncIG', 'CarrouselFoncTT'] }[theme];
if (!COMPS) throw new Error(`thème inconnu : ${theme}`);
const data = theme === 'top5' ? JSON.parse(fs.readFileSync('data/format-top5-301.json', 'utf8')) : {};
const dir = `brouillons/carrousel/${date}-${theme}`;
fs.mkdirSync(dir, { recursive: true });
const serveUrl = await bundle({ entryPoint: 'src/index.ts', onProgress: () => {} });
for (const [id, suf] of [[COMPS[0], 'instagram'], [COMPS[1], 'tiktok']]) for (let i = 0; i < 5; i++) {
  const inputProps = { data, i };
  const composition = await selectComposition({ serveUrl, id, inputProps, browserExecutable: CH, logLevel: 'error' });
  await renderStill({ serveUrl, composition, inputProps, output: `${dir}/${suf}-0${i + 1}.png`, browserExecutable: CH, imageFormat: 'png', logLevel: 'error' });
}
const py = spawnSync('python3', ['-c', `
from PIL import Image
import glob
d='${dir}'
for f in glob.glob(d+'/*.png'):
  if 'PLANCHE' in f: continue
  Image.open(f).convert('RGB').save(f[:-4]+'.jpg', quality=92)
for fmt,(w,h) in [('instagram',(432,540)),('tiktok',(360,640))]:
  fs=sorted(glob.glob(f'{d}/{fmt}-0*.png'));ims=[Image.open(x).convert('RGB').resize((w,h)) for x in fs]
  o=Image.new('RGB',(w*5+60,h+20),(30,30,30));[o.paste(im,(10+i*(w+10),10)) for i,im in enumerate(ims)];o.save(f'{d}/PLANCHE-{fmt}.png')
`], { stdio: 'inherit' });
if (py.status !== 0) throw new Error('conversion JPG / planche');
console.log(dir);
