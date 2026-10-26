#!/usr/bin/env python3
"""take.py <name> <url-or-file> --fal-words fal.json [--dir takes] — step 4: bring in a finished actor take and read its beats.

Saves <dir>/<name>.mp4, writes Whisper word timings to <dir>/<name>-words.json, prints the words with
times and the loud onsets (flinches, shouts — where crashes and place changes belong), and writes a 1-per-second
contact sheet <dir>/<name>-sheet.png to check the take (frozen people, a visible phone, the look-to-camera ending).

Whisper drifts on whispered, shouted and long words, and invents a repeat of the last line at 30.0 s: check the
times against the onsets, fix the words file by hand (SKILL.md, step 6), and drop anything at >= 29.9 s.

--fal-words F is the result of fal-ai/whisper (chunk_level "word") that Claude ran through Joystick and saved to F
(SKILL.md, step 4). This script calls no API.
"""
import sys, os, json, subprocess, urllib.request, argparse
import numpy as np

ap = argparse.ArgumentParser(); ap.add_argument('name'); ap.add_argument('src'); ap.add_argument('--dir', default='takes')
ap.add_argument('--fal-words', required=True, help='the saved fal-ai/whisper result (SKILL.md, step 4)')
a = ap.parse_args(); os.makedirs(a.dir, exist_ok=True)
mp4, words = f"{a.dir}/{a.name}.mp4", f"{a.dir}/{a.name}-words.json"
if a.src.startswith('http'): urllib.request.urlretrieve(a.src, mp4)
elif os.path.abspath(a.src) != os.path.abspath(mp4): subprocess.run(['cp', a.src, mp4], check=True)
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], capture_output=True, text=True).stdout)
print('duration', dur)

# fal-ai/whisper: {"text", "chunks": [{"timestamp": [start, end], "text"}]}; the last end can be null
f = json.load(open(a.fal_words))
ws = [{'word': c['text'].strip(), 'start': c['timestamp'][0], 'end': c['timestamp'][1] if c['timestamp'][1] is not None else dur}
      for c in f.get('chunks') or [] if c['text'].strip() and c['timestamp'][0] is not None]
if not ws: sys.exit(f'{a.fal_words}: no word chunks; run fal-ai/whisper with chunk_level "word"')
d = {'text': f.get('text', ''), 'words': ws, 'source': 'fal-ai/whisper'}
json.dump(d, open(words, 'w'))
print('WORDS:', ' '.join(f"{w['word']}@{w['start']:.1f}" for w in d.get('words', [])))

o = subprocess.run(['ffmpeg', '-v', 'error', '-i', mp4, '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], capture_output=True).stdout
x = np.frombuffer(o, np.int16).astype(np.float32); w = 800
rms = np.array([np.sqrt((x[i:i + w] ** 2).mean()) for i in range(0, len(x) - w, w)]); thr = np.percentile(rms, 85)
print('LOUD ONSETS:', ' '.join(f"{i / 10:.1f}" for i in range(1, len(rms)) if rms[i] > thr and rms[i - 1] <= thr))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-vf', 'fps=1,scale=160:-2,tile=10x3', '-frames:v', '1', f"{a.dir}/{a.name}-sheet.png"], check=True)
print('sheet', f"{a.dir}/{a.name}-sheet.png")
