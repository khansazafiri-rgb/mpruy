"""Original quiet instrumental score and sparse synthetic accents (CC0).

No samples, melodies or audio from reference videos are used.
"""
from pathlib import Path
import wave,json
import numpy as np
P=Path(__file__).resolve().parent;SR=48000;D=87.5;N=round(SR*D)
def read(p):
 with wave.open(str(p))as w:r=w.getframerate();x=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(np.float64)/32768
 return np.interp(np.arange(N)/SR,np.arange(len(x))/r,x,left=0,right=0)
def write(p,x):
 with wave.open(str(p),'wb')as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((np.clip(x,-1,1)*32767).astype(np.int16).tobytes())
voice=read(P/'audio/narasi-timeline.wav');music=np.zeros(N);sfx=np.zeros(N)
def add(buf,t,x):
 n=round(t*SR);k=min(len(x),len(buf)-n)
 if k>0:buf[n:n+k]+=x[:k]
def tone(freq,d=2.4):
 t=np.arange(round(SR*d))/SR;env=(1-np.exp(-t*35))*np.exp(-t*2.5)
 return env*(np.sin(2*np.pi*freq*t)+.2*np.sin(2*np.pi*freq*2*t)+.055*np.sin(2*np.pi*freq*3*t))
# New sparse pentatonic motif over a four-chord original bed.
chords=[[48,52,55],[45,48,52],[41,45,48],[43,47,50]]
for k,t0 in enumerate(np.arange(0,D,3.2)):
 c=chords[(k//2)%4]
 for j,note in enumerate(c):add(music,t0+j*.19,.0025*tone(440*2**((note+12-69)/12),3.1))
 if k%2==0:add(music,t0+.92,.002*tone(440*2**((c[(k//2)%3]+24-69)/12),1.9))
# Attack/release ducking under narration; no processing of the narration stem.
block=4800;lev=np.array([np.sqrt(np.mean(voice[i:i+block]**2))for i in range(0,N,block)])
duck=np.interp(np.arange(N),np.arange(len(lev))*block,np.where(lev>.012,.28,.8))
music*=duck;music*=np.minimum(1,np.arange(N)/(SR*1.2))*np.minimum(1,(N-np.arange(N))/(SR*1.8))
events=[(1.55,'jam'),(7.8,'penampang'),(14.25,'sinyal'),(41.02,'netralisasi'),(45.74,'pompa')]
for t0,name in events:
 t=np.arange(int(SR*.18))/SR
 if name=='jam':x=np.sin(2*np.pi*850*t)*np.exp(-t*55)*.006
 elif name=='penampang':x=(np.sin(2*np.pi*(260*t+500*t*t)))*np.sin(np.pi*t/.18)**2*.004
 elif name=='sinyal':x=np.sin(2*np.pi*620*t)*np.exp(-t*28)*.004
 elif name=='netralisasi':x=(np.sin(2*np.pi*710*t)+.25*np.sin(2*np.pi*1065*t))*np.exp(-t*26)*.004
 else:x=(np.sin(2*np.pi*390*t)+.3*np.sin(2*np.pi*780*t))*np.exp(-t*40)*.005
 add(sfx,t0,x)
music*=12;sfx*=2
mix=voice+music+sfx;assert max(abs(mix))<1,'Mix would clip; lower score, do not normalize voice'
write(P/'audio/musik-orisinal.wav',music);write(P/'audio/sfx-orisinal.wav',sfx);write(P/'audio/master-video.wav',mix)
active=np.repeat(lev>.012,block)[:N];vr=np.sqrt(np.mean(voice[active]**2));br=np.sqrt(np.mean((music+sfx)[active]**2))
(P/'audio-mix.json').write_text(json.dumps(dict(duration=D,sampleRate=SR,musicLicense='CC0 1.0; original procedural score authored for this video',sfxLicense='CC0 1.0; original synthesis, no external samples',ducking=True,narrationVsBackgroundDB=float(20*np.log10(vr/br)),peak=float(max(abs(mix))),events=[dict(time=t,name=n)for t,n in events]),indent=2)+'\n')
print('Original score/SFX mixed below narration by',round(20*np.log10(vr/br),1),'dB; peak',round(max(abs(mix)),4))
