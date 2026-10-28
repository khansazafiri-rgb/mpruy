"""Susun linimasa dari klip asli (tanpa mengubah kecepatan), buat voice.wav, envelope bibir, dan takarir per frasa."""
import json, sys, subprocess, numpy as np
clipdir, out_json, out_wav = sys.argv[1], sys.argv[2], sys.argv[3]
FPS = 30; SR = 44100
meta = json.load(open(f'{clipdir}/clips.json'))
ORDER = ['N01','N02','O01','N03','N04','N05','O02','N06','N07','O03','N08','N09','O04','N10']
GAP_AFTER = {'N01':.65,'N02':.35,'O01':.7,'N03':.4,'N04':.7,'N05':.3,'O02':.35,'N06':.7,'N07':.3,'O03':.4,'N08':.7,'N09':.3,'O04':.45,'N10':0}
LEAD = 0.5; HOLD = 0.9; END_CARD = 3.4
GAIN = {'N': 1.0, 'O': 0.62}   # menyamakan loudness dua suara (hanya volume)
PHR = {
 'N01': ["Kalau sachet kecil ini tidak pernah ada,", "apa yang berubah?"],
 'N02': ["Di sebuah rumah, seorang anak sedang diare,", "dan orang tuanya menemani."],
 'O01': ["Sini, Nak.", "Perutnya masih sakit ya?", "Kita pelan-pelan saja."],
 'N03': ["Coba lihat ke dalam tubuh.", "Masalah diare bukan cuma sering ke toilet."],
 'N04': ["Bersama tinja yang cair,", "air dan elektrolit, mineral penting bagi tubuh,", "ikut keluar.", "Itulah yang sebenarnya hilang."],
 'N05': ["Sekarang bayangkan dunia tanpa oralit.", "Minum dan bantuan kesehatan tetap ada,", "tapi larutan pengganti air dan elektrolit tidak."],
 'O02': ["Minum pelan-pelan ya, Nak.", "Kita cari bantuan."],
 'N06': ["Bila cairan yang hilang tak terganti,", "risiko dehidrasi meningkat."],
 'N07': ["Sekarang, kita putar balik.", "Sachet itu ada."],
 'O03': ["Ini oralitnya, Nak.", "Kita siapkan sesuai petunjuk di kemasan."],
 'N08': ["Oralit membantu rehidrasi,", "yaitu mengganti air dan elektrolit yang hilang.", "Ia bukan obat yang langsung menghentikan diare", "atau mengatasi penyebabnya."],
 'N09': ["Rehidrasi oral membantu banyak kasus.", "Namun anak yang tampak sangat lemas,", "tidak mampu minum,", "atau menunjukkan tanda dehidrasi berat", "perlu segera diperiksa tenaga kesehatan.", "Infus mungkin diperlukan."],
 'O04': ["Kalau dia makin lemas,", "kita langsung ke tenaga kesehatan."],
 'N10': ["Kemajuan kesehatan kadang hadir", "dalam bentuk yang tampak sangat sederhana."],
}
def internal_silences(env, s, e, thr_db=-40, mind=0.10):
    db = 20*np.log10(np.array(env)+1e-9); res=[]; i=int(s*100)+3; n=int(e*100)-3; st=None
    while i<n:
        if db[i]<thr_db:
            if st is None: st=i
        else:
            if st is not None and (i-st)*0.01>=mind: res.append(((st+i)/2)*0.01)
            st=None
        i+=1
    return res
def breaks(env, s, e, phrases):
    if len(phrases)==1: return []
    cands = internal_silences(env, s, e)
    w=[len(p) for p in phrases]; tot=sum(w); cum=0; exp=[]
    for k in range(len(phrases)-1):
        cum+=w[k]; exp.append(s+(e-s)*cum/tot)
    chosen=[]; last=s
    for x in exp:
        c=[t for t in cands if t>last+0.25 and t<e-0.25]
        if c and min(abs(t-x) for t in c)<0.9:
            t=min(c,key=lambda t:abs(t-x))
        else: t=x
        chosen.append(t); last=t
    return chosen
turns={}; t=LEAD; caps=[]
for tid in ORDER:
    m=meta[tid]; sp=m['e']-m['s']
    turns[tid]=dict(actor=tid[0], start=round(t,3), end=round(t+sp,3), off=round(t-m['s'],3), dur=m['dur'])
    br=breaks(m['env'], m['s'], m['e'], PHR[tid]); edges=[m['s']]+br+[m['e']]
    for k,ph in enumerate(PHR[tid]):
        caps.append(dict(id=tid, text=ph, t0=round(turns[tid]['off']+edges[k],3), t1=round(turns[tid]['off']+edges[k+1],3), actor=tid[0]))
    t+=sp+GAP_AFTER[tid]
speech_end=turns['N10']['end']
total=speech_end+HOLD+END_CARD
# perpanjang tiap takarir sedikit sampai ke takarir berikutnya bila celahnya kecil (tanpa tumpang tindih)
for i,c in enumerate(caps):
    nxt=caps[i+1]['t0'] if i+1<len(caps) else 1e9
    c['t1']=round(min(c['t1']+0.12, nxt-0.02 if nxt-c['t1']<0.4 else c['t1']+0.12),3)
# voice.wav
N=int(total*SR)+SR; mix=np.zeros(N,dtype=np.float32)
for tid,tr in turns.items():
    x=subprocess.run(['ffmpeg','-v','error','-i',f'{clipdir}/{tid}.wav','-f','f32le','-ac','1','-ar',str(SR),'-'],capture_output=True,check=True).stdout
    x=np.frombuffer(x,dtype=np.float32)*GAIN[tr['actor']]
    i0=int(round(tr['off']*SR)); 
    if i0<0: x=x[-i0:]; i0=0
    mix[i0:i0+len(x)]+=x[:N-i0]
subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','1','-i','-',out_wav],input=mix.tobytes(),check=True)
# envelope bibir per frame
nf=int(total*FPS)+1
def env_for(actor):
    e=np.zeros(nf)
    for tid,tr in turns.items():
        if tr['actor']!=actor: continue
        env=np.array(meta[tid]['env'])
        for f in range(nf):
            tt=f/FPS-tr['off']
            if 0<=tt<len(env)*0.01-0.01:
                e[f]=env[int(tt*100)]
    return e
eo=env_for('O'); en=env_for('N')
def norm(e):
    p=np.percentile(e[e>0.002],90) if (e>0.002).any() else 1
    return [round(float(min(1,v/p)),3) for v in e]
json.dump(dict(fps=FPS,total=round(total,3),speechEnd=speech_end,turns=turns,caps=caps,envO=norm(eo),envN=norm(en)),open(out_json,'w'))
print('total',total); 
for k,v in turns.items(): print(k,v['start'],v['end'])
for c in caps: print(c['id'],c['t0'],c['t1'],c['text'])
