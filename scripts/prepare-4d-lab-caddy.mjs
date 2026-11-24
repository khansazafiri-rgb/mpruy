// Review-only Caddy integration for the ORIGINAL MEDCOEL 4D Lab.
// It changes ONLY a candidate file, not /etc/caddy/Caddyfile or public traffic.
// stage-4d-lab.mjs still requires commercial rights and SHA-pinned source.
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

function matchingBrace(input,open){
  let depth=0,quote=false,comment=false;
  for(let i=open;i<input.length;i++){
    const c=input[i];
    if(comment){if(c==='\n')comment=false;continue;}
    if(quote){if(c==='\\'){i++;continue;}if(c==='"')quote=false;continue;}
    if(c==='#'){comment=true;continue;}
    if(c==='"'){quote=true;continue;}
    if(c==='{')depth++;
    if(c==='}'&&--depth===0)return i;
  }
  throw Error('Caddy config has unbalanced braces');
}
const handlerPattern=/^[ \t]*handle(?:_path)?[ \t]+\/anatomy\/4d-lab(?:\/data\/atlas\/\*|\/\*)?[ \t]*\{/gm;
export function prepare4dLabCaddy(live,snippet){
  if(typeof live!=='string'||typeof snippet!=='string')throw Error('Caddy candidate requires text');
  const siteMatches=[...live.matchAll(/^(?:https:\/\/)?medcoel\.com(?:[\s,][^{}\n]*)?\s*\{/gm)];
  if(siteMatches.length!==1)
    throw Error('Expected one explicit medcoel.com site; imports or ambiguous sites require manual review');
  for(const clause of [
    'handle /anatomy/4d-lab/data/atlas/* {',
    'handle /anatomy/4d-lab {',
    'handle_path /anatomy/4d-lab/* {',
    'root * /var/lib/medcoel/4d-lab',
    'respond "Not Found" 404'
  ])if(!snippet.includes(clause))throw Error('4D Lab snippet lacks essential route/rights containment: '+clause);
  const site=siteMatches[0],open=site.index+site[0].lastIndexOf('{'),
    close=matchingBrace(live,open);
  let body=live.slice(open+1,close);
  const matches=[...body.matchAll(handlerPattern)];
  for(const match of matches.reverse()){
    const start=match.index,brace=start+match[0].lastIndexOf('{'),
      end=matchingBrace(body,brace);
    body=body.slice(0,start)+body.slice(end+1);
  }
  if(/^[ \t]*(?:handle|route|redir|rewrite)[^\n]*\/anatomy\/4d-lab/m.test(body))
    throw Error('Unrecognised existing 4D Lab Caddy route; manual reconciliation required');
  const block='\n\t# Independent MEDCOEL 4D Lab; activation needs reviewed commercial clearance.\n'+
    snippet.split('\n').map(line=>'\t'+line).join('\n')+'\n';
  const fallback=body.search(/^[ \t]*handle[ \t]*\{/m);
  body=fallback<0?body+block:body.slice(0,fallback)+block+body.slice(fallback);
  const candidate=live.slice(0,open+1)+body+live.slice(close);
  if((candidate.match(/^[ \t]*handle_path[ \t]+\/anatomy\/4d-lab\/\*[ \t]*\{/gm)||[]).length!==1||
     (candidate.match(/^[ \t]*handle[ \t]+\/anatomy\/4d-lab\/data\/atlas\/\*[ \t]*\{/gm)||[]).length!==1)
    throw Error('4D Lab candidate does not have exactly one route and one Atlas quarantine guard');
  return candidate;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const [input,output]=process.argv.slice(2);
  if(!input||!output||input===output)
    throw Error('Usage: node scripts/prepare-4d-lab-caddy.mjs LIVE_CADDYFILE REVIEW_CANDIDATE');
  const snippet=await fs.readFile(new URL('../deploy/4d-lab.caddy.snippet',import.meta.url),'utf8');
  const out=prepare4dLabCaddy(await fs.readFile(input,'utf8'),snippet);
  await fs.writeFile(output,out);
  console.log('Review-only 4D Lab Caddy candidate: '+output+
    '\nNo public deployment, service reload or licensing override occurred.');
}
