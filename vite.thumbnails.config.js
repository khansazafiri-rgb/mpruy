import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({base:'/',publicDir:false,build:{outDir:'dist-thumbnails',target:'esnext',rolldownOptions:{input:fileURLToPath(new URL('./tools/thumbnail-export.html',import.meta.url))}}});
