// Explicit opt-in local QA build; never used by npm run build.
import path from 'node:path';
import {defineConfig,mergeConfig} from 'vite';
import base from './vite.config.js';
const fixture=path.resolve(__dirname,'../../preview/AuthContext.jsx');
export default defineConfig(mergeConfig(base,{
 resolve:{alias:[{find:'@/context/AuthContext',replacement:fixture},{find:'./context/AuthContext',replacement:fixture}]},
 build:{outDir:'dist-anatomy-preview'},
}));
