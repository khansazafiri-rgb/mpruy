"""Merakit Reel POV "Baru nemu web belajar FK gratis" (Live 4D Lab) 1080x1920 30 fps dari rekaman ponsel POV asli menurut edl.json.
Pemakaian (dari akar repo): python3 video/pov-live-4d-lab/build.py <folder-rekaman>   (20261111_231920.mp4 dan 20261111_231238.mp4 dari Drive)"""
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); RAW = sys.argv[1]; OUT = os.path.join(HERE, 'shots'); os.makedirs(OUT, exist_ok=True)
SRC = {'r231920': '20261111_231920.mp4', 'r231238': '20261111_231238.mp4'}
edl = json.load(open(os.path.join(HERE, 'edl.json'))); T = edl['total']
def run(c): subprocess.run(c, check=True)
# koreksi ringan untuk rekaman gelap: kurangi kedipan layar (deflicker), noise (hqdn3d), angkat bayangan sedikit (gamma) dan sedikit ketajaman; tetap bernuansa ruangan nyata
FIX = "deflicker=size=5:mode=pm,hqdn3d=2.5:2:4:3,eq=gamma=1.22:contrast=1.05:saturation=1.08,unsharp=5:5:0.5"
def shot(i, s):
    o = os.path.join(OUT, f'shot{i}.mp4'); d = s['dur']; cx, cy, cw, ch = s['crop']
    vf = f"fps=30,crop={cw}:{ch}:{cx}:{cy},scale=1080:1920:flags=lanczos,{FIX}"
    run(['ffmpeg', '-v', 'error', '-y', '-ss', f"{s['t']}", '-t', f'{d + 0.05}', '-i', os.path.join(RAW, SRC[s['src']]), '-vf', vf, '-an', '-t', f'{d}', '-r', '30', '-c:v', 'libx264', '-crf', '15', '-pix_fmt', 'yuv420p', o]); return o
def main():
    outs = [shot(i, s) for i, s in enumerate(edl['shots'])]; lst = os.path.join(OUT, 'list.txt'); open(lst, 'w').write(''.join(f"file '{p}'\n" for p in outs))
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', os.path.join(OUT, 'tanpa-teks.mp4')])
def final():
    ov = os.path.join(HERE, 'overlay'); cmd = ['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(OUT, 'tanpa-teks.mp4')]
    for t in edl['teks']: cmd += ['-loop', '1', '-framerate', '30', '-t', f'{T}', '-i', os.path.join(ov, t['id'] + '.png')]
    parts = []; prev = '[0:v]'
    for i, t in enumerate(edl['teks'], 1):
        parts.append(f"[{i}:v]format=rgba,fade=t=in:st={t['at']:.3f}:d=0.16:alpha=1,fade=t=out:st={t['to'] - 0.12:.3f}:d=0.12:alpha=1[o{i}]"); parts.append(f"{prev}[o{i}]overlay=0:0:shortest=1[v{i}]"); prev = f'[v{i}]'
    n = len(edl['teks'])
    cmd += ['-i', os.path.join(HERE, 'audio', 'mix.wav'), '-filter_complex', ';'.join(parts), '-map', prev, '-map', f'{n + 1}:a', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=7', '-ar', '44100', '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-t', f'{T}', '-movflags', '+faststart', os.path.join(HERE, 'medcoel-pov-live-4d-lab.mp4')]
    run(cmd)
main(); final()
