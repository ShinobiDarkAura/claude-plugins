#!/usr/bin/env python3
"""compose.py <name>.ad.json — step 9: build a 30 s reaction ad: the actor's take on top, the filmed gameplay below, the game's
place bar straddling the seam, one-word captions timed to the take's own audio (curses bleeped and shown as #####),
the game's sound ducked under the voice, and the "18+ • AI Actor" footer.

Paths in ad.json are relative to the ad.json. The game's look (layout, caption font, footer, curse list, game
sound) comes from reference/games/<profile>.json. Example and every field: reference/ad.example.json.
"""
import sys, os, json, subprocess, statistics, tempfile
from PIL import Image, ImageDraw, ImageFont

SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AD = os.path.abspath(sys.argv[1]); BASE = os.path.dirname(AD); cfg = json.load(open(AD))
P = json.load(open(f"{SKILL}/reference/games/{cfg['profile']}.json"))
rel = lambda p: p if os.path.isabs(p) else os.path.normpath(os.path.join(BASE, p))
sk = lambda p: p if os.path.isabs(p) else os.path.join(SKILL, p)
face, film, out = rel(cfg['face']), rel(cfg['gameplay']), rel(cfg['out'])
DUR = float(cfg.get('duration', 30)); W = tempfile.mkdtemp(prefix='reaction-')
H = P['top_height']; B = 1920 - H; y0 = P['game_bottom'] - B
trace = json.load(open(rel(cfg['trace']))) if cfg.get('trace') else None
HUD_UNTIL = cfg.get('hud_until') or (trace or {}).get('finished') or DUR   # the place bar leaves when the race ends


def swift_tool(name):
    """facey / facetrack are tiny Vision scripts; compile once into scripts/bin."""
    src, bin_ = f"{SKILL}/scripts/{name}.swift", f"{SKILL}/scripts/bin/{name}"
    if not os.path.exists(bin_) or os.path.getmtime(bin_) < os.path.getmtime(src):
        os.makedirs(os.path.dirname(bin_), exist_ok=True)
        subprocess.run(['swiftc', '-O', src, '-o', bin_], check=True, capture_output=True)
    return bin_


def track_y():
    """Opt-in face-follow: median-filtered, smoothed, piecewise-linear crop over time. Default is a FIXED crop —
    a face drifting part-way out of frame reads as a real phone recording."""
    pts = [tuple(map(float, l.split())) for l in subprocess.run([swift_tool('facetrack'), face, '0.5'], capture_output=True, text=True).stdout.splitlines() if l.strip()]
    ts = [t for t, _ in pts]; ys = [statistics.median([y for _, y in pts[max(0, i - 2):i + 3]]) for i in range(len(pts))]
    ys = [sum(ys[max(0, i - 3):i + 4]) / len(ys[max(0, i - 3):i + 4]) for i in range(len(ys))]
    cy = [max(0, min(1920 - H, int(y * 1920 - H / 2))) for y in ys]
    kt, ky = ts[::2], cy[::2]; e = str(ky[-1])
    for i in range(len(kt) - 2, -1, -1):
        e = f"if(lt(t,{kt[i + 1]:.2f}),{ky[i]}+({ky[i + 1]}-{ky[i]})*(t-{kt[i]:.2f})/{kt[i + 1] - kt[i]:.2f},{e})"
    return e


crop = cfg.get('crop')
if crop == 'track': crop_y = track_y()
elif isinstance(crop, int): crop_y = crop   # fixed, e.g. lower it so someone walking behind stays in shot
else:
    fy = float(subprocess.run([swift_tool('facey'), face], capture_output=True, text=True).stdout.split()[0])
    crop_y = max(0, min(1920 - H, int(fy * 1920 - H / 2)))

# ---- captions: one word per card, timed to the take's own words
words = json.load(open(rel(cfg['words'])))['words']
C = P['caption']; canvas = lambda: Image.new('RGBA', (1080, 1920), (0, 0, 0, 0))
cfont = ImageFont.truetype(sk(C['font']), C['size'], index=C.get('index', 0))


def card(text, path):
    im = canvas(); d = ImageDraw.Draw(im); f = cfont
    while d.textbbox((0, 0), text, font=f, stroke_width=C['stroke'])[2] > C['max_width']: f = f.font_variant(size=f.size - 6)
    b = d.textbbox((0, 0), text, font=f, stroke_width=C['stroke'])
    d.text(((1080 - b[2]) / 2, C['center_y'] - b[3] / 2), text, font=f, fill=C['fill'], stroke_width=C['stroke'], stroke_fill=C['stroke_fill']); im.save(path)


CURSE = set(P['curses']) | set(cfg.get('bleep_words', [])); SLANG = {**P.get('slang', {}), **cfg.get('caption_overrides', {})}
MUTE = [tuple(m) for m in cfg.get('mute', [])]   # stretches the take got wrong (a stage direction read aloud, unsynced lips): silenced, uncaptioned
ov, bleeps = [], []
for i, w in enumerate(words):
    if any(a <= w['start'] < b for a, b in MUTE) or w['start'] >= DUR: continue
    raw = w['word'].lower().strip('.,!?'); nxt = words[i + 1]['start'] if i + 1 < len(words) else DUR
    if raw in CURSE or any(raw.startswith(c) for c in P.get('curse_prefixes', [])):
        t = '#####'; bleeps.append((w['start'] - 0.02, max(w['end'], w['start'] + 0.3) + 0.03))
    else: t = SLANG.get(raw, raw)
    p = f"{W}/w{i}.png"; card(t, p); ov.append((p, w['start'], min(w['end'] + 0.35, nxt)))

# ---- footer: the AI-actor disclosure, on every ad
Fo = P['footer']; im = canvas(); d = ImageDraw.Draw(im)
fonts = {k: ImageFont.truetype(sk(v['file']), Fo['size'], index=v.get('index', 0)) for k, v in Fo['fonts'].items()}
parts = [(t, fonts[k]) for t, k in Fo['parts']]; ws = [d.textbbox((0, 0), t, font=f)[2] for t, f in parts]; x = (1080 - sum(ws)) / 2
for (t, f), w_ in zip(parts, ws): d.text((x + 2, Fo['y'] + 2), t, font=f, fill=(0, 0, 0, 110)); d.text((x, Fo['y']), t, font=f, fill='white'); x += w_
im.save(f"{W}/footer.png"); ov.append((f"{W}/footer.png", 0, DUR + 1))

# ---- game sound: the profile's builder (from the race trace), else silence
gs = f"{W}/game.wav"
if P.get('gamesound') and trace:
    subprocess.run(['python3', sk(P['gamesound']), rel(cfg['trace']), gs, str(DUR)] + [str(x) for x in cfg.get('lost', [])], check=True, capture_output=True)
else:
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', f'anullsrc=r=44100:cl=stereo', '-t', str(DUR), gs], check=True)

# ---- picture
hx, hy, hh = P['hud_strip']; mute = '+'.join(f"between(t,{a:.2f},{b:.2f})" for a, b in bleeps) or '0'
# crop in yuv444p: in 4:2:0 an odd panel height (845) rounds down to an even one, and the frame comes out 1918 tall
fc = [f"[0:v]scale=1080:1920,setsar=1,fps=60,format=yuv444p,crop=1080:{H}:0:'{crop_y}'[top]",
      f"[1:v]fps=60,setsar=1,format=yuv444p,tpad=stop_mode=clone:stop_duration=5,split[s][h];[s]crop=1080:{B}:0:{y0}[game];[h]crop=1080:{hh}:{hx}:{hy}[hud]",
      "[top][game]vstack[st]", f"[st][hud]overlay=0:{H + P['hud_offset']}:enable='between(t,0,{HUD_UNTIL:.2f})'[v0]"]
last = 'v0'
for i, (p, a, b) in enumerate(ov):
    fc.append(f"[{last}][{i + 3}:v]overlay=enable='between(t,{a:.3f},{b:.3f})'[o{i}]"); last = f'o{i}'
# ---- sound: voice (bleeps = silence + 1 kHz tone), game sound ducked under the voice
silent = '+'.join([mute] + [f"between(t,{a:.2f},{b:.2f})" for a, b in MUTE])
fc.append(f"[0:a]aresample=44100,volume=enable='{silent}':volume=0[vx]")
fc.append(f"sine=frequency=1000:sample_rate=44100:duration={DUR},volume=0.35,volume=enable='not({mute})':volume=0[bp]")
fc.append(f"[2:a]volume=0.6[g];[vx]asplit[v1][v2];[g][v2]sidechaincompress=threshold=0.03:ratio=5:attack=20:release=250[gd];[v1][gd][bp]amix=inputs=3:duration=first:normalize=0[a]")
open(f"{W}/fc.txt", 'w').write(';\n'.join(fc))
args = ['ffmpeg', '-v', 'error', '-y', '-i', face, '-i', film, '-i', gs]
for p, _, _ in ov: args += ['-i', p]
os.makedirs(os.path.dirname(out), exist_ok=True)
subprocess.run(args + ['-/filter_complex', f"{W}/fc.txt", '-map', f'[{last}]', '-map', '[a]', '-t', str(DUR), '-r', '60', '-c:v', 'libx264', '-crf', '18',
                       '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], check=True)
print('done', out, '| hud until', HUD_UNTIL, '| bleeps', [(round(a, 2), round(b, 2)) for a, b in bleeps], '| crop', 'track' if crop == 'track' else crop_y)
