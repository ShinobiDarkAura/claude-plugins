#!/usr/bin/env python3
"""Offline check run by the Pipelines workflow: every Python script compiles, every shell script parses, every JSON
loads, and each game profile has the keys and files compose.py reads. Spends nothing, needs no keys."""
import os, sys, json, glob, subprocess
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); bad = []
for f in glob.glob(f"{root}/**/*.py", recursive=True):
    try: compile(open(f).read(), f, 'exec')
    except SyntaxError as e: bad.append(f"{f}: {e}")
for f in glob.glob(f"{root}/**/*.sh", recursive=True):
    if subprocess.run(['bash', '-n', f], capture_output=True).returncode: bad.append(f"{f}: shell syntax")
for f in glob.glob(f"{root}/**/*.json", recursive=True):
    try: json.load(open(f))
    except Exception as e: bad.append(f"{f}: {e}")
NEED = ['top_height', 'game_bottom', 'hud_strip', 'hud_offset', 'caption', 'curses', 'footer']
for f in glob.glob(f"{root}/reference/games/*.json"):
    miss = [k for k in NEED if k not in json.load(open(f))]
    if miss: bad.append(f"{f}: missing {miss}")
    P = json.load(open(f)); files = [P.get('gamesound')] + [v['file'] for v in P.get('footer', {}).get('fonts', {}).values()]
    bad += [f"{f}: no file {p}" for p in files if p and not os.path.isabs(p) and not os.path.exists(os.path.join(root, p))]   # system fonts are absolute: not checked
print('\n'.join(bad) or 'selfcheck ok'); sys.exit(1 if bad else 0)
