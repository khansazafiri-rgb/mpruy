// Only the existing main-web preview routes may fall through to the host router.
// Never expose the old Atlas, 4D Lab, private packs or arbitrary filesystem paths.
export const privateLibraryRoute=p=>typeof p==='string'&&(/^\/anatomy\/library\/?$/.test(p)||/^\/anatomy\/structure\/(?:bp|sel)-[a-f0-9]{24}\/?$/.test(p)||/^\/anatomy\/system\/(?:skeletal|muscular|joints|cardiovascular|nervous|lymphatic|visceral)\/?$/.test(p));
export function classifyIndependentPath(p,libraryEnabled=false){
 if(typeof p!=='string'||!p.startsWith('/')||p.includes('\\')||p.includes('%')||p.includes('\0')||p.split('/').some(s=>s==='.'||s==='..'))return 'deny';
 if(libraryEnabled&&privateLibraryRoute(p))return 'host';
 if(p==='/anatomy/viewer')return 'redirect';
 if(p.startsWith('/anatomy/viewer/'))return 'independent';
 if(p==='/anatomy'||p==='/anatomy/'||p==='/anatomy/explore'||p==='/anatomy/explore/'||p==='/'||/^\/assets\/[A-Za-z0-9_.-]+\.(js|css|woff2|svg|png|webp|jpg)$/.test(p)||p.startsWith('/api/'))return 'host';
 return 'deny';
}

export function rawRequestPath(target){
 if(typeof target!=='string'||!target.startsWith('/')||target.startsWith('//')||target.includes('#'))return null;
 const p=target.split('?')[0];
 if(p.includes('%')||p.includes('\\')||/[\x00-\x20\x7f]/.test(p)||p.includes('//')||p.split('/').some(s=>s==='.'||s==='..'))return null;
 return p;
}
