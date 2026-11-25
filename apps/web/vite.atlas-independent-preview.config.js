// Explicit local-only integration build. Normal npm run build never reads this file.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig,mergeConfig} from 'vite';
import preview from './vite.anatomy-preview.config.js';
const here=path.dirname(fileURLToPath(import.meta.url));
export default defineConfig(mergeConfig(preview,{
 publicDir:false,
 resolve:{alias:[{find:'./pages/AnatomyLibrary',replacement:path.join(here,'src/pages/IndependentAtlasPreview.jsx')}]},
 build:{outDir:path.resolve(here,'../../local-data/licensing-quarantine/atlas-host-preview-unused'),emptyOutDir:false},
}));
