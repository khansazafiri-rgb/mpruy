"""Mengunduh salinan statis atlas Human Anatomy dari medcoel.com (aset publik: HTML/JS/CSS/font/data/model GLB).
Tidak ada API, akun, atau data pengguna yang diakses. Hasil: <keluaran>/anatomy/viewer/... (sajikan dengan python3 -m http.server 8130).
Satu-satunya perubahan pada salinan: enableDamping dimatikan agar putaran kamera tepat per bingkai (tanpa inersia).
Pakai:  python3 fetch_atlas.py atlas-site"""
import os, re, subprocess, sys
OUT = sys.argv[1] if len(sys.argv) > 1 else 'atlas-site'; B = 'https://medcoel.com'
os.makedirs(OUT, exist_ok=True); os.chdir(OUT)
def get(path):
    out = '.' + path + ('index.html' if path.endswith('/') else '')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if os.path.exists(out) and os.path.getsize(out) > 0: return out
    r = subprocess.run(['curl', '-sS', '-m', '180', '-f', '-o', out, B + path], capture_output=True, text=True)
    return out if r.returncode == 0 else None
seen, q = set(), ['/anatomy/viewer/']
while q:
    p = q.pop()
    if p in seen: continue
    seen.add(p); f = get(p)
    if not f or not re.search(r'\.(html|js|css)$', f): continue
    txt = open(f, errors='ignore').read()
    for m in re.finditer(r'/anatomy/viewer/[A-Za-z0-9_./\-@]+\.[A-Za-z0-9]+', txt): q.append(m.group(0))
    if f.endswith(('.js', '.css')):
        for m in re.finditer(r'[\'"`(]((?:\./|\.\./)?[A-Za-z0-9_\-/]+\.(?:glb|wasm|woff2|webp|png|svg|json|js))[\'"`)]', txt): q.append('/anatomy/viewer/' + m.group(1).lstrip('./'))
for known in ['models/skeletal', 'models/muscular', 'models/cardiovascular', 'models/lymphatic', 'models/nervous', 'models/joints', 'models/visceral']:
    get('/anatomy/viewer/' + known + '.glb')
for known in ['draco/draco_decoder.wasm', 'draco/draco_wasm_wrapper.js', 'draco/draco_decoder.js', 'brand/logo-full.webp', 'brand/logo-mark.webp']: get('/anatomy/viewer/' + known)
js = [os.path.join('anatomy/viewer/assets', n) for n in os.listdir('anatomy/viewer/assets') if n.startswith('index-') and n.endswith('.js')][0]
s = open(js).read(); n = s.count('c.enableDamping=!0'); open(js, 'w').write(s.replace('c.enableDamping=!0', 'c.enableDamping=!1')); print('damping dimatikan pada', n, 'tempat')
