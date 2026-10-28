# Mencocokkan tiap klip hasil potong dengan naskah (ASR ulang per klip) supaya tidak ada ucapan terpotong atau tertukar.
import json,difflib,re,subprocess,numpy as np,os
from faster_whisper import WhisperModel
HERE=os.path.dirname(os.path.abspath(__file__))
S=json.load(open(HERE+"/script.json")); C=json.load(open(HERE+"/clips.json"))
norm=lambda t:re.sub(r"[^a-z ]","",t.lower().replace("medcoel","med koel")).split()
m=WhisperModel("small",device="cpu",compute_type="int8")
bad=0
for cid in S:
    raw=subprocess.run(["ffmpeg","-v","error","-i",f"{HERE}/clips/{cid}.wav","-f","f32le","-ac","1","-ar","16000","-"],capture_output=True,check=True).stdout
    segs,_=m.transcribe(np.frombuffer(raw,dtype=np.float32),language="id",beam_size=5,condition_on_previous_text=False)
    got=" ".join(s.text for s in segs)
    r=difflib.SequenceMatcher(None,norm(S[cid]),norm(got)).ratio()
    print(f"{cid} {r:.2f}  {got.strip()}")
    if r<0.8: bad+=1
print("MASALAH" if bad else "semua klip cocok dengan naskah (kemiripan >= 0,80; selisih kecil = salah dengar ASR)")
