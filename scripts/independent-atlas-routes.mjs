// Only the existing main-web preview routes may fall through to the host router.
// Never expose the old Atlas, 4D Lab, private packs or arbitrary filesystem paths.
export function classifyIndependentPath(p){
 if(typeof p!=='string'||!p.startsWith('/')||p.includes('\\')||p.includes('%')||p.includes('\0')||p.split('/').some(s=>s==='.'||s==='..'))return 'deny';
 if(p==='/anatomy/viewer')return 'redirect';
 if(p.startsWith('/anatomy/viewer/'))return 'independent';
 if(p==='/anatomy'||p==='/anatomy/'||p==='/anatomy/explore'||p==='/anatomy/explore/'||p==='/'||/^\/assets\/[A-Za-z0-9_.-]+\.(js|css|woff2|svg|png|webp|jpg)$/.test(p)||p.startsWith('/api/'))return 'host';
 return 'deny';
}
