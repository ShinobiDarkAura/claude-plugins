#!/usr/bin/env python3
"""lipcheck.py <take.mp4> <words.json> [-o lips.png] — step 5: does the actor's mouth move on every line?

Seedance sometimes plays a line over a closed mouth. Groups the words into lines (a gap of 0.6 s+ starts a new one),
tiles the mouth region at 5 fps across each line with the time on every tile, and saves one sheet. Read it: a line
whose tiles show a shut mouth goes in the ad's "mute" list (silenced and uncaptioned) — it reads better as a silent
reaction than as a dub. Cut a line rather than fight it.
"""
import sys, os, json, subprocess, argparse
from PIL import Image, ImageDraw
SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser(); ap.add_argument('take'); ap.add_argument('words'); ap.add_argument('-o', default='lips.png'); a = ap.parse_args()

src, bin_ = f"{SKILL}/scripts/facey.swift", f"{SKILL}/scripts/bin/facey"   # the face finder, shared with compose.py
if not os.path.exists(bin_): os.makedirs(f"{SKILL}/scripts/bin", exist_ok=True); subprocess.run(['swiftc', '-O', src, '-o', bin_], check=True, capture_output=True)
fy, fh = map(float, subprocess.run([bin_, a.take], capture_output=True, text=True).stdout.split()[:2])
my = max(0.0, fy + fh * 0.15)   # mouth band: just below the face centre

ws = [w for w in json.load(open(a.words))['words'] if w['start'] < 29.9]; lines, cur = [], []
for w in ws:
    if cur and w['start'] - cur[-1]['end'] > 0.6: lines.append(cur); cur = []
    cur.append(w)
if cur: lines.append(cur)
rows = []
for ln in lines:
    t0, t1 = max(0, ln[0]['start'] - 0.2), ln[-1]['end'] + 0.2; n = max(1, int((t1 - t0) * 5))
    tmp = f"/tmp/lip-{os.getpid()}.png"
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t0}', '-t', f'{t1 - t0}', '-i', a.take, '-vf',
                    f"fps=5,crop=iw*0.5:ih*{fh * 0.6:.3f}:iw*0.25:ih*{my:.3f},scale=150:-2,tile={min(n, 12)}x{(n + 11) // 12}", '-frames:v', '1', tmp], check=True)
    im = Image.open(tmp).convert('RGB'); d = ImageDraw.Draw(im); tw = im.width // min(n, 12); th = im.height // ((n + 11) // 12)
    for i in range(n): d.text((i % 12 * tw + 3, i // 12 * th + 2), f"{t0 + i * 0.2:.1f}", fill=(255, 255, 0))
    label = Image.new('RGB', (im.width, 18), (30, 30, 30)); ImageDraw.Draw(label).text((4, 3), f"{t0:.1f}s  " + ' '.join(w['word'] for w in ln)[:120], fill='white')
    rows += [label, im]
out = Image.new('RGB', (max(r.width for r in rows), sum(r.height for r in rows)), 'black'); y = 0
for r in rows: out.paste(r, (0, y)); y += r.height
out.save(a.o); print('lines', len(lines), '->', a.o)
