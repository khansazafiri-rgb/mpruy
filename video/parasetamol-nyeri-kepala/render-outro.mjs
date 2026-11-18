import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { raka, rakaSvg } from './brand/characters/raka/raka.js';
const require=createRequire(import.meta.url);
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
const root=path.dirname(fileURLToPath(import.meta.url));
const cfg=JSON.parse(fs.readFileSync(path.join(root,'timeline.json')));
const ff=process.env.FFMPEG || 'ffmpeg';
const out=path.resolve(root,process.env.OUTPUT_DIR || 'out');
const cache=path.join(root,'.cache'); fs.mkdirSync(out,{recursive:true});fs.mkdirSync(cache,{recursive:true});
for(const [p,n] of [['/System/Library/Fonts/Supplemental/Arial.ttf','Arial'],['/System/Library/Fonts/Supplemental/Arial Bold.ttf','Arial Bold']]) if(fs.existsSync(p)) GlobalFonts.registerFromPath(p,n);
const C={cream:'#F5F1E6',navy:'#212739',teal:'#017162',mint:'#D8EDE5',gold:'#FBC23A',coral:'#F2735E'};
const canvas=createCanvas(1080,1920),g=canvas.getContext('2d');
const logo=await loadImage(path.join(root,'assets/logo-full.webp'));
function rect(x,y,w,h,r,fill){g.fillStyle=fill;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();}
function text(s,x,y,size=40,col=C.navy,align='left',bold=true){g.fillStyle=col;g.font=`${size}px "${bold?'Arial Bold':'Arial'}"`;g.textAlign=align;g.fillText(s,x,y);}
function brand(){g.drawImage(logo,64,147,370,370*logo.height/logo.width);text('BELAJAR FK',1016,192,26,C.teal,'right');}
function base(){g.fillStyle=C.cream;g.fillRect(0,0,1080,1920);rect(64,116,72,7,4,C.gold);brand();}
function footer(){text('Rekaman demo • data uji lokal',540,1646,28,C.teal,'center',false);}
async function cover(){
 base();text('SAKIT KEPALA',64,418,86);text('OBATNYA BEKERJA',64,518,64);text('DI MANA?',64,605,86,C.teal);
 rect(64,658,586,66,22,C.mint);text('Farmakodinamik parasetamol',88,703,32,C.teal);
 const s=raka('berpikir',null,{yaw:-0.3,gazeX:-0.4});const svg=rakaSvg(s,{outfit:'harian'}).replace('viewBox="0 0 400 800"','width="400" height="800" viewBox="0 0 400 800"');const im=await loadImage(Buffer.from(svg));g.drawImage(im,260,738,600,1200);
 rect(64,1520,952,185,28,C.navy);text('Nyeri mereda ≠',105,1593,56,'white');text('penyebab selesai',105,1662,56,C.gold);
 rect(52,1750,976,70,20,C.cream);text('DRAF • MENUNGGU NARASI PARASETAMOL',540,1795,28,C.teal,'center');
 fs.writeFileSync(path.join(out,'cover-DRAF.png'),canvas.toBuffer('image/png'));
}
await cover();if(process.argv.includes('--cover'))process.exit(0);
for(const c of cfg.outro.clips){
 const dir=path.join(cache,c.id);fs.mkdirSync(dir,{recursive:true});
 const r=spawnSync(ff,['-v','error','-ss',String(c.sourceStart),'-i',path.join(root,c.source),'-t',String(c.end-c.start),'-vf','fps=30','-q:v','2','-y',path.join(dir,'%04d.jpg')],{stdio:'inherit'});if(r.status!==0)throw Error('Ekstraksi footage gagal');
}
const enc=spawn(ff,['-hide_banner','-loglevel','warning','-y','-f','rawvideo','-pixel_format','rgba','-video_size','1080x1920','-framerate','30','-i','-','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,'outro-20s-DRAF-tanpa-narasi.mp4')],{stdio:['pipe','inherit','inherit']});
for(let f=0;f<600;f++){
 const t=f/30,c=cfg.outro.clips.find(c=>t>=c.start&&t<c.end);
 const n=Math.floor((t-c.start)*30+0.001)+1;
 const im=await loadImage(path.join(cache,c.id,`${String(n).padStart(4,'0')}.jpg`));
 base();text(c.label,64,298,c.id==='soal'?57:68,C.navy);
 rect(32,352,1016,1245,28,C.mint);
 g.save();g.beginPath();g.roundRect(40,360,1000,1229,22);g.clip();g.drawImage(im,40,360,1000,1229);g.restore();
 footer();
 if(t>=16.5){rect(48,1673,984,192,28,C.teal);text('Belajar FK gratis',540,1745,49,'white','center');text('medcoel.com',540,1820,68,C.gold,'center');}
 else {text('medcoel.com',540,1768,54,C.teal,'center');text('DRAF VISUAL • NARASI MENYUSUL',540,1836,24,C.teal,'center');}
 if(!enc.stdin.write(canvas.data()))await once(enc.stdin,'drain');
 if([0,97,194,195,292,389,390,494,599].includes(f))fs.writeFileSync(path.join(out,`qa-${String(f).padStart(3,'0')}.png`),canvas.toBuffer('image/png'));
 if(f%60===0)console.log(`${f}/600`);
}
enc.stdin.end();const [code]=await once(enc,'close');if(code!==0)throw Error('Encode gagal');console.log('Render outro selesai: 20 detik, 1080×1920, 30 fps; tanpa audio.');
