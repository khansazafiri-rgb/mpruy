// Explicit local-only integration build. Normal npm run build never reads this file.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig,mergeConfig} from 'vite';
import preview from './vite.anatomy-preview.config.js';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import tailwindConfig from './tailwind.config.js';
const here=path.dirname(fileURLToPath(import.meta.url));
export default defineConfig(mergeConfig(preview,{
 publicDir:false,
 // The programmatic Atlas build is launched from the repository root, not
 // apps/web. Reuse the real design tokens and anchor all scan paths to the
 // actual web directory; do not depend on Tailwind's process.cwd() discovery.
 css:{postcss:{plugins:[tailwindcss({...tailwindConfig,content:[
  ...tailwindConfig.content.map(glob=>path.resolve(here,glob).split(path.sep).join('/')),
  path.resolve(here,'../../preview/AuthContext.jsx').split(path.sep).join('/'),
 ]}),autoprefixer()]}},
 resolve:{alias:[{find:'./pages/AnatomyLibrary',replacement:path.join(here,'src/pages/IndependentAtlasPreview.jsx')}]},
 build:{outDir:path.resolve(here,'../../local-data/licensing-quarantine/atlas-host-preview-unused'),emptyOutDir:false},
}));
