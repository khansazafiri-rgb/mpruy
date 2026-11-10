"""Merakit video "Live 4D Lab" 1080x1920 30 fps dari rekaman layar asli (Drive) menurut edl.json.
Pemakaian (dari akar repo):  python3 video/live-4d-lab/build.py <folder-rekaman>   (berisi r5323/r5523/r5843/r5944.mov = unduhan Drive, lihat README)
Langkah: (1) potong+crop tiap shot -> shots/*.mp4 (2) gabung (3) overlay teks/label (overlay/*.png) (4) audio (audio/mix.wav) -> hasil.
"""
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); RAW = sys.argv[1]; OUT = os.path.join(HERE, 'shots'); os.makedirs(OUT, exist_ok=True)
SRC = {'r5323': 'rec_23.53.24.mov', 'r5523': 'rec_23.55.23.mov', 'r5843': 'rec_23.58.43.mov', 'r5944': 'rec_23.59.44.mov'}
edl = json.load(open(os.path.join(HERE, 'edl.json')))
BG = '0x061C24'
def run(cmd): subprocess.run(cmd, check=True)
def sh(i, s):
    f = os.path.join(RAW, SRC[s['src']]); o = os.path.join(OUT, f'shot{i}.mp4'); d = s['dur']
    base = ['ffmpeg', '-v', 'error', '-y', '-ss', f"{s['t']}", '-t', f'{d + 0.05}', '-i', f]
    if s['layout'] == 'stack':
        tx, ty, tw, th = s['top']; bx, by, bw, bh = s['bot']
        fc = (f"[0:v]fps=30,split=3[a][b][c];[a]crop={tw}:{th}:{tx}:{ty},scale=1080:900:flags=lanczos[t];"
              f"[b]crop={bw}:{bh}:{bx}:{by},scale=1080:400:flags=lanczos[u];"
              f"[c]crop={tw}:{th}:{tx}:{ty},scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=40,eq=brightness=-0.6[bg];[bg][t]overlay=0:190[v1];[v1][u]overlay=0:1098,"
              f"drawbox=x=0:y=1090:w=1080:h=8:color=0xF8C038@0.9:t=fill,drawbox=x=0:y=186:w=1080:h=4:color=0xF8C038@0.9:t=fill[v]")
    elif s['layout'] == 'full':
        cx, cy, cw, ch = s['crop']
        fc = (f"[0:v]fps=30,crop={cw}:{ch}:{cx}:{cy},split=2[a][c];[a]scale=1080:1280:flags=lanczos[t];[c]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=40,eq=brightness=-0.6[bg];[bg][t]overlay=0:190,"
              f"drawbox=x=0:y=186:w=1080:h=4:color=0xF8C038@0.9:t=fill[v]")
    else:   # ui: seluruh antarmuka (zoom pelan) di atas salinan buram
        fc = (f"[0:v]fps=30,split=2[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=30,eq=brightness=-0.35[bgb];"
              f"[b]scale=w='1080*(1+0.22*t/{d})':h=-2:eval=frame:flags=lanczos,crop=1080:607:x='(iw-1080)*0.62':y='(ih-607)*0.5'[ui];"
              f"[bgb][ui]overlay=0:656,drawbox=x=0:y=652:w=1080:h=4:color=0xF8C038@0.9:t=fill,drawbox=x=0:y=1263:w=1080:h=4:color=0xF8C038@0.9:t=fill[v]")
    run(base + ['-filter_complex', fc, '-map', '[v]', '-an', '-t', f'{d}', '-r', '30', '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', o]); return o
def main():
    outs = [sh(i, s) for i, s in enumerate(edl['shots'])]
    # outro: salinan buram bingkai terakhir shot UI
    o = os.path.join(OUT, 'outro.mp4'); u = edl['shots'][6]
    run(['ffmpeg', '-v', 'error', '-y', '-ss', f"{u['t'] + 1.0}", '-i', os.path.join(RAW, SRC[u['src']]), '-frames:v', '1', '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=34,eq=brightness=-0.45', os.path.join(OUT, 'outro-bg.png')])
    run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-framerate', '30', '-t', f"{edl['outro']['dur']}", '-i', os.path.join(OUT, 'outro-bg.png'), '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', o]); outs.append(o)
    lst = os.path.join(OUT, 'list.txt'); open(lst, 'w').write(''.join(f"file '{p}'\n" for p in outs))
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', os.path.join(OUT, 'tanpa-overlay.mp4')])

def final():
    ov = os.path.join(HERE, 'overlay'); T = edl['total']; ins = []; fc = []; chain = '[0:v]'; k = 0
    items = []
    for s in edl['shots']:
        if s.get('teks'): items.append(({'LIHAT JANTUNGNYA BERGERAK': 't1', 'GERAKKAN PROBENYA': 't2', 'LIVE 4D LAB': 't3'}[s['teks']], s['at'] + 0.0, s['at'] + s['dur'] - 0.0))
        if s.get('klinis'): items.append(('klinis', s['at'] + 0.12, s['at'] + s['dur'] - 0.0))
    items.append(('outro', edl['outro']['at'] + 0.15, T))
    cmd = ['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(OUT, 'tanpa-overlay.mp4')]
    for n, a, z in items: cmd += ['-loop', '1', '-framerate', '30', '-t', f'{T}', '-i', os.path.join(ov, n + '.png')]
    parts = []; prev = '[0:v]'
    for i, (n, a, z) in enumerate(items, 1):
        parts.append(f"[{i}:v]format=rgba,fade=t=in:st={a:.3f}:d={0.001 if a < 0.01 else 0.18}:alpha=1,fade=t=out:st={z - 0.15:.3f}:d=0.15:alpha=1[o{i}]")
        parts.append(f"{prev}[o{i}]overlay=0:0:shortest=1[v{i}]"); prev = f'[v{i}]'
    cmd += ['-i', os.path.join(HERE, 'audio', 'mix.wav'), '-filter_complex', ';'.join(parts), '-map', prev, '-map', f'{len(items) + 1}:a', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=7', '-ar', '44100',
            '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-t', f'{T}', '-movflags', '+faststart', os.path.join(HERE, 'medcoel-live-4d-lab.mp4')]
    run(cmd)
main(); final()
