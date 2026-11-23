/* MEDCOEL OFFLINE PRIVATE MPR: no network and no public route. */
(async function () {
  'use strict';
  const status=document.getElementById('status');
  const d=window.MEDCOEL_CT_PRIVATE;
  const needed=['view-x','view-y','view-z','slice-x','slice-y','slice-z',
    'n-x','n-y','n-z','window','opacity','pct','organs','reset'];
  const ui=Object.fromEntries(needed.map(id=>[id,document.getElementById(id)]));
  const fail=(message)=>{
    document.body.dataset.mprReady='false';
    for(const axis of ['x','y','z']){
      const canvas=ui['view-'+axis],ctx=canvas?.getContext('2d');
      ctx?.clearRect(0,0,canvas.width,canvas.height);
    }
    for(const control of document.querySelectorAll('input,select,button'))control.disabled=true;
    status.textContent='Preview MPR tidak dapat dimuat: '+String(message)+
      '. Gunakan tautan preview statis di atas.';
    status.style.color='#ffb9ba';
  };
  try {
    if(!d||!['medcoel.private-mpr-ct.v1','medcoel.private-mpr-ct.v2'].includes(d.schema)||
       !['releaseEligible','clinicalApproved','privacyApproved','rightsApproved','orientationApproved'].every(k=>d[k]===false)||
       !/^s\d{3,6}$/.test(d.subject||'')||
       ![d.archiveSha256,d.ctMemberSha256].every(x=>/^[a-f0-9]{64}$/.test(x||'')&&!/^0{64}$/.test(x))||
       !Array.isArray(d.dimensions)||d.dimensions.length!==3||
       !d.dimensions.every(x=>Number.isInteger(x)&&x>=4&&x<=192)||
       !Array.isArray(d.organs)||d.organs.length<1||d.organs.length>(d.schema.endsWith('.v2')?30:15)||
       !needed.every(id=>ui[id])||typeof DecompressionStream==='undefined'||!globalThis.crypto?.subtle)
      throw Error('volume lokal tidak tersedia atau browser tidak mendukung gzip');
    const maskWidth=d.schema.endsWith('.v2')?4:2;
    if(d.dtype!==(maskWidth===4?'int16-hu-and-uint32-mask-bitset-le':
      'int16-hu-and-uint16-mask-bitset-le'))throw Error('private mask bitset encoding mismatch');
    const [W,H,D]=d.dimensions;
    const count=W*H*D;
    const geometry=globalThis.MEDCOEL_CT_GEOMETRY?.describe(d.sourceAffine,d.originalDimensions,d.sampledSourceIndices);
    if(!geometry||d.sampledSourceIndices.some((map,i)=>map.length!==d.dimensions[i]))
      throw Error('invalid source geometry');
    async function unzip(field,bytesPerVoxel){
      const str=field?.base64;
      if(typeof str!=='string'||str.length>100_000_000||
         field.uncompressedBytes!==count*bytesPerVoxel||!Number.isInteger(field.compressedBytes)||
         field.compressedBytes<1||field.compressedBytes>48*1024*1024||
         !/^[a-f0-9]{64}$/.test(field.sha256||''))
        throw Error('invalid private bundle length');
      const chars=atob(str),bytes=new Uint8Array(chars.length);
      if(chars.length!==field.compressedBytes)throw Error('compressed volume length mismatch');
      for(let i=0;i<chars.length;i++)bytes[i]=chars.charCodeAt(i);
      const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      const reader=stream.getReader(),output=new Uint8Array(count*bytesPerVoxel);
      let length=0;
      try{
        while(true){
          const {done,value}=await reader.read();if(done)break;
          if(length+value.length>output.length){
            await reader.cancel();throw Error('decompressed volume exceeds bounded grid');
          }
          output.set(value,length);length+=value.length;
        }
      }finally{reader.releaseLock();}
      if(length!==field.uncompressedBytes)
        throw Error('decompressed volume length mismatch');
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',output)),
        b=>b.toString(16).padStart(2,'0')).join('');
      if(digest!==field.sha256)throw Error('source bundle checksum mismatch');
      return new DataView(output.buffer);
    }
    const hu=await unzip(d.hu,2),bits=await unzip(d.masks,maskWidth);
    const maskAt=i=>maskWidth===4?bits.getUint32(i*4,true):bits.getUint16(i*2,true);
    const organs=d.organs;
    const ids=new Set(),organBits=new Set();let allowed=0;
    for(const o of organs){
      if(!/^[a-z][A-Za-z0-9_]{0,69}$/.test(o.id||'')||ids.has(o.id)||
         !Number.isInteger(o.bit)||o.bit<1||o.bit>2**29||(o.bit&(o.bit-1))!==0||organBits.has(o.bit)||
         (maskWidth===2&&o.bit>16384)||
         typeof o.label!=='string'||o.label.length<1||o.label.length>160||
         !Array.isArray(o.rgb)||o.rgb.length!==3||!o.rgb.every(n=>Number.isInteger(n)&&n>=0&&n<=255))
        throw Error('invalid source organ metadata');
      ids.add(o.id);organBits.add(o.bit);allowed|=o.bit;
    }
    for(let i=0;i<count;i++)if((maskAt(i)&~allowed)!==0)
      throw Error('mask contains unknown source labels');
    const studio=document.body.dataset.studio;
    const selected=new Set(organs.filter(o=>Array.isArray(o.studios)?
      o.studios.includes(studio):studio==='chest-ct'?
      /^lung_|^heart$/.test(o.id):studio==='abdomen-ct'?
      !/^lung_|^heart$/.test(o.id):false).map(o=>o.id));
    function rebuildSelector(){
      ui.organs.replaceChildren();
      for(const o of organs){
        if(!Number.isInteger(o.bit)||o.bit<1||o.bit>2**29||
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
    const recommended=d.recommendedSlices?.[studio];
    const defaultSlices={x:Math.floor(W/2),y:Math.floor(H/2),z:Math.floor(D/2)};
    for(const [axis,max] of [['x',W-1],['y',H-1],['z',D-1]]){
      const index=recommended?.[axis];
      if(Number.isInteger(index)&&index>=0&&index<=max)defaultSlices[axis]=index;
    }
    const contexts={};
    for(const axis of ['x','y','z']){
      const plane=axes[axis];
      const spatial=geometry.planes[axis];
      document.getElementById('plane-'+axis).textContent=spatial.label;
      document.getElementById('orientation-'+axis).textContent=spatial.left?
        'Kiri layar: '+spatial.left+' · kanan: '+spatial.right+' · atas: '+spatial.top+' · bawah: '+spatial.bottom+' (header RAS+, belum direview klinis)':
        'Bidang indeks oblique; tidak menyatakan orientasi Axial/Coronal/Sagittal diagnostik';
      plane.canvas.width=plane.width;plane.canvas.height=plane.height;
      plane.canvas.style.aspectRatio=String(spatial.aspectRatio);
      plane.canvas.style.height='auto';
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
    const windows={soft:[40,400],lung:[-600,1500],bone:[400,1800],
      brain:[40,80],subdural:[80,200],cardiac:[350,700]};
    ui.window.value=({'chest-ct':'lung','brain-ct':'brain',
      'cardiac-ct':'cardiac'})[studio]||'soft';
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
        try{
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
              const mask=maskAt(i)&visible;
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
        document.body.dataset.mprReady='true';
        }catch(e){fail(e?.message||e);}
      });
    }
    status.textContent='MPR siap · sumber '+d.subject+
      ' · '+W+'×'+H+'×'+D+' voxel sampel · '+organs.length+
      ' mask organ · SHA-256 diperiksa · L/R belum divalidasi klinis · hanya privat';
    repaint();
  } catch(e) { fail(e?.message||e); }
})();
