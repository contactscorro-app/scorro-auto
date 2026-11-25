// Usage : node scripts/duree-prevue.mjs <composition> <props.json> [chemin-chrome]
// Affiche la durée PRÉVUE (secondes) calculée par la composition elle-même, avant tout rendu. Sert au garde-fou : le fichier rendu et le fichier hébergé doivent durer ça (±1 s).
import { bundle } from '@remotion/bundler';
import { selectComposition } from '@remotion/renderer';
import fs from 'node:fs';
const [comp, props, chrome] = process.argv.slice(2);
if (!comp || !props) throw new Error('usage : duree-prevue.mjs <composition> <props.json> [chrome]');
const serveUrl = await bundle({ entryPoint: 'src/index.ts', onProgress: () => {} });
const c = await selectComposition({ serveUrl, id: comp, inputProps: JSON.parse(fs.readFileSync(props, 'utf8')), logLevel: 'error', ...(chrome ? { browserExecutable: chrome } : {}) });
console.log((c.durationInFrames / c.fps).toFixed(3));
