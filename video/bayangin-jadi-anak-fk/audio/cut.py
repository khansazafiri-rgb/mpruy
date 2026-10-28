# Memotong audio ElevenLabs (narator lalu Raka dalam satu berkas) di jeda antarucapan.
# Hasil: clips/N01..N08.wav, clips/R01..R06.wav, clips.json (durasi + waktu kata dari ASR).
# Pakai: python3 cut.py   (butuh ffmpeg; asr.json dibuat dari asr.py)
import json,subprocess,numpy as np,os
HERE=os.path.dirname(os.path.abspath(__file__))
SR=44100
raw=subprocess.run(["ffmpeg","-v","error","-i",HERE+"/sumber-narator-dan-raka.mp3","-f","f32le","-ac","1","-ar",str(SR),"-"],capture_output=True,check=True).stdout
A=np.frombuffer(raw,dtype=np.float32)
asr=json.load(open(HERE+"/asr.json"))
W=[w for s in asr for w in s["words"]]
def rms10(a):
    h=SR//100; n=len(a)//h
    return np.sqrt((a[:n*h].reshape(n,h)**2).mean(1)+1e-12)
E=rms10(A)
def quiet(lo,hi):
    seg=E[int(lo*100):int(hi*100)]
    k=np.convolve(seg,np.ones(5)/5,mode='same'); j=int(np.argmin(k)); return (int(lo*100)+j)/100
# (id sebelum, id sesudah, jendela jeda di berkas sumber)
GAPS=[("N01","N02",4.10,4.46),("N02","N03",12.70,13.24),("N03","N04",31.30,31.78),("N04","N05",42.74,43.14),("N05","N06",57.52,57.82),
      ("N06","N07",64.80,65.26),("N07","N08",91.34,91.76),("N08","R01",94.74,95.22),("R01","R02",96.62,97.12),("R02","R03",98.58,99.10),
      ("R03","R04",100.82,101.48),("R04","R05",104.88,105.40),("R05","R06",107.70,108.45)]
IDS=["N01","N02","N03","N04","N05","N06","N07","N08","R01","R02","R03","R04","R05","R06"]
cuts=[0.0]+[quiet(lo,hi) for *_,lo,hi in GAPS]+[len(A)/SR]
os.makedirs(HERE+"/clips",exist_ok=True)
thr=0.04*np.percentile(E,99)
out={}
for i,cid in enumerate(IDS):
    a,b=cuts[i],cuts[i+1]
    # rapatkan ke bunyi: buang hening di tepi tapi sisakan 60 ms di awal dan 140 ms di akhir
    e=E[int(a*100):int(b*100)]; on=np.where(e>thr)[0]
    s=max(a,a+on[0]/100-0.06); t=min(b,a+on[-1]/100+0.14)
    seg=A[int(s*SR):int(t*SR)].copy()
    fade=int(0.015*SR); seg[:fade]*=np.linspace(0,1,fade); seg[-fade:]*=np.linspace(1,0,fade)
    path=f"{HERE}/clips/{cid}.wav"
    subprocess.run(["ffmpeg","-y","-v","error","-f","f32le","-ar",str(SR),"-ac","1","-i","-","-ar",str(SR),path],input=seg.tobytes(),check=True)
    ws=[{"w":w["w"],"s":round(w["s"]-s,3),"e":round(w["e"]-s,3)} for w in W if w["s"]>=a-0.02 and w["e"]<=b+0.05]
    out[cid]={"src":[round(s,3),round(t,3)],"dur":round(t-s,3),"words":ws}
    print(cid,f"{s:.2f}-{t:.2f}  {t-s:.2f}s  {len(ws)} kata")
json.dump(out,open(HERE+"/clips.json","w"),ensure_ascii=False,indent=1)
