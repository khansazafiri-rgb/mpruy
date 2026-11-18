import fs from 'node:fs';import path from 'node:path';import {createRequire}from'node:module';import{fileURLToPath}from'node:url';import{spawn,spawnSync}from'node:child_process';import{once}from'node:events';import{createHash}from'node:crypto';
const require=createRequire(import.meta.url),{createCanvas,loadImage,GlobalFonts,Path2D}=require('@napi-rs/canvas');
const R=path.dirname(fileURLToPath(import.meta.url)),T=JSON.parse(fs.readFileSync(path.join(R,'timeline.json'))),CAP=JSON.parse(fs.readFileSync(path.join(R,'captions.json'))),OUT=path.resolve(R,process.env.OUTPUT_DIR||'out'),CACHE=path.join(R,'.cache');fs.mkdirSync(OUT,{recursive:true});fs.mkdirSync(CACHE,{recursive:true});const FF=process.env.FFMPEG||'ffmpeg';
for(const[p,n]of[['/System/Library/Fonts/Supplemental/Arial.ttf','Arial'],['/System/Library/Fonts/Supplemental/Arial Bold.ttf','Arial Bold']])if(fs.existsSync(p))GlobalFonts.registerFromPath(p,n);
const C={bg:'#101B2C',card:'#18283D',white:'#F8FAFC',muted:'#ACBBD0',ct:'#55DDEC',mr:'#C6ABFF',line:'#354760',green:'#017162',gold:'#FBC23A'};
const cv=createCanvas(1080,1920),g=cv.getContext('2d'),ct=await loadImage(path.join(R,'assets/ct.png')),mr=await loadImage(path.join(R,'assets/mri-t2.png')),logo=await loadImage(path.join(R,'assets/logo-full.webp'));
const clamp=(a,l=0,h=1)=>Math.max(l,Math.min(h,a)),ease=a=>{a=clamp(a);return a*a*(3-2*a)};
function rect(x,y,w,h,r,f,s=null,l=4){g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=f;g.fill();if(s){g.strokeStyle=s;g.lineWidth=l;g.stroke()}}
function txt(s,x,y,z=44,c=C.white,a='left',b=true){g.font=`${z}px "${b?'Arial Bold':'Arial'}"`;g.fillStyle=c;g.textAlign=a;g.fillText(s,x,y)}
function lines(a,x,y,z=62,c=C.white,align='left',gap=1.2){a.forEach((s,i)=>txt(s,x,y+i*z*gap,z,c,align))}
function pd(d,f,s=null,w=5){const p=new Path2D(d);if(f){g.fillStyle=f;g.fill(p)}if(s){g.strokeStyle=s;g.lineWidth=w;g.lineJoin='round';g.lineCap='round';g.stroke(p)}}
function line(x,y,a,b,c=C.white,w=5){g.beginPath();g.moveTo(x,y);g.lineTo(a,b);g.strokeStyle=c;g.lineWidth=w;g.lineCap='round';g.stroke()}
function dot(x,y,r,c){g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fillStyle=c;g.fill()}
function ellipse(x,y,rx,ry,fill,stroke=null,w=5){g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=w;g.stroke()}}
function arrow(x,y,a,b,c=C.white,w=5){line(x,y,a,b,c,w);const z=Math.atan2(b-y,a-x);line(a,b,a-17*Math.cos(z-.6),b-17*Math.sin(z-.6),c,w);line(a,b,a-17*Math.cos(z+.6),b-17*Math.sin(z+.6),c,w)}
function base(t,k){g.fillStyle=C.bg;g.fillRect(0,0,1080,1920);txt(k,64,145,27,C.muted);rect(64,1748,952,4,2,C.line);rect(64,1748,952*t/T.duration,4,2,C.ct)}
function heading(a,z=66){lines(a,64,242,z)}
function caption(t,web=false){const c=CAP.find(c=>t>=c.start&&t<c.end);if(!c)return;const y=web?1470:1510;rect(52,y,976,164,24,'#F8FAFC');let z=47;for(const s of c.lines){g.font='47px "Arial Bold"';z=Math.min(z,918/g.measureText(s).width*47)}c.lines.forEach((s,i)=>txt(s,540,y+(c.lines.length===1?100:66+i*60),z,C.bg,'center'))}
function pill(s,x,y,w,col=C.ct,z=34){rect(x,y,w,62,20,C.card,col,3);txt(s,x+w/2,y+42,z,col,'center')}
function imageBox(im,x,y,w,h,zoom=1,col=C.ct){rect(x,y,w,h,24,'#000000',col,4);const sc=Math.min((w-24)/im.width,(h-24)/im.height)*zoom,dw=im.width*sc,dh=im.height*sc,dx=x+(w-dw)/2,dy=y+(h-dh)/2;g.save();g.beginPath();g.roundRect(x+3,y+3,w-6,h-6,20);g.clip();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(im,dx,dy,dw,dh);g.restore();return{x:dx,y:dy,w:dw,h:dh}}
function roi(b,u,v,col,r=22){const x=b.x+b.w*u,y=b.y+b.h*v;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.strokeStyle=col;g.lineWidth=5;g.stroke();return{x,y}}
function credit(which='both'){if(which==='ct')txt('CT: Mikael Häggström • CC0 1.0',540,1424,27,C.muted,'center',false);else if(which==='mr'){txt('MRI T2: Sean Novak • CC BY-SA 4.0',540,1390,27,C.muted,'center',false);txt('creativecommons.org/licenses/by-sa/4.0',540,1430,25,C.muted,'center',false)}else{txt('CT: Mikael Häggström · CC0',540,1390,26,C.muted,'center',false);txt('MRI: Sean Novak · CC BY-SA 4.0 · kredit lengkap di proyek',540,1430,25,C.muted,'center',false)}}
function pair(t,focus=null,zoom=1,small=false){const y=small?408:405,h=small?580:685;txt('CT TANPA KONTRAS',286,365,33,C.ct,'center');txt('MRI T2',794,365,38,C.mr,'center');const a=imageBox(ct,52,y,466,h,zoom,C.ct),b=imageBox(mr,562,y,466,h,zoom,C.mr);txt('Contoh CT',286,y+h+51,32,C.ct,'center');txt('Contoh MRI T2',794,y+h+51,32,C.mr,'center');
 if(focus==='bone'){roi(a,.12,.5,C.ct);roi(b,.07,.5,C.mr);txt('Tampak terang',286,y+h+105,37,C.ct,'center');txt('Tampak gelap',794,y+h+105,37,C.mr,'center')}
 if(focus==='csf'){roi(a,.51,.43,C.ct);roi(b,.52,.38,C.mr);txt('Cairan lebih gelap',286,y+h+105,34,C.ct,'center');txt('Cairan terang',794,y+h+105,37,C.mr,'center')}
 return[a,b]}
function patient(){
 // Same stationary patient geometry and foreshortened table in both scanner shots.
 pd('M409 794L518 770L895 1098L777 1150Z','#CDD8E2',C.line,4);pd('M777 1150L895 1098L895 1130L777 1184Z','#8399AD');pd('M704 1064L769 1042V1276L704 1296Z','#6E859B');
 pd('M453 804L513 802L633 920L581 959L490 899Z','#55A6A3');pd('M579 950L632 917L754 1038L732 1068L655 1004L639 1019L708 1091L678 1112L578 1008Z','#53697F');
 line(495,843,596,955,'#9BBFC2',22);line(468,860,553,971,'#9BBFC2',22);ellipse(451,779,37,46,'#D4B6A2');pd('M416 773Q418 728 454 732Q491 734 488 769Q458 752 416 773Z','#536073');
}
function scanner(t,type){const col=type==='CT'?C.ct:C.mr;
 rect(62,382,956,1026,30,C.card);
 const d=type==='CT'?75:148;
 ellipse(443+d,737-d*.42,285,310,'#52697E');pd(`M158 737L${158+d} ${737-d*.42}L${728+d} ${737-d*.42}L728 737Z`,'#71899E');
 ellipse(443,737,285,310,'#C9D8E4');ellipse(443,737,221,252,'#819AAE');ellipse(443,737,151,189,C.bg);ellipse(443+d*.6,737-d*.25,107,160,'#22354C');ellipse(443,737,143,181,C.bg);
 txt(type,443,495,52,C.bg,'center');patient();
 if(type==='CT'){
  const a=(t-9.94)*.8-.7,s={x:443+234*Math.cos(a),y:737+267*Math.sin(a)},q={x:443-234*Math.cos(a),y:737-267*Math.sin(a)};
  if(t>=9.94){g.save();g.globalAlpha=.7;for(const k of[-.07,0,.07])line(s.x,s.y,443-234*Math.cos(a+k),737-267*Math.sin(a+k),col,2);g.restore();dot(s.x,s.y,17,col);rect(q.x-19,q.y-27,38,54,8,col);}
  txt('CT',860,561,31,col,'center');imageBox(ct,772,597,184,238,1,col);txt('Data → irisan',863,879,25,C.white,'center');
  pill('Sumber + detektor berputar',174,1284,734,col,35);
 }else{
  if(t>=23.26){g.save();g.globalAlpha=.5;for(const n of[0,1,2]){g.setLineDash([24,14]);g.lineDashOffset=-(t*30+n*15);ellipse(442,737,310+n*19,337+n*14,null,col,3)}g.restore()}
  if(t>=24&&t<25.2){g.save();g.globalAlpha=1-clamp((t-24)/1.2);ellipse(443,737,130+70*(t-24),160+85*(t-24),null,col,7);g.restore()}
  rect(88,1157,904,224,22,C.bg,col,3);txt('Proton hidrogen • model konseptual',540,1204,31,col,'center');
  const k=ease((t-24)/.7);for(let i=0;i<7;i++){const x=157+i*88,y=1280;dot(x,y,7,col);const a=-Math.PI/2+k*(.8+Math.sin(t*3+i)*.25);arrow(x,y,x+Math.cos(a)*36,y+Math.sin(a)*36,col,4)}
  if(t>=25.32){let d='';for(let i=0;i<90;i++){const x=770+i*1.6,y=1278+Math.sin(i*.3-t*7)*18;d+=(i?'L':'M')+x+' '+y}pd(d,null,col,4);txt('Sinyal',850,1341,28,col,'center')}
  txt(t>=24?'Magnet + pulsa radio':'Medan magnet',540,1097,41,col,'center');
 }
}
async function scene(t,id){
 const chapter={hook:'DUA CARA MELIHAT TUBUH','ct-scanner':'01 / CT SCAN','ct-image':'01 / CT TANPA KONTRAS','mri-scanner':'02 / MRI',sekuens:'02 / SEKUENS MRI','mri-image':'02 / CONTOH MRI T2','banding-tulang':'03 / BANDINGKAN SENDIRI','banding-cairan':'03 / BANDINGKAN SENDIRI',mekanisme:'03 / SUMBER KONTRAS',klinis:'04 / PERTANYAAN KLINIS'};
 base(t,chapter[id]||'MEDCOEL / BELAJAR FK');
 if(id==='hook'){heading(['KENAPA CT DAN MRI','TERLIHAT BEDA?']);pair(t,null,1.16-.16*ease((t+.03)/1.4));txt('Contoh berbeda orang • potongan aksial',540,1283,31,C.muted,'center');credit();}
 if(id==='ct-scanner'){heading(['Sinar-X dari banyak arah']);scanner(t,'CT');}
 if(id==='ct-image'){heading(['Perbedaan penyerapan','sinar-X'],63);pill('CT TANPA KONTRAS',278,360,524,C.ct,34);const b=imageBox(ct,219,450,642,758,1+.055*ease((t-13.56)/5),C.ct);if(t>=17.7){const p=roi(b,.12,.5,C.ct,24);line(p.x,p.y,138,1235,C.ct,4);txt('Tulang tengkorak',156,1283,47,C.ct)}lines(['Lebih banyak sinar-X ditahan','→ tampak lebih terang'],540,1329,34,C.white,'center',1.08);credit('ct');}
 if(id==='mri-scanner'){heading(['Sumber sinyal berbeda']);scanner(t,'MRI');}
 if(id==='sekuens'){heading(['Sekuens memengaruhi','tampilan MRI'],64);imageBox(mr,310,455,460,576,1,C.mr);for(const[i,s]of['T1','T2','FLAIR'].entries())pill(s,89+i*315,1124,274,s==='T2'?C.mr:C.muted,47);txt('Contoh yang dipakai: MRI T2',540,1290,40,C.mr,'center');credit('mr');}
 if(id==='mri-image'){heading(['Perhatikan cairan','dan tulangnya'],64);pill('MRI T2',390,360,300,C.mr,38);const b=imageBox(mr,219,450,642,758,1,C.mr);if(t>=34.72){roi(b,.52,.38,C.mr,24);txt('Cairan tampak terang',540,1275,45,C.mr,'center')}if(t>=36.26){roi(b,.07,.5,C.mr,24);txt('Tulang tampak gelap',540,1336,41,C.white,'center')}credit('mr');}
 if(id==='banding-tulang'||id==='banding-cairan'){heading(['Gambar berbeda,','anatomi tetap dikenali'],62);pair(t,id==='banding-tulang'?'bone':'csf',1);pill(id==='banding-tulang'?'TENGKORAK':'CAIRAN (CSF)',310,1274,460,C.white,37);credit();}
 if(id==='mekanisme'){heading(['Cara membuat gambar','yang berbeda'],64);pair(t,null,1,true);lines(['Sinar-X','↓','Perbedaan penyerapan'],286,1088,34,C.ct,'center',1.15);lines(['Magnet + radio','↓','Perbedaan sinyal jaringan'],794,1088,34,C.mr,'center',1.15);credit();}
 if(id==='klinis'){heading(['Untuk pertanyaan','klinis yang berbeda'],64);rect(125,511,360,180,24,C.card,C.ct);rect(595,511,360,180,24,C.card,C.mr);txt('CT',305,632,72,C.ct,'center');txt('MRI',775,632,72,C.mr,'center');txt('Dipilih sesuai kebutuhan klinis',540,801,46,C.white,'center');lines(['Anatominya tidak berubah.','Cara membuat gambarnya berbeda.'],540,1132,48,C.white,'center');}
 if(['materi','soal','lab'].includes(id)){const c=T.web.find(c=>c.id===id),n=Math.max(1,Math.floor((t-c.start)*30+.002)+1),im=await loadImage(path.join(CACHE,id,String(n).padStart(4,'0')+'.jpg'));rect(64,105,365,90,18,C.white);g.drawImage(logo,83,126,326,326*logo.height/logo.width);const labels={materi:['Materi FK per bab'],soal:['Latihan soal + pembahasan'],lab:['Eksplorasi simulasi','CT & USG']};lines(labels[id],64,277,id==='lab'?57:id==='soal'?57:68,C.white,'left',1.08);
  rect(32,398,1016,1027,24,C.line);g.save();g.beginPath();g.roundRect(40,406,1000,1011,19);g.clip();const pan=id==='soal'?145*ease((t-c.start-1)/1.2):0;g.drawImage(im,40,406-pan,1000,1000*im.height/im.width);g.restore();
  if(id==='lab'){rect(53,1387,974,65,15,C.bg,C.mr,2);txt('Simulasi edukatif, bukan alat diagnosis',540,1430,32,C.white,'center');txt('BodyParts3D / Z-Anatomy · CC BY-SA 4.0',540,1825,23,C.muted,'center',false)}else txt('Rekaman demo • data uji lokal',540,1450,25,C.muted,'center',false);
  caption(t,true);if(t>=T.ctaStart){rect(52,1650,976,140,23,C.white);txt('Belajar FK gratis',85,1738,41,C.green);txt('medcoel.com',993,1740,62,C.green,'right')}return;
 }
 caption(t);
}
async function cover(){base(0,'MEDCOEL / EDUKASI RADIOLOGI');heading(['KENAPA CT & MRI','TERLIHAT BEDA?'],69);pair(0,null,1);pill('Sinar-X',116,1222,341,C.ct,42);pill('Magnet + radio',600,1222,407,C.mr,38);credit();rect(52,1510,976,190,24,C.white);lines(['Anatominya tidak berubah.','Cara membuat gambarnya berbeda.'],540,1587,43,C.bg,'center');txt('medcoel.com',540,1798,48,C.white,'center');fs.writeFileSync(path.join(OUT,'MEDCOEL-CT-MRI-cover.png'),cv.toBuffer('image/png'))}
await cover();if(process.argv.includes('--cover'))process.exit(0);
for(const c of T.web){const dir=path.join(CACHE,c.id);fs.mkdirSync(dir,{recursive:true});const count=Math.ceil((c.end-c.start)*30-.001),sig=createHash('sha256').update(fs.readFileSync(path.join(R,c.source))).update(JSON.stringify(c)).digest('hex'),stamp=path.join(dir,'source.sha256');if(!fs.existsSync(path.join(dir,String(count).padStart(4,'0')+'.jpg'))||!fs.existsSync(stamp)||fs.readFileSync(stamp,'utf8')!==sig){const r=spawnSync(FF,['-v','error','-y','-ss',String(c.sourceStart),'-i',path.join(R,c.source),'-t',String(c.end-c.start+.07),'-vf','fps=30','-q:v','2',path.join(dir,'%04d.jpg')],{stdio:'inherit'});if(r.status)throw Error('Footage extraction failed');fs.writeFileSync(stamp,sig)}}
const qa=[];for(const s of T.shots){const a=Math.ceil(s.start*30-1e-6),b=Math.ceil(s.end*30-1e-6)-1;for(const[tag,f]of[['awal',a],['tengah',Math.round((a+b)/2)],['akhir',b]])qa.push({id:s.id,tag,f,time:f/30})}fs.writeFileSync(path.join(OUT,'qa-index.json'),JSON.stringify(qa,null,2));
async function frame(t){const s=T.shots.find(s=>t+1e-7>=s.start&&t+1e-7<s.end)||T.shots.at(-1);await scene(t,s.id)}
if(process.argv.includes('--stills')){for(const q of qa){await frame(q.time);fs.writeFileSync(path.join(OUT,`shot-${q.id}-${q.tag}.png`),cv.toBuffer('image/png'))}console.log('Rendered all 39 shot review frames');process.exit(0)}
const pic=path.join(OUT,'picture.mp4'),p=spawn(FF,['-v','warning','-y','-f','rawvideo','-pixel_format','rgba','-video_size','1080x1920','-framerate','30','-i','-','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',pic],{stdio:['pipe','inherit','inherit']});for(let f=0;f<2289;f++){await frame(f/30);if(!p.stdin.write(cv.data()))await once(p.stdin,'drain');for(const q of qa.filter(q=>q.f===f))fs.writeFileSync(path.join(OUT,`shot-${q.id}-${q.tag}.png`),cv.toBuffer('image/png'));if(f%150===0)console.log('Frame',f,'/2289')}p.stdin.end();if((await once(p,'close'))[0])throw Error('Encode failed');const mux=spawnSync(FF,['-v','error','-y','-i',pic,'-i',path.join(R,'audio/narasi-timeline.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-t','76.3','-movflags','+faststart',path.join(OUT,'MEDCOEL-CT-MRI-FINAL.mp4')],{stdio:'inherit'});if(mux.status)throw Error('Mux failed');console.log('Render complete.');
