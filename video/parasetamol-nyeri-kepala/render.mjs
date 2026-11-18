import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {raka,rakaSvg,idle,lerpState} from './brand/characters/raka/raka.js';
const require=createRequire(import.meta.url);
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const T=JSON.parse(fs.readFileSync(path.join(ROOT,'timeline.json')));
const caps=JSON.parse(fs.readFileSync(path.join(ROOT,'captions.json')));
const out=path.resolve(ROOT,process.env.OUTPUT_DIR||'out');
const cache=path.join(ROOT,'.cache','final');fs.mkdirSync(out,{recursive:true});fs.mkdirSync(cache,{recursive:true});
const ff=process.env.FFMPEG||'ffmpeg';
for(const [p,n] of [['/System/Library/Fonts/Supplemental/Arial.ttf','Arial'],['/System/Library/Fonts/Supplemental/Arial Bold.ttf','Arial Bold']])if(fs.existsSync(p))GlobalFonts.registerFromPath(p,n);
const C={cream:'#F5F1E6',paper:'#FFFDF7',navy:'#212739',teal:'#017162',mint:'#D8EDE5',gold:'#FBC23A',coral:'#F2735E',skin:'#F7BC8E',muted:'#697A7B',line:'#C3D6CF'};
const canvas=createCanvas(1080,1920),g=canvas.getContext('2d');
const logo=await loadImage(path.join(ROOT,'assets/logo-full.webp'));
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x)};
function rect(x,y,w,h,r,fill,stroke=null,lw=3){g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke()}}
function text(s,x,y,size=42,color=C.navy,align='left',bold=true){g.font=`${size}px "${bold?'Arial Bold':'Arial'}"`;g.fillStyle=color;g.textAlign=align;g.fillText(s,x,y)}
function lines(a,x,y,size=60,color=C.navy,align='left',gap=1.22){for(let i=0;i<a.length;i++)text(a[i],x,y+i*size*gap,size,color,align)}
function pathD(d,fill,stroke=null,lw=6){const {Path2D}=require('@napi-rs/canvas');const p=new Path2D(d);if(fill){g.fillStyle=fill;g.fill(p)}if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.lineCap='round';g.lineJoin='round';g.stroke(p)}}
function line(x1,y1,x2,y2,col=C.navy,w=6){g.strokeStyle=col;g.lineWidth=w;g.lineCap='round';g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()}
function dot(x,y,r,col){g.fillStyle=col;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill()}
function arrow(x1,y1,x2,y2,col=C.gold,w=7){line(x1,y1,x2,y2,col,w);const a=Math.atan2(y2-y1,x2-x1);line(x2,y2,x2-20*Math.cos(a-.6),y2-20*Math.sin(a-.6),col,w);line(x2,y2,x2-20*Math.cos(a+.6),y2-20*Math.sin(a+.6),col,w)}
function pillLabel(s,x,y,w=400,fill=C.mint,col=C.teal,size=32){rect(x,y,w,66,22,fill);text(s,x+w/2,y+44,size,col,'center')}
function base(t,section){g.fillStyle=C.cream;g.fillRect(0,0,1080,1920);g.drawImage(logo,64,132,310,310*logo.height/logo.width);text('FARMAKOLOGI',1016,177,27,C.teal,'right');rect(64,105,72,7,4,C.gold);text(section,64,237,27,C.muted);rect(64,1775,952,5,3,'#E1E5DC');rect(64,1775,952*clamp(t/T.duration),5,3,C.teal);text('medcoel.com',1016,1828,29,C.teal,'right',false)}
function title(a,size=65){lines(a,64,325,size)}
function caption(t,web=false){const c=caps.find(c=>t>=c.start&&t<c.end);if(!c)return;
 const y=web?1455:1512;const h=162;rect(54,y,972,h,26,C.navy);
 const sizes=c.lines.map(s=>{g.font='48px "Arial Bold"';return Math.min(48,910/g.measureText(s).width*48)});const sz=Math.min(...sizes);
 for(let i=0;i<c.lines.length;i++)text(c.lines[i],540,y+(c.lines.length===1?99:66+i*61),sz,'#FFFFFF','center');
}
async function drawRaka(t,x=280,y=420,w=620,mode='pain',yaw=.35){
 let s;
 if(mode==='pain'){
  const a=raka('netral','netral',{yaw,gazeY:.55,blink:.15,mouth:{w:12,up:-1,lo:1},browL:{y:1,rot:12},browR:{y:0,rot:-10},armL:{wx:158,wy:542,ex:95,ey:492,front:1},armR:{wx:244,wy:550,ex:315,ey:510,front:1}});
  const b=raka('khawatir','netral',{yaw,blink:.28,browL:{y:2,rot:17},browR:{y:0,rot:-14},mouth:{w:12,up:-3,lo:-1},armL:{wx:89,wy:244,ex:44,ey:365,front:1},armR:{wx:244,wy:550,ex:315,ey:510,front:1}});
  s=lerpState(a,b,ease((t+.12)/1.05));
 }else s=raka(mode==='calm'?'netral':'berpikir','netral',{yaw,gazeY:.15,armL:{wx:154,wy:548,ex:94,ey:500,front:1},armR:{wx:251,wy:550,ex:314,ey:502,front:1}});
 s=idle(s,t);const svg=rakaSvg(s,{outfit:'harian',shadow:false}).replace('viewBox="0 0 400 800"','width="400" height="800" viewBox="0 0 400 800"');
 const im=await loadImage(Buffer.from(svg));g.drawImage(im,x,y,w,w*2);
}
function medicine(x=755,y=1100,w=270,h=150,label='PARASETAMOL',kind='generic'){
 rect(x+8,y+8,w,h,16,'#DCDDD3');rect(x,y,w,h,16,C.paper,C.teal,3);rect(x,y,w,32,14,C.teal);text(label,x+w/2,y+76,kind==='large'?44:29,C.teal,'center');
 text('ikuti aturan pakai',x+w/2,y+118,kind==='large'?32:23,C.navy,'center',false);
}
async function room(t,mode='pain',yaw=.35){
 rect(64,434,952,976,36,'#E7EEE5');
 rect(88,474,238,385,20,'#F9F8EF');line(207,480,207,850,C.line,7);line(94,664,318,664,C.line,7);
 for(let i=0;i<4;i++)rect(860+i*29,525+(i%2)*12,18,140-(i%2)*12,4,[C.teal,C.gold,C.coral,C.navy][i]);line(845,670,1005,670,C.navy,7);
 rect(390,810,370,550,54,'#C6D8CE');
 g.save();g.beginPath();g.rect(64,434,952,816);g.clip();await drawRaka(t,280,420,620,mode,yaw);g.restore();
 // The book, laptop and medicine always stay on the same side of the desk.
 rect(64,1250,952,170,16,'#DBC9AD');rect(64,1250,952,18,5,'#BEA888');
 rect(133,1047,244,175,16,C.navy);rect(146,1060,218,149,8,'#BDD9D0');line(205,1124,309,1124,C.teal,8);line(205,1153,281,1153,C.teal,6);
 pathD('M116 1222H393L418 1254H94Z','#ABB9B3');
 pathD('M431 1221Q484 1200 540 1220Q596 1200 649 1221V1280Q593 1258 540 1280Q485 1258 431 1280Z',C.paper,C.navy,3);line(540,1221,540,1279,C.line,3);
 for(let i=0;i<3;i++){line(448,1233+i*11,521,1229+i*12,C.line,3);line(560,1229+i*12,629,1233+i*11,C.line,3)}
 medicine();
}
function brain(x,y,s=1,alpha=1){g.save();g.translate(x,y);g.scale(s,s);g.globalAlpha*=alpha;
 pathD('M-134 45C-181 22-177-30-145-55C-148-96-106-126-69-118C-45-151-1-146 22-126C64-149 111-125 113-91C159-81 180-43 163-11C190 20 167 67 135 70C115 106 69 119 38 99C0 124-46 111-66 87C-100 102-136 80-134 45Z',C.navy);
 for(const d of ['M-126 -24Q-104 -58-70 -35T-15 -52','M-96 27Q-57-6-28 27T22 31','M-41 -96Q-7-76-14-39','M38-98Q79-80 61-49T98-12','M-4 71Q35 48 65 74','M100 28Q129 4 143 27'])pathD(d,null,'#617A8C',7);
 g.restore();}
function spine(x,y,s=1){g.save();g.translate(x,y);g.scale(s,s);pathD('M-14 0C-9 36 13 72 5 122C1 155-5 193 10 230L-15 234C-30 190-21 152-19 124C-13 77-37 43-39 5Z',C.navy);for(let i=0;i<5;i++){line(-25,30+i*35,-70,52+i*35,C.navy,7);line(-7,30+i*35,39,52+i*35,C.navy,7)}g.restore()}
function head(x=300,y=800,s=1){g.save();g.translate(x,y);g.scale(s,s);
 pathD('M-93 280L-90 160C-167 97-194-20-140-116C-97-201 50-211 127-143C159-113 159-57 168-24L207 29Q215 46 183 51L174 66Q192 94 162 103L157 149Q140 170 92 167L91 280Z','#D8EDE5',C.navy,5);
 brain(-10,-52,.65);pathD('M4 27C24 57 32 102 23 151',null,C.navy,18);dot(146,-40,5,C.navy);g.restore()}
function signalPath(t,x=180,y=835,w=665,level=1){
 pathD(`M${x} ${y}C${x+120} ${y-160} ${x+180} ${y+105} ${x+290} ${y}S${x+510} ${y-95} ${x+w} ${y}`,null,'#D9E2DB',10);
 const count=Math.ceil(5*level);for(let i=0;i<count;i++){const u=((t*.35+i/count)%1);const px=x+w*u;const py=y+Math.sin(u*Math.PI*4)*55*(1-u);dot(px,py,8+9*level,C.gold);}
 arrow(x+w-40,y,x+w+10,y,C.gold,7);
}
function molecule(x,y,alpha=1){g.save();g.globalAlpha=alpha;rect(x-118,y-49,236,98,26,C.paper,C.teal,4);for(const [a,b] of [[-70,0],[-43,-20],[-20,9]]){line(x+a,y+b,x+a+26,y+b-10,C.teal,3);dot(x+a,y+b,8,C.teal)}text('P',x+55,y+15,44,C.teal,'center');g.restore()}
function calendar(x,y,w=820,h=670,n=1){rect(x+8,y+8,w,h,30,'#DDE3D9');rect(x,y,w,h,30,C.paper,C.line,3);rect(x,y,w,88,26,C.teal);text('KALENDER PENGGUNAAN',x+w/2,y+57,Math.min(36,w/23),C.paper,'center');
 const cw=(w-56)/7,ch=(h-134)/5;for(let i=0;i<35;i++){const a=x+28+(i%7)*cw,b=y+112+Math.floor(i/7)*ch;rect(a+3,b+3,cw-10,ch-12,10,'#F0F0E8');if(i<30)text(String(i+1),a+16,b+30,Math.min(24,cw*.24),C.muted,'left',false)}
 const marked=[5,9,12,15,18,21,24,27,29,2,6,10,13,16,19,22,25,28,3,7,11,14,17,20];
 for(let k=0;k<Math.min(marked.length,n);k++){const i=marked[k],a=x+28+i%7*cw,b=y+112+Math.floor(i/7)*ch;const a1=clamp(n-k);g.save();g.globalAlpha=a1;dot(a+cw*.58,b+ch*.55,Math.min(cw,ch)*.28,C.gold);line(a+cw*.44,b+ch*.56,a+cw*.55,b+ch*.67,C.navy,5);line(a+cw*.55,b+ch*.67,a+cw*.76,b+ch*.4,C.navy,5);g.restore()}}
function painMeter(x,y,w,h,t){rect(x,y,w,h,30,C.paper,C.line,3);text('RASA NYERI',x+w/2,y+80,38,C.teal,'center');const v=1-.65*ease((t-22.3)/1.65);for(let i=0;i<5;i++)rect(x+54+i*58,y+320-i*40,38,90+i*40,15,i<Math.ceil(v*5)?C.gold:'#E3E6DC');text('MEREDA',x+w/2,y+h-61,42,C.teal,'center')}
function torso(t){
 g.save();g.translate(540,480);pathD('M-70 0H70L80 66C160 84 237 129 246 234L198 580Q111 624 0 621Q-111 624-198 580L-246 234C-237 129-160 84-80 66Z','#D8EDE5',C.navy,5);
 pathD('M-70 0V55Q0 98 70 55V0',null,C.line,6);line(0,112,0,358,'#9EBDB1',6);
 for(let i=0;i<4;i++){pathD(`M-8 ${143+i*47} Q-134 ${110+i*47} -178 ${186+i*43}`,null,'#AFCABE',7);pathD(`M8 ${143+i*47} Q134 ${110+i*47} 178 ${186+i*43}`,null,'#AFCABE',7)}
 // Anatomical right = viewer left; normal size and no damage animation.
 pathD('M-164 348C-141 315-62 321-10 332C23 331 48 348 58 367C23 395-7 406-32 404C-83 448-140 432-165 398C-175 381-175 366-164 348Z','#CE7564',C.navy,4);
 if(t>=46.54){line(-116,386,-303,418,C.teal,4);text('Hati',-321,432,44,C.teal,'right')}
 g.restore();pillLabel('Dosis berlebihan',298,1176,484,C.paper,C.teal,40);
}
function packageCard(x,y,kind){rect(x+6,y+7,432,468,26,'#DDE3D9');rect(x,y,432,468,26,C.paper,C.teal,4);rect(x,y,432,112,24,kind==='flu'?C.mint:C.teal);text(kind==='flu'?'OBAT FLU':'OBAT NYERI',x+216,y+75,46,kind==='flu'?C.teal:C.paper,'center');text('Komposisi:',x+32,y+198,33,C.muted);rect(x+22,y+235,388,92,20,'#FFF0B4');text('parasetamol',x+216,y+296,45,C.navy,'center');text('Baca label kemasan',x+216,y+410,28,C.teal,'center',false)}
async function education(t,id){
 if(id==='pembuka'){
  base(t,'01  /  KEPALA NYERI');title(['SAKIT KEPALA →','LANGSUNG MINUM OBAT?'],63);
  g.save();g.beginPath();g.rect(0,415,1080,1025);g.clip();const z=1+.25*ease((t-3.82)/2.4);g.translate(846,1162);g.scale(z,z);g.translate(-846,-1162);await room(t,'pain');g.restore();
 }else if(id==='sinyal'){
  base(t,'02  /  SEBELUM OBAT BEKERJA');title(['Ikuti sinyal nyerinya']);rect(64,455,952,966,36,C.paper);
  head(330,830,1.04);dot(170,780,18,C.gold);signalPath(t,170,780,680);brain(830,780,.55);text('Area kepala',122,1205,38,C.teal);text('Pemrosesan nyeri',620,1205,36,C.teal);pillLabel('Sinyal nyeri',348,1312,384,'#FFF0B4',C.navy,38);
 }else if(id==='ssp'){
  base(t,'03  /  FARMAKODINAMIK');title(['Bagaimana nyeri mereda?'],63);rect(64,455,952,966,36,C.paper);
  brain(569,765,1.28);spine(568,892,.95);
  const k=ease((t-10.36)/1.04);molecule(170+235*k,543,clamp((t-10.36)*2));if(t<12.9)text('Parasetamol',170+235*k,624,32,C.teal,'center');
  const lev=1-.72*ease((t-11.4)/1.4);signalPath(t,160,1088,700,lev);
  if(t>=11.4)pillLabel('Sistem saraf pusat',273,1182,534,C.mint,C.teal,42);
  pillLabel('Sinyal nyeri',377,1320,326,'#FFF0B4',C.navy,36);
  if(t>=12.9){rect(185,470,710,94,28,C.navy);text('Mekanismenya kompleks',540,532,43,C.paper,'center')}
 }else if(id==='prostaglandin'){
  base(t,'03  /  FARMAKODINAMIK');title(['Salah satu jalur','yang dipelajari'],64);rect(64,498,952,923,36,C.paper);
  brain(315,772,.9);spine(321,869,.62);molecule(315,1125);text('Parasetamol',315,1240,39,C.teal,'center');
  arrow(522,817,601,817,C.teal,6);const n=8-5*ease((t-17.88)/2.8);
  for(let i=0;i<8;i++){const a=clamp(n-i);g.save();g.globalAlpha=a;const x=670+i%2*148,y=652+Math.floor(i/2)*120;dot(x,y,40,C.coral);text('PG',x,y+12,27,C.paper,'center');g.restore()}
  if(t>=17.88){text('Prostaglandin',753,1225,43,C.teal,'center');text('Pembentukan berkurang',753,1284,28,C.muted,'center',false)}
 }else if(id==='gejala'){
  base(t,'04  /  GEJALA DAN PENYEBAB');title(['Rasa sakit bisa mereda']);painMeter(64,515,454,580,t);
  rect(542,515,474,580,30,C.paper,C.line,3);lines(['PENYEBAB','SAKIT KEPALA'],779,595,34,C.teal,'center');text('?',779,944,250,C.navy,'center');text('BELUM TENTU HILANG',779,1043,30,C.muted,'center');
  lines(['Nyeri mereda ≠','penyebab selesai'],540,1255,67,C.navy,'center');
 }else if(id==='sesekali'){
  base(t,'05  /  PEMAKAIAN SESEKALI');title(['Sesekali, sesuai aturan'],66);await room(t-27.8,'calm',0);
  calendar(82,502,330,350,1);rect(92,1335,896,85,25,C.paper);text('Ikuti aturan pakai pada kemasan',540,1391,43,C.teal,'center');
 }else if(id==='sering'||id==='berlebihan'){
  base(t,'06  /  PERHATIKAN FREKUENSI');title(id==='sering'?['Sering membutuhkannya?']:['Penggunaan terlalu sering'],64);
  const n=1+21*ease((t-34.76)/6);calendar(129,477,822,680,n);
  if(t>=36.18)lines(['Sering butuh obat?','Cari penyebabnya.'],540,1266,60,C.teal,'center');
 }else if(id==='hati'){
  base(t,'07  /  RISIKO DOSIS BERLEBIHAN');title(['Terlalu banyak parasetamol'],62);torso(t);
  if(t>=46.54)text('Risiko pada hati',540,1355,51,C.teal,'center');
 }else if(id==='kandungan'){
  base(t,'07  /  CEK KANDUNGAN OBAT');title(['Cek kandungan obat'],68);packageCard(78,650,'nyeri');packageCard(568,650,'flu');
  if(t>=50.48){line(294,1125,294,1210,C.teal,6);line(784,1125,784,1210,C.teal,6);line(294,1210,784,1210,C.teal,6);pillLabel('Kandungannya bisa sama',173,1250,734,C.mint,C.teal,43)}
 }else if(id==='bantuan'){
  base(t,'08  /  KAPAN PERLU BANTUAN');title(['Kenali tanda penting'],68);await room(t-52.26,'calm',.35);
  g.fillStyle='rgba(245,241,230,.55)';g.fillRect(64,1030,952,390);
  if(t>=53.58){rect(85,1050,910,124,28,C.paper,C.teal,3);text('Mendadak sangat berat',540,1130,49,C.navy,'center')}
  if(t>=55.36){rect(85,1195,910,124,28,C.paper,C.teal,3);text('Disertai kelemahan tubuh',540,1275,49,C.navy,'center')}
  if(t>=56.9)text('Segera cari bantuan medis',540,1407,47,C.teal,'center');
 }
 caption(t);
}
async function outro(t,id){const c=T.outro.clips.find(c=>c.id===id);const n=Math.floor((t-c.start)*30+.002)+1;const im=await loadImage(path.join(cache,c.id,String(Math.max(1,n)).padStart(4,'0')+'.jpg'));
 base(t,'09  /  BELAJAR BERSAMA MEDCOEL');const labels={materi:'Materi FK per bab',soal:'Latihan soal + pembahasan',simulasi:'Coba Simulasi Dokter'};text(labels[id],64,326,id==='soal'?57:68);
 // Native portrait footage at 92.6% frame width. No pixel filter or speed-up.
 rect(32,374,1016,1046,28,C.mint);g.save();g.beginPath();g.roundRect(40,382,1000,1030,22);g.clip();
 // Move crop vertically only; preserve the source aspect ratio.
 const dh=1229.167;let sy=0;if(id==='soal')sy=clamp((t-c.start-1)/1.2)*145;
 if(id==='simulasi')sy=90;
 g.drawImage(im,40,382-sy,1000,dh);g.restore();
 text('Rekaman demo • data uji lokal',540,1439,25,C.teal,'center',false);
 caption(t,true);
 if(t>=T.outro.ctaStart){rect(54,1640,972,102,26,C.teal);text('Belajar FK gratis',84,1705,35,C.paper);text('medcoel.com',984,1708,58,C.gold,'right')}
}
async function frame(t){const s=T.shots.find(s=>t+1e-7>=s.start&&t+1e-7<s.end)||T.shots.at(-1);if(['materi','soal','simulasi'].includes(s.id))await outro(t,s.id);else await education(t,s.id)}
async function cover(){base(0,'MEDCOEL  /  NYERI KEPALA');title(['SAKIT KEPALA','OBATNYA BEKERJA','DI MANA?'],76);pillLabel('Farmakodinamik parasetamol',64,560,780,C.mint,C.teal,38);g.save();g.beginPath();g.rect(0,650,1080,830);g.clip();await drawRaka(0,250,689,620,'thought',-.3);g.restore();rect(40,1680,1000,240,0,C.cream);rect(64,1480,952,187,28,C.navy);lines(['Nyeri mereda ≠','penyebab selesai'],108,1554,58,C.paper);text('medcoel.com',540,1740,48,C.teal,'center');fs.writeFileSync(path.join(out,'medcoel-parasetamol-cover.png'),canvas.toBuffer('image/png'))}
await cover();
if(process.argv.includes('--cover'))process.exit(0);
for(const c of T.outro.clips){const dir=path.join(cache,c.id);fs.mkdirSync(dir,{recursive:true});const count=Math.ceil((c.end-c.start)*30-.001);if(!fs.existsSync(path.join(dir,String(count).padStart(4,'0')+'.jpg'))){const p=spawnSync(ff,['-v','error','-ss',String(c.sourceStart),'-i',path.join(ROOT,c.source),'-t',String((c.end-c.start)+.067),'-vf','fps=30','-q:v','2','-y',path.join(dir,'%04d.jpg')],{stdio:'inherit'});if(p.status)throw Error('Footage extraction failed')}}
const qa=[];for(const s of T.shots){const a=Math.ceil(s.start*30-.00001),b=Math.ceil(s.end*30-.00001)-1;for(const [tag,f]of [['awal',a],['tengah',Math.round((a+b)/2)],['akhir',b]])qa.push({id:s.id,tag,f,time:f/30})}fs.writeFileSync(path.join(out,'qa-index.json'),JSON.stringify(qa,null,2));
if(process.argv.includes('--stills')){for(const q of qa){await frame(q.time);fs.writeFileSync(path.join(out,`shot-${q.id}-${q.tag}.png`),canvas.toBuffer('image/png'))}console.log('All shot stills rendered');process.exit(0)}
const video=path.join(out,'picture.mp4');const p=spawn(ff,['-hide_banner','-loglevel','warning','-y','-f','rawvideo','-pixel_format','rgba','-video_size','1080x1920','-framerate','30','-i','-','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',video],{stdio:['pipe','inherit','inherit']});
for(let f=0;f<Math.round(T.duration*30);f++){await frame(f/30);if(!p.stdin.write(canvas.data()))await once(p.stdin,'drain');for(const q of qa.filter(q=>q.f===f))fs.writeFileSync(path.join(out,`shot-${q.id}-${q.tag}.png`),canvas.toBuffer('image/png'));if(f%120===0)console.log(`Frame ${f}/${Math.round(T.duration*30)}`)}p.stdin.end();const [code]=await once(p,'close');if(code)throw Error('Encoding failed');
const mux=spawnSync(ff,['-v','error','-y','-i',video,'-i',path.join(ROOT,T.audio),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-t',String(T.duration),'-movflags','+faststart',path.join(out,'MEDCOEL-parasetamol-FINAL.mp4')],{stdio:'inherit'});if(mux.status)throw Error('Mux failed');console.log('Final render and audio mux complete.');
