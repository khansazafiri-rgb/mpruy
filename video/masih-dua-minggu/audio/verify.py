import json,subprocess,numpy as np
from faster_whisper import WhisperModel
m=WhisperModel("small",device="cpu",compute_type="int8")
meta=json.load(open('clips.json'))
for k,v in meta.items():
    raw=subprocess.run(["ffmpeg","-v","error","-i",f"clips/{k}.wav","-f","f32le","-ac","1","-ar","16000","-"],capture_output=True,check=True).stdout
    x=np.frombuffer(raw,dtype=np.float32)
    segs,_=m.transcribe(x,language="id",beam_size=5,condition_on_previous_text=False)
    print(k,v['dur'],'|',' '.join(s.text.strip() for s in segs),'| ',v['text'])
