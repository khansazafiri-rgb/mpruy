import json,sys,subprocess,os
out=sys.argv[1]; dst=sys.argv[2]
d=json.load(open(out+'/frames.json'))
fr=d['frames']; w0=d['wall0']
# waktu video frame = tstart + (ts - ts_first_wall); ts memakai jam wall yang sama dengan Date.now()/1000
t=[f['ts']-w0 for f in fr]
# frame pertama bisa sebelum w0 (kecil); jepit ke 0
t=[max(0,x) for x in t]
end=d['tend']-d['tstart']
lines=[]
for i,f in enumerate(fr):
    nxt=t[i+1] if i+1<len(fr) else end
    dur=max(0.001,nxt-t[i])
    lines.append(f"file '{os.path.abspath(out)}/{f['file']}'\nduration {dur:.4f}")
lines.append(f"file '{os.path.abspath(out)}/{fr[-1]['file']}'")
open(out+'/concat.txt','w').write('\n'.join(lines))
subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',out+'/concat.txt','-vf','fps=30,crop=960:1180:0:0,format=yuv420p','-c:v','libx264','-crf','16','-preset','fast',dst],check=True)
print('ok',dst, 'frames',len(fr),'span',t[0],t[-1],'end',end)
