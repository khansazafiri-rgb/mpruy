# Mengubah hasil screencast (frame berinterval tak tetap) menjadi urutan JPG 30 fps untuk panggung.
#   python3 assemble.py <folder-rekaman> <folder-keluar>     frame i = waktu video (tstart + i/30)
import json,sys,subprocess,os
out=sys.argv[1]; dst=sys.argv[2]; os.makedirs(dst,exist_ok=True)
d=json.load(open(out+'/frames.json')); fr=d['frames']; w0=d['wall0']
t=[max(0,f['ts']-w0) for f in fr]; end=d['tend']-d['tstart']
lines=[]
for i,f in enumerate(fr):
    nxt=t[i+1] if i+1<len(fr) else end
    lines.append(f"file '{os.path.abspath(out)}/{f['file']}'\nduration {max(0.001,nxt-t[i]):.4f}")
lines.append(f"file '{os.path.abspath(out)}/{fr[-1]['file']}'")
open(out+'/concat.txt','w').write('\n'.join(lines))
subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',out+'/concat.txt','-vf','fps=30,crop=960:1180:0:0','-q:v','3','-start_number','0',dst+'/%05d.jpg'],check=True)
n=len([x for x in os.listdir(dst) if x.endswith('.jpg')])
json.dump({'tstart':d['tstart'],'n':n,'first':t[0]},open(dst+'/meta.json','w'))
print('ok',dst,'frame',n,'awal',round(t[0],2),'tstart',d['tstart'])
