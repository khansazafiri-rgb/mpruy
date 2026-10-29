"""Musik + SFX "Masih Dua Minggu" di bawah dialog asli (tidak diubah). Semua disintesis dengan numpy."""
import numpy as np, wave, json
S='.'  # jalankan dari folder ini; membaca dialog.wav, menulis mix.wav
sr=44100; T=83.0; N=int(T*sr); rng=np.random.default_rng(7)
def load_wav(p):
    w=wave.open(p); return np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
dlg=load_wav(S+'/dialog.wav'); dlg=np.pad(dlg,(0,max(0,N-len(dlg))))[:N]
t=np.arange(N)/sr
def lp(x,k): k=max(1,int(k)); return np.convolve(x,np.ones(k)/k,mode='same')
def add(buf,t0,sig,g=1.0):
    i=int(t0*sr)
    if i<0 or i>=len(buf): return
    j=min(len(buf),i+len(sig)); buf[i:j]+=sig[:j-i]*g
def seg(a,b,x=None):  # jendela 0/1 halus
    w=((t>=a)&(t<b)).astype(np.float32); return lp(w,int(0.03*sr))

# ---- instrumen
def pluck(f,dur=0.5,bright=1.0):
    n=int(dur*sr); tt=np.arange(n)/sr
    s=np.sin(2*np.pi*f*tt)+0.45*bright*np.sin(2*np.pi*f*2*tt)*np.exp(-tt/0.09)+0.2*bright*np.sin(2*np.pi*f*3*tt)*np.exp(-tt/0.05)
    return s*np.exp(-tt/(0.16+0.05*dur))*np.minimum(1,tt/0.002)
def uke(f,dur=0.6): return pluck(f,dur,1.2)
def rhodes(f,dur,vel=1.0):
    n=int(dur*sr); tt=np.arange(n)/sr
    s=np.sin(2*np.pi*f*tt)+np.sin(2*np.pi*f*2.003*tt)*0.3*np.exp(-tt/0.22)+np.sin(2*np.pi*f*3.01*tt)*0.1*np.exp(-tt/0.1)+np.sin(2*np.pi*f*0.5*tt)*0.18
    s*=np.minimum(1,tt/0.006)*np.exp(-tt/(dur*0.5))*(1+0.08*np.sin(2*np.pi*4.6*tt))*np.clip((dur-tt)/0.1,0,1)
    return s*vel
def bass(f,dur):
    n=int(dur*sr); tt=np.arange(n)/sr
    return (np.sin(2*np.pi*f*tt)+0.25*np.sin(2*np.pi*f*2*tt))*np.minimum(1,tt/0.012)*np.exp(-tt/(dur*0.65))*np.clip((dur-tt)/0.06,0,1)
def kick():
    n=int(0.25*sr); tt=np.arange(n)/sr
    return np.sin(2*np.pi*np.cumsum(46+90*np.exp(-tt/0.03))/sr)*np.exp(-tt/0.1)
def hat():
    n=int(0.035*sr); tt=np.arange(n)/sr; nz=rng.standard_normal(n); return (nz-lp(nz,4))*np.exp(-tt/0.01)
def shaker():
    n=int(0.07*sr); tt=np.arange(n)/sr; nz=rng.standard_normal(n); return (nz-lp(nz,5))*np.minimum(1,tt/0.02)*np.exp(-tt/0.03)
def pad(f,dur):
    n=int(dur*sr); tt=np.arange(n)/sr
    s=sum(np.sin(2*np.pi*f*(1+d)*tt) for d in (-0.003,0,0.003))/3+0.3*np.sin(2*np.pi*f*2*tt)
    return s*np.minimum(1,tt/0.5)*np.clip((dur-tt)/0.6,0,1)

NOTE={'C':261.63,'D':293.66,'E':329.63,'F':349.23,'G':392.0,'A':440.0,'B':493.88}
def ch(root,kind):
    r=NOTE[root[0]]*(2**((1 if '#' in root else 0)/12))
    iv={'maj':[0,4,7,12],'min':[0,3,7,12],'maj7':[0,4,7,11],'min7':[0,3,7,10],'dom7':[0,4,7,10]}[kind]
    return [r*2**(i/12) for i in iv], r/2
mus=np.zeros(N); drum=np.zeros(N); sfx=np.zeros(N); amb=np.zeros(N)

def section(t0,t1,prog,bpm,vel=1.0,inst='uke',arp=False,beat=0,swing=0.0,pad_on=False,bassline=True):
    beatl=60/bpm; bar=beatl*4; tt=t0; k=0
    while tt<t1-0.05:
        notes,root=ch(*prog[k%len(prog)]); L=min(bar,t1-tt)
        if inst=='uke':
            for j in range(4):
                x=tt+j*beatl+ (swing*beatl*0.33 if j%2 else 0)
                if x>=t1: break
                for i,fq in enumerate(notes[:4]): add(mus,x+0.012*i,uke(fq*(2 if j%2 else 1),0.5),0.13*vel*(1.0 if j%2==0 else 0.7))
        elif inst=='rhodes':
            for i,fq in enumerate(notes): add(mus,tt+0.012*i,rhodes(fq,min(L,beatl*3.7)),0.14*vel)
        if arp:
            for j in range(8):
                x=tt+j*beatl/2
                if x>=t1: break
                add(mus,x,pluck(notes[[0,2,1,3,0,2,3,1][j]]*2,0.4),0.07*vel)
        if bassline:
            add(mus,tt,bass(root,min(L,beatl*2.0)),0.28*vel)
            if L>beatl*2.4: add(mus,tt+beatl*2.5,bass(root*(1.5 if beat else 1),beatl*1.2),0.2*vel)
        if pad_on:
            for fq in notes[:3]: add(mus,tt,pad(fq,L),0.06*vel)
        if beat:
            for b in range(8):
                x=tt+b*beatl/2
                if x>=t1: break
                add(drum,x,shaker(),0.1 if b%2 else 0.16)
                if beat>=2 and b in (0,4): add(drum,x,kick(),0.5)
                if beat>=2 and b in (2,6): add(drum,x,hat(),0.18)
        k+=1; tt+=bar

C_,G_,A_,F_=('C','maj'),('G','maj'),('A','min'),('F','maj')
# 0.6-11.6 hook (hangat, ringan) | 11.6-14.4 pantai (ukulele, shaker)
section(0.62,11.62,[C_,G_,A_,F_],92,0.85,'uke',beat=0)
section(11.62,14.4,[C_,G_,F_,G_],104,1.0,'uke',beat=1,swing=1)
# 14.4-15.5 jeda singkat setelah "pop"
section(14.4,15.52,[A_,F_],92,0.7,'rhodes',bassline=False)
# 15.5-27.7 montase: lebih sibuk
section(15.52,24.3,[A_,F_,C_,G_],116,1.0,'uke',arp=True,beat=2)
section(24.3,27.74,[('A','min7'),('D','min7')],116,0.9,'rhodes',arp=True,beat=2,pad_on=True)
# 27.74-29.62 ombak H-3: drone tegang
for fq in (73.4,110.0,146.8): add(mus,27.74,pad(fq,2.0),0.2)
# 29.62-35.4 ruang: denyut cemas
section(29.62,35.42,[('A','min7'),('E','min')],100,0.7,'rhodes',arp=True,beat=1,pad_on=True)
for k in range(12): add(drum,29.7+k*0.48,kick(),0.28+0.02*k)
# 36.7-38.4 harapan: pad naik
for i,fq in enumerate((261.63,329.63,392.0,523.25)): add(mus,36.75,pad(fq,1.9),0.1)
for k,fq in enumerate((784,988,1175,1568)): add(mus,37.0+k*0.3,pluck(fq,0.8),0.09)
# 39.7-44.4 lemas (pelan)
section(39.7,44.5,[('A','min'),('F','maj7')],72,0.55,'rhodes',bassline=True)
# 44.5-46.2 menutup tab: tegas tapi hangat
section(44.55,46.2,[C_,G_],100,0.8,'rhodes',beat=1)
# 46.2-63.6 web: lo-fi tenang
section(46.2,63.6,[('C','maj7'),('A','min7'),('D','min7'),('G','dom7')],84,0.9,'rhodes',beat=1,arp=False)
# 63.6-69.0 callback: sangat lembut
section(63.62,69.0,[('A','min7'),('F','maj7')],78,0.5,'rhodes',bassline=False,pad_on=True)
# 69.0-83 penutup: cerah
section(69.0,70.9,[C_,G_],100,0.7,'uke',beat=0)
section(70.9,83.0,[C_,G_,A_,F_],100,1.05,'uke',arp=True,beat=2)
for fq in (261.63,329.63,392.0,523.25,659.25): add(mus,77.1,rhodes(fq,5.4),0.15)
# ---- jendela musik (berhenti untuk zonk, turun saat panik)
g=np.ones(N)
def dip(a,b,lvl,fade=0.08): global g; g=g*(1-(1-lvl)*lp(((t>=a)&(t<b)).astype(np.float32),int(fade*sr)))
dip(38.38,39.62,0.0,0.05)      # zonk: hening
dip(35.42,36.72,0.25,0.1)      # "Aku mulai dari mana?"
dip(0.0,0.62,0.0,0.05)
mus*=g; drum*=g
# denyut kick juga berhenti saat hening
fade=np.clip((T-0.1-t)/2.2,0,1)
music=(mus+drum*0.9)*fade
env=lp(np.abs(dlg),int(0.06*sr)); env=env/(np.percentile(env,98)+1e-6)
duck=1-0.55*np.clip(lp((env>0.12).astype(np.float32),int(0.22*sr)),0,1)
music*=duck

# ---- SFX
def whoosh(t0,dur=0.45,gv=0.35,up=True):
    n=int(dur*sr); tt=np.arange(n)/sr; nz=rng.standard_normal(n)
    bell=np.sin(np.pi*np.clip(tt/dur,0,1))**1.5; lo=lp(nz,26); hi=nz-lp(nz,6); fr=np.linspace(0,1,n) if up else np.linspace(1,0,n)
    add(sfx,t0,(lo*(1-fr)+hi*fr*0.6)*bell*1.4,gv)
def pop(t0,gv=0.35,f0=620):
    n=int(0.1*sr); tt=np.arange(n)/sr; add(sfx,t0,np.sin(2*np.pi*(f0+420*np.exp(-tt/0.02))*tt)*np.exp(-tt/0.03),gv)
def thud(t0,gv=0.6,f=70):
    n=int(0.4*sr); tt=np.arange(n)/sr; nz=lp(rng.standard_normal(n),20)
    add(sfx,t0,np.sin(2*np.pi*f*tt)*np.exp(-tt/0.12)+nz*np.exp(-tt/0.04)*0.6,gv)
def tap(t0,gv=0.22):
    n=int(0.06*sr); tt=np.arange(n)/sr; nz=rng.standard_normal(n); add(sfx,t0,(nz-lp(nz,7))*np.exp(-tt/0.008)+np.sin(2*np.pi*900*tt)*np.exp(-tt/0.01)*0.5,gv)
def chime(t0,notes,gv=0.25,gap=0.08,dur=1.2):
    for i,f in enumerate(notes):
        n=int(dur*sr); tt=np.arange(n)/sr
        add(sfx,t0+i*gap,(np.sin(2*np.pi*f*tt)+0.35*np.sin(2*np.pi*f*2.76*tt)*np.exp(-tt/0.3))*np.exp(-tt/0.45)*np.minimum(1,tt/0.003),gv)
def buzz(t0,f=140,dur=0.17,gv=0.55):
    n=int(dur*sr); tt=np.arange(n)/sr
    sq=np.sign(np.sin(2*np.pi*f*tt))*0.5+np.sign(np.sin(2*np.pi*f*1.5*tt))*0.25
    add(sfx,t0,lp(sq,6)*np.minimum(1,tt/0.004)*np.clip((dur-tt)/0.02,0,1),gv)
def boom(t0,gv=0.8):
    n=int(0.9*sr); tt=np.arange(n)/sr
    add(sfx,t0,np.sin(2*np.pi*np.cumsum(60+120*np.exp(-tt/0.05))/sr)*np.exp(-tt/0.3)+lp(rng.standard_normal(n),12)*np.exp(-tt/0.06)*0.7,gv)
def click(t0,gv=0.18):
    n=int(0.03*sr); tt=np.arange(n)/sr; nz=rng.standard_normal(n); add(sfx,t0,(nz-lp(nz,5))*np.exp(-tt/0.006),gv)
def swell(a,b,gv=0.1):  # ombak lembut (hanya saat pantai)
    nz=lp(rng.standard_normal(N),60); env=lp(((t>=a)&(t<b)).astype(np.float32),int(0.25*sr))*(0.55+0.45*np.sin(2*np.pi*0.35*(t-a)))
    amb[:]+=nz*env*gv*12

boom(0.0,0.9); whoosh(0.3,0.5,0.4,True)                          # H-14 UJIAN membanting layar
whoosh(11.5,0.25,0.35,True); tap(11.9,0.2); chime(10.92,[1568,1976,2349],0.14,0.07)   # potong cepat ke pantai; kilau "dua minggu"
swell(11.62,14.4,0.10)
pop(14.42,0.5,820); whoosh(14.32,0.2,0.3,False)                  # pop: kembali ke kantin (hanya di kepala)
for tt in (15.45,17.87,20.2,24.25,29.55): whoosh(tt,0.3,0.28,True)  # iris pencocok
thud(22.35,0.42,90)                                                # tugas baru jatuh
for k,tt in enumerate((26.55,26.7,26.85,27.0,27.15)): pop(tt,0.18,520+k*50)  # hari kosong berjatuhan
whoosh(27.7,0.3,0.3,True); swell(27.74,29.62,0.2)
whoosh(28.2,1.2,0.5,True); thud(29.26,0.8,60); boom(29.28,0.4)       # ombak + papan "H-3 UJIAN"
for k in range(8): pop(29.78+0.29*k,0.1,700+k*35)                 # tab dibuka
boom(35.42,0.45)                                                   # kaget
chime(36.8,[784,1047,1319],0.1,0.12)                               # harapan
buzz(38.66,150,0.17,1.0); buzz(38.88,138,0.17,1.0); buzz(39.10,98,0.36,1.0)  # ZONK: tet—tet—tet! (sekali saja)
for k in range(14): click(44.62+k*0.1,0.14)                        # menutup tab
thud(44.95,0.3,95); pop(44.95,0.2,900)                              # satu BAB tersisa
# ketukan di footage web asli (waktu video = pemetaan rekaman)
for tt in (46.4,48.5,49.6,50.5,52.7,53.7,55.9): tap(tt,0.2)
thud(53.82,0.25,110)                                               # "Belum tepat" (halus)
thud(57.45,0.8,55)                                                 # buku ensiklopedia jatuh
chime(61.35,[988,1319],0.12,0.1)                                   # "oh, paham"
pop(63.62,0.3,760); pop(69.05,0.3,640)                             # gelembung pantai muncul
whoosh(69.0,0.5,0.25,True)
chime(71.7,[1047,1319,1568],0.18,0.07); pop(word_t:=72.43,0.2,800); pop(74.1,0.2,900); chime(75.9,[1319],0.12)
chime(77.15,[784,1047],0.14,0.1)
mus_=music
# ---- mix
def rms(x): return np.sqrt(np.mean(x[np.abs(x)>1e-4]**2)+1e-12)
dd=dlg/(np.abs(dlg).max()+1e-6)*0.85; dr=rms(dd)
mu=mus_/(rms(mus_)+1e-9)*dr*10**(-14.5/20)
fx=sfx/(np.abs(sfx).max()+1e-9)*dr*2.6
am=amb/(np.abs(amb).max()+1e-9)*dr*0.18
mix=dd+mu+fx+am
pk=np.abs(mix).max(); print('puncak',pk,'rms dialog',dr)
mix=mix/max(1,pk/0.95)
for nm,a in (('mix',mix),('music',mu),('sfx',fx+am)):
    w=wave.open(f'{S}/{nm}.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a,-1,1)*32767).astype(np.int16).tobytes()); w.close()
print('ok')
