import json,subprocess,numpy as np
asr=json.load(open('asr.json'))
def load(p):
    raw=subprocess.run(["ffmpeg","-v","error","-i",p,"-f","f32le","-ac","1","-ar","44100","-"],capture_output=True,check=True).stdout
    return np.frombuffer(raw,dtype=np.float32)
sr=44100
def rms10(a):
    h=sr//100; n=len(a)//h
    return np.sqrt((a[:n*h].reshape(n,h)**2).mean(1)+1e-12)
def words(n): return [w for s in asr[n] for w in s['words']]
def quiet(env,lo,hi):
    i0,i1=int(lo*100),int(hi*100); seg=env[i0:i1]
    # titik tenang: pusat rentang minimum berjalan 3 frame
    k=np.convolve(seg,np.ones(3)/3,mode='same'); j=int(np.argmin(k)); return (i0+j)/100
# ---- NARATOR ----
A=load('dakocan.mp3'); EA=rms10(A); WA=words('dakocan')
def wi(txt,start):  # indeks kata dengan teks dan waktu mulai dekat
    return min(range(len(WA)),key=lambda i:(abs(WA[i]['s']-start)+(0 if WA[i]['w'].lower().startswith(txt.lower()) else 9)))
bounds=[('N01','N02',4.18,4.70),('N02','N03',6.18,6.72),('N03','N04',12.02,12.60),('N04','N05',16.16,16.70),('N05','N06',20.66,21.14),
        ('N06','N07',21.42,21.84),('N07','N08',27.45,27.95),('N08','N09',31.44,31.82),('N09','N10',33.22,33.64),('N10','N11',38.50,38.82),
        ('N11','N12',46.72,47.22),('N12','N13',49.70,49.98),('N13','N14',56.20,56.60)]
cuts=[0.0]+[quiet(EA,lo,hi) for _,_,lo,hi in bounds]+[len(A)/sr]
ids=['N%02d'%i for i in range(1,15)]
out={}
thr=0.02*np.percentile(EA,99)
def span(cs,ce):
    ws=[w for w in WA if w['s']>=cs-0.02 and w['e']<=ce+0.02]
    s=ws[0]['s']; e=ws[-1]['e']
    # perluas ke energi (jangan lewat cut)
    i=int(s*100)
    while i>int(cs*100) and EA[i-1]>thr and s-(i/100)<0.25: i-=1
    j=int(e*100)
    while j<int(ce*100)-1 and EA[j]>thr and (j/100-e)<0.3: j+=1
    return max(cs,min(s,i/100)-0.05), min(ce,max(e,j/100)+0.06)
for k,i in enumerate(ids):
    cs,ce=cuts[k],cuts[k+1]; s,e=span(cs,ce); out[i]=(s,e)
# ---- PETUGAS ----
P=load('pratama.mp3'); EP=rms10(P); WP=words('pratama')
pc=[0.0,quiet(EP,1.66,2.12),quiet(EP,3.96,4.48),len(P)/sr]
thrP=0.02*np.percentile(EP,99)
for k,i in enumerate(['P01','P02','P03']):
    cs,ce=pc[k],pc[k+1]
    ws=[w for w in WP if w['s']>=cs-0.02 and w['e']<=ce+0.02]
    s=ws[0]['s']; e=ws[-1]['e']
    ii=int(s*100)
    while ii>int(cs*100) and EP[ii-1]>thrP and s-ii/100<0.25: ii-=1
    jj=int(e*100)
    while jj<int(ce*100)-1 and EP[jj]>thrP and jj/100-e<0.3: jj+=1
    out[i]=(max(cs,min(s,ii/100)-0.05),min(ce,max(e,jj/100)+0.06))
src={'N':'dakocan.mp3','P':'pratama.mp3'}
meta={}
for i,(s,e) in out.items():
    f=src[i[0]]
    subprocess.run(['ffmpeg','-y','-v','error','-i',f,'-af',f'atrim=start={s:.3f}:end={e:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.006,afade=t=out:st={e-s-0.012:.3f}:d=0.012','-ar','44100','-ac','1',f'clips/{i}.wav'],check=True)
    meta[i]={'src':f,'start':round(s,3),'end':round(e,3),'dur':round(e-s,3)}
json.dump(meta,open('clips.json','w'),indent=1)
for i,m in meta.items(): print(i,m['start'],m['end'],m['dur'])
