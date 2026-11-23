/* MEDCOEL OFFLINE PRIVATE MPR: no network and no public route. */
(async function () {
  'use strict';
  const status=document.getElementById('status');
  const d=window.MEDCOEL_CT_PRIVATE;
  const needed=['view-x','view-y','view-z','slice-x','slice-y','slice-z',
    'n-x','n-y','n-z','window','opacity','pct','organs','reset'];
  const ui=Object.fromEntries(needed.map(id=>[id,document.getElementById(id)]));
  const fail=(message)=>{
    status.textContent='Preview MPR tidak dapat dimuat: '+String(message)+
      '. Gunakan tautan preview statis di atas.';
    status.style.color='#ffb9ba';
  };
  try {
    if(!d||d.schema!=='medcoel.private-mpr-ct.v1'||d.releaseEligible!==false||
       !Array.isArray(d.dimensions)||d.dimensions.length!==3||
       !d.dimensions.every(x=>Number.isInteger(x)&&x>=4&&x<=192)||
       !Array.isArray(d.organs)||d.organs.length<1||d.organs.length>15||
       !ui['view-x']||typeof DecompressionStream==='undefined')
      throw Error('volume lokal tidak tersedia atau browser tidak mendukung gzip');
    const [W,H,D]=d.dimensions;
    const count=W*H*D;
    async function unzip(field){
      const str=field.base64;
      if(typeof str!=='string'||str.length>100_000_000||
         field.uncompressedBytes!==count*2)
        throw Error('invalid private bundle length');
      const chars=atob(str),bytes=new Uint8Array(chars.length);
      for(let i=0;i<chars.length;i++)bytes[i]=chars.charCodeAt(i);
      const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      const buffer=await new Response(stream).arrayBuffer();
      if(buffer.byteLength!==field.uncompressedBytes)
        throw Error('decompressed volume length mismatch');
      return new DataView(buffer);
    }
    const hu=await unzip(d.hu),bits=await unzip(d.masks);
    const organs=d.organs;
    const studio=document.body.dataset.studio;
    const selected=new Set(organs.filter(o=>studio==='chest-ct'?
      /^lung_|^heart$/.test(o.id):!/^lung_|^heart$/.test(o.id)).map(o=>o.id));
    function rebuildSelector(){
      ui.organs.replaceChildren();
      for(const o of organs){
        if(!Number.isInteger(o.bit)||o.bit<1||o.bit>32768||
           !Array.isArray(o.rgb)||o.rgb.length!==3||
           !o.rgb.every(n=>Number.isInteger(n)&&n>=0&&n<=255))
          throw Error('invalid source organ metadata');
        const label=document.createElement('label');
        label.className='organ';
        const input=document.createElement('input');
        input.type='checkbox';input.checked=selected.has(o.id);
        const color=document.createElement('span');
        color.style.background='rgb('+o.rgb.join(',')+')';
        label.append(input,color,document.createTextNode(o.label));
        ui.organs.append(label);
        input.addEventListener('change',()=>{
          if(input.checked)selected.add(o.id);else selected.delete(o.id);
          repaint();
        });
      }
    }
    rebuildSelector();
    const sliders={
      x:ui['slice-x'],y:ui['slice-y'],z:ui['slice-z']
    };
    const axes={
      x:{canvas:ui['view-x'],width:H,height:D,max:W-1},
      y:{canvas:ui['view-y'],width:W,height:D,max:H-1},
      z:{canvas:ui['view-z'],width:W,height:H,max:D-1}
    };
    const defaultSlices={x:Math.floor(W/2),y:Math.floor(H/2),z:Math.floor(D/2)};
    const contexts={};
    for(const axis of ['x','y','z']){
      const plane=axes[axis];
      plane.canvas.width=plane.width;plane.canvas.height=plane.height;
      contexts[axis]=plane.canvas.getContext('2d',{alpha:false});
      if(!contexts[axis])throw Error('Canvas 2D not available');
      sliders[axis].max=String(plane.max);
      sliders[axis].step='1';sliders[axis].value=String(defaultSlices[axis]);
      sliders[axis].addEventListener('input',repaint);
      // Wheel: navigate the current plane without changing another plane.
      plane.canvas.addEventListener('wheel',e=>{
        e.preventDefault();
        sliders[axis].value=String(Math.max(0,Math.min(plane.max,
          Number(sliders[axis].value)+(e.deltaY>0?1:-1))));
        repaint();
      },{passive:false});
    }
    const windows={soft:[40,400],lung:[-600,1500],bone:[400,1800]};
    ui.window.value=studio==='chest-ct'?'lung':'soft';
    ui.window.addEventListener('change',repaint);
    ui.opacity.addEventListener('input',()=>{
      ui.pct.textContent=ui.opacity.value+'%';repaint();
    });
    ui.reset.addEventListener('click',()=>{
      for(const axis of ['x','y','z'])sliders[axis].value=String(defaultSlices[axis]);
      repaint();
    });
    let pending=false;
    function repaint(){
      if(pending)return;
      pending=true;requestAnimationFrame(()=>{
        pending=false;
        const [level,width]=windows[ui.window.value]||windows.soft;
        const alpha=Number(ui.opacity.value)/100;
        let visible=0;
        for(const o of organs)if(selected.has(o.id))visible|=o.bit;
        for(const axis of ['x','y','z']){
          const plane=axes[axis],ctx=contexts[axis];
          const frame=ctx.createImageData(plane.width,plane.height);
          const cursor=Number(sliders[axis].value);
          ui['n-'+axis].textContent=String(cursor);
          for(let v=0;v<plane.height;v++)for(let u=0;u<plane.width;u++){
            const x=axis==='x'?cursor:u;
            const y=axis==='z'?H-1-v:axis==='y'?cursor:u;
            const z=axis==='z'?cursor:D-1-v;
            const i=x+W*(y+H*z),off=(v*plane.width+u)*4;
            const value=hu.getInt16(i*2,true);
            const grey=Math.max(0,Math.min(255,
              Math.round(255*((value-(level-width/2))/width))));
            let r=grey,g=grey,b=grey;
            if(alpha){
              const mask=bits.getUint16(i*2,true)&visible;
              if(mask){
                const organ=organs.find(o=>(mask&o.bit)!==0);
                if(organ){
                  r=Math.round(grey*(1-alpha)+organ.rgb[0]*alpha);
                  g=Math.round(grey*(1-alpha)+organ.rgb[1]*alpha);
                  b=Math.round(grey*(1-alpha)+organ.rgb[2]*alpha);
                }
              }
            }
            frame.data[off]=r;frame.data[off+1]=g;
            frame.data[off+2]=b;frame.data[off+3]=255;
          }
          ctx.putImageData(frame,0,0);
        }
      });
    }
    status.textContent='MPR siap · sumber '+d.subject+
      ' · '+W+'×'+H+'×'+D+' voxel sampel · '+organs.length+
      ' mask organ · L/R belum divalidasi · hanya privat';
    repaint();
  } catch(e) { fail(e?.message||e); }
})();
