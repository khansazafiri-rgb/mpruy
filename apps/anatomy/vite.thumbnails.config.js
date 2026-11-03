import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({base:'/',publicDir:false,build:{outDir:'dist-thumbnails',target:'esnext',rolldownOptions:{input:{structures:fileURLToPath(new URL('./tools/thumbnail-export.html',import.meta.url)),systems:fileURLToPath(new URL('./tools/system-thumbnails.html',import.meta.url))}}}});
