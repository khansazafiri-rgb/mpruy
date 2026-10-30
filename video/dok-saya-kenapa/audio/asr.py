import json,subprocess,numpy as np,sys
from faster_whisper import WhisperModel
def load(p):
    raw=subprocess.run(["ffmpeg","-v","error","-i",p,"-f","f32le","-ac","1","-ar","16000","-"],capture_output=True,check=True).stdout
    return np.frombuffer(raw,dtype=np.float32)
m=WhisperModel("small",device="cpu",compute_type="int8")
out={}
for n in sys.argv[1:]:
    segs,_=m.transcribe(load(n+".mp3"),language="id",beam_size=5,word_timestamps=True,condition_on_previous_text=False)
    out[n]=[{"start":s.start,"end":s.end,"text":s.text.strip(),"words":[{"w":w.word.strip(),"s":w.start,"e":w.end} for w in s.words]} for s in segs]
json.dump(out,open("asr.json","w"),ensure_ascii=False,indent=1)
for n in out:
    print("==",n)
    for s in out[n]: print(f"{s['start']:.2f}-{s['end']:.2f} {s['text']}")
