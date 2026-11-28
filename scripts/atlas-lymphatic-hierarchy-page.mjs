// HTML-only, metadata-only private learning page; no inferred flow or geometry.
import assert from 'node:assert/strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const hierarchyRoute='/anatomy/viewer/lymphatic-hierarchy/';
export function hierarchyPage(doc,query=''){
 assert(doc?.publicRelease==='NO_GO'&&doc.geometryVerified===false&&doc.flowDirectionValidated===false&&doc.clinicalValidation===false&&doc.registrationValidated===false&&doc.approvedForDistribution===false);
 assert(typeof query==='string'&&query.length<=120);const needle=query.trim().toLowerCase();
 const matches=doc.paths.filter(r=>!needle||r.terms.some(t=>[t.name,t.label,t.ontologyId].some(s=>String(s??'').toLowerCase().includes(needle))));
 const rows=matches.map(r=>'<li><details><summary>Baris sumber '+r.sourceRecord+' · '+esc(r.terms.at(-1).name)+'</summary><ol>'+r.terms.map(t=>'<li><strong>'+esc(t.name)+'</strong>'+(t.label&&t.label!==t.name?' — '+esc(t.label):'')+' <small>'+esc(t.ontologyId||'ID ontologi belum tersedia')+'</small></li>').join('')+'</ol></details></li>').join('');
 return '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MEDCOEL · Hierarki limfatik HRA</title></head><body><main><a href="/anatomy/viewer/">Kembali ke Atlas</a><h1>Hierarki limfatik HRA v1.5</h1><p>Referensi privat berbasis tabel sumber. Urutan hierarki tidak menyatakan arah aliran limfe yang tervalidasi. Tidak ada model 3D atau registrasi tubuh.</p><p>122 nama struktur · 121 jalur sumber · 72 nama tanpa ID ontologi. Nama dan label resmi sumber dipertahankan; tidak ada ID yang ditebak.</p><form action="'+hierarchyRoute+'" method="get"><label for="q">Cari nama atau ID struktur</label> <input id="q" name="q" type="search" maxlength="120" value="'+esc(query)+'"><button type="submit">Cari</button> <a href="'+hierarchyRoute+'">Reset</a></form><p role="status">'+matches.length+'/'+doc.paths.length+' jalur sumber</p><ul>'+rows+'</ul><footer><p>Singhal, Itkin &amp; Boppana (2024). HuBMAP ASCT+B Tables, Lymph Vasculature v1.5. <a href="https://doi.org/10.48539/HBM622.PDVS.333" rel="noopener noreferrer">DOI sumber</a> · <a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener noreferrer">CC BY 4.0</a>. Ditampilkan sebagai jalur hierarki yang dapat dicari; tanpa perubahan identitas struktur. Distribusi MEDCOEL: NO GO.</p></footer></main></body></html>';
}
export function serveHierarchy(req,res,doc){const send=(code,body,type='text/plain; charset=utf-8')=>{res.writeHead(code,{'Content-Type':type,'Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; form-action 'self'; frame-ancestors 'self'; base-uri 'none'"});res.end(req.method==='HEAD'?undefined:body);};
 if(!doc||!['GET','HEAD'].includes(req.method))return send(404,'Not found');
 const url=new URL(req.url,'http://127.0.0.1');if(url.pathname!==hierarchyRoute||[...url.searchParams.keys()].some(k=>k!=='q')||url.searchParams.getAll('q').length>1)return send(404,'Not found');
 const query=url.searchParams.get('q')||'';if(query.length>120)return send(400,'Search too long');
 return send(200,hierarchyPage(doc,query),'text/html; charset=utf-8');
}
