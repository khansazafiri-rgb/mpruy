// Coarse, bounded CT exterior estimate. Not a clinical segmentation.
// Independent 2D connected components suppress disconnected table/markers.
export function extractSkin(volume, transform, options={}) {
 const dims=transform.dims, grid=72, bands=27, angles=96;
 const slices=[];let usable=0, clipped=0;
 for(let b=0;b<bands;b++){
  const h=-.87+1.74*b/(bands-1), y=h*dims.y*.49;
  const mask=new Uint8Array(grid*grid);
  for(let z=0;z<grid;z++)for(let x=0;x<grid;x++){
   const p={x:(x/(grid-1)-.5)*dims.x,y,z:(z/(grid-1)-.5)*dims.z};
   const v=transform.localToVoxel(p);
   if(v.every((c,i)=>c>=0&&c<=volume.sizes[i]-1) && volume.voxel(...v)>-400)mask[z*grid+x]=1;
  }
  const seen=new Uint8Array(mask.length),queue=new Int32Array(mask.length);
  let best=null;
  for(let n=0;n<mask.length;n++)if(mask[n]&&!seen[n]){
   let head=0,tail=1,edge=0,sx=0,sz=0;queue[0]=n;seen[n]=1;const members=[];
   while(head<tail){const q=queue[head++],x=q%grid,z=(q/grid)|0;members.push(q);sx+=x;sz+=z;
    if(x===0||z===0||x===grid-1||z===grid-1)edge++;
    for(const next of [x>0?q-1:-1,x<grid-1?q+1:-1,z>0?q-grid:-1,z<grid-1?q+grid:-1])if(next>=0&&mask[next]&&!seen[next]){seen[next]=1;queue[tail++]=next}
   }
   if(!best||tail>best.members.length)best={members,sx,sz,edge};
  }
  if(!best||best.members.length<grid*grid*.025||best.members.length>grid*grid*.8){slices.push(null);continue}
  if(best.edge>grid*.16){clipped++;slices.push(null);continue}
  const cx=best.sx/best.members.length,cz=best.sz/best.members.length;
  if(Math.hypot(cx-(grid-1)/2,cz-(grid-1)/2)>grid*.23){slices.push(null);continue}
  const component=new Uint8Array(mask.length);for(const q of best.members)component[q]=1;
  const radii=[];let missing=0;
  for(let a=0;a<angles;a++){
   const theta=a*Math.PI*2/angles,dx=Math.cos(theta),dz=Math.sin(theta);
   let radius=0;
   for(let r=0;r<grid*.7;r+=.5){const x=Math.round(cx+r*dx),z=Math.round(cz+r*dz);if(x<0||z<0||x>=grid||z>=grid)break;if(component[z*grid+x])radius=r}
   if(radius<grid*.08)missing++;
   radii.push(radius);
  }
  if(missing>angles*.12){slices.push(null);continue}
  slices.push({cx:(cx/(grid-1)-.5)*dims.x,cz:(cz/(grid-1)-.5)*dims.z,radii:radii.map(r=>r/(grid-1)),h});usable++;
 }
 if(usable<bands*.65)return {model:null,reason:clipped>bands*.2?'Kontur menyentuh tepi volume; segmentasi kulit tidak andal.':'Jaringan tubuh tidak cukup kontinu untuk ekstraksi kulit.'};
 // Fill a few missing slices with nearest valid neighbor; do not extrapolate beyond sampled range.
 const valid=slices.map((s,i)=>s?i:-1).filter(i=>i>=0);
 const model={source:volume.kind==='synthetic'?'phantom':'estimated-ct',range:[slices[valid[0]].h,slices[valid.at(-1)].h],point(a,h){
  const t=Math.max(valid[0],Math.min(valid.at(-1),(h+.87)/1.74*(bands-1)));
  const lo=valid.filter(i=>i<=t).at(-1),hi=valid.find(i=>i>=t),f=hi===lo?0:(t-lo)/(hi-lo),s=slices[lo],e=slices[hi];
  const v=((a%(Math.PI*2))/(Math.PI*2)*angles+angles)%angles,j=Math.floor(v),k=(j+1)%angles,g=v-j;
  const rad=q=>(q.radii[j]*(1-g)+q.radii[k]*g);
  const r=(rad(s)*(1-f)+rad(e)*f),cx=s.cx*(1-f)+e.cx*f,cz=s.cz*(1-f)+e.cz*f;
  return {x:cx+r*dims.x*Math.cos(a),y:h*dims.y*.49,z:cz+r*dims.z*Math.sin(a)};
 }};
 return {model,reason:volume.kind==='synthetic'?`Kontur dari ${usable}/${bands} penampang phantom sintetis; bukan anatomi pasien.`:`Kontur luar diperkirakan dari ${usable}/${bands} penampang CT; bukan segmentasi tervalidasi.`};
}
