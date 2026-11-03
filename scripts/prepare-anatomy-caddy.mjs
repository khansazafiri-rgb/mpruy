// Produces a review candidate, preserving every non-Anatomy live directive.
import fs from 'node:fs/promises';import {fileURLToPath} from 'node:url';
function closing(text,open){let depth=0,quote=null,comment=false;for(let i=open;i<text.length;i++){const c=text[i];if(comment){if(c==='\n')comment=false;continue;}if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote=null;continue;}if(c==='#'){comment=true;continue;}if(c==='"'||c==='`'){quote=c;continue;}if(c==='{')depth++;if(c==='}'&&--depth===0)return i;}throw Error('Unbalanced Caddy block');}
export function prepareAnatomyCaddy(live,snippet){
 const sites=[...live.matchAll(/^(?:https:\/\/)?medcoel\.com(?:[\s,][^{}\n]*)?\s*\{/gm)];
 if(sites.length!==1)throw Error('Expected exactly one medcoel.com site; inspect custom/imported configuration manually');
 const site=sites[0],open=site.index+site[0].lastIndexOf('{'),close=closing(live,open);let body=live.slice(open+1,close);
 const handlers=[...body.matchAll(/^\s*handle(?:_path)?\s+\/anatomy\/viewer(?:\/\*)?\s*\{/gm)];
 for(const match of handlers.reverse()){const start=match.index,brace=start+match[0].lastIndexOf('{'),end=closing(body,brace);body=body.slice(0,start)+body.slice(end+1);}
 const block='\n\t# Persistent Anatomy static release (outside the web dist).\n'+snippet.split('\n').map(line=>'\t'+line).join('\n')+'\n';
 const fallback=body.search(/^\s*handle\s*\{/m);body=fallback<0?body+block:body.slice(0,fallback)+block+body.slice(fallback);
 return live.slice(0,open+1)+body+live.slice(close);
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [input,output]=process.argv.slice(2);if(!input||!output||input===output)throw Error('Usage: node prepare-anatomy-caddy.mjs LIVE_CONFIG NEW_CANDIDATE');
 const snippet=await fs.readFile(new URL('../deploy/anatomy.caddy.snippet',import.meta.url),'utf8');await fs.writeFile(output,prepareAnatomyCaddy(await fs.readFile(input,'utf8'),snippet));console.log('Review candidate written to '+output+'; no live configuration was changed.');
}
