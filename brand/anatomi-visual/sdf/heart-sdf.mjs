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

// rantai kapsul 3D (radius meruncing) dengan kotak pembatas agar cepat dilewati bila jauh
function vesselFn(name, pts, r0, r1) {
  const poly = densify(pts.map((p) => [p[0], p[1]]), 9);
  // z diinterpolasi dari titik kontrol (linear terhadap indeks)
  const n = poly.length, m = pts.length - 1;
  const full = poly.map((p, i) => { const t = (i / (n - 1)) * m, k = Math.min(m - 1, Math.floor(t)), u = t - k; return [p[0], p[1], pts[k][2] * (1 - u) + pts[k + 1][2] * u]; });
  const xs = full.map((p) => p[0]), ys = full.map((p) => p[1]), zs = full.map((p) => p[2]);
  const pad = Math.max(r0, r1) + 4;
  const c = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2];
  const h = [(Math.max(...xs) - Math.min(...xs)) / 2 + pad, (Math.max(...ys) - Math.min(...ys)) / 2 + pad, (Math.max(...zs) - Math.min(...zs)) / 2 + pad];
  return `const vec3 ${name}P[${n}] = vec3[${n}](${full.map(v3).join(',')});
float ${name}(vec3 p){ vec3 q=abs(p-${v3(c)})-${v3(h)}; float db=length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); if(db>30.) return db;
  float best=1e9; for(int i=0;i<${n - 1};i++){ vec3 a=${name}P[i], b=${name}P[i+1]; vec3 pa=p-a, ba=b-a; float hh=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); float r=mix(${f(r0)},${f(r1)},(float(i)+hh)/${f(n - 1)}); best=min(best,length(pa-ba*hh)-r);} return best; }`;
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
  for (const [k, v] of Object.entries(VESSELS)) g += vesselFn('ves' + k, v.pts, v.r0, v.r1) + '\n';
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
uniform float uScale;
const float PI=3.14159265;
${g}
// ---------- utilitas SDF
float smin(float a,float b,float k){ float h=max(k-abs(a-b),0.)/k; return min(a,b)-h*h*k*0.25; }
vec3 rotZ(vec3 p,float a){ float c=cos(a), s=sin(a); return vec3(c*p.x-s*p.y, s*p.x+c*p.y, p.z); }
float ell(vec3 p,vec3 c,vec3 r,float a){ vec3 q=rotZ(p-c,a); float k0=length(q/r); float k1=length(q/(r*r)); return k0*(k0-1.)/k1; }
// elipsoid yang meruncing ke bawah (apeks): taper = pengurangan lebar di ujung bawah
float ellT(vec3 p,vec3 c,vec3 r,float a,float taper){ vec3 q=rotZ(p-c,a); float ty=clamp(q.y/r.y*0.5+0.5,0.,1.); float sx=1.-taper*smoothstep(0.35,1.,ty); q.x/=sx; float k0=length(q/r); float k1=length(q/(r*r)); return (k0*(k0-1.)/k1)*sx; }
// ---------- badan jantung: ventrikel, basis, atrium kanan, auricula kiri
float body(vec3 p){
  float sc=1.+0.03*uBeat;
  vec3 c0=vec3(510.,560.,0.);
  vec3 q=c0+(p-c0)/sc;
  float lv=ellT(q,vec3(552.,652.,-10.),vec3(246.,292.,190.),-0.24,0.62);
  float rv=ell(q,vec3(384.,508.,50.),vec3(166.,176.,166.),0.28);
  float bs=ell(q,vec3(500.,388.,0.),vec3(255.,108.,150.),0.03);
  float d=smin(lv,rv,130.); d=smin(d,bs,70.);
  float ra=ell(q,vec3(292.,350.,26.),vec3(88.,94.,96.),0.);
  float la=ell(q,vec3(708.,372.,78.),vec3(88.,54.,44.),0.35);
  d=smin(d,ra,34.); d=smin(d,la,30.);
  return d*sc;
}
vec4 vessels(vec3 p){ // x aorta, y arteri paru, z vena, w campuran
  float aorta=min(vesAORTA(p),vesBRACH(p));
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
  return smin(b,vd,30.);
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
  // decal di permukaan badan
  float decalW=wB;
  vec3 nD=n; float contact=1.; float pulseAdd=0.;
  if(decalW>0.25 && uMode!=2){
    Decal D=decal(p.xy);
    Decal Dx=decal(p.xy+vec2(1.,0.)), Dy=decal(p.xy+vec2(0.,1.));
    vec2 gH=vec2(Dx.h-D.h, Dy.h-D.h);
    nD=normalize(n-vec3(gH*0.9,0.));
    vec3 cFat=vec3(0.95,0.76,0.30), cFatLo=vec3(0.68,0.40,0.12), cA=vec3(0.58,0.04,0.07), cV=vec3(0.18,0.22,0.78);
    vec3 fat=mix(cFatLo,cFat,smoothstep(0.,7.,D.h));
    alb=mix(alb,fat,D.fMask*decalW);
    alb=mix(alb,cA,D.aMask*decalW);
    alb=mix(alb,cV,D.vMask*decalW);
    contact=1.-0.25*clamp(D.h*0.12,0.,1.)*(1.-D.aMask);
    pulseAdd=D.pulse*D.aMask*0.18*decalW;
    n=nD;
  }
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
  col=ACES(col*0.80);
  col=pow(col,vec3(1./2.2));
  outColor=vec4(col, 1.);
}
`;
}

export function buildHtml(w, h) {
  return `<!doctype html><html><body style="margin:0;background:#000"><canvas id="c" width="${w}" height="${h}"></canvas></body></html>`;
}
