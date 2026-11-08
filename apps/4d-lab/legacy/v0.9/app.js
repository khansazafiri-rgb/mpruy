import {readNrrdFile} from './nrrd.js?v=0.9.0';
import {TAU,clamp,add,sub,mul,dot,norm,wrap,shortest,makeTransform,probePose,planePoint,cameraProject,explorationPose,quat,qmul} from './kinematics.js?v=0.9.0';
import {loadRegisteredMesh,cameraRay,raycast,contactFrame} from './mesh.js?v=0.9.0';
const $=id=>document.getElementById(id);
const vc=$('space'),ctx=vc.getContext('2d'),sc=$('scan'),sctx=sc.getContext('2d');
let raster=sctx.createImageData(sc.width,sc.height);const monitor=$('monitor'),mctx=monitor.getContext('2d');let imageZoom=1,pixelMode=false,imagePan={x:0,y:0},viewMode='normal';
const deg=r=>r*Math.PI/180,rad=r=>r*180/Math.PI;
function makeSynthetic(){
  const sizes=[140,138,156],spacing=[2.1,2.2,2.2];
  const voxel=(i,j,k)=>{
    const x=(i/(sizes[0]-1)-.5)*2,y=(k/(sizes[2]-1)-.5)*2,z=(j/(sizes[1]-1)-.5)*2;
    const shoulders=Math.exp(-(((y-.55)/.23)**2)),waist=Math.exp(-(((y+.32)/.28)**2));
    const rx=.77*(1+.16*shoulders-.13*waist),rz=.66*(1+.12*shoulders+.05*Math.exp(-(((y+.48)/.3)**2)));
    const r=(x/rx)**2+((z-.025*y)/rz)**2;
    if(r>1 || Math.abs(y)>0.94)return -1000;
    let density=58 + 8*Math.sin(i*.17)*Math.cos(j*.2);
    const spine=(x/.13)**2+((z+.44)/.13)**2;
    if(spine<1 && y>-.8)density=720;
    const lungL=((x+.33)/.27)**2+((y-.20)/.53)**2+((z+.01)/.43)**2;
    const lungR=((x-.33)/.27)**2+((y-.20)/.53)**2+((z+.01)/.43)**2;
    if(lungL<1 || lungR<1)density=-760+18*Math.sin(i*.5)*Math.sin(k*.3);
    const heart=((x-.08)/.28)**2+((y+.02)/.32)**2+((z-.09)/.29)**2;
    if(heart<1)density=118 + 14*Math.sin(j*.17);
    const heartCavity=((x-.03)/.11)**2+((y+.02)/.14)**2+((z-.14)/.12)**2;
    if(heartCavity<1)density=190;
    return density;
  };
  return {name:'Phantom sintetis — demonstrasi teknis',kind:'synthetic',sizes,spacing,
   axisVectors:[[spacing[0],0,0],[0,spacing[1],0],[0,0,spacing[2]]],
   fields:{space:'left-posterior-superior','space origin':'(0,0,0)'},voxel};
}
let volume=makeSynthetic(),transform=makeTransform(volume),anterior=null,leftSide=null,superiorLabel='K+',patientMesh=null;
let clinicalAngles={yaw:0,pitch:0,roll:0},freeAngles={yaw:0,pitch:0,roll:0};
const state={mode:'clinical',az:0,height:0,free:{x:0,y:0,z:0},yaw:0,pitch:0,roll:0,depth:190,width:170,level:80,window:650};
let camera={yaw:.9,pitch:.25,zoom:1,panX:0,panY:0};
let cameraTarget={...camera};let follow=false,drag=null,selected=false,hover=false,needsScan=true,frame=null,lastTime=0,lastPose=null,lastProject=null,points=[],handles=[];
const error=$('runtimeError');
function alertError(e){error.hidden=false;error.textContent='Scanner error: '+(e?.message||e);console.error(e)}
window.addEventListener('error',e=>alertError(e.error||e.message));window.addEventListener('unhandledrejection',e=>alertError(e.reason));
function dimensions(){return transform.dims}
function invalidateMesh(){patientMesh=null;state.contact=null;state.mode='free';
 $('clinicalMode').disabled=true;$('clinicalMode').checked=false;$('freeMode').checked=true;
 $('freeControls').hidden=false;$('contactPresets').hidden=true;$('mprPresets').hidden=false;$('probePresets').hidden=true;
 $('skinStatus').textContent='Muat GLB + registration.json dari CT yang sama. Kontak kulit belum tersedia.';
 $('modeStatus').textContent='Free MPR aktif. Clinical memerlukan mesh terdaftar.';
}
function pickSurface(x,y,cameraPose=camera){return patientMesh?raycast(patientMesh,cameraRay(cameraPose,dimensions(),vc.width,vc.height,x,y)):null}
function placeAtSide(angle){const hit=pickSurface(vc.width/2,vc.height/2,{...camera,yaw:angle+Math.PI/2,pitch:0,panX:0,panY:0});if(hit){state.contact=contactFrame(hit,state.contact);syncControls();mark(true)}}
async function installMesh(buffer,meta){
 const candidate=await loadRegisteredMesh(buffer,meta,volume,transform);patientMesh=candidate;
 $('skinStatus').textContent=`${meta.synthetic?'PHANTOM SINTETIS':'REKONSTRUKSI CT · perlu QC'} · ${candidate.faces.length} segitiga · registrasi numerik cocok. Batas crop bukan kulit.`;
 $('clinicalMode').disabled=false;$('clinicalMode').checked=true;$('freeMode').checked=false;switchMode();placeAtSide(anterior??0);
 $('modeStatus').textContent='Kontak segitiga mesh; klik kulit atau drag probe. Tidak ada orbit silinder.';
}
$('meshFiles').onchange=async e=>{try{const files=Array.from(e.target.files),g=files.find(f=>f.name.endsWith('.glb')),j=files.find(f=>f.name.endsWith('.json'));if(!g||!j)throw Error('Pilih patient.glb dan registration.json bersama');await installMesh(await g.arrayBuffer(),JSON.parse(await j.text()))}catch(e){$('skinStatus').textContent='Mesh ditolak: '+e.message}};
async function loadDemoPatient(){try{
 const [ct,g,j]=await Promise.all(['synthetic-patient.nrrd','patient.glb','registration.json'].map(f=>fetch('./assets/'+f).then(r=>{if(!r.ok)throw Error(f+' tidak tersedia');return f.endsWith('.json')?r.json():r.arrayBuffer()})));
 volume=await readNrrdFile(new File([ct],'synthetic-patient.nrrd'));transform=makeTransform(volume);orientation();invalidateMesh();reset();await installMesh(g,j);
 $('status').textContent='Phantom anatomis sintetis + mesh dari voxel yang sama. Bukan pasien nyata.';
 }catch(e){$('status').textContent='Gagal memuat phantom: '+e.message;alertError(e)}}
function inferAnatomy(v){
 const space=(v.fields?.space||'').toLowerCase(),dirs=v.axisVectors;
 const axes=space.split('-');
 if(!dirs||axes.length!==3)return {anterior:null,left:null,superior:'K+'};
 const ap=axes[1]==='anterior'?1:axes[1]==='posterior'?-1:0;
 const lr=axes[0]==='left'?1:axes[0]==='right'?-1:0;
 const si=axes[2]==='superior'?1:axes[2]==='inferior'?-1:0;
 const aligned=(coordinate,sign)=>{
  if(!sign)return null;
  const x=dirs[0][coordinate]/Math.hypot(...dirs[0])*sign,z=dirs[1][coordinate]/Math.hypot(...dirs[1])*sign;
  return Math.hypot(x,z)>.8?Math.atan2(z,x):null;
 };
 const a=aligned(1,ap),l=aligned(0,lr),k=dirs[2][2]/Math.hypot(...dirs[2])*si;
 return {anterior:a,left:l,superior:k>.8?'S ↑':k<-.8?'I ↑':'K+'};
}
function orientation(){
 const inferred=inferAnatomy(volume);anterior=inferred.anterior;leftSide=inferred.left;superiorLabel=inferred.superior;
 $('info').textContent=volume.kind==='nrrd'?`${volume.sizes.join(' × ')} voxels`:'PHANTOM';
 $('internals').disabled=volume.kind==='nrrd';if(volume.kind==='nrrd')$('internals').checked=false;
 $('orientNote').textContent=anterior===null||leftSide===null?'Arah anatomi tidak lengkap: sisi I/J/K mengacu pada sumbu volume.':'Arah anatomi dari metadata volume; kontur kulit tetap perkiraan voxel.';
 $('front').textContent=anterior===null?'Sisi I+':'Depan';$('back').textContent=anterior===null?'Sisi I−':'Belakang';
 $('left').textContent=leftSide===null?'Sisi J+':'Kiri';$('right').textContent=leftSide===null?'Sisi J−':'Kanan';
 for(const [id,label,known] of [['placeFront','I+',anterior!==null],['placeBack','I−',anterior!==null],['placeLeft','J+',leftSide!==null],['placeRight','J−',leftSide!==null]])$(id).textContent='Kontak '+(known?{placeFront:'depan',placeBack:'belakang',placeLeft:'kiri',placeRight:'kanan'}[id]:label);
 $('freeXLabel').textContent=leftSide===null?'X / I':'Left (+) / Right (−)';$('freeZLabel').textContent=anterior===null?'Z / J':'Posterior (+) / Anterior (−)';
 $('freeYLabel').textContent=superiorLabel==='S ↑'?'Superior / K':superiorLabel==='I ↑'?'Inferior / K':'K (sumbu volume)';
}
function mark(scan=false){needsScan||=scan;if(frame===null)frame=requestAnimationFrame(render)}
function syncControls(){for(const key of ['yaw','pitch','roll','depth','width','level','window']){
 const v=['yaw','pitch','roll'].includes(key)?Math.round(rad(state[key])):state[key];$(key).value=v;$(key+'v').textContent=v+(['yaw','pitch','roll'].includes(key)?'°':['depth','width'].includes(key)?' mm':' HU')}
 $('poseReadout').textContent=(state.mode==='free'?`Posisi bebas X ${Math.round(state.free.x)} · Y ${Math.round(state.free.y)} · Z ${Math.round(state.free.z)} mm`:(state.contact?`Kontak I/K/J mm: ${Object.values(state.contact.p).map(v=>v.toFixed(1)).join(' / ')}`:'Belum ada kontak mesh'))+` · ${state.mode==='free'?'yaw':'rock'} ${Math.round(rad(state.yaw))}° · ${state.mode==='free'?'pitch':'heel-toe'} ${Math.round(rad(state.pitch))}° · ${state.mode==='free'?'roll':'rotasi'} ${Math.round(rad(state.roll))}°`;
 for(const key of ['yaw','pitch','roll'])$(key+'Number').value=Math.round(rad(state[key]));
 for(const key of ['x','y','z']){const el=$('free'+key.toUpperCase());if(el)el.value=Math.round(state.free[key])}
}
function resetContact(){state.contact=null;state.az=anterior??0;state.height=0;if(patientMesh)placeAtSide(anterior??0);state.free={x:0,y:0,z:0};syncControls();mark(true)}
function reset(){resetContact();state.mprQ=null;Object.assign(state,{yaw:0,pitch:0,roll:0,depth:190,width:170,level:80,window:650});cameraTarget={...cameraTarget,yaw:state.az+Math.PI/2,pitch:.2,zoom:1,panX:0,panY:0};syncControls();mark(true)}
function preset(angle){cameraTarget.yaw=angle+Math.PI/2;cameraTarget.pitch=.2;cameraTarget.panX=0;cameraTarget.panY=0;mark()}
for(const [id,angle] of [['front',()=>anterior??0],['left',()=>leftSide??Math.PI/2],['back',()=> (anterior??0)+Math.PI],['right',()=> (leftSide??Math.PI/2)+Math.PI]])$(id).onclick=()=>preset(angle());
$('follow').onchange=()=>{follow=$('follow').checked;if(follow&&!drag&&state.mode==='clinical'&&state.contact){cameraTarget.yaw=Math.atan2(state.contact.p.z,state.contact.p.x)+Math.PI/2;cameraTarget.pitch=.2}mark()};
$('reset').onclick=reset;
$('resetContact').onclick=resetContact;
for(const key of ['x','y','z'])$('free'+key.toUpperCase()).addEventListener('input',e=>{state.free[key]=Number(e.target.value)||0;syncControls();mark(true)});
function switchMode(){
 const next=$('freeMode').checked?'free':'clinical';
 if(state.mode==='free')freeAngles={yaw:state.yaw,pitch:state.pitch,roll:state.roll};else clinicalAngles={yaw:state.yaw,pitch:state.pitch,roll:state.roll};
 state.mode=next;Object.assign(state,next==='free'?freeAngles:clinicalAngles);
 $('freeControls').hidden=next!=='free';$('contactPresets').hidden=next!=='clinical';$('mprPresets').hidden=next!=='free';$('probePresets').hidden=next==='free';
 $('angleNote').textContent=next==='free'?'MPR 6-DOF · sudut kumulatif terhadap sumbu pasien; urutan rotasi berpengaruh. Pivot di pusat bidang.':'Kontak kulit · pivot pada kulit.';
 syncControls();mark(true);
}
for(const id of ['clinicalMode','freeMode'])$(id).onchange=switchMode;
for(const [id,angles] of [['axial',[0,0,0]],['coronal',[90,0,0]],['sagittal',[0,90,0]],['mprOblique',[45,45,0]]])$(id).onclick=()=>{state.mprQ=null;[state.pitch,state.yaw,state.roll]=angles.map(deg);syncControls();mark(true)};
for(const [id,angle] of [['placeFront',()=>anterior??0],['placeLeft',()=>leftSide??Math.PI/2],['placeBack',()=> (anterior??0)+Math.PI],['placeRight',()=> (leftSide??Math.PI/2)+Math.PI]])$(id).onclick=()=>placeAtSide(angle());
$('demo').onclick=loadDemoPatient;
$('file').onchange=async e=>{
 const file=e.target.files?.[0];if(!file)return;
 $('loading').hidden=false;$('file').disabled=true;$('status').textContent='Memuat NRRD secara lokal…';
 try{const v=await readNrrdFile(file);const t=makeTransform(v);volume=v;transform=t;orientation();invalidateMesh();reset();$('status').textContent=`✔ ${v.name} · ${v.sizes.join(' × ')} · ${v.spacing.map(x=>x.toFixed(2)).join('/')} mm`}
 catch(e){$('status').textContent='⚠ '+e.message;console.error(e)}finally{$('file').disabled=false;$('loading').hidden=true}
};
for(const key of ['yaw','pitch','roll','depth','width','level','window'])$(key).addEventListener('input',e=>{
 if(['yaw','pitch','roll'].includes(key)){setAngle(key,e.target.value);return}state[key]=Number(e.target.value);syncControls();mark(true)
});
const angleLimit={yaw:77,pitch:63,roll:180};
function setAngle(key,value){if(state.mode==='free'){const next=deg(Number(value)||0),pose=explorationPose(state,transform,volume),axis=pose.axes[{pitch:0,yaw:2,roll:1}[key]],worldAxis=sub(transform.localToWorld(axis),transform.center);state.mprQ=qmul(quat(worldAxis,next-state[key]),pose.rotation);state[key]=next;syncControls();mark(true);return}const bound=$('freeAngle').checked?180:angleLimit[key];state[key]=deg(state.mode==='free'?(Number(value)||0):clamp(Number(value)||0,-bound,bound));syncControls();mark(true)}
for(const key of ['yaw','pitch','roll']){
 $(key+'Number').addEventListener('input',e=>{if(e.target.value!==''&&Number.isFinite(Number(e.target.value)))setAngle(key,e.target.value)});
 $(key+'Number').addEventListener('change',e=>setAngle(key,e.target.value));
 for(const step of [-5,-1,1,5])$(key+(step<0?'m':'p')+Math.abs(step)).onclick=()=>setAngle(key,Math.round(rad(state[key]))+step);
}
$('resetAngles').onclick=()=>{state.mprQ=null;state.yaw=state.pitch=state.roll=0;syncControls();mark(true)};
for(const [id,roll] of [['transverse',0],['longitudinal',90],['oblique',45],['oblique135',135]])$(id).onclick=()=>setAngle('roll',roll);
let customPose=null;$('savePreset').onclick=()=>{customPose={yaw:state.yaw,pitch:state.pitch,roll:state.roll,mprQ:state.mprQ};$('angleNote').textContent='Preset kustom disimpan untuk sesi ini.'};
$('loadPreset').onclick=()=>{if(customPose){Object.assign(state,customPose);syncControls();mark(true)}};
$('freeAngle').onchange=()=>{$('angleNote').textContent=$('freeAngle').checked?'Rotasi demonstrasi ±180°; dapat mengarah keluar tubuh.':'Mode kontak: rock ±77°, heel-toe ±63°. Rotasi bebas.'};
function monitorSize(){const box=monitor.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
 const w=Math.max(280,Math.round(box.width*dpr)),h=Math.max(340,Math.round(box.height*dpr));
 if(monitor.width!==w||monitor.height!==h){monitor.width=w;monitor.height=h;needsScan=true}
 const preview=drag&&['probe','free','tilt','rock','rotate'].includes(drag.kind)?.72:1;
 const ratio=state.width/state.depth;
 const base=Math.min(h,w/ratio),targetH=Math.round(Math.min(1500,1200/ratio,Math.max(640,base*imageZoom*preview))),targetW=Math.round(targetH*ratio);
 if(sc.width!==targetW||sc.height!==targetH){sc.width=targetW;sc.height=targetH;raster=sctx.createImageData(targetW,targetH);needsScan=true}
}
function paintMonitor(){const w=monitor.width,h=monitor.height;mctx.fillStyle='#02070b';mctx.fillRect(0,0,w,h);
 const scale=pixelMode?1:Math.min(w/sc.width,h/sc.height)*imageZoom,drawW=sc.width*scale,drawH=sc.height*scale;
 mctx.drawImage(sc,(w-drawW)/2+imagePan.x,(h-drawH)/2+imagePan.y,drawW,drawH);
}
function imageAction(next){pixelMode=false;imageZoom=clamp(next,.5,4);imagePan={x:0,y:0};mark(true)}
$('zoomIn').onclick=()=>imageAction(imageZoom*1.25);$('zoomOut').onclick=()=>imageAction(imageZoom/1.25);
$('fitImage').onclick=()=>imageAction(1);$('pixelImage').onclick=()=>{pixelMode=true;imageZoom=1;imagePan={x:0,y:0};mark(true)};
function setView(next){viewMode=next;document.body.classList.toggle('image-focus',next==='focus');document.body.classList.toggle('image-full',next==='full');
 $('focusImage').textContent=next==='focus'?'Tampilkan 3D':'Fokus citra';$('fullImage').textContent=next==='full'?'Keluar fullscreen':'Perbesar layar';mark(true)}
$('focusImage').onclick=()=>setView(viewMode==='focus'?'normal':'focus');$('fullImage').onclick=()=>setView(viewMode==='full'?'normal':'full');
let dockDrag=null;$('controlsDock').addEventListener('pointerdown',e=>{if(viewMode!=='full')return;const box=$('controlsDock').parentElement.getBoundingClientRect();dockDrag={id:e.pointerId,x:e.clientX,y:e.clientY,left:box.left,top:box.top};$('controlsDock').setPointerCapture(e.pointerId);e.preventDefault()});
$('controlsDock').addEventListener('pointermove',e=>{if(dockDrag?.id!==e.pointerId)return;const x=clamp(dockDrag.left+e.clientX-dockDrag.x,8,window.innerWidth-280),y=clamp(dockDrag.top+e.clientY-dockDrag.y,8,window.innerHeight-90);
 document.documentElement.style.setProperty('--dockX',x+'px');document.documentElement.style.setProperty('--dockY',y+'px')});
for(const event of ['pointerup','pointercancel'])$('controlsDock').addEventListener(event,()=>dockDrag=null);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&viewMode!=='normal')setView('normal')});
let imageDrag=null;monitor.addEventListener('pointerdown',e=>{imageDrag={x:e.clientX,y:e.clientY,pan:{...imagePan},id:e.pointerId};monitor.setPointerCapture(e.pointerId)});
monitor.addEventListener('pointermove',e=>{if(!imageDrag||e.pointerId!==imageDrag.id)return;const d=monitor.width/monitor.getBoundingClientRect().width;imagePan={x:imageDrag.pan.x+(e.clientX-imageDrag.x)*d,y:imageDrag.pan.y+(e.clientY-imageDrag.y)*d};paintMonitor()});
for(const event of ['pointerup','pointercancel'])monitor.addEventListener(event,()=>imageDrag=null);
monitor.addEventListener('wheel',e=>{e.preventDefault();imageAction(imageZoom*Math.exp(-e.deltaY*.001))},{passive:false});
let dividerDrag=null;$('divider').addEventListener('pointerdown',e=>{dividerDrag=e.pointerId;$('divider').setPointerCapture(e.pointerId)});
$('divider').addEventListener('pointermove',e=>{if(dividerDrag!==e.pointerId)return;const main=$('workspace').getBoundingClientRect();document.documentElement.style.setProperty('--patientWidth',clamp((e.clientX-main.left-main.width*.19)/main.width*100,25,65)+'%');mark(true)});
$('divider').addEventListener('pointerup',()=>dividerDrag=null);
function resize(){const dpr=Math.min(window.devicePixelRatio||1,2),rect=vc.getBoundingClientRect(),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
 if(w!==vc.width||h!==vc.height){vc.width=Math.max(200,w);vc.height=Math.max(200,h)}
 return {w:vc.width,h:vc.height,dpr:vc.width/rect.width};
}
function scan(pose){
 const {width:w,height:h}=sc,raw=raster.data,min=state.level-state.window/2;
 let covered=0;
 for(let row=0;row<h;row++){const v=row/(h-1);
  // Fan width is linear along each row. Transform its two endpoints once,
  // then step through voxel coordinates without allocating per pixel.
  const start=transform.localToVoxel(planePoint(pose,state.depth,state.width,0,v));
  const end=transform.localToVoxel(planePoint(pose,state.depth,state.width,1,v));
  const di=(end[0]-start[0])/(w-1),dj=(end[1]-start[1])/(w-1),dk=(end[2]-start[2])/(w-1);
  let i=start[0],j=start[1],k=start[2];
  for(let col=0;col<w;col++,i+=di,j+=dj,k+=dk){
   const inside=i>=0&&j>=0&&k>=0&&i<=volume.sizes[0]-1&&j<=volume.sizes[1]-1&&k<=volume.sizes[2]-1;
   if(inside)covered++;
   const value=inside?volume.voxel(i,j,k):-1024;
   const shade=Math.round(clamp((value-min)/state.window,0,1)*255),q=(row*w+col)*4;
   if(inside)raw[q]=raw[q+1]=raw[q+2]=shade;
   else{raw[q]=10;raw[q+1]=23+((row+col)%18<2?25:0);raw[q+2]=37+((row+col)%18<2?25:0)}raw[q+3]=255;
  }
 }
 sctx.putImageData(raster,0,0);
 sctx.save();sctx.fillStyle='rgba(2,9,15,.75)';sctx.fillRect(0,0,w,28);sctx.fillStyle='#b8faf6';sctx.font='12px system-ui';sctx.fillText(volume.kind==='nrrd'?'CT REFORMAT — NOT ULTRASOUND':'SYNTHETIC PHANTOM — NOT CLINICAL',9,19);
 sctx.strokeStyle='rgba(88,238,225,.5)';sctx.setLineDash([4,5]);sctx.beginPath();sctx.moveTo(w/2,28);sctx.lineTo(w/2,h);sctx.stroke();sctx.setLineDash([]);
 sctx.fillStyle='#b4ebdf';sctx.font='11px system-ui';for(let mm=50;mm<state.depth;mm+=50){const y=mm/state.depth*h;sctx.fillText(mm+' mm',7,y-3);sctx.fillRect(0,y,7,1)}
 const ratio=covered/(w*h);if(ratio<.05){sctx.fillStyle='rgba(5,15,25,.8)';sctx.fillRect(0,h/2-28,w,56);sctx.fillStyle='#ffdf9f';sctx.textAlign='center';sctx.fillText('Di luar cakupan volume',w/2,h/2+5)}sctx.restore();
 $('coverage').textContent=`Sampel di dalam batas volume: ${Math.round(ratio*100)}%${ratio<.999?' · biru bergaris = tidak ada data CT':''}`;paintMonitor();
}
function line(a,b,color,width=1){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke()}
let meshCache=null;
function body(project,dims){
 if(!patientMesh){ctx.fillStyle='#d9c7b4';ctx.font='14px system-ui';ctx.fillText('Muat rekonstruksi GLB + registrasi CT',20,65);return}
 const cacheKey=[camera.yaw,camera.pitch,camera.zoom,camera.panX,camera.panY,vc.width,vc.height].join(',');
 if(meshCache?.mesh!==patientMesh||meshCache.key!==cacheKey){
  const projected=patientMesh.points.map(project),triangles=patientMesh.faces.map((ids,i)=>({ids,i,depth:ids.reduce((v,j)=>v+projected[j].depth,0)/3})).sort((a,b)=>b.depth-a.depth);
  meshCache={mesh:patientMesh,key:cacheKey,projected,triangles};
 }
 const opacity=Number($('skinOpacity').value||85)/100*($('skinMode').checked?.35:1),light=norm({x:-.4,y:.6,z:-.8});
 ctx.save();ctx.globalAlpha=opacity;
 for(const tri of meshCache.triangles){const [a,b,c]=tri.ids.map(i=>meshCache.projected[i]),n=patientMesh.normals[tri.ids[0]],shade=.55+.45*Math.abs(dot(n,light));
  ctx.fillStyle=`rgb(${Math.round(189*shade)},${Math.round(151*shade)},${Math.round(127*shade)})`;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.closePath();ctx.fill();
 }
 ctx.restore();
}
function acquisitionBounds(project){
 const points=[];for(let k=0;k<2;k++)for(let j=0;j<2;j++)for(let i=0;i<2;i++)points.push(project(transform.worldToLocal(transform.voxelToWorld(i*(volume.sizes[0]-1),j*(volume.sizes[1]-1),k*(volume.sizes[2]-1)))));
 for(let i=0;i<8;i++)for(const bit of [1,2,4])if(!(i&bit))line(points[i],points[i|bit],'rgba(139,191,215,.35)',1);
 ctx.fillStyle='#d9e9ed';ctx.font='12px system-ui';ctx.fillText('Batas akuisisi CT · crop bukan kulit',16,vc.height-43);
 const labels=anterior===null?[[{x:1,y:0,z:0},'I+'],[{x:0,y:1,z:0},'K+'],[{x:0,y:0,z:1},'J+']]:explorationPose({...state,free:{x:0,y:0,z:0}},transform,volume).axes.flatMap((a,i)=>[[a,['L','S','P'][i]],[mul(a,-1),['R','I','A'][i]]]);
 for(const [axis,label] of labels){const p=project(mul(axis,Math.max(dimensions().x,dimensions().y,dimensions().z)*.48));ctx.fillText(label,p.x,p.y)}
}
$('skinOpacity').oninput=()=>mark();$('skinMode').onchange=()=>mark();$('internals').onchange=()=>mark();
function beam(project,pose){
 const A=project(planePoint(pose,state.depth,state.width,0,0)),B=project(planePoint(pose,state.depth,state.width,1,0));
 const C=project(planePoint(pose,state.depth,state.width,0,1)),D=project(planePoint(pose,state.depth,state.width,1,1));
 ctx.save();ctx.globalAlpha=.82;
 // Subdivide affine texture into bands so the displayed image follows the true fan sampling.
 const count=32,w=sc.width,h=sc.height;
 for(let n=0;n<count;n++){const v0=n/count,v1=(n+1)/count,p0=project(planePoint(pose,state.depth,state.width,0,v0)),p1=project(planePoint(pose,state.depth,state.width,1,v0)),p2=project(planePoint(pose,state.depth,state.width,0,v1));
  const sy=v0*h,sh=(v1-v0)*h;
  ctx.setTransform((p1.x-p0.x)/w,(p1.y-p0.y)/w,(p2.x-p0.x)/sh,(p2.y-p0.y)/sh,p0.x,p0.y);
  ctx.drawImage(sc,0,sy,w,sh,0,0,w,sh);
 }
 ctx.restore();line(A,B,'#73e6e4',2);line(A,C,'#73e6e4',2);line(B,D,'#73e6e4',2);line(C,D,'#73e6e4',2);
}
function probeGraphic(project,pose){
 if(pose.rect){mprGizmo(project,pose);return}

 const P=project(pose.p),N=project(add(pose.p,mul(pose.dir,-38))),T=project(add(pose.p,mul(pose.tangent,16)));
 const selectedColor=selected?'#ffe38b':'#ffb570';
 if(selected||hover){ctx.beginPath();ctx.arc(P.x,P.y,selected?24:20,0,TAU);ctx.fillStyle=selected?'rgba(255,217,111,.18)':'rgba(255,190,111,.11)';ctx.fill();ctx.strokeStyle=selectedColor;ctx.lineWidth=2;ctx.stroke()}
 line(P,N,'#533c35',15);line(P,N,selectedColor,11);
 const tv={x:T.x-P.x,y:T.y-P.y},len=Math.hypot(tv.x,tv.y)||1;
 const ux=tv.x/len,uy=tv.y/len;
 line({x:P.x-ux*14,y:P.y-uy*14},{x:P.x+ux*14,y:P.y+uy*14},'#fff0bd',8);
 ctx.beginPath();ctx.arc(P.x,P.y,5,0,TAU);ctx.fillStyle='#fff4d4';ctx.fill();
 points=[P,N];
 const dpr=vc.width/vc.getBoundingClientRect().width;
 handles=[{kind:'rock',x:P.x+56*dpr,y:P.y-35*dpr,label:'ROCK',color:'#efabda'},
  {kind:'tilt',x:P.x-46*dpr,y:P.y-47*dpr,label:'HEEL',color:'#8cecc5'},
  {kind:'rotate',x:P.x+4*dpr,y:P.y+63*dpr,label:'ROTATE',color:'#ffd78f'}];
 for(const h of handles){line(P,h,h.color,1.5*dpr);ctx.beginPath();ctx.arc(h.x,h.y,10*dpr,0,TAU);ctx.fillStyle=h.color;ctx.fill();
  ctx.fillStyle='#07131c';ctx.font=`${10*dpr}px system-ui`;ctx.fillText(h.label,h.x+13*dpr,h.y+3*dpr)}
}
function mprGizmo(project,pose){
 const P=project(pose.p),dpr=vc.width/vc.getBoundingClientRect().width;
 points=[P];handles=[];
 const labels=pose.known?['L/R','S/I','P/A']:['I','K','J'],colors=['#ff9d9d','#8cecc5','#91bdff'];
 pose.axes.forEach((axis,i)=>{
  const end=project(add(pose.p,mul(axis,65))),dx=end.x-P.x,dy=end.y-P.y,len=Math.hypot(dx,dy);
  let E=len<18*dpr?{x:P.x+([75,-60,10][i])*dpr,y:P.y+([0,-65,80][i])*dpr}:end;
  for(let attempt=0;attempt<8&&handles.some(h=>Math.hypot(h.x-E.x,h.y-E.y)<40*dpr);attempt++)E={x:E.x,y:E.y-42*dpr};
  line(P,E,colors[i],3*dpr);ctx.beginPath();ctx.arc(E.x,E.y,8*dpr,0,TAU);ctx.fillStyle=colors[i];ctx.fill();
  ctx.font=`${11*dpr}px system-ui`;ctx.fillText(labels[i],E.x+11*dpr,E.y);
  handles.push({kind:'translate'+i,...E,axis,screen:{x:E.x-P.x,y:E.y-P.y},length:65});
 });
 // Rotation rings are the actual plane-frame axes, projected into the view.
 const ringAxes=[pose.axes[0],pose.axes[2],pose.axes[1]];
 ringAxes.forEach((axis,i)=>{
  const others=ringAxes.filter((_,j)=>j!==i),radius=43+i*12;
  let prev=null,chosen=null,bestClearance=-1;
  for(let j=0;j<=64;j++){const a=j*TAU/64,q=project(add(pose.p,add(mul(others[0],radius*Math.cos(a)),mul(others[1],radius*Math.sin(a)))));
   if(prev)line(prev,q,colors[i],1.4*dpr);prev=q;const clearance=Math.min(Math.hypot(q.x-P.x,q.y-P.y),...handles.map(h=>Math.hypot(q.x-h.x,q.y-h.y)));if(clearance>bestClearance){chosen=q;bestClearance=clearance};
  }
  const E=chosen;ctx.beginPath();ctx.arc(E.x,E.y,7*dpr,0,TAU);ctx.fillStyle=colors[i];ctx.fill();
  ctx.fillText(['PITCH','YAW','ROLL'][i],E.x+10*dpr,E.y-5*dpr);
  handles.push({kind:['rx','ry','rz'][i],...E});
 });
 ctx.beginPath();ctx.arc(P.x,P.y,6*dpr,0,TAU);ctx.fillStyle='#fff4d4';ctx.fill();
}
function draw(pose){
 const {w,h}=resize();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);
 const project=cameraProject(camera,dimensions(),w,h);lastProject=project;
 body(project,dimensions());acquisitionBounds(project);beam(project,pose);probeGraphic(project,pose);
 ctx.fillStyle='#c6dce9';ctx.font=`${Math.max(12,Math.round(w/45))}px system-ui`;
 ctx.fillText('Drag probe • Empty space: orbit camera',15,25);
 ctx.fillStyle='#9cb7c8';ctx.font=`${Math.max(11,Math.round(w/55))}px system-ui`;
 ctx.fillText(patientMesh?`${volume.kind==='nrrd'?'Mesh CT terdaftar (QC diperlukan)':'Phantom sintetis'} · ${superiorLabel}`:'Tidak ada kontur kulit terverifikasi',15,h-20);
}
function render(t){frame=null;try{
 const elapsed=lastTime?Math.min((t-lastTime)/1000,.05):.016;lastTime=t;
 let moving=false;
 for(const k of ['yaw','pitch','zoom','panX','panY']){
  const delta=k==='yaw'?shortest(camera[k],cameraTarget[k]):cameraTarget[k]-camera[k];
  if(Math.abs(delta)>1e-4){camera[k]+=delta*(1-Math.exp(-11*elapsed));moving=true}
 }
 monitorSize();const pose=state.mode==='free'||!state.contact?explorationPose(state,transform,volume):probePose(state,dimensions());lastPose=pose;
 if(needsScan){scan(pose);needsScan=false}draw(pose);
 if(moving)mark();
 }catch(e){alertError(e)}
}
function coords(e){const rect=vc.getBoundingClientRect(),dpr=vc.width/rect.width;return{x:(e.clientX-rect.left)*dpr,y:(e.clientY-rect.top)*dpr,dpr}}
function onProbe(e){const q=coords(e);const handle=handles.find(h=>Math.hypot(q.x-h.x,q.y-h.y)<17*q.dpr);if(handle)return handle.kind;
 return points.some(p=>Math.hypot(q.x-p.x,q.y-p.y)<Math.max(28*q.dpr,18))?'probe':null}
vc.addEventListener('pointerdown',e=>{
 if(drag)return;
 const p=coords(e);let hit=e.button===0&&onProbe(e);let surfaceHit=null;if(!hit&&e.button===0&&!e.shiftKey&&state.mode==='clinical'){surfaceHit=pickSurface(p.x,p.y);if(surfaceHit){state.contact=contactFrame(surfaceHit,state.contact);hit='probe';syncControls();mark(true)}}
 const kind=hit?(e.altKey?'rotate':e.shiftKey?'tilt':hit==='probe'&&state.mode==='free'?'free':hit):(e.button===2||e.shiftKey?'pan':'camera');
 drag={id:e.pointerId,kind,start:p,pickOffset:hit==='probe'&&!surfaceHit&&state.contact?{x:lastProject(state.contact.p).x-p.x,y:lastProject(state.contact.p).y-p.y}:{x:0,y:0},az:state.az,height:state.height,free:{...state.free},yaw:state.yaw,pitch:state.pitch,roll:state.roll,handle:handles.find(h=>h.kind===kind),camera:{...camera},target:{...cameraTarget},viewport:{w:vc.width,h:vc.height}};
 selected=hit;vc.setPointerCapture(e.pointerId);vc.style.cursor=hit?'grabbing':kind==='pan'?'move':'grabbing';mark();e.preventDefault();
});
vc.addEventListener('pointermove',e=>{
 const q=coords(e);
 if(!drag){const next=onProbe(e);if(next!==hover){hover=next;mark()}vc.style.cursor=next?'grab':'crosshair';return}
 if(drag.id!==e.pointerId)return;
 const dx=q.x-drag.start.x,dy=q.y-drag.start.y;
 if(drag.kind.startsWith('translate')){
   const i=Number(drag.kind.at(-1)),h=drag.handle,den=h.screen.x*h.screen.x+h.screen.y*h.screen.y;
   const mm=(dx*h.screen.x+dy*h.screen.y)/den*h.length;state.free[['x','y','z'][i]]=drag.free[['x','y','z'][i]]+mm;syncControls();mark(true);
 }else if(['rx','ry','rz'].includes(drag.kind)){
   const key={rx:'pitch',ry:'yaw',rz:'roll'}[drag.kind];setAngle(key,rad(drag[key]+(dx-dy)*.007/q.dpr));
  }else if(drag.kind==='probe'){
   const hit=pickSurface(q.x+drag.pickOffset.x,q.y+drag.pickOffset.y,drag.camera);
   if(hit){state.contact=contactFrame(hit,state.contact);syncControls();mark(true)}
 }else if(drag.kind==='free'){
   const scale=Math.min(vc.width,vc.height)*.79*drag.camera.zoom/Math.max(dimensions().x,dimensions().y,dimensions().z);
   const c=Math.cos(drag.camera.yaw),s=Math.sin(drag.camera.yaw),cp=Math.cos(drag.camera.pitch),sp=Math.sin(drag.camera.pitch);
   const delta=add(mul({x:c,y:0,z:s},dx/scale),mul({x:s*sp,y:cp,z:-c*sp},-dy/scale));
   const pose=explorationPose(state,transform,volume),worldDelta=sub(transform.localToWorld(delta),transform.localToWorld({x:0,y:0,z:0}));
   for(const [i,key] of ['x','y','z'].entries()){const worldAxis=sub(transform.localToWorld(pose.axes[i]),transform.center);state.free[key]=drag.free[key]+dot(worldDelta,worldAxis)}
   syncControls();mark(true);
 }else if(drag.kind==='tilt'){
   const limit=state.mode==='free'||$('freeAngle').checked?Math.PI:1.1;state.pitch=clamp(drag.pitch-dy*.007,-limit,limit);syncControls();mark(true);
 }else if(drag.kind==='rock'){
   const limit=state.mode==='free'||$('freeAngle').checked?Math.PI:1.35;state.yaw=clamp(drag.yaw+dx*.007,-limit,limit);syncControls();mark(true);
 }else if(drag.kind==='rotate'){state.roll=clamp(drag.roll+dx*.009,-Math.PI,Math.PI);syncControls();mark(true)}
 else if(drag.kind==='camera'){
   follow=false;$('follow').checked=false;
   cameraTarget.yaw=drag.target.yaw+dx*.005;cameraTarget.pitch=clamp(drag.target.pitch+dy*.004,-1.3,1.3);mark();
 }else{
   const scale=Math.min(vc.width,vc.height)*.79*camera.zoom/Math.max(dimensions().x,dimensions().y,dimensions().z);
   cameraTarget.panX=drag.target.panX-dx/scale;cameraTarget.panY=drag.target.panY+dy/scale;mark();
 }
 e.preventDefault();
});
function release(e){if(!drag||drag.id!==e.pointerId)return;drag=null;selected=false;vc.style.cursor='crosshair';if(vc.hasPointerCapture(e.pointerId))vc.releasePointerCapture(e.pointerId);
 if(follow&&state.mode==='clinical'&&state.contact){cameraTarget.yaw=Math.atan2(state.contact.p.z,state.contact.p.x)+Math.PI/2;cameraTarget.pitch=.2}mark(true)}
vc.addEventListener('pointerup',release);vc.addEventListener('pointercancel',release);vc.addEventListener('lostpointercapture',e=>{if(drag?.id===e.pointerId){drag=null;selected=false;mark()}});
vc.addEventListener('contextmenu',e=>e.preventDefault());
vc.addEventListener('wheel',e=>{e.preventDefault();const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?vc.height:1);const factor=Math.exp(-pixels*.0005);cameraTarget.zoom=clamp(cameraTarget.zoom*factor,.55,2.4);mark()},{passive:false});
if(typeof ResizeObserver!=='undefined'){new ResizeObserver(()=>mark()).observe(vc);new ResizeObserver(()=>mark(true)).observe(monitor)}else window.addEventListener('resize',()=>mark());
orientation();invalidateMesh();syncControls();mark(true);
export const ready=typeof location!=='undefined'?loadDemoPatient():Promise.resolve();
