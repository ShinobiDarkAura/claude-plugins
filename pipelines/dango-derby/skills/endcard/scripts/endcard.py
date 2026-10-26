#!/usr/bin/env python3
"""endcard.py: put the one official Dango Derby end card on finished ads, check them, fix old ones.

  endcard.py add   <video or folder>... [--out DIR]   join the card with the ball-roll wipe
  endcard.py check <video or folder>...               is it 1080x1920 and ending on the official card?
  endcard.py fix   <video or folder>...               swap an old 5-cosmetic pink card for the official one

The card is ../assets/endcard-pink-audio.mp4 (7 s, 1080x1920, 60 fps, "3 cosmetics, 1 guaranteed epic").
Nothing here renders a card; every video gets this exact file."""
import os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CARD = os.path.join(HERE, '..', 'assets', 'endcard-pink-audio.mp4')
OLD = os.path.join(HERE, '..', 'assets', 'old-cards')
W, H, CARD_LEN, WIPE = 1080, 1920, 7.0, 0.5
DIGIT = 'crop=34:43:226:1007,format=gray'            # the "3" of "3 cosmetics"
SMALL = 'scale=54:96,format=rgb24'                # colour, so the old lemon card does not pass for pink
SAMPLES = ((3.5, 3.5), (5.0, 2.0), (6.7, 0.3))    # (time in the card, seconds before the end); the card is still by 3.5 s, so a few frames of drift do not matter


def probe(p):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                          '-show_entries', 'format=duration', '-of', 'default=nw=1', p], capture_output=True, text=True).stdout
    kv = dict(l.split('=', 1) for l in out.split() if '=' in l)
    return int(kv.get('width', 0)), int(kv.get('height', 0)), float(kv.get('duration', 0) or 0)


def grab(p, vf, at=None, from_end=None):
    seek = ['-ss', str(at)] if at is not None else ['-sseof', f'-{from_end}']
    return subprocess.run(['ffmpeg', '-v', 'error'] + seek + ['-i', p, '-frames:v', '1', '-vf', vf, '-f', 'rawvideo', '-'],
                          capture_output=True).stdout


def diff(a, b):
    return sum(abs(x - y) for x, y in zip(a, b)) / len(a) if a and len(a) == len(b) else 999


def videos(args):
    for a in args:
        if os.path.isdir(a):
            for d, dirs, files in os.walk(a):
                dirs[:] = sorted(x for x in dirs if x != '_old-endcard')
                yield from (os.path.join(d, f) for f in sorted(files) if f.lower().endswith('.mp4') and not f.startswith('.'))
        elif a.lower().endswith('.mp4'):
            yield a
        else:
            print(f'skip (not an .mp4 or folder): {a}')


def verdict(p):
    """('ok' | 'old-pink' | 'old-lemon' | 'old-giftbox' | 'none' | 'bad-size', detail)"""
    w, h, dur = probe(p)
    if (w, h) != (W, H):
        return 'bad-size', f'{w}x{h}, needs {W}x{H}'
    if dur < CARD_LEN + 0.5:
        return 'none', f'only {dur:.1f} s long'
    layout = max(diff(grab(p, SMALL, from_end=e), grab(CARD, SMALL, at=t)) for t, e in SAMPLES)
    if layout < 6:
        tail = grab(p, DIGIT, from_end=0.3)
        new, old = diff(tail, grab(CARD, DIGIT, at=6.7)), diff(tail, grab(os.path.join(OLD, 'pink-5cosmetics-digit.png'), 'format=gray', at=0))
        return ('ok', 'official card') if new < old else ('old-pink', 'old card that says 5 cosmetics')
    last = grab(p, SMALL, from_end=0.3)
    for name in ('lemon', 'giftbox'):
        if diff(last, grab(os.path.join(OLD, f'{name}-last.png'), 'format=rgb24', at=0)) < 8:
            return f'old-{name}', f'old {name} card'
    return 'none', 'does not end on the official card'


def check(args):
    bad = 0
    for p in videos(args):
        v, why = verdict(p)
        bad += v != 'ok'
        print(f"{'OK  ' if v == 'ok' else 'FAIL'}  {why:34}  {p}")
    print('All good.' if not bad else f'{bad} video(s) need attention.')
    return 1 if bad else 0


def add(args):
    out_dir = None
    if '--out' in args:
        i = args.index('--out'); out_dir = args[i + 1]; args = args[:i] + args[i + 2:]
    failed = 0
    for p in videos(args):
        v, why = verdict(p)
        if v in ('ok', 'old-pink', 'old-lemon', 'old-giftbox'):
            print(f'skip (already has an end card: {why}): {p}'); continue
        w, h, _ = probe(p)
        if h * 9 != w * 16:
            print(f'skip (not vertical 9:16, it is {w}x{h}): {p}'); failed += 1; continue
        d = out_dir or os.path.join(os.path.dirname(p) or '.', 'With End Card')
        os.makedirs(d, exist_ok=True)
        out = os.path.join(d, os.path.basename(p))
        r = subprocess.run([sys.executable, os.path.join(HERE, 'wipecut.py'), p, CARD, out], env={**os.environ, 'KEEP_ANIM_MIX': '1'},
                           capture_output=True, text=True)
        v, why = verdict(out) if r.returncode == 0 else ('error', r.stderr.strip()[-300:])
        failed += v != 'ok'
        print(f"{'done' if v == 'ok' else 'FAILED'}  {out}" + ('' if v == 'ok' else f'  ({why})'))
    return 1 if failed else 0


def fix(args):
    failed = 0
    for p in videos(args):
        v, why = verdict(p)
        if v == 'ok':
            continue
        if v != 'old-pink':
            print(f'cannot fix ({why}): {p}\n      re-make it with "add" from the version without an end card'); failed += 1; continue
        _, _, dur = probe(p)
        keep = dur - CARD_LEN + WIPE                          # everything up to the end of the ball-roll wipe
        tmp = p[:-4] + '.swap.mp4'
        fc = (f'[0:v]trim=0:{keep},setpts=PTS-STARTPTS,fps=60,scale={W}:{H},setsar=1[a];'
              f'[1:v]trim={WIPE},setpts=PTS-STARTPTS,fps=60,scale={W}:{H},setsar=1[b];[a][b]concat=n=2:v=1:a=0[v]')
        r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', p, '-i', CARD, '-filter_complex', fc, '-map', '[v]', '-map', '0:a',
                            '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', tmp])
        if r.returncode or verdict(tmp)[0] != 'ok':
            if os.path.exists(tmp): os.remove(tmp)
            print(f'FAILED  {p}'); failed += 1; continue
        keep_dir = os.path.join(os.path.dirname(p) or '.', '_old-endcard'); os.makedirs(keep_dir, exist_ok=True)
        shutil.move(p, os.path.join(keep_dir, os.path.basename(p))); os.replace(tmp, p)
        print(f'fixed  {p}  (old version kept in _old-endcard/)')
    return 1 if failed else 0


if __name__ == '__main__':
    cmd, rest = (sys.argv[1], sys.argv[2:]) if len(sys.argv) > 2 else (None, [])
    if cmd not in ('add', 'check', 'fix'):
        sys.exit(__doc__)
    sys.exit({'add': add, 'check': check, 'fix': fix}[cmd](rest))
