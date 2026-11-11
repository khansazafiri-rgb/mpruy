"""Merakit video "Atlas 3D + Live 4D Lab" 1080x1920 30 fps menurut edl.json.
Pemakaian (dari akar repo):  python3 video/atlas-4d-promo/build.py <folder-rekaman-drive>   (berisi rec_23.53.24.mov, rec_23.55.23.mov, rec_23.59.44.mov)
Langkah: (1) tiap shot -> shots/*.mp4 (2) gabung (3) overlay teks (overlay/*.png) (4) audio (audio/mix.wav) -> medcoel-atlas-4d.mp4"""
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); RAW = sys.argv[1]; OUT = os.path.join(HERE, 'shots'); os.makedirs(OUT, exist_ok=True)
SRC = {'r5324': 'rec_23.53.24.mov', 'r5523': 'rec_23.55.23.mov', 'r5944': 'rec_23.59.44.mov'}
edl = json.load(open(os.path.join(HERE, 'edl.json'))); T = edl['total']
def run(c): subprocess.run(c, check=True)
BLUR = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=40,eq=brightness=-0.6"
def shot(i, s):
    d = s['dur']; o = os.path.join(OUT, f'shot{i}.mp4'); sp = s.get('speed', 1.0)
    if s.get('web'):
        base = ['ffmpeg', '-v', 'error', '-y', '-framerate', '30', '-start_number', str(s['f0']), '-i', os.path.join(HERE, 'rekam', 'web', s['web'], 'f%04d.jpg')]
        fc = (f"[0:v]fps=30,split=2[a][c];[c]{BLUR}[bg];[a]scale=960:1600:flags=lanczos,drawbox=x=0:y=0:w=960:h=1600:color=0xF8C038:t=6[p];[bg][p]overlay=60:280[v]")
        run(base + ['-filter_complex', fc, '-map', '[v]', '-t', f'{d}', '-r', '30', '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', o]); return o
    f = os.path.join(RAW, SRC[s['src']]); lay = s['layout']
    base = ['ffmpeg', '-v', 'error', '-y', '-ss', f"{s['t']}", '-t', f'{d * sp + 0.05}', '-i', f]
    sc = f"setpts=PTS/{sp}," if sp != 1 else ''
    if lay == 'stack':
        tx, ty, tw, th = s['top']; bx, by, bw, bh = s['bot']; hT = round(1080 * th / tw)
        fc = (f"[0:v]{sc}fps=30,split=3[a][b][c];[a]crop={tw}:{th}:{tx}:{ty},scale=1080:{hT}:flags=lanczos[t];[b]crop={bw}:{bh}:{bx}:{by},scale=1080:400:flags=lanczos[u];"
              f"[c]crop={tw}:{th}:{tx}:{ty},{BLUR}[bg];[bg][t]overlay=0:190[v1];[v1][u]overlay=0:{190 + hT + 8},drawbox=x=0:y=186:w=1080:h=4:color=0xF8C038@0.9:t=fill,drawbox=x=0:y={190 + hT}:w=1080:h=8:color=0xF8C038@0.9:t=fill[v]")
    else:
        cx, cy, cw, ch = s['crop']; hh = round(1080 * ch / cw); y0 = s.get('y0') or max(190, (1920 - hh) // 2 - (60 if lay != 'model' else 0)) if hh < 1500 else 190
        fc = (f"[0:v]{sc}fps=30,crop={cw}:{ch}:{cx}:{cy},split=2[a][c];[a]scale=1080:{hh}:flags=lanczos[t];[c]{BLUR}[bg];[bg][t]overlay=0:{y0}[v]")
    run(base + ['-filter_complex', fc, '-map', '[v]', '-an', '-t', f'{d}', '-r', '30', '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', o]); return o
def main():
    outs = [shot(i, s) for i, s in enumerate(edl['shots'])]
    o = os.path.join(OUT, 'outro.mp4'); bgp = os.path.join(OUT, 'outro-bg.png')
    run(['ffmpeg', '-v', 'error', '-y', '-ss', '9.0', '-i', os.path.join(RAW, SRC['r5523']), '-frames:v', '1', '-vf', "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=34,eq=brightness=-0.45", bgp])
    run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-framerate', '30', '-t', f"{edl['outro']['dur']}", '-i', bgp, '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', o]); outs.append(o)
    lst = os.path.join(OUT, 'list.txt'); open(lst, 'w').write(''.join(f"file '{p}'\n" for p in outs))
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', os.path.join(OUT, 'tanpa-overlay.mp4')])
def final():
    ov = os.path.join(HERE, 'overlay'); items = [('atlas', 5.2, 11.9), ('live', 12.3, 21.6), ('atlas', 21.6, 23.5), ('live', 23.5, 25.6), ('materi', 25.7, 28.4), ('latihan', 28.4, 29.9), ('sim', 29.9, 31.5), ('outro', edl['outro']['at'] + 0.15, T)]
    for s in edl['shots']:
        if s.get('klinis'): items.append(('klinis', s['at'] + 0.1, s['at'] + s['dur']))
    cmd = ['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(OUT, 'tanpa-overlay.mp4')]
    for n, a, z in items: cmd += ['-loop', '1', '-framerate', '30', '-t', f'{T}', '-i', os.path.join(ov, n + '.png')]
    parts = []; prev = '[0:v]'
    for i, (n, a, z) in enumerate(items, 1):
        parts.append(f"[{i}:v]format=rgba,fade=t=in:st={a:.3f}:d=0.18:alpha=1,fade=t=out:st={z - 0.15:.3f}:d=0.15:alpha=1[o{i}]"); parts.append(f"{prev}[o{i}]overlay=0:0:shortest=1[v{i}]"); prev = f'[v{i}]'
    cmd += ['-i', os.path.join(HERE, 'audio', 'mix.wav'), '-filter_complex', ';'.join(parts), '-map', prev, '-map', f'{len(items) + 1}:a', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=7', '-ar', '44100',
            '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-t', f'{T}', '-movflags', '+faststart', os.path.join(HERE, 'medcoel-atlas-4d.mp4')]
    run(cmd)
main(); final()
