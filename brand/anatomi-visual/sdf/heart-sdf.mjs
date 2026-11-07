// Prototipe jantung dengan SDF (signed distance field) + raymarching di fragment shader (WebGL2).
// Bentuk jantung adalah gabungan halus (smooth-union) beberapa elipsoid, sehingga sambungan badan dengan atrium dan
// pembuluh besar menyatu otomatis. Pembuluh besar adalah rantai kapsul 3D yang juga disatukan dengan badan.
// Arteri koroner, vena kardiak besar, dan lemak di alur adalah "decal" 2D yang menempel di permukaan lewat bidang tinggi
// (heightfield), sehingga normalnya ikut berubah dan pencahayaan mengikuti permukaan tanpa menambah cabang acak.
// Cahaya: kunci dari kiri atas, rim magenta, AO dan bayangan lembut dihitung dari SDF yang sama.
import { ARTERIES, VEIN_GCV, VESSELS, densify, cumulative, fatCircles } from './paths.mjs';

const f = (n) => { const t = String(+n.toFixed(3)); return /[.e]/.test(t) ? t : t + '.0'; };   // selalu literal float untuk GLSL
const v2 = (p) => `vec2(${f(p[0])},${f(p[1])})`;
const v3 = (p) => `vec3(${f(p[0])},${f(p[1])},${f(p[2])})`;

function arr2(name, poly) { return `const vec2 ${name}[${poly.length}] = vec2[${poly.length}](${poly.map(v2).join(',')});`; }
function arrF(name, a) { return `const float ${name}[${a.length}] = float[${a.length}](${a.map(f).join(',')});`; }

// fungsi jarak 2D ke polyline: mengembalikan (jarak, parameter panjang busur)
function polyFn(name, poly) {
  const cum = cumulative(poly);
  return `${arr2(name + 'P', poly)}\n${arrF(name + 'C', cum)}\nvec2 ${name}(vec2 p){ float best=1e9, par=0.; for(int i=0;i<${poly.length - 1};i++){ vec2 a=${name}P[i], b=${name}P[i+1]; vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); float d=length(pa-ba*h); if(d<best){best=d; par=${name}C[i]+h*length(ba);} } return vec2(best,par); }`;
}

// rantai kapsul 3D (radius meruncing) dengan kotak pembatas. Ujung terpotong (cutStart/cutEnd): rantai diperpanjang lalu dipotong
// bidang miring, dan lumen (lubang) dilubangi dengan silinder. Data ujung potong dikumpulkan di CUTS untuk pewarnaan lumen.
const CUTS = [];
function vesselFn(name, v) {
  const { pts, r0, r1 } = v;
  let poly = densify(pts.map((p) => [p[0], p[1]]), 7);
  const n0 = poly.length, m = pts.length - 1;
  let full = poly.map((p, i) => { const t = (i / (n0 - 1)) * m, k = Math.min(m - 1, Math.floor(t)), u = t - k; return [p[0], p[1], pts[k][2] * (1 - u) + pts[k + 1][2] * u]; });
  const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); };
  const sub = (a, b) => a.map((x, i) => x - b[i]);
  const add = (a, b, s = 1) => a.map((x, i) => x + b[i] * s);
  const cuts = [];
  const mk = (cut, e, dirOut, r, label) => {
    const t = norm(add(dirOut, cut.tilt));
    cuts.push({ e, t, r, rin: r * 0.66 });
    CUTS.push({ e, t, r, rin: r * 0.66 });
  };
  const ext = (r) => r * 2.0;
  if (v.cutEnd) { const e = full[full.length - 1], d = norm(sub(e, full[full.length - 2])); mk(v.cutEnd, e, d, r1); full = [...full, add(e, d, ext(r1))]; }
  if (v.cutStart) { const e = full[0], d = norm(sub(e, full[1])); mk(v.cutStart, e, d, r0); full = [add(e, d, ext(r0)), ...full]; }
  const n = full.length;
  const xs = full.map((p) => p[0]), ys = full.map((p) => p[1]), zs = full.map((p) => p[2]);
  const pad = Math.max(r0, r1) + 4;
  const c = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2];
  const h = [(Math.max(...xs) - Math.min(...xs)) / 2 + pad, (Math.max(...ys) - Math.min(...ys)) / 2 + pad, (Math.max(...zs) - Math.min(...zs)) / 2 + pad];
  let cutCode = '';
  for (const k of cuts) cutCode += `if(length(p-${v3(k.e)})<${f(k.r * 4.2)}){ float s=dot(p-${v3(k.e)},${v3(k.t)}); best=max(best,s); vec3 rv=p-${v3(k.e)}-${v3(k.t)}*s; float cyl=max(length(rv)-${f(k.rin)}, max(s-4.,-s-12.)); best=max(best,-cyl); }\n  `;
  return `const vec3 ${name}P[${n}] = vec3[${n}](${full.map(v3).join(',')});
float ${name}(vec3 p){ vec3 q=abs(p-${v3(c)})-${v3(h)}; float db=length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); if(db>30.) return db;
  float best=1e9; for(int i=0;i<${n - 1};i++){ vec3 a=${name}P[i], b=${name}P[i+1]; vec3 pa=p-a, ba=b-a; float hh=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); float r=mix(${f(r0)},${f(r1)},(float(i)+hh)/${f(n - 1)}); best=min(best,length(pa-ba*hh)-r);}
  ${cutCode}return best; }`;
}

export function buildFragment() {
  const arteryNames = Object.keys(ARTERIES);
  const polys = Object.fromEntries(arteryNames.map((k) => [k, densify(ARTERIES[k].pts, 8)]));
  const gcv = densify(VEIN_GCV.pts, 8);
  const circles = fatCircles();
  let g = '';
  for (const k of arteryNames) g += polyFn('art' + k, polys[k]) + '\n';
  g += polyFn('veinGCV', gcv) + '\n';
  g += `const vec3 FAT[${circles.length}] = vec3[${circles.length}](${circles.map(v3).join(',')});\n`;
  for (const [k, v] of Object.entries(VESSELS)) g += vesselFn('ves' + k, v) + '\n';
  g += `const vec3 CUTE[${CUTS.length}] = vec3[${CUTS.length}](${CUTS.map((c) => v3(c.e)).join(',')});\nconst vec3 CUTT[${CUTS.length}] = vec3[${CUTS.length}](${CUTS.map((c) => v3(c.t)).join(',')});\nconst vec2 CUTR[${CUTS.length}] = vec2[${CUTS.length}](${CUTS.map((c) => v2([c.r, c.rin])).join(',')});\n`;
  const artDecal = arteryNames.map((k) => {
    const a = ARTERIES[k], total = cumulative(polys[k]).slice(-1)[0];
    const band = (k === 'LM') ? '' : `{ float u=q.y/${f(total)}; float lob=0.5+0.5*sin(q.y*0.11+${f(k.length)}*1.7)*0.6+0.22*sin(q.y*0.19+${f(k.length)}*2.3); float Rf=(${k === 'LAD' ? '15.' : '20.'}+${k === 'LAD' ? '6.' : '9.'}*lob)*(1.-0.55*smoothstep(0.55,1.,u)); float edge=Rf-q.x; hF=max(hF, sqrt(max(Rf*Rf-q.x*q.x,0.))*(0.26+0.12*lob)); mF=max(mF, smoothstep(-1.5,5.5,edge)); }`;
    return `{ vec2 q=art${k}(p); ${band} float t=q.y/${f(total)}; float r=mix(${f(a.r0)},${f(a.r1)},t)*1.45*(1.-0.5*smoothstep(0.88,1.,t)); hA=max(hA, sqrt(max(r*r-q.x*q.x,0.))*1.0); if(q.x<r){ pulse=0.5+0.5*sin(q.y*0.05-uFlow*6.2832); } mA=max(mA, 1.-smoothstep(r-0.8,r+0.8,q.x)); }`;
  }).join('\n  ');
  const totalGCV = cumulative(gcv).slice(-1)[0];

  return `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uRes; uniform vec2 uTileOrigin;
uniform float uBeat; uniform float uFlow; uniform int uMode; // 0 penuh, 1 badan+decal, 2 pembuluh besar
uniform float uScale; uniform int uView; // 0 akhir, 1 siluet, 2 warna datar, 3 kedalaman
const float PI=3.14159265;
${g}
// ---------- utilitas SDF
float smin(float a,float b,float k){ float h=max(k-abs(a-b),0.)/k; return min(a,b)-h*h*k*0.25; }
vec3 rotZ(vec3 p,float a){ float c=cos(a), s=sin(a); return vec3(c*p.x-s*p.y, s*p.x+c*p.y, p.z); }
float ell(vec3 p,vec3 c,vec3 r,float a){ vec3 q=rotZ(p-c,a); float k0=length(q/r); float k1=length(q/(r*r)); return k0*(k0-1.)/k1; }
// elipsoid yang meruncing ke bawah (apeks): taper = pengurangan lebar di ujung bawah
float ellT(vec3 p,vec3 c,vec3 r,float a,float taper){ vec3 q=rotZ(p-c,a); float ty=clamp(q.y/r.y*0.5+0.5,0.,1.); float sx=1.-taper*smoothstep(0.35,1.,ty); q.x/=sx; float k0=length(q/r); float k1=length(q/(r*r)); return (k0*(k0-1.)/k1)*sx; }
// ---------- aurikula: kanan (melengkung di depan akar aorta) dan kiri (jari melengkung di sisi batang pulmonalis)
float aur(vec3 q){
  float r1=ell(q,vec3(378.,392.,150.),vec3(84.,46.,40.),0.5);
  float r2=ell(q,vec3(428.,360.,148.),vec3(42.,26.,30.),0.9);
  float l1=ell(q,vec3(690.,414.,134.),vec3(68.,40.,38.),-0.5);
  float l2=ell(q,vec3(636.,372.,140.),vec3(50.,24.,28.),-0.8);
  return smin(smin(r1,r2,26.),smin(l1,l2,30.),10.);
}
// ---------- badan jantung: ventrikel, basis, atrium kanan, aurikula
float body(vec3 p){
  float sc=1.+0.03*uBeat;
  vec3 c0=vec3(510.,560.,0.);
  vec3 q=c0+(p-c0)/sc;
  float lv=ellT(q,vec3(552.,652.,-10.),vec3(240.,300.,190.),-0.20,0.68);
  float rv=ell(q,vec3(386.,548.,40.),vec3(158.,192.,140.),0.32);
  float bs=ell(q,vec3(500.,388.,0.),vec3(255.,108.,150.),0.03);
  float d=smin(lv,rv,104.); d=smin(d,bs,70.);
  float ra=ell(q,vec3(298.,372.,26.),vec3(90.,118.,96.),0.);
  d=smin(d,ra,34.);
  d=smin(d,aur(q),30.);
  return d*sc;
}
vec4 vessels(vec3 p){ // x aorta, y arteri paru, z vena, w campuran
  float aorta=smin(vesAORTA(p),min(vesBCT(p),min(vesLCC(p),vesLSA(p))),10.);
  float pa=smin(vesPA(p),smin(vesPAL(p),vesPAR(p),14.),14.);
  float vn=min(vesSVC(p),vesIVC(p));
  return vec4(aorta,pa,vn,0.);
}
// dua keluaran: jarak total dan komponen (untuk bahan)
float mapAll(vec3 p){
  float b=body(p);
  if(uMode==2) b=1e5;
  vec4 v=vessels(p);
  float vd=smin(v.x,smin(v.y,v.z,14.),14.);
  if(uMode==1) return b;
  if(uMode==2) return vd;
  return smin(b,vd,22.);
}
vec3 calcN(vec3 p){ vec2 e=vec2(1.2,0.); return normalize(vec3(mapAll(p+e.xyy)-mapAll(p-e.xyy), mapAll(p+e.yxy)-mapAll(p-e.yxy), mapAll(p+e.yyx)-mapAll(p-e.yyx))); }
// ---------- decal permukaan: lemak, arteri koroner, vena kardiak
struct Decal { float h; float aMask; float fMask; float vMask; float pulse; };
Decal decal(vec2 p){
  Decal D; D.h=0.; D.aMask=0.; D.fMask=0.; D.vMask=0.; D.pulse=0.;
  // lemak: lobulus bulat, tinggi dengan profil bulat
  float hF=0.; float mF=0.;
  for(int i=0;i<${circles.length};i++){ vec3 c=FAT[i]; float d=length(p-c.xy); float r=c.z*0.55; hF=max(hF, sqrt(max(r*r-d*d,0.))*0.30); mF=max(mF, 1.-smoothstep(r-3.0,r+0.5,d)); }
  float hA=0.; float mA=0.; float pulse=0.;
  ${artDecal}
  vec2 qv=veinGCV(p); float tv=qv.y/${f(totalGCV)}; float rv=mix(${f(VEIN_GCV.r0)},${f(VEIN_GCV.r1)},tv);
  rv*=1.4; float hV=sqrt(max(rv*rv-qv.x*qv.x,0.)); float mV=1.-smoothstep(rv-0.8,rv+0.8,qv.x);
  D.h=hF*(1.-mA*0.85)+hA*0.9+hV*0.9; D.aMask=mA; D.fMask=mF; D.vMask=mV; D.pulse=pulse;
  return D;
}
// ---------- cahaya
vec3 LIGHTDIR(){ return normalize(vec3(-0.5,-0.7,0.9)); }
float softShadow(vec3 ro, vec3 rd){ float res=1.; float t=4.; for(int i=0;i<26;i++){ float h=mapAll(ro+rd*t); res=min(res,10.*h/t); t+=clamp(h,3.,26.); if(res<0.002||t>260.) break; } return clamp(res,0.,1.); }
float ao(vec3 p, vec3 n){ float o=0.; float s=1.; for(int i=1;i<=5;i++){ float h=float(i)*13.; float d=mapAll(p+n*h); o+=(h-d)*s; s*=0.68; } return clamp(1.-o*0.012,0.,1.); }
// latar: gradien ungu-magenta, cahaya di belakang, partikel halus, vinyet
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 background(vec2 px){
  float y=px.y/uRes.y;
  vec3 top=vec3(0.110,0.031,0.125), mid=vec3(0.227,0.055,0.243), bot=vec3(0.071,0.016,0.102);
  vec3 col=mix(mix(top,mid,smoothstep(0.,0.5,y)),bot,smoothstep(0.5,1.,y));
  float g=exp(-pow(length((px-uRes*vec2(0.5,0.5))/uRes.y)*1.75,2.)); col+=vec3(0.77,0.165,0.416)*g*0.42;
  // partikel halus (sel acak kecil)
  vec2 cell=floor(px/90.); vec2 f=fract(px/90.)-0.5; vec2 o=vec2(hash(cell),hash(cell+7.3))-0.5; float rr=1.0+2.4*hash(cell+3.1);
  float d=length((f-o*0.8)*90.); float pa=step(0.72,hash(cell+11.))*(0.12+0.26*hash(cell+5.))*smoothstep(rr,rr-1.,d);
  col+=vec3(0.98,0.94,0.95)*pa;
  float v=length((px/uRes-0.5)*vec2(1.,0.8)); col*=1.-smoothstep(0.45,0.95,v)*0.5;
  return col;
}
vec3 ACES(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.,1.); }

void main(){
  vec2 px=vec2(gl_FragCoord.x+uTileOrigin.x, uRes.y-(gl_FragCoord.y+uTileOrigin.y)); // y ke bawah
  // pemetaan piksel -> koordinat lokal jantung (orthografi)
  vec2 L=vec2((px.x-uRes.x*0.5)/uScale+510., (px.y-uRes.y*0.5)/uScale+470.);
  vec3 ro=vec3(L,700.), rd=vec3(0.,0.,-1.);
  float t=0.; float dmin=1e9; bool hit=false; vec3 p=ro;
  for(int i=0;i<150;i++){ p=ro+rd*t; float d=mapAll(p); dmin=min(dmin,d); if(d<0.35){hit=true;break;} t+=d*0.85; if(t>1400.) break; }
  vec3 bg=background(px);
  if(uMode!=0) bg=vec3(0.);
  if(uView==1){ outColor=hit?vec4(0.08,0.07,0.10,1.):vec4(1.); return; }
  if(uView==3){ float vd=hit?t/1500.:1.; float a=floor(vd*255.)/255.; outColor=vec4(a,fract(vd*255.),0.,1.); return; }
  if(uView==2) bg=vec3(0.94,0.94,0.92);
  if(!hit && uView==2){ outColor=vec4(bg,1.); return; }
  if(!hit){
    float glow=exp(-dmin*0.05)*0.16*(uMode==0?1.:0.);
    outColor=vec4(bg+vec3(0.95,0.25,0.45)*glow, uMode==0?1.:0.); return;
  }
  vec3 n=calcN(p); vec3 v=vec3(0.,0.,1.);
  n=normalize(n+0.03*vec3(sin(p.y*0.031+p.z*0.027), sin(p.z*0.035+p.x*0.029), 0.5*sin(p.x*0.033+p.y*0.028)));
  // bahan: jarak komponen di titik kena
  float dB=body(p); vec4 vv=vessels(p);
  float wB=exp(-max(dB,0.)*1.5), wA=exp(-max(vv.x,0.)*1.5), wP=exp(-max(vv.y,0.)*1.5), wV=exp(-max(vv.z,0.)*1.5);
  if(uMode==2) wB=0.; if(uMode==1){ wA=0.; wP=0.; wV=0.; }
  float ws=wB+wA+wP+wV+1e-4; wB/=ws; wA/=ws; wP/=ws; wV/=ws;
  vec3 cMus=vec3(0.70,0.075,0.12), cArt=vec3(0.66,0.07,0.09), cPul=vec3(0.18,0.36,0.78), cVen=vec3(0.17,0.21,0.70);
  vec3 alb=cMus*wB+cArt*wA+cPul*wP+cVen*wV;
  // variasi halus (sangat lebar, bukan bintik): ventrikel kanan sedikit lebih gelap
  alb*=1.-0.16*smoothstep(430.,260.,p.x)*wB;
  // aurikula sedikit lebih gelap/ungu daripada ventrikel
  float aw=1.-smoothstep(0.,10.,aur(p)); alb=mix(alb,vec3(0.50,0.05,0.14),aw*0.85*wB);
  // ujung pembuluh terpotong: dinding terpotong (krem-merah muda) dan lumen gelap
  float lumen=0.; float cutFace=0.;
  for(int i=0;i<CUTE.length();i++){ float s=dot(p-CUTE[i],CUTT[i]); float rad=length(p-CUTE[i]-CUTT[i]*s);
    if(s>-13. && s<2. && rad<CUTR[i].x+2.){ if(rad<CUTR[i].y+0.8 && s<-1.5) lumen=max(lumen,1.); else if(s>-2.5 && rad>=CUTR[i].y) cutFace=1.; } }
  alb=mix(alb,vec3(0.90,0.58,0.52),cutFace);
  alb=mix(alb,vec3(0.20,0.02,0.07),lumen);
  // decal di permukaan badan
  float decalW=wB*smoothstep(2.,10.,aur(p));
  vec3 nD=n; float contact=1.; float pulseAdd=0.;
  if(decalW>0.25 && uMode!=2){
    Decal D=decal(p.xy);
    Decal Dx=decal(p.xy+vec2(1.,0.)), Dy=decal(p.xy+vec2(0.,1.));
    vec2 gH=vec2(Dx.h-D.h, Dy.h-D.h);
    nD=normalize(n-vec3(gH*0.9,0.));
    vec3 cFat=vec3(1.0,0.66,0.06), cFatLo=vec3(0.72,0.34,0.04), cA=vec3(0.45,0.02,0.05), cV=vec3(0.18,0.22,0.78);
    vec3 fat=mix(cFatLo,cFat,smoothstep(0.,7.,D.h));
    alb=mix(alb,fat,D.fMask*decalW);
    alb=mix(alb,cA,D.aMask*decalW);
    alb=mix(alb,cV,D.vMask*decalW);
    contact=1.-0.25*clamp(D.h*0.12,0.,1.)*(1.-D.aMask);
    pulseAdd=D.pulse*D.aMask*0.18*decalW;
    n=nD;
  }
  if(uView==2){ outColor=vec4(pow(alb,vec3(1./1.0)),1.); return; }
  vec3 l=LIGHTDIR();
  float sh=softShadow(p+n*3.,l);
  float occ=ao(p,n);
  float ndl=dot(n,l);
  float diff=clamp((ndl+0.35)/1.35,0.,1.); diff=diff*diff*(3.-2.*diff);
  vec3 h=normalize(l+v);
  float nh=max(dot(n,h),0.);
  float specSharp=pow(nh,90.)*0.9, specBroad=pow(nh,16.)*0.12;
  float fres=pow(1.-max(dot(n,v),0.),2.6);
  vec3 ambient=vec3(0.19,0.06,0.16);
  vec3 col=alb*(ambient*occ + vec3(1.0,0.93,0.90)*diff*mix(0.35,1.,sh)*1.05)*contact;
  col+=vec3(1.,0.95,0.95)*(specSharp+specBroad)*mix(0.3,1.,sh)*occ;
  col+=vec3(1.0,0.30,0.50)*fres*0.55*occ;                               // rim magenta
  vec3 l2=normalize(vec3(0.9,-0.1,-0.3)); col+=alb*pow(max(dot(n,l2),0.),2.)*0.18;  // pantulan dari kanan
  col+=pulseAdd*vec3(1.,0.55,0.45);
  col=mix(col,col*0.35,lumen*0.7); col=ACES(col*0.80);
  col=pow(col,vec3(1./2.2));
  outColor=vec4(col, 1.);
}
`;
}

export function buildHtml(w, h) {
  return `<!doctype html><html><body style="margin:0;background:#000"><canvas id="c" width="${w}" height="${h}"></canvas></body></html>`;
}
