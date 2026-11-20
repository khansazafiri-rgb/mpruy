import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {raka,rakaSvg,idle,lerpState} from './brand/characters/raka/raka.js';
import {backOut, kf, sparkle} from './reference/medcoel-lib.js';

const require=createRequire(import.meta.url);
const {createCanvas,loadImage,GlobalFonts,Path2D}=require('@napi-rs/canvas');
const R=path.dirname(fileURLToPath(import.meta.url));
const T=JSON.parse(fs.readFileSync(path.join(R,'timeline.json')));
const CAP=JSON.parse(fs.readFileSync(path.join(R,'captions.json')));
const OUT=path.resolve(R,process.env.OUTPUT_DIR||'out'),CACHE=path.join(R,'.cache');
fs.mkdirSync(OUT,{recursive:true});fs.mkdirSync(CACHE,{recursive:true});
const FF=process.env.FFMPEG||'ffmpeg';
for(const [file,family]of[['PlusJakartaSans-800.woff2','MEDCOEL Heavy'],['PlusJakartaSans-600.woff2','MEDCOEL Text']])if(!GlobalFonts.registerFromPath(path.join(R,'fonts',file),family))throw Error('Bundled MEDCOEL font failed');
const C={navy:'#172B38',bg:'#F7F3E8',paper:'#FFFDF7',mint:'#CDEFDD',green:'#007060',gold:'#F8C038',coral:'#F2735E',ct:'#55DDEC',mr:'#C6ABFF',muted:'#526F70',line:'#BED4CC',dark:'#1D3042',skin:'#F7BC8E'};
const cv=createCanvas(1080,1920),g=cv.getContext('2d');
const ct=await loadImage(path.join(R,'assets/ct.png')),mr=await loadImage(path.join(R,'assets/mri-t2.png')),logo=await loadImage(path.join(R,'assets/logo-full.webp'));
const clamp=(a,l=0,h=1)=>Math.max(l,Math.min(h,a)),ease=a=>{a=clamp(a);return a*a*(3-2*a)},mix=(a,b,k)=>a+(b-a)*k;
function rect(x,y,w,h,r,f,s=null,l=4){g.beginPath();g.roundRect(x,y,w,h,r);if(f){g.fillStyle=f;g.fill()}if(s){g.strokeStyle=s;g.lineWidth=l;g.stroke()}}
function card(x,y,w,h,f=C.paper,r=26,s=C.navy){rect(x,y+9,w,h,r,C.navy);rect(x,y,w,h,r,f,s,4)}
function txt(s,x,y,z=44,c=C.navy,a='left',weight=800){g.font=`${weight} ${z}px "${weight>=700?'MEDCOEL Heavy':'MEDCOEL Text'}"`;g.fillStyle=c;g.textAlign=a;g.fillText(s,x,y)}
function lines(a,x,y,z=62,c=C.navy,align='left',gap=1.18){a.forEach((s,i)=>txt(s,x,y+i*z*gap,z,c,align))}
function pd(d,f,s=null,w=5){const p=new Path2D(d);if(f){g.fillStyle=f;g.fill(p)}if(s){g.strokeStyle=s;g.lineWidth=w;g.lineJoin='round';g.lineCap='round';g.stroke(p)}}
function line(x,y,a,b,c=C.navy,w=5){g.beginPath();g.moveTo(x,y);g.lineTo(a,b);g.strokeStyle=c;g.lineWidth=w;g.lineCap='round';g.stroke()}
function dot(x,y,r,c){g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fillStyle=c;g.fill()}
function ellipse(x,y,rx,ry,fill,stroke=null,w=5){g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=w;g.stroke()}}
function arrow(x,y,a,b,c=C.navy,w=5){line(x,y,a,b,c,w);const z=Math.atan2(b-y,a-x);line(a,b,a-16*Math.cos(z-.6),b-16*Math.sin(z-.6),c,w);line(a,b,a-16*Math.cos(z+.6),b-16*Math.sin(z+.6),c,w)}
function progressLine(x,y,a,b,k,col,w=5){line(x,y,mix(x,a,clamp(k)),mix(y,b,clamp(k)),col,w)}
function chip(s,x,y,w,col=C.gold,z=34){card(x,y,w,68,col,22);g.font=`800 ${z}px "MEDCOEL Heavy"`;z=Math.min(z,(w-38)/g.measureText(s).width*z);txt(s,x+w/2,y+45,z,C.navy,'center')}
function popLayer(t,t0,x,y,draw,d=.42){const k=t>=t0?backOut((t-t0)/d):0;g.save();g.translate(x,y);g.scale(k,k);draw();g.restore()}
function base(t,section,dark=false){
 g.fillStyle=dark?C.navy:C.bg;g.fillRect(0,0,1080,1920);
 const grad=g.createRadialGradient(950,90,0,950,90,900);grad.addColorStop(0,dark?'#294B52':'#E0EFDF');grad.addColorStop(1,dark?C.navy:C.bg);g.fillStyle=grad;g.fillRect(0,0,1080,1510);
 g.save();g.globalAlpha=.1;for(let y=40;y<1740;y+=42)for(let x=30;x<1080;x+=42)dot(x,y,2,dark?C.mint:C.green);g.restore();
 txt(section,64,153,27,dark?C.mint:C.green);rect(64,1752,952,5,2,dark?'#35545B':'#CFDCD2');rect(64,1752,952*t/T.duration,5,2,dark?C.gold:C.green);
 txt('medcoel.com',1016,1820,27,dark?C.mint:C.green,'right',600);
}
function heading(a,z=65){card(54,196,972,a.length>1?177:108,C.gold,24);g.font=`800 ${z}px "MEDCOEL Heavy"`;for(const s of a)z=Math.min(z,910/g.measureText(s).width*z);lines(a,540,a.length>1?267:268,z,C.navy,'center',1.12)}
function caption(t,web=false){const c=CAP.find(c=>t>=c.start&&t<c.end);if(!c)return;
 const y=web?1485:1510;card(56,y,968,158,C.paper,25);let z=45;
 for(const s of c.lines){g.font='800 45px "MEDCOEL Heavy"';z=Math.min(z,902/g.measureText(s).width*45)}
 c.lines.forEach((s,i)=>txt(s,540,y+(c.lines.length===1?98:65+i*58),z,C.navy,'center'));
}
function imageBox(im,x,y,w,h,zoom=1,col=C.ct){
 rect(x,y+9,w,h,25,C.navy);rect(x,y,w,h,25,'#020506',col,5);
 const sc=Math.min((w-24)/im.width,(h-24)/im.height)*zoom,dw=im.width*sc,dh=im.height*sc,dx=x+(w-dw)/2,dy=y+(h-dh)/2;
 g.save();g.beginPath();g.roundRect(x+3,y+3,w-6,h-6,20);g.clip();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(im,dx,dy,dw,dh);g.restore();return{x:dx,y:dy,w:dw,h:dh};
}
function roi(b,u,v,col,t,t0,r=26){const x=b.x+b.w*u,y=b.y+b.h*v,k=ease((t-t0)/.5);
 g.beginPath();for(let i=0;i<=64;i++){const a=-Math.PI/2+Math.PI*2*k*i/64,xx=x+r*Math.cos(a),yy=y+r*Math.sin(a);if(i===0)g.moveTo(xx,yy);else g.lineTo(xx,yy)}g.strokeStyle=col;g.lineWidth=6;g.stroke();
 if(k===1){dot(x+r,y,4,col)}return{x,y};
}
function credit(which='both'){
 if(which==='ct')txt('CT: Mikael Häggström · CC0 1.0',540,1459,25,C.muted,'center',500);
 else if(which==='mr')txt('MRI T2: Sean Novak · CC BY-SA 4.0',540,1459,25,C.muted,'center',500);
 else{txt('CT: Mikael Häggström · CC0  |  MRI: Sean Novak · CC BY-SA 4.0',540,1459,22,C.muted,'center',500)}
}
function pair(t,{zoom=1,y=449,h=636,labels=true}={}){
 if(labels){chip('CT TANPA KONTRAS',57,y-83,458,C.ct,30);chip('MRI T2',565,y-83,458,C.mr,35)}
 const a=imageBox(ct,57,y,458,h,zoom,C.ct),b=imageBox(mr,565,y,458,h,zoom,C.mr);
 txt('Contoh CT',286,y+h+49,29,C.green,'center');txt('Contoh MRI T2',794,y+h+49,29,C.green,'center');return[a,b];
}
async function svgArt(s,w=1080,h=1920){return loadImage(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${s}</svg>`))}
async function drawRaka(t,x,y,w,mode='think',phase=0){
 const think=raka('berpikir','berpikir',{yaw:-.25,gazeX:-.55,gazeY:-.25,fxSpark:0});
 const surprise=raka('kaget','kaget',{yaw:.18,wide:.55,fxBurst:.45});
 const point=raka('menunjuk','menunjuk',{yaw:.25,gazeX:.65,gazeY:-.4,fxSpark:0,armR:{wx:365,wy:225,ex:380,ey:330,fa:-100,finger:1,front:1}});
 const pointLeft=raka('menunjuk','netral',{yaw:-.25,gazeX:-.65,gazeY:-.4,fxSpark:0,armL:{wx:35,wy:225,ex:20,ey:330,fa:-80,finger:1,front:1}});
 const calm=raka('lega','netral',{yaw:.15,gazeX:.2,fxSpark:0});
 let st;
 if(mode==='hook'){
  st=lerpState(surprise,think,ease((t-.15)/.65));
  if(t>2.7)st=lerpState(think,pointLeft,ease((t-2.7)/.6));
  if(t>4.9)st=lerpState(pointLeft,point,ease((t-4.9)/.6));
 }else if(mode==='point')st=lerpState(think,point,ease(phase));
 else if(mode==='happy')st=lerpState(think,calm,ease(phase));
 else st=think;
 st=idle(st,t);const s=rakaSvg(st,{outfit:'harian',shadow:false,uid:'medcoel-raka'}).replace('viewBox="0 0 400 800"','width="400" height="800" viewBox="0 0 400 800"');
 const im=await loadImage(Buffer.from(s));g.drawImage(im,x,y,w,w*2);
}
async function hook(t){
 base(t,'RADIOLOGI / LIHAT BEDANYA');heading(['KENAPA CT DAN MRI','TERLIHAT BEDA?'],63);
 const [a,b]=pair(t,{zoom:1.15-.15*ease((t+.025)/1.35),y:461,h:606});
 g.save();g.beginPath();g.rect(54,1108,972,310);g.clip();await drawRaka(t,90,1066,295,'hook');g.restore();
 popLayer(t,.08,700,1219,()=>{card(-275,-78,550,156,C.paper,28);lines(t<3.8?['Sama-sama irisan otak…']:t<5.2?['Kenapa terang-','gelapnya berbeda?']:['Lihat juga','ruang cairannya.'],0,-12,38,C.navy,'center',1.23)});
 if(t>=3.8&&t<5.2){roi(a,.095,.5,C.gold,t,3.8);roi(b,.07,.5,C.gold,t,3.8);}
 if(t>=5.2){roi(a,.51,.43,C.gold,t,5.2);roi(b,.52,.38,C.gold,t,5.2);}
 txt('Contoh berbeda orang · potongan aksial',722,1386,23,C.muted,'center');credit();
}
// Fixed patient and gantry: one shared three-quarter geometry for both modalities.
function patient(){
 pd('M324 300L400 286L803 550L715 593Z','#D9E3E5',C.navy,4);pd('M715 593L803 550V574L715 618Z','#91ABB4');
 pd('M599 526L666 507V688L599 705Z','#708C98');
 pd('M365 319Q403 302 432 342L519 408L482 458L388 393Z','#1D7B75',C.navy,3);
 pd('M483 445L520 408L697 526L675 555L585 505L572 520L644 570L620 593L483 493Z','#34485E');
 line(396,359,481,434,'#19726D',22);line(369,376,450,447,'#19726D',22);
 ellipse(350,304,29,35,C.skin);pd('M322 294Q326 261 353 268Q384 275 377 296Q349 282 322 294Z','#212739');
}
function scannerDevice(t,type,x=60,y=425,scale=1){
 const col=type==='CT'?C.ct:C.mr;g.save();g.translate(x,y);g.scale(scale,scale);
 ellipse(461,283,235,type==='CT'?232:252,'#688D9A');
 pd('M123 291L228 240L696 239L590 291Z','#93ADB5');
 ellipse(357,306,234,247,'#ECF1E9',C.navy,5);ellipse(357,306,174,186,'#A3BDC1',C.navy,4);ellipse(357,306,121,137,C.dark);ellipse(392,286,83,112,'#243F4F');ellipse(357,306,112,130,C.dark);
 txt(type,357,129,49,C.navy,'center');patient();
 // Console remains separate and does not pretend to be the website.
 rect(737,161,155,120,16,C.navy);imageBox(type==='CT'?ct:mr,754,174,120,92,1,col);line(815,285,815,375,'#658A96',14);
 if(type==='CT'){
  const a=(t-9.94)*1.35-.8,s={x:357+193*Math.cos(a),y:306+208*Math.sin(a)},q={x:357-193*Math.cos(a),y:306-208*Math.sin(a)};
  if(t>=9.94){for(const k of[-.04,0,.04])line(s.x,s.y,357-193*Math.cos(a+k),306-208*Math.sin(a+k),col,2);dot(s.x,s.y,15,col);rect(q.x-16,q.y-22,32,44,6,col,C.navy,3)}
 }else if(t>=23.26){
  g.save();g.setLineDash([24,15]);g.lineDashOffset=-t*24;
  for(let i=0;i<3;i++)ellipse(357,306,254+i*13,271+i*13,null,col,3);g.restore();
 }
 g.restore();
}
function headSlice(cx,cy,scale=1){g.save();g.translate(cx,cy);g.scale(scale,scale);ellipse(0,0,76,97,C.skin,C.navy,4);ellipse(0,-2,62,81,C.paper,C.navy,4);ellipse(0,-2,52,71,'#7693A4');pd('M-17 -21Q-36-30-28-9L-10 19L-1 10L8 22L31-9Q34-26 15-24L2-9Z','#364F66');g.restore()}
function axialCT(t){
 const u=t-9.94,cx=267,cy=1160;headSlice(cx,cy,.88);
 ellipse(cx,cy,157,166,null,'#66818B',3);
 const a=u*1.35-.8,s={x:cx+157*Math.cos(a),y:cy+166*Math.sin(a)},q={x:cx-157*Math.cos(a),y:cy-166*Math.sin(a)};
 for(let i=-2;i<=2;i++){const ang=a+i*.035;line(s.x,s.y,cx-157*Math.cos(ang),cy-166*Math.sin(ang),C.ct,2)}
 dot(s.x,s.y,14,C.ct);rect(q.x-16,q.y-21,32,42,5,C.ct,C.navy,2);
 txt('Irisan kepala tetap',cx,1385,28,C.paper,'center');
 arrow(458,1160,528,1160,C.gold,6);
 card(558,986,420,399,C.paper,24);txt('DATA → CITRA IRISAN',768,1035,26,C.navy,'center');
 // Bars represent different measured transmissions; not clinical measurements.
 for(let i=0;i<6;i++){const h=30+((i*47)%90),k=clamp((u-i*.23)/.7);rect(586+i*56,1194-h*k,33,h*k,7,C.ct,C.navy,2)}
 if(u>1.8){const k=ease((u-1.8)/1.1);g.save();g.globalAlpha=k;imageBox(ct,671,1073,194,258,1,C.ct);g.restore()}
 txt('Ilustrasi pembentukan gambar',540,1440,25,C.paper,'center',500);
}
async function ctScanner(t){
 base(t,'01 / CT SCAN');heading(['Sinar-X dari banyak arah'],59);
 card(54,348,972,1081,C.navy,30);
 scannerDevice(t,'CT',64,363,.96);
 if(t<9.94){g.save();g.beginPath();g.rect(72,1000,936,412);g.clip();await drawRaka(t,90,987,225,'point',t-7.96);g.restore();lines(['Kepala tetap.','Sumber dan detektor','bergerak mengelilinginya.'],660,1145,38,C.paper,'center',1.3)}
 else axialCT(t);
}
function attenuationDemo(t){
 card(65,1188,950,225,C.paper,26);const x=160,y=1280;
 txt('SINAR-X',x,1232,26,C.green,'center');
 rect(410,1233,100,115,15,'#E6EAD6',C.navy,4);txt('Tulang',460,1380,27,C.navy,'center');
 const p=((t-13.56)*.65)%1;for(let i=0;i<5;i++){
  const yy=y-26+i*14;line(213,yy,405,yy,C.ct,3);const xx=213+p*192;dot(xx,yy,4,C.ct);
  if(i<2){line(515,yy,635,yy,C.ct,3);dot(515+p*120,yy,4,C.ct)}
 }
 arrow(667,1280,718,1280,C.navy,5);dot(798,1280,51,C.paper);ellipse(798,1280,51,51,null,C.navy,4);txt('Terang',798,1380,30,C.navy,'center');
}
async function ctImage(t){
 base(t,'01 / CONTOH CT TANPA KONTRAS');heading(['Kenapa tulang terang?'],65);
 chip('CT TANPA KONTRAS',241,349,598,C.ct,34);
 const b=imageBox(ct,250,444,580,632,1+.055*ease((t-13.56)/5),C.ct);
 if(t>=17.7){const p=roi(b,.095,.5,C.gold,t,17.7,27);progressLine(p.x-30,p.y,132,1110,(t-17.7)/.55,C.green);chip('Tulang tengkorak',126,1090,431,C.gold,31)}
 attenuationDemo(t);credit('ct');
}
function rfWave(t,x,y,w,h,col=C.mr){let d='';for(let i=0;i<=120;i++){const xx=x+w*i/120,yy=y+Math.sin(i*.24-t*10)*h;d+=(i?'L':'M')+xx+' '+yy}pd(d,null,col,4)}
function mriSignal(t){
 const z=t-23.26;card(65,1013,950,404,C.paper,26);
 txt('DI DALAM JARINGAN · MODEL KONSEPTUAL',540,1061,25,C.muted,'center');
 // RF tips the net magnetisation; individual vectors are a conceptual model.
 for(let i=0;i<6;i++){
  const x=130+i*91,y=1161;dot(x,y,5,C.navy);
  const aligned=ease(z/.5),rf=ease((t-24)/.45),angle=mix(i*.89-2,-Math.PI/2,aligned)+rf*(.9+Math.sin((t-24)*6+i*.3)*.2);
  arrow(x,y,x+Math.cos(angle)*37,y+Math.sin(angle)*37,C.green,5);
 }
 if(t>=24){rfWave(t,110,1264,450,14,C.mr);txt('Pulsa radio',335,1333,29,C.navy,'center')}
 if(t>=25.1){arrow(640,1178,697,1178,C.mr,5);rfWave(t,709,1178,130,23,C.mr);rect(868,1127,82,101,18,C.navy);txt('Penerima',845,1298,29,C.navy,'center')}
 const step=t<24?'Magnet menyelaraskan':t<25.1?'Pulsa radio diberikan':'Sinyal jaringan ditangkap';
 txt(step,540,1392,32,C.green,'center');
 if(t>=27.3)chip('Terutama hidrogen',300,928,480,C.mr,31);
}
async function mriScanner(t){
 base(t,'02 / MRI');heading(['Magnet + gelombang radio'],57);card(54,348,972,1081,C.navy,30);
 scannerDevice(t,'MRI',64,363,.96);
 if(t<23.26){g.save();g.beginPath();g.rect(72,1000,936,412);g.clip();await drawRaka(t,94,987,225,'point',t-20.02);g.restore();lines(['Alat serupa,','sumber sinyal berbeda.'],664,1190,40,C.paper,'center',1.3)}
 else mriSignal(t);
}
async function sequence(t){
 base(t,'02 / PENGATURAN GAMBAR MRI');heading(['Sekuens ikut menentukan','tampilan MRI'],61);
 imageBox(mr,308,450,464,571,1,C.mr);
 const names=['T1','T2','FLAIR'];names.forEach((s,i)=>popLayer(t,28.3+i*.15,218+i*322,1131,()=>{chip(s,-138,-36,276,s==='T2'?C.mr:C.paper,41)}));
 const k=ease((t-30.2)/.5);g.save();g.globalAlpha=k;line(540,1088,540,1044,C.mr,6);txt('Contoh yang dipakai: T2',540,1252,41,C.green,'center');g.restore();
 txt('Beda sekuens, beda tampilan.',540,1368,33,C.green,'center');credit('mr');
}
async function mriImage(t){
 base(t,'02 / CONTOH MRI T2');heading(['Sekarang lihat cairannya'],62);chip('MRI T2',365,349,350,C.mr,37);
 const b=imageBox(mr,246,445,588,710,1,C.mr);
 if(t>=34.72){const p=roi(b,.52,.38,C.gold,t,34.72,29);progressLine(p.x,p.y+29,694,1194,(t-34.72)/.55,C.mr);chip('Cairan terang',535,1191,427,C.mr,33)}
 if(t>=36.26){const p=roi(b,.07,.5,C.gold,t,36.26,25);progressLine(p.x,p.y,177,1301,(t-36.26)/.55,C.green);chip('Tulang gelap',88,1294,407,C.paper,33)}
 txt('Contoh sekuens T2',540,1404,30,C.green,'center');credit('mr');
}
async function compare(t,id){
 const bone=id==='banding-tulang',start=bone?38.34:42.84;
 base(t,'03 / BANDINGKAN STRUKTURNYA');heading([bone?'Lihat tulang tengkoraknya.':'Lalu ruang cairannya,',bone?'Terang-gelapnya berbeda.':'tampil berbeda.'],bone?54:60);
 const [a,b]=pair(t,{y:461,h:636});
 const p=roi(a,bone?.095:.51,bone?.5:.43,C.gold,t,start+.15,27),q=roi(b,bone?.07:.52,bone?.5:.38,C.gold,t,start+.15,27);
 const l=bone?'Tampak terang':'Lebih gelap',r=bone?'Tampak gelap':'Tampak terang';
 popLayer(t,start+.28,286,1225,()=>chip(l,-212,-35,424,C.ct,32));popLayer(t,start+.28,794,1225,()=>chip(r,-212,-35,424,C.mr,32));
 chip(bone?'TENGKORAK':'CAIRAN / CSF',349,1325,382,C.paper,30);
 g.save();g.globalAlpha=.6;progressLine(p.x,p.y+30,286,1185,(t-start)/.6,C.ct,4);progressLine(q.x,q.y+30,794,1185,(t-start)/.6,C.mr,4);g.restore();credit();
}
async function mechanism(t){
 base(t,'03 / CARA MENGHASILKAN GAMBAR');heading(['Anatominya tidak berubah.','Cara membuat gambarnya berbeda.'],48);
 const u=t-47.3666666667;
 for(const [i,col,im,title,label]of[[0,C.ct,ct,'CT','Penyerapan sinar-X'],[1,C.mr,mr,'MRI T2','Sinyal jaringan']]){
  const y=444+i*474;card(64,y,952,410,C.paper,28);chip(title,92,y+23,210,col,32);
  if(i===0){headSlice(231,y+222,.8);const a=u*1.3;line(231+135*Math.cos(a),y+222+135*Math.sin(a),231-135*Math.cos(a),y+222-135*Math.sin(a),C.ct,4);dot(231+135*Math.cos(a),y+222+135*Math.sin(a),12,C.ct)}
  else{for(let j=0;j<4;j++)arrow(156+j*49,y+212,156+j*49,y+169,C.mr,5);rfWave(t,127,y+265,220,14,C.mr)}
  arrow(408,y+214,636,y+214,col,7);const x=408+((u*.6+i*.3)%1)*228;dot(x,y+214,9,C.gold);
  imageBox(im,705,y+31,240,305,1,col);txt(label,540,y+371,35,C.navy,'center');
 }
 txt('Cara menangkap sinyal + menampilkan data',540,1437,30,C.green,'center');
}
async function clinical(t){
 base(t,'04 / SESUAI PERTANYAAN KLINIS');heading(['Keduanya punya peran'],66);
 const u=t-51.6666666667;popLayer(t,51.68,281,556,()=>{chip('CT',-169,-48,338,C.ct,63)});popLayer(t,51.86,799,556,()=>chip('MRI',-169,-48,338,C.mr,63));
 g.save();g.beginPath();g.rect(54,670,972,634);g.clip();await drawRaka(t,300,628,478,'happy',u/1.2);g.restore();
 popLayer(t,52.2,540,1364,()=>{card(-465,-61,930,122,C.paper,28);txt('Dipilih sesuai kebutuhan klinis',0,18,43,C.navy,'center')});
}
async function web(t,id){
 base(t,'MEDCOEL / BELAJAR FK');
 g.drawImage(logo,64,111,344,344*logo.height/logo.width);
 const labels={materi:['Materi FK per bab'],soal:['Latihan soal + pembahasan'],lab:['Eksplorasi simulasi CT & USG']};
 card(54,210,972,108,C.gold,23);txt(labels[id][0],540,280,id==='lab'?45:id==='soal'?48:61,C.navy,'center');
 const c=T.web.find(c=>c.id===id),n=Math.max(1,Math.floor((t-c.start)*30+.002)+1);
 const im=await loadImage(path.join(CACHE,id,String(n).padStart(4,'0')+'.jpg'));
 card(35,369,1010,1044,C.paper,24);g.save();g.beginPath();g.roundRect(40,375,1000,1031,19);g.clip();
 const pan=id==='soal'?145*ease((t-c.start-1)/1.2):0;g.drawImage(im,40,375-pan,1000,1000*im.height/im.width);g.restore();
 if(id==='lab'){rect(54,1383,972,71,17,C.navy);txt('Simulasi edukatif, bukan alat diagnosis',540,1430,31,C.paper,'center');txt('BodyParts3D / Z-Anatomy · CC BY-SA 4.0',540,1857,22,C.muted,'center',500)}
 else txt('Rekaman demo · data uji lokal',540,1450,24,C.muted,'center',500);
 caption(t,true);
 if(t>=T.ctaStart){card(54,1672,972,103,C.mint,23);txt('Belajar FK gratis',83,1738,38,C.green);txt('medcoel.com',993,1740,55,C.green,'right')}
}
async function frame(t){
 const s=T.shots.find(s=>t+1e-7>=s.start&&t+1e-7<s.end)||T.shots.at(-1),id=s.id;
 if(['materi','soal','lab'].includes(id))return web(t,id);
 if(id==='hook')await hook(t);else if(id==='ct-scanner')await ctScanner(t);else if(id==='ct-image')await ctImage(t);else if(id==='mri-scanner')await mriScanner(t);else if(id==='sekuens')await sequence(t);else if(id==='mri-image')await mriImage(t);else if(id.startsWith('banding'))await compare(t,id);else if(id==='mekanisme')await mechanism(t);else if(id==='klinis')await clinical(t);
 caption(t);
}
async function cover(){
 base(0,'MEDCOEL / RADIOLOGI');heading(['KENAPA CT & MRI','TERLIHAT BEDA?'],63);pair(0,{y:461,h:636});
 g.save();g.beginPath();g.rect(54,1150,972,355);g.clip();await drawRaka(3.9,96,1091,335,'point',1);g.restore();
 card(445,1201,561,180,C.gold,28);lines(['Anatomi otak.','Dua cara melihat.'],726,1273,40,C.navy,'center',1.28);
 txt('CT: Mikael Häggström · CC0',736,1433,22,C.muted,'center',500);txt('MRI: Sean Novak · CC BY-SA 4.0',736,1470,22,C.muted,'center',500);
 card(54,1540,972,154,C.navy,26);txt('SINAR-X',285,1637,42,C.ct,'center');txt('MAGNET + RADIO',771,1637,36,C.mr,'center');
 rect(0,1720,1080,200,0,C.bg);txt('medcoel.com',540,1795,47,C.green,'center');
 fs.writeFileSync(path.join(OUT,'MEDCOEL-CT-MRI-cover.png'),cv.toBuffer('image/png'));
}
await cover();if(process.argv.includes('--cover'))process.exit(0);
for(const c of T.web){
 const dir=path.join(CACHE,c.id);fs.mkdirSync(dir,{recursive:true});
 const count=Math.ceil((c.end-c.start)*30-.001),sig=createHash('sha256').update(fs.readFileSync(path.join(R,c.source))).update(JSON.stringify(c)).digest('hex'),stamp=path.join(dir,'source.sha256');
 if(!fs.existsSync(path.join(dir,String(count).padStart(4,'0')+'.jpg'))||!fs.existsSync(stamp)||fs.readFileSync(stamp,'utf8')!==sig){
  const r=spawnSync(FF,['-v','error','-y','-ss',String(c.sourceStart),'-i',path.join(R,c.source),'-t',String(c.end-c.start+.07),'-vf','fps=30','-q:v','2',path.join(dir,'%04d.jpg')],{stdio:'inherit'});
  if(r.status)throw Error('Footage extraction failed');fs.writeFileSync(stamp,sig);
 }
}
const qa=[];for(const s of T.shots){const a=Math.ceil(s.start*30-1e-6),b=Math.ceil(s.end*30-1e-6)-1;for(const[tag,f]of[['awal',a],['tengah',Math.round((a+b)/2)],['akhir',b]])qa.push({id:s.id,tag,f,time:f/30})}
fs.writeFileSync(path.join(OUT,'qa-index.json'),JSON.stringify(qa,null,2));
if(process.argv.includes('--stills')){for(const q of qa){await frame(q.time);fs.writeFileSync(path.join(OUT,`shot-${q.id}-${q.tag}.png`),cv.toBuffer('image/png'))}console.log('39 shot frames rendered');process.exit(0)}
const at=process.argv.indexOf('--at');if(at>=0){for(const t of process.argv[at+1].split(',').map(Number)){await frame(t);fs.writeFileSync(path.join(OUT,`frame-${t}.png`),cv.toBuffer('image/png'))}process.exit(0)}
const frames=Math.round(T.duration*T.fps),pic=path.join(OUT,'picture.mp4');
const p=spawn(FF,['-v','warning','-y','-f','rawvideo','-pixel_format','rgba','-video_size','1080x1920','-framerate','30','-i','-','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',pic],{stdio:['pipe','inherit','inherit']});
for(let f=0;f<frames;f++){
 await frame(f/30);if(!p.stdin.write(cv.data()))await once(p.stdin,'drain');
 for(const q of qa.filter(q=>q.f===f))fs.writeFileSync(path.join(OUT,`shot-${q.id}-${q.tag}.png`),cv.toBuffer('image/png'));
 if(f%150===0)console.log('Frame',f,'/',frames);
}
p.stdin.end();if((await once(p,'close'))[0])throw Error('Encode failed');
const mux=spawnSync(FF,['-v','error','-y','-i',pic,'-i',path.join(R,'audio/narasi-timeline.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-t',String(T.duration),'-movflags','+faststart',path.join(OUT,'MEDCOEL-CT-MRI-FINAL.mp4')],{stdio:'inherit'});
if(mux.status)throw Error('Mux failed');console.log('Render complete.');
