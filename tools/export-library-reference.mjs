import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {ALIASES,REGIONS} from '../src/atlas/catalog.js';
const output=fileURLToPath(new URL('../public/data/library-reference.json',import.meta.url));
fs.writeFileSync(output,JSON.stringify({schemaVersion:1,spatialSource:'a874a3dcb111d5b4de543c5be6253f5013416f4d',regions:REGIONS.map(([id,name,description])=>({id,name,description})),synonyms:{id:ALIASES}},null,2)+'\n');
