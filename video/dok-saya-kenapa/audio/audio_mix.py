"""Musik + SFX "Dok, saya kenapa?" di bawah dialog asli (tidak diubah). Semua disintesis dengan numpy."""
import numpy as np, wave, json
S='.'  # jalankan dari folder ini; membaca dialog.wav, menulis mix.wav
sr=44100; T=100.0; N=int(T*sr); rng=np.random.default_rng(7)
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
D_,Bb_,Gm_=('D','min'),('A','maj'),('G','min')
# 0.5-24.3 lorong + ruang periksa: pizzicato gugup, minor ringan
section(0.5,7.7,[D_,Gm_,A_,D_],104,0.8,'uke',arp=True,beat=0)
section(7.7,24.3,[D_,Gm_,A_,D_],108,0.9,'uke',arp=True,beat=1)
# 25.85-27.85 putar mundur: dengung pita
# 27.85-53.9 kilas balik: cerah, ringan
section(27.85,35.9,[C_,G_,A_,F_],100,0.9,'uke',arp=True,beat=1,swing=1)
section(35.9,46.9,[C_,G_,A_,F_],96,0.8,'uke',beat=0)
section(46.9,54.9,[A_,F_,C_,G_],108,0.9,'uke',arp=True,beat=1)
# 54.9-70.7 web: lo-fi tenang
section(54.9,70.7,[('C','maj7'),('A','min7'),('D','min7'),('G','dom7')],84,0.85,'rhodes',beat=1)
# 71.0-89.2 ulang: lembut, harapan
section(71.0,79.4,[('A','min7'),('F','maj7')],80,0.55,'rhodes',bassline=False,pad_on=True)
section(79.4,89.2,[C_,G_,A_,F_],88,0.7,'rhodes',pad_on=True)
# 89.2-100 penutup cerah
section(89.2,100.0,[C_,G_,A_,F_],100,1.0,'uke',arp=True,beat=2)
for fq in (261.63,329.63,392.0,523.25,659.25): add(mus,90.2,rhodes(fq,4.0),0.16)
# ---- jendela musik (berhenti untuk zonk, turun saat panik)
g=np.ones(N)
def dip(a,b,lvl,fade=0.08): global g; g=g*(1-(1-lvl)*lp(((t>=a)&(t<b)).astype(np.float32),int(fade*sr)))
dip(24.3,28.0,0.0,0.05)        # pingsan + putar mundur: musik berhenti (hanya efek)
dip(0.0,0.5,0.0,0.05)
dip(10.0,12.5,0.35,0.15)       # pasien bicara
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

# ---- SFX (fungsi jelas, tidak ada derau latar tetap)
tap(6.55,0.22); whoosh(6.45,0.9,0.28,True); thud(7.2,0.25,70)       # pintu: klik gagang, ayun, berhenti
whoosh(7.62,0.3,0.28,True)                                            # potong ke ruang periksa
for k in range(6): pop(12.55+0.07*k,0.3,520+60*k)                     # pertanyaan keluar dari kepala
for tt in np.arange(12.9,15.6,0.16): click(tt,0.1)                    # langkah kecil berlari
def breath(t0,dur=0.9,gv=0.18):
    n=int(dur*sr); tt=np.arange(n)/sr; nz=lp(rng.standard_normal(n),9); add(sfx,t0,nz*np.sin(np.pi*np.clip(tt/dur,0,1))**1.4,gv)
breath(16.7,0.85,0.5)                                                  # menarik napas
chime(18.5,[1100],0.06,0.05,0.4)                                       # senyum tegang
for tt in (21.4,21.9,22.4): pop(tt,0.12,400)                           # "..." tak ada yang keluar
# PINGSAN: satu kali saja, lucu dan ringan (peluit meluncur turun + bunyi duk kecil)
def slide(t0,dur=0.85,gv=0.5):
    n=int(dur*sr); tt=np.arange(n)/sr; f=1500*np.exp(-tt/dur*1.6)+260; ph=2*np.pi*np.cumsum(f)/sr
    add(sfx,t0,(np.sin(ph)+0.25*np.sin(2*ph))*np.clip(tt/0.01,0,1)*np.clip((dur-tt)/0.06,0,1),gv)
slide(24.35,0.85,0.9); thud(25.25,0.35,90)
# putar mundur: dengung pita + cicit
def rewind(t0,dur=2.0,gv=0.35):
    n=int(dur*sr); tt=np.arange(n)/sr; f=380+900*np.sin(np.pi*np.clip(tt/dur,0,1))**0.8; ph=2*np.pi*np.cumsum(f)/sr
    nz=lp(rng.standard_normal(n),5)
    add(sfx,t0,(np.sin(ph)*0.5+nz*0.9)*np.sin(np.pi*np.clip(tt/dur,0,1))**0.6*(0.7+0.3*np.sin(2*np.pi*14*tt)),gv)
rewind(25.85,2.0,0.5); thud(27.83,0.2,120)
for tt in (28.0,): whoosh(27.8,0.3,0.3,True)
for tt in (word_t for word_t in (30.7,31.9,33.4)): whoosh(tt-0.1,0.25,0.18,True)   # potong antar-lokasi
for k,tt in enumerate((36.7,37.0,37.3,37.6)): pop(tt,0.2,700+60*k)    # daftar tercentang
thud(38.5,0.22,110)                                                    # "Latihan kasus" belum tercentang
pop(40.15,0.2,900)                                                     # balon teman
whoosh(45.2,0.4,0.25,True)                                             # item dioper ke "nanti"
for tt in (word_t for word_t in (48.1,51.4,52.6)): whoosh(tt,0.3,0.25,True)   # folder dilempar antar-minggu
for tt in (51.2,52.4,53.5): pop(tt,0.18,640)
pop(35.8,0.3,760); pop(54.8,0.3,700)                                   # gelembung pikiran pecah; panel web
# ketukan di rekaman web asli (waktu video = pemetaan rekaman)
for tt in (55.94,57.3,58.9,59.16,60.51,66.3,69.7): tap(tt,0.2)
thud(63.0,0.15,100)                                                    # hasil "belum tepat" muncul (halus)
chime(69.9,[988,1319],0.1,0.1)                                         # coba lagi
whoosh(70.7,0.4,0.25,False); whoosh(70.95,0.3,0.28,True)              # panel keluar, putar ulang
chime(71.1,[784,1047],0.12,0.1)
tap(78.0,0.18); whoosh(78.2,0.8,0.25,True)                             # pintu dibuka (ulang)
def pfft(t0,dur=0.45,gv=0.2):
    n=int(dur*sr); tt=np.arange(n)/sr; nz=rng.standard_normal(n); add(sfx,t0,(nz-lp(nz,4))*np.exp(-tt/0.16),gv)
pfft(77.1,0.45,0.35)                                                   # kekuatan super tidak datang (kempis kecil)
whoosh(79.3,0.3,0.28,True)
chime(90.4,[1047,1319,1568],0.18,0.07); pop(word_t:=92.5,0.2,800); pop(93.7,0.2,900); chime(94.4,[1319],0.12)
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
