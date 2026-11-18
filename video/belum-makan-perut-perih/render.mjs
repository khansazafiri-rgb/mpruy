import fs from'node:fs';import path from'node:path';import{createRequire}from'node:module';import{fileURLToPath}from'node:url';import{spawn,spawnSync}from'node:child_process';import{once}from'node:events';import{createHash}from'node:crypto';
import{raka,rakaSvg,idle,lerpState}from'./brand/characters/raka/raka.js';
import{backOut}from'./reference/medcoel-lib.js';import*as A from'./reference/malam-art.js';import{STOMACH,stomachSvg,bacteriumSvg}from'./stage/anatomy.js';
const require=createRequire(import.meta.url),{createCanvas,loadImage,GlobalFonts,Path2D}=require('@napi-rs/canvas');
const R=path.dirname(fileURLToPath(import.meta.url)),T=JSON.parse(fs.readFileSync(path.join(R,'timeline.json'))),CAP=JSON.parse(fs.readFileSync(path.join(R,'captions.json'))),WORDS=JSON.parse(fs.readFileSync(path.join(R,'word-timing.json'))),OUT=path.resolve(R,process.env.OUTPUT_DIR||'out'),CACHE=path.join(R,'.cache');
fs.mkdirSync(OUT,{recursive:true});fs.mkdirSync(CACHE,{recursive:true});const FF=process.env.FFMPEG||'ffmpeg';
GlobalFonts.registerFromPath(path.join(R,'fonts/PlusJakartaSans-800.woff2'),'Jakarta');GlobalFonts.registerFromPath(path.join(R,'fonts/PlusJakartaSans-600.woff2'),'Jakarta Text');
const C={forest:'#0A3830',teal:'#1D7B75',navy:'#172B38',cream:'#F7F3E8',paper:'#FFFDF7',mint:'#9DE0BD',gold:'#F8C038',coral:'#F2735E',skin:'#F7BC8E',wall:'#F4A29B',lumen:'#FFF0DC',acid:'#F2735E',blue:'#5BD0E6',violet:'#8E7CE8',muted:'#52766D'};
const cv=createCanvas(1080,1920),g=cv.getContext('2d'),logo=await loadImage(path.join(R,'assets/logo-full.webp'));
const clamp=(a,l=0,h=1)=>Math.max(l,Math.min(h,a)),ease=a=>{a=clamp(a);return a*a*(3-2*a)},lerp=(a,b,k)=>a+(b-a)*k;
function rect(x,y,w,h,r,f,s=null,z=4){g.beginPath();g.roundRect(x,y,w,h,r);if(f){g.fillStyle=f;g.fill()}if(s){g.strokeStyle=s;g.lineWidth=z;g.stroke()}}
function card(x,y,w,h,f=C.paper,r=28){rect(x,y+9,w,h,r,'#082B28');rect(x,y,w,h,r,f)}
function txt(s,x,y,z=43,c=C.navy,a='left',weight=800){g.font=`${weight} ${z}px "${weight>=700?'Jakarta':'Jakarta Text'}"`;g.fillStyle=c;g.textAlign=a;g.fillText(s,x,y)}
function lines(a,x,y,z=60,c=C.paper,align='center',gap=1.15){a.forEach((s,i)=>txt(s,x,y+z*gap*i,z,c,align))}
function line(x,y,a,b,c=C.paper,z=5){g.beginPath();g.moveTo(x,y);g.lineTo(a,b);g.strokeStyle=c;g.lineWidth=z;g.lineCap='round';g.stroke()}
function pd(d,fill,stroke=null,z=5){const p=new Path2D(d);if(fill){g.fillStyle=fill;g.fill(p)}if(stroke){g.strokeStyle=stroke;g.lineWidth=z;g.lineJoin='round';g.lineCap='round';g.stroke(p)}}
function dot(x,y,r,c){g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fillStyle=c;g.fill()}
function ellipse(x,y,rx,ry,col,stroke=null,z=5){g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(col){g.fillStyle=col;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=z;g.stroke()}}
function arrow(x,y,a,b,c=C.gold,z=6){line(x,y,a,b,c,z);const ang=Math.atan2(b-y,a-x);line(a,b,a-18*Math.cos(ang-.6),b-18*Math.sin(ang-.6),c,z);line(a,b,a-18*Math.cos(ang+.6),b-18*Math.sin(ang+.6),c,z)}
function chip(s,cx,y,w=750,col=C.coral,z=43,ink=C.paper){g.font=`800 ${z}px Jakarta`;z=Math.min(z,(w-40)/g.measureText(s).width*z);card(cx-w/2,y,w,79,col,39);txt(s,cx,y+54,z,ink,'center')}
function pop(t,t0,cx,cy,fn){const k=t<t0?0:backOut((t-t0)/.42);g.save();g.translate(cx,cy);g.scale(k,k);fn();g.restore()}
function base(t,kind='green'){
 const top=kind==='cream'?'#FBF7EA':kind==='room'?'#233D53':'#0F5F57',bottom=kind==='cream'?'#EFE8D2':kind==='room'?'#162A3E':C.forest;
 const grad=g.createLinearGradient(0,0,0,1920);grad.addColorStop(0,top);grad.addColorStop(1,bottom);g.fillStyle=grad;g.fillRect(0,0,1080,1920);
 g.save();g.globalAlpha=.045;dot(980,400,290,C.paper);dot(90,1440,330,C.paper);dot(140,180,150,C.paper);g.restore();
}
function caption(t,web=false){const c=CAP.find(c=>t>=c.start&&t<c.end);if(!c)return;const y=web?1486:1504;card(64,y,952,162,C.forest,25);let z=45;for(const s of c.lines){g.font='800 45px Jakarta';z=Math.min(z,892/g.measureText(s).width*45)}
 const active=WORDS.find(w=>t>=w.start&&t<w.end),norm=s=>s.replace(/[^A-Z0-9]/g,'');const activeParts=(active?.word.toUpperCase()||'').split(/\s+/).map(norm);
 c.lines.forEach((s,i)=>{const parts=s.split(' ');g.font=`800 ${z}px Jakarta`;const total=g.measureText(s).width;let x=540-total/2;const yy=y+(c.lines.length===1?99:66+i*57);for(const w of parts){const wd=g.measureText(w).width,on=activeParts.includes(norm(w));if(on)rect(x-5,yy-z+2,wd+10,z+10,9,C.gold);txt(w,x,yy,z,on?C.forest:C.paper,'left');x+=wd+g.measureText(' ').width}});
}
async function svg(inner,x,y,w,h,vb='0 0 1080 1920'){const im=await loadImage(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}">${inner}</svg>`));g.drawImage(im,x,y,w,h)}
async function char(t,x,y,w,mode='neutral',u=0){
 const n=raka('netral','netral',{yaw:.25,gazeX:.35}),thought=raka('berpikir','berpikir',{yaw:.25,gazeX:.3,gazeY:-.15}),pain=raka('khawatir','netral',{yaw:.22,gazeY:.5,browL:{y:3,rot:13},browR:{y:1,rot:-12},mouth:{w:11,up:-3,lo:2},armL:{wx:178,wy:460,ex:95,ey:488,front:1},armR:{wx:281,wy:540,ex:336,ey:491,front:1}});
 let st=n;
 if(mode==='pain')st=lerpState(n,pain,ease(u));
 if(mode==='think')st=thought;
 if(mode==='happy')st=lerpState(thought,raka('lega','netral',{yaw:.2}),ease(u));
 if(mode==='point')st=lerpState(thought,raka('menunjuk','netral',{yaw:.3,gazeX:.65,armR:{wx:365,wy:225,ex:380,ey:330,fa:-100,finger:1,front:1}}),ease(u));
 if(mode==='hook'){
  const reach=raka('netral','netral',{yaw:.35,gazeX:.7,gazeY:.6,armR:{wx:365,wy:540,ex:340,ey:500,front:1},armL:{wx:157,wy:550,ex:90,ey:505,front:1}});
  const notice=raka('kaget','netral',{yaw:.65,gazeX:.9,gazeY:-.2,wide:.4,fxBurst:0,armR:{wx:390,wy:540,ex:351,ey:500,front:1}});
  st=lerpState(n,reach,ease((t+.09)/.35));if(t>.55)st=lerpState(reach,notice,ease((t-.55)/.4));if(t>1.65)st=lerpState(notice,pain,ease((t-1.65)/.65));
 }
 st=idle(st,t);const s=rakaSvg(st,{outfit:'harian',shadow:false,uid:'rk',dark:true}).replace('viewBox="0 0 400 800"','width="400" height="800" viewBox="0 0 400 800"');const im=await loadImage(Buffer.from(s));g.drawImage(im,x,y,w,w*2);
}
function lunch(x,y){card(x,y,235,130,'#C5E4D5',18);rect(x+9,y+12,217,83,12,C.paper);ellipse(x+78,y+62,42,22,'#FFFFFF');ellipse(x+77,y+54,37,18,'#FFFFFF');dot(x+151,y+54,19,C.coral);pd(`M${x+135} ${y+45}Q${x+155} ${y+18} ${x+182} ${y+45}Z`,'#6CC489');rect(x+8,y+99,219,16,6,C.teal)}
async function room(t,mode='neutral',u=0,opening=false){
 base(t,'room');rect(55,430,260,400,25,'#AECED8');rect(72,447,226,366,16,'#CFE8F3');line(183,447,183,813,'#6F9DAF',9);line(72,630,298,630,'#6F9DAF',9);
 rect(751,641,285,15,5,'#8A6240');for(let i=0;i<6;i++)rect(765+i*41,555-(i%2)*21,29,85+(i%2)*21,5,[C.coral,C.gold,C.mint,'#6998BC'][i%4]);
 const zoom=opening?1+.12*ease((t-2.25)/1.35):1;g.save();g.translate(540,1060);g.scale(zoom,zoom);g.translate(-540,-1060);
 rect(358,932,376,420,55,'#28485E');g.save();g.beginPath();g.rect(0,326,1080,924);g.clip();await char(t,230,350,620,mode,u);g.restore();
 rect(0,1250,1080,58,0,'#A77D55');rect(0,1308,1080,612,0,'#795536');for(let j=0;j<4;j++)line(0,1390+j*130,1080,1390+j*130,'#704D31',5);
 rect(82,1035,270,192,17,C.navy);rect(95,1048,244,164,10,'#D9EFE3');line(132,1103,284,1103,C.teal,7);line(132,1138,245,1138,C.teal,5);pd('M66 1227H369L389 1252H46Z','#90A8AC');
 const fx=opening?810+65*ease((t-.95)/.7):875;lunch(fx,1130);
 const page=opening?0:ease(u);pd('M398 1239Q468 1208 540 1232Q612 1208 682 1239V1296Q608 1269 540 1291Q472 1269 398 1296Z',C.paper);line(540,1233,540,1290,'#B9C8B8',3);
 if(mode==='learn'){const k=ease(u);rect(415,1160,252,99,12,C.paper);line(435,1192,516+90*k,1192,C.teal,5);line(435,1220,597,1220,C.teal,5)}
 g.restore();
 rect(725,412,285,119,21,C.navy);let hour=opening?9+5*ease((t-1.4)/.7):14;txt(String(Math.floor(hour)).padStart(2,'0')+':00',868,494,63,C.gold,'center');
 if(opening){const x=1110-360*ease((t-.48)/.43);card(x,682,270,296,C.paper,22);txt('JADWAL',x+135,736,31,C.teal,'center');txt('KULIAH',x+135,776,31,C.teal,'center');for(let i=0;i<3;i++){rect(x+27,808+i*43,24,24,5,i===0?C.gold:C.mint);line(x+69,820+i*43,x+225,820+i*43,'#B5C9BE',6)}}
}
async function stomach(t,cx=540,cy=850,sc=1.5,{wound=0,food=0,acid=true}={}){
 await svg(stomachSvg(t,{wound,food}),cx-350*sc,cy-370*sc,700*sc,740*sc,'-350 -370 700 740');
 if(acid){g.save();g.translate(cx,cy);g.scale(sc,sc);for(let i=0;i<10;i++){const x=22+(i%3)*58+Math.sin(t*.7+i)*13,y=-92+Math.floor(i/3)*66+Math.cos(t*.8+i)*12;dot(x,y,7,C.acid)}for(let j=0;j<3;j++){if(wound>.5&&j===1)continue;const v=(t*.48+j/3)%1,x=223-v*92,y=-34+j*60;ellipse(233,y,11,18,'#DE8D84');dot(234,y,3,'#B66B70');dot(x,y,5,C.acid);arrow(224,y,188,y,'#CD7E72',2)}g.restore()}
}
function acidParticle(x,y,r=21,alpha=1){g.save();g.globalAlpha=alpha;dot(x,y,r,C.acid);txt('H+',x,y+r*.31,r*.77,C.paper,'center');g.restore()}
function wall(t,{weak=0,ulcer=0,neutral=0,particles=true}={}){
 rect(55,432,970,966,38,C.lumen);txt('LUMEN LAMBUNG',540,498,30,'#A16D57','center');
 const h=165-78*weak;g.save();g.beginPath();g.roundRect(55,432,970,966,38);g.clip();rect(55,1010-h,970,h+12,0,C.mint);
 for(let i=0;i<14;i++){const x=88+i*72;rect(x,1020,65,255,28,C.wall,'#DA8D83',3);ellipse(x+32,1156,13,24,'#CA7778')}
 rect(55,1276,970,122,0,'#DB877A');
 for(let i=0;i<11;i++){const x=100+i*87,y=950-h*.3+Math.sin(t*1.4+i)*13;dot(x,y,9,C.teal)}
 if(ulcer>0){g.save();g.globalAlpha=ulcer;pd('M620 863H735L738 1011Q710 1085 682 1106Q645 1076 620 1010Z',C.lumen);pd('M624 1010Q646 1108 682 1125Q724 1105 735 1010',null,'#B85A51',15);g.restore()}
 if(particles)for(let i=0;i<9;i++){const u=(t*.32+i*.125)%1,xx=115+i*102+Math.sin(t+i)*12,yy=560+u*(455-h);acidParticle(xx,yy,18,yy>990-h?Math.max(.1,(1020-yy)/(h*.6)):1)}
 g.restore();txt('Mukus + bikarbonat',95,1010-h+54,31,C.forest);txt('EPITEL',128,1325,29,'#8B4D4C');
}
async function bac(t,x,y,scale=1,alpha=1){g.save();g.globalAlpha=alpha;await svg(bacteriumSvg(t),x-90*scale,y-65*scale,270*scale,130*scale,'-90 -65 270 130');g.restore()}
function capsule(x,y,s=1,col=C.blue,rot=-.3){g.save();g.translate(x,y);g.rotate(rot);g.scale(s,s);rect(-72,-32,144,64,32,C.paper,C.navy,4);g.save();g.beginPath();g.rect(-74,-36,74,72);g.clip();rect(-72,-32,144,64,32,col);g.restore();line(0,-31,0,31,C.navy,3);g.restore()}
async function education(t,id){
 if(id==='hook'){await room(t,'hook',0,true);chip('BELUM MAKAN, KOK PERUT PERIH?',540,210,930,C.coral,43);return}
 base(t);
 if(id==='asam'){
  chip('ASAM TETAP DIPRODUKSI',540,210,830,C.coral,43);const u=t-3.94;await stomach(t,554,871,1.48,{food:1-ease(u/1.55)});
  if(u<1.8){for(let i=0;i<3;i++){const q=clamp((u-i*.15)/1.3),x=lerp(540,150,q),y=lerp(1050,1170,q);ellipse(x,y,15*(1-q*.5),11*(1-q*.5),'#DDB87B')}}
  chip('Lambung kosong, asam tetap diproduksi',540,1345,930,C.paper,30,C.forest);return;
 }
 if(id==='pelindung'){
  chip('ADA LAPISAN PELINDUNG',540,210,835,C.gold,43,C.forest);wall(t);
  // Local H+ is buffered in mucus; it does not reach the intact epithelial cells.
  for(let i=0;i<3;i++){const u=((t-7.8)*.55+i/3)%1,x=326+i*186,y=lerp(654,920,u);acidParticle(x,y,23,1-ease((u-.75)/.25));if(u>.65){dot(x+23*(1-u),920,15*ease((u-.65)/.35),C.paper)}}
  return;
 }
 if(id==='sinyal'){
  chip('PADA SEBAGIAN ORANG',540,210,815,C.gold,43,C.forest);await stomach(t,276,1055,.78);
  await char(t,638,668,340,'pain',ease((t-14.7)/.6));
  await svg(A.brain({glow:clamp((t-14.5)/.5)}),728,402,205,217,'-140 -145 280 290');
  const pts=[[412,1083],[490,969],[561,802],[673,698],[810,581]];for(let j=0;j<4;j++)line(...pts[j],...pts[j+1],'#82A599',5);
  for(let j=0;j<4;j++){if(t<12.6)continue;const u=(((t-12.6)*.52+j*.2)%1+1)%1,v=u*4,i=Math.min(3,Math.floor(v)),k=v-i;dot(lerp(pts[i][0],pts[i+1][0],k),lerp(pts[i][1],pts[i+1][1],k),13,C.gold)}
  txt('Sinyal sensasi',410,1307,40,C.paper,'center');return;
 }
 if(id==='bukan-luka'){
  chip('PERIH BELUM TENTU LUKA',540,210,900,C.coral,43);await stomach(t,617,854,1.34);await char(t,80,904,250,'pain',1);
  pop(t,17.15,649,1340,()=>chip('Pelindung masih utuh',0,-40,660,C.mint,38,C.forest));return;
 }
 if(id==='percabangan'){
  chip('KAPAN MASALAHNYA BERBEDA?',540,210,940,C.gold,39,C.forest);await stomach(t,540,990,1.01);
  pop(t,20.7,264,570,()=>chip('H. pylori',0,-39,390,C.violet,40));pop(t,21.1,816,570,()=>chip('NSAID',0,-39,390,C.blue,40,C.forest));
  const k=ease((t-21.2)/1);arrow(264,650,lerp(264,445,k),lerp(650,901,k),C.violet,7);arrow(816,650,lerp(816,666,k),lerp(650,901,k),C.blue,7);return;
 }
 if(id==='penyebab'){
  chip('PERTAHANAN DAPAT TERGANGGU',540,210,960,C.gold,38,C.forest);
  card(65,389,449,300,C.paper);card(566,389,449,300,C.paper);await bac(t,252,531,.85);txt('H. pylori',290,646,36,C.violet,'center');capsule(790,504,1,C.blue);txt('NSAID',790,585,36,C.teal,'center');
  if(t>=26.22)txt('Prostaglandin berkurang',790,645,26,C.muted,'center');
  const weak=ease((t-27.82)/3);g.save();g.translate(0,405);g.scale(1,.63);wall(t,{weak});g.restore();
  if(t>=24.56){arrow(290,700,290,951,C.violet,7);await bac(t,280,980,.46)}if(t>=26.22)arrow(790,700,790,980,C.blue,7);
  txt('Seiring waktu • tidak selalu menjadi tukak',540,1403,31,C.paper,'center');return;
 }
 if(id==='tukak'){
  const k=ease((t-32.3)/.8);chip('JIKA TERBENTUK LUKA: TUKAK',540,210,950,C.coral,40);await stomach(t,540,862,1.42,{wound:k});
  if(k>.02){line(835,929,934,1245,C.gold,6);chip('Luka lokal pada lapisan',540,1330,838,C.paper,36,C.forest)}
  if(t>=34.02){chip('Pola nyeri saja tidak memastikan diagnosis',540,360,960,C.mint,30,C.forest)}return;
 }
 if(id==='obat-beda'){
  chip('BEDA CARA KERJA',540,210,770,C.gold,47,C.forest);await stomach(t,540,968,1.1);
  capsule(260,580,1.25,C.blue);capsule(806,580,1.25,C.violet);chip('ANTASIDA',260,710,390,C.blue,33,C.forest);chip('PPI',806,710,390,C.violet,38);
  const k=ease((t-38)/1.6);arrow(260,820,lerp(260,386,k),lerp(820,1035,k),C.blue);arrow(806,820,lerp(806,755,k),lerp(820,1002,k),C.violet);return;
 }
 if(id==='antasida'){
  chip('ANTASIDA: MENETRALKAN',540,210,910,C.blue,42,C.forest);wall(t,{particles:false});
  for(let i=0;i<10;i++){const x=175+i%4*211,y=573+Math.floor(i/4)*118+Math.sin(t+i)*12,j=[0,3,6].indexOf(i),k=j>=0?ease((t-41.02-j*.15)/.8):0;acidParticle(x,y,23,1-k);if(k>0)dot(x,y,22*k,'#B8CDC6')}
  for(let j=0;j<3;j++){const i=[0,3,6][j],k=ease((t-40.42-j*.1)/.6),x=175+i%4*211,y=lerp(404,573+Math.floor(i/4)*118+Math.sin(t+i)*12,k);g.save();g.globalAlpha=1-.75*ease((t-41.02-j*.15)/.8);rect(x-28,y-28,56,56,16,C.blue);txt('A',x,y+12,31,C.forest,'center');g.restore()}
  chip('Bekerja pada asam yang sudah ada',540,1328,900,C.paper,34,C.forest);return;
 }
 if(id==='ppi'){
  chip('PPI: MENGURANGI PRODUKSI',540,210,958,C.violet,41);const block=ease((t-45.74)/.55);
  rect(70,400,940,438,36,C.lumen);txt('KE LUMEN LAMBUNG',540,465,31,'#9A6955','center');
  rect(161,841,760,553,100,C.wall,'#D98680',7);ellipse(407,1207,75,51,'#CD7D7D');txt('Sel parietal',540,1340,41,C.navy,'center');
  line(175,849,906,849,C.teal,13);rect(491,781,100,148,33,C.navy);rect(518,800,46,110,18,block>.5?C.violet:C.gold);txt('Pompa proton',790,805,31,C.navy,'center');line(687,821,599,834,C.navy,4);
  for(let i=0;i<6;i++){const x=181+i*129,y=590+(i%2)*110;acidParticle(x,y,24)}
  for(let i=0;i<4;i++){let u=((t-44.3)*.65+i*.25)%1;if(t>=45.74)u=((45.74-44.3)*.65+i*.25)%1+(t-45.74)*.65;if(u>=1)continue;const y=lerp(1120,544,u);if(block>.8&&y>780)continue;acidParticle(540,y,19)}
  const p=ease((t-44.7)/1.04),x=lerp(851,541,p),y=lerp(1130,934,p);card(x-69,y-33,138,66,C.violet,21);txt('PPI',x,y+15,38,C.paper,'center');
  if(block>.6){line(501,812,578,888,C.violet,10);line(578,812,501,888,C.violet,10);chip('Asam baru yang keluar berkurang',540,1410,930,C.paper,32,C.forest)}return;
 }
 if(id==='terapi-penyebab'){
  chip('PENYEBABNYA JUGA DITANGANI',540,210,960,C.gold,38,C.forest);wall(t);
  const k=ease((t-51.3)/2);await bac(t,499,920,1.05,1-.55*k);
  const bx=lerp(210,393,k),by=lerp(628,901,k);card(bx-53,by-35,106,70,C.gold,20);txt('+',bx,by+16,48,C.forest,'center');txt('Antibakteri',254,567,30,C.navy,'center');arrow(254,688,450,910,C.gold,7);
  card(698,521,299,290,C.paper,23);txt('Asam berkurang',847,565,26,C.navy,'center');rect(746,640,200,125,35,C.wall);rect(817,602,63,105,22,C.navy);rect(835,612,28,82,10,C.violet);line(824,620,873,689,C.violet,6);line(873,620,824,689,C.violet,6);const px=lerp(938,849,k),py=lerp(774,722,k);card(px-45,py-25,90,50,C.violet,17);txt('PPI',px,py+13,28,C.paper,'center');
  chip('Penanganan sesuai diagnosis',540,1328,890,C.paper,36,C.forest);return;
 }
 if(id==='maag'){
  await room(t,'think',0);chip('“MAAG” BUKAN SATU DIAGNOSIS',540,210,950,C.coral,39);
  pop(t,55.2,231,942,()=>chip('Penyebab?',0,-40,360,C.paper,32,C.forest));pop(t,56.4,847,933,()=>chip('Obatnya?',0,-40,340,C.gold,32,C.forest));return;
 }
 if(id==='bantuan'){
  await room(t,'neutral',0);chip('KELUHAN PERLU DIPERIKSA',540,210,930,C.gold,41,C.forest);
  if(t<62.36)pop(t,59.65,540,1160,()=>chip('Berulang atau makin berat',0,-40,915,C.paper,39,C.forest));
  else{pop(t,62.36,540,1110,()=>chip('Muntah darah',0,-40,890,C.coral,42));if(t>=63.14)pop(t,63.14,540,1244,()=>chip('Tinja hitam',0,-40,890,C.coral,42));txt('Segera periksakan diri',540,1415,44,C.paper,'center')}return;
 }
 if(id==='belajar'){
  await room(t,'point',t-65.48);chip('PAHAMI CARA KERJA TUBUH',540,210,940,C.gold,42,C.forest);return;
 }
}
async function web(t,id){base(t,'cream');g.drawImage(logo,64,112,340,340*logo.height/logo.width);const c=T.web.find(c=>c.id===id),n=Math.max(1,Math.floor((t-c.start)*30+.002)+1),im=await loadImage(path.join(CACHE,id,String(n).padStart(4,'0')+'.jpg'));
 chip({materi:'Materi FK per bab',soal:'Latihan soal + pembahasan',simulasi:'Coba Simulasi Dokter'}[id],540,220,970,C.gold,id==='soal'?43:51,C.forest);
 card(32,371,1016,1042,C.paper,26);g.save();g.beginPath();g.roundRect(40,379,1000,1026,20);g.clip();const pan=id==='soal'?145*ease((t-c.start-1)/1.2):id==='simulasi'?90:0;g.drawImage(im,40,379-pan,1000,1000*im.height/im.width);g.restore();
 txt('Rekaman demo • data uji lokal',540,1450,25,C.muted,'center',600);caption(t,true);
 if(t>=T.ctaStart){card(54,1683,972,106,C.teal,24);txt('Belajar FK gratis',86,1751,38,C.paper);txt('medcoel.com',994,1753,57,C.gold,'right')}
}
async function rawFrame(t,id){if(['materi','soal','simulasi'].includes(id))return web(t,id);await education(t,id);caption(t)}
async function frame(t){const s=T.shots.find(s=>t+1e-7>=s.start&&t+1e-7<s.end)||T.shots.at(-1);
 if((s.id==='asam'||s.id==='pelindung')&&t-s.start<.43){const prev=T.shots[T.shots.indexOf(s)-1];await education(prev.end-.01,prev.id);const bg=await loadImage(cv.toBuffer('image/png'));await education(t,s.id);const fg=await loadImage(cv.toBuffer('image/png'));g.drawImage(bg,0,0);g.save();g.beginPath();g.arc(s.id==='asam'?540:861,s.id==='asam'?1060:940,1700*ease((t-s.start)/.43),0,Math.PI*2);g.clip();g.drawImage(fg,0,0);g.restore();caption(t);return}
 await rawFrame(t,s.id);
}
async function cover(){base(0,'room');await char(2.5,305,475,472,'pain',1);chip('BELUM MAKAN,',540,206,940,C.coral,67);chip('KOK PERUT PERIH?',540,307,940,C.coral,67);await stomach(1,237,1160,.65);card(532,1098,495,198,C.gold,26);lines(['Perih belum','tentu luka'],779,1177,53,C.forest);card(54,1505,972,169,C.paper,28);g.drawImage(logo,286,1550,508,508*logo.height/logo.width);txt('medcoel.com',540,1790,52,C.mint,'center');fs.writeFileSync(path.join(OUT,'MEDCOEL-perut-perih-cover.png'),cv.toBuffer('image/png'))}
await cover();if(process.argv.includes('--cover'))process.exit(0);
for(const c of T.web){const dir=path.join(CACHE,c.id);fs.mkdirSync(dir,{recursive:true});const count=Math.ceil((c.end-c.start)*30-.001),sig=createHash('sha256').update(fs.readFileSync(path.join(R,c.source))).update(JSON.stringify(c)).digest('hex'),stamp=path.join(dir,'source.sha256');if(!fs.existsSync(path.join(dir,String(count).padStart(4,'0')+'.jpg'))||!fs.existsSync(stamp)||fs.readFileSync(stamp,'utf8')!==sig){const r=spawnSync(FF,['-v','error','-y','-ss',String(c.sourceStart),'-i',path.join(R,c.source),'-t',String(c.end-c.start+.07),'-vf','fps=30','-q:v','2',path.join(dir,'%04d.jpg')],{stdio:'inherit'});if(r.status)throw Error('Footage extraction failed');fs.writeFileSync(stamp,sig)}}
const qa=[];for(const s of T.shots){const a=Math.ceil(s.start*30-1e-6),b=Math.ceil(s.end*30-1e-6)-1;for(const[tag,f]of[['awal',a],['tengah',Math.round((a+b)/2)],['akhir',b]])qa.push({id:s.id,tag,f,time:f/30})}fs.writeFileSync(path.join(OUT,'qa-index.json'),JSON.stringify(qa,null,2));
if(process.argv.includes('--stills')){for(const q of qa){await frame(q.time);fs.writeFileSync(path.join(OUT,`shot-${q.id}-${q.tag}.png`),cv.toBuffer('image/png'))}for(const t of[0,.5,1,1.5,2,2.5,3]){await frame(t);fs.writeFileSync(path.join(OUT,`frame-${t}.png`),cv.toBuffer('image/png'))}console.log('Rendered 54 shot frames + seven opening frames');process.exit(0)}
const at=process.argv.indexOf('--at');if(at>=0){for(const t of process.argv[at+1].split(',').map(Number)){await frame(t);fs.writeFileSync(path.join(OUT,`frame-${t}.png`),cv.toBuffer('image/png'))}process.exit(0)}
const count=Math.round(T.duration*30),pic=path.join(OUT,'picture.mp4'),p=spawn(FF,['-v','warning','-y','-f','rawvideo','-pixel_format','rgba','-video_size','1080x1920','-framerate','30','-i','-','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',pic],{stdio:['pipe','inherit','inherit']});
for(let f=0;f<count;f++){await frame(f/30);if(!p.stdin.write(cv.data()))await once(p.stdin,'drain');for(const q of qa.filter(q=>q.f===f))fs.writeFileSync(path.join(OUT,`shot-${q.id}-${q.tag}.png`),cv.toBuffer('image/png'));if(f%150===0)console.log('Frame',f,'/',count)}p.stdin.end();if((await once(p,'close'))[0])throw Error('Encode failed');const r=spawnSync(FF,['-v','error','-y','-i',pic,'-i',path.join(R,'audio/master-video.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-t',String(T.duration),'-movflags','+faststart',path.join(OUT,'MEDCOEL-perut-perih-FINAL.mp4')],{stdio:'inherit'});if(r.status)throw Error('Mux failed');console.log('Render complete');
