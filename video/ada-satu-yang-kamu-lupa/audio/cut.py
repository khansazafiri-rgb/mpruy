# Memotong audio ElevenLabs (narasi, lalu tiga dialog Raka di ujung berkas yang sama) di jeda antarucapan.
# Hasil: clips/N1..N9.wav, clips/R1..R3.wav, clips.json (durasi + waktu kata dari ASR).
# Pakai: python3 cut.py   (butuh ffmpeg; asr.json = hasil faster-whisper pada sumber-baru.mp3)
import json,subprocess,numpy as np,os
HERE=os.path.dirname(os.path.abspath(__file__))
SR=44100
raw=subprocess.run(["ffmpeg","-v","error","-i",HERE+"/sumber-baru.mp3","-f","f32le","-ac","1","-ar",str(SR),"-"],capture_output=True,check=True).stdout
A=np.frombuffer(raw,dtype=np.float32)
asr=json.load(open(HERE+"/asr.json"))
W=[w for s in asr for w in s["words"]]
h=SR//100; n=len(A)//h
E=np.sqrt((A[:n*h].reshape(n,h)**2).mean(1)+1e-12)
def quiet(lo,hi):
    seg=E[int(lo*100):int(hi*100)]
    k=np.convolve(seg,np.ones(5)/5,mode='same'); j=int(np.argmin(k)); return (int(lo*100)+j)/100
# (id sebelum, id sesudah, jendela jeda di berkas sumber)
GAPS=[("N1","N2",8.76,9.30),("N2","N3",20.42,20.90),("N3","N4",31.40,31.90),("N4","N5",43.66,44.20),("N5","N6",51.06,51.58),
      ("N6","N7",58.28,58.64),("N7","N8",74.78,75.32),("N8","N9",81.46,81.90),("N9","R1",91.38,91.84),("R1","R2",94.58,95.26),("R2","R3",99.68,100.26)]
IDS=["N1","N2","N3","N4","N5","N6","N7","N8","N9","R1","R2","R3"]
cuts=[0.0]+[quiet(lo,hi) for *_,lo,hi in GAPS]+[len(A)/SR]
os.makedirs(HERE+"/clips",exist_ok=True)
thr=0.04*np.percentile(E,99)
out={}
for i,cid in enumerate(IDS):
    a,b=cuts[i],cuts[i+1]
    e=E[int(a*100):int(b*100)]; on=np.where(e>thr)[0]
    s=max(a,a+on[0]/100-0.06); t=min(b,a+on[-1]/100+0.14)
    seg=A[int(s*SR):int(t*SR)].copy()
    fade=int(0.015*SR); seg[:fade]*=np.linspace(0,1,fade); seg[-fade:]*=np.linspace(1,0,fade)
    subprocess.run(["ffmpeg","-y","-v","error","-f","f32le","-ar",str(SR),"-ac","1","-i","-","-ar",str(SR),f"{HERE}/clips/{cid}.wav"],input=seg.tobytes(),check=True)
    ws=[{"w":w["w"],"s":round(w["s"]-s,3),"e":round(w["e"]-s,3)} for w in W if w["s"]>=a-0.02 and w["e"]<=b+0.05]
    out[cid]={"src":[round(s,3),round(t,3)],"dur":round(t-s,3),"words":ws}
    print(cid,f"{s:.2f}-{t:.2f}  {t-s:.2f}s  {len(ws)} kata  tepi {20*np.log10(E[int(a*100)]+1e-9):.0f}/{20*np.log10(E[min(n-1,int(b*100))]+1e-9):.0f} dB")
json.dump(out,open(HERE+"/clips.json","w"),ensure_ascii=False,indent=1)
