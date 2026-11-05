# Perbandingan v6 | revisi (v7) | acuan pada ukuran organ dan posisi yang sama (koordinat acuan), plus crop badan dan pangkal pulmonalis.
# Pemakaian: python3 bandingkan7.py acuan.jpg v6.png v7.png keluaran_dir   (v6.png dan v7.png: render skala 2, y mulai 200)
import sys
from PIL import Image, ImageDraw, ImageFont
ref_p, v6_p, v7_p, outd = sys.argv[1:5]
F = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', s)
ref = Image.open(ref_p).convert('RGB'); ref = ref.crop((0, 0, ref.width // 2, ref.height))
v6 = Image.open(v6_p).convert('RGB'); v7 = Image.open(v7_p).convert('RGB')
Y0 = 200
def crop(box, scale, src):
    x0, y0, x1, y1 = box
    if src is ref: im = ref.crop(box)
    else: im = src.crop((x0 * 2, (y0 - Y0) * 2, x1 * 2, (y1 - Y0) * 2))
    return im.resize((int((x1 - x0) * scale), int((y1 - y0) * scale)), Image.LANCZOS)
def sheet(box, scale, path, head=34, gap=8):
    ims = [crop(box, scale, s) for s in (v6, v7, ref)]
    w, h = ims[0].size
    S = Image.new('RGB', (w * 3 + gap * 2, h + head), (22, 22, 26)); d = ImageDraw.Draw(S)
    for i, (im, t) in enumerate(zip(ims, ['v6', 'revisi baru (v7)', 'acuan (gaya saja)'])):
        S.paste(im, (i * (w + gap), head)); d.text((i * (w + gap) + 8, 7), t, fill=(238, 238, 238), font=F(18))
    S.save(path); return S.size
print('organ', sheet((0, 200, 572, 1100), 1.0, f'{outd}/v7-perbandingan-v6-v7-acuan.png'))
print('badan penuh', sheet((30, 540, 545, 1075), 2.0, f'{outd}/v7-crop-badan-penuh.png'))
print('pangkal penuh', sheet((220, 560, 530, 740), 2.0, f'{outd}/v7-crop-pangkal-penuh.png'))
# lebar HP: tiap crop selebar 390 px (lebar layar), disusun vertikal v6 / v7 / acuan
def hp(box, path):
    ims = [crop(box, 390 / (box[2] - box[0]), s) for s in (v6, v7, ref)]
    w, h = ims[0].size; head = 26
    S = Image.new('RGB', (w, (h + head) * 3), (22, 22, 26)); d = ImageDraw.Draw(S)
    for i, (im, t) in enumerate(zip(ims, ['v6', 'revisi baru (v7)', 'acuan (gaya saja)'])):
        S.paste(im, (0, i * (h + head) + head)); d.text((6, i * (h + head) + 4), t, fill=(238, 238, 238), font=F(16))
    S.save(path); return S.size
print('hp badan', hp((30, 540, 545, 1075), f'{outd}/v7-crop-hp-badan.png'))
print('hp pangkal', hp((220, 560, 530, 740), f'{outd}/v7-crop-hp-pangkal.png'))
