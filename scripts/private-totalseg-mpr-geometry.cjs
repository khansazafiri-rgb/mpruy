/* Shared Node/browser geometry for LOCAL source-index inspection, never clinical approval. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.MEDCOEL_CT_GEOMETRY=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const axes=['x','y','z'],names=['Sagittal','Coronal','Axial'];
  const positive=['R','A','S'],negative=['L','P','I'];
  function describe(affine,sourceDims,maps){
    if(!Array.isArray(affine)||affine.length!==12||!affine.every(Number.isFinite)||
       !Array.isArray(sourceDims)||sourceDims.length!==3||
       !sourceDims.every(n=>Number.isInteger(n)&&n>=4&&n<=1024)||
       !Array.isArray(maps)||maps.length!==3)throw Error('CT_MPR_SOURCE_GEOMETRY_INVALID');
    const cols=axes.map((_,i)=>[affine[i],affine[4+i],affine[8+i]]);
    const spacing=cols.map(v=>Math.hypot(...v));
    const a=affine,det=a[0]*(a[5]*a[10]-a[6]*a[9])-a[1]*(a[4]*a[10]-a[6]*a[8])+a[2]*(a[4]*a[9]-a[5]*a[8]);
    if(spacing.some(n=>n<1e-5)||Math.abs(det)<1e-5)throw Error('CT_MPR_SOURCE_GEOMETRY_INVALID');
    for(let axis=0;axis<3;axis++){
      const map=maps[axis];
      if(!map||map.length<4||map.length>192||
         Array.from(map).some((v,i)=>!Number.isInteger(v)||v<0||v>=sourceDims[axis]||i>0&&v<=map[i-1]))
        throw Error('CT_MPR_SAMPLE_MAP_INVALID');
    }
    const dominant=cols.map(v=>v.reduce((best,n,i)=>Math.abs(n)>Math.abs(v[best])?i:best,0));
    const aligned=new Set(dominant).size===3&&cols.every((v,i)=>v.every((n,j)=>j===dominant[i]||Math.abs(n)<spacing[i]*1e-5));
    const dir=(axis,sign)=>{
      if(!aligned)return null;
      const k=dominant[axis];return cols[axis][k]*sign>0?positive[k]:negative[k];
    };
    const planes={};
    for(let i=0;i<3;i++){
      const u=i===0?1:0,v=i===2?1:2;
      const extent=k=>(maps[k][maps[k].length-1]-maps[k][0])*spacing[k];
      planes[axes[i]]={label:aligned?names[dominant[i]]+' · source index '+axes[i]:'Source index '+axes[i]+' · noncanonical volume',
        left:dir(u,-1),right:dir(u,1),top:dir(v,1),bottom:dir(v,-1),
        aspectRatio:extent(u)/extent(v)};
    }
    return {coordinateSystem:'NIfTI RAS+ header; source-index planes',axisAligned:aligned,spacing,planes,
      clinicalOrientationApproved:false};
  }
  return {describe};
});
