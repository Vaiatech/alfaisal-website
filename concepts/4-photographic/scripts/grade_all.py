#!/usr/bin/env python3
"""Download (if needed) and grade every photograph into one look.
Usage: python3 -I scripts/grade_all.py   (run from the concept folder)"""
import json, os, sys, subprocess
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))
from PIL import Image
import grade
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cfg = json.load(open(os.path.join(root, 'scripts/media.json')))
raw = os.path.join(root, 'media-src/raw'); out = os.path.join(root, 'media-src/graded')
os.makedirs(raw, exist_ok=True); os.makedirs(out, exist_ok=True)
only = set(sys.argv[1:])
for it in cfg['images']:
    if only and it['slug'] not in only: continue
    rp = os.path.join(raw, it['id'] + '.img')
    if not os.path.exists(rp) or os.path.getsize(rp) < 5000:
        for ext in ('jpeg', 'jpg', 'png'):
            url = f"https://images.pexels.com/photos/{it['id']}/pexels-photo-{it['id']}.{ext}?auto=compress&w=2600"
            subprocess.run(['curl', '-sS', '-o', rp, url])
            if os.path.getsize(rp) > 5000: break
    im = Image.open(rp).convert('RGB')
    if im.width > 2400: im = im.resize((2400, round(im.height * 2400 / im.width)), Image.LANCZOS)
    kw = {k: it[k] for k in ('exposure', 'gnd', 'gnd_to', 'gnd_side', 'mix', 'lift', 'vignette') if k in it}
    g = grade.grade_img(im, **kw)
    g.save(os.path.join(out, it['slug'] + '.png'))
    print(it['slug'], g.size)
