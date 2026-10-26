# build.py <you-final.json> <out.wav> <duration> [lost_place_t ...] : in-game soundtrack from the race log
import json, sys, subprocess
trace, out, dur = sys.argv[1], sys.argv[2], float(sys.argv[3]); lost = [float(x) for x in sys.argv[4:]]
import os; P = os.path.expanduser(os.environ.get('DANGO_REPO') or os.environ.get('DANGO_CACHE', '~/.cache/dango-ugc') + '/dango-rec') + '/web/public'; d = json.load(open(trace))
ev = [(g['t'], 'sfx/boost-latch.mp3', 0.35) for g in d['gates'] if g['result'] == 'clear'] + \
     [(g['t'], 'sfx/crash-wipeout.mp3', 0.8) for g in d['gates'] if g['result'] == 'HIT'] + \
     [(t, 'sfx/toggle-off.mp3', 0.6) for t in lost]
if d.get('finished'): ev.append((d['finished'], 'sfx/finish.mp3', 0.8))
ev = [e for e in ev if e[0] < dur]
args = ['ffmpeg', '-v', 'error', '-y', '-stream_loop', '-1', '-i', f'{P}/music/tutorial-race.mp3']
fc = [f'[0:a]atrim=0:{dur},volume=0.22[m]']; labels = ['[m]']
for i, (t, f, g) in enumerate(ev):
    args += ['-i', f'{P}/{f}']; fc.append(f'[{i+1}:a]volume={g},adelay={int(t*1000)}|{int(t*1000)}[e{i}]'); labels.append(f'[e{i}]')
fc.append(''.join(labels) + f'amix=inputs={len(labels)}:duration=first:normalize=0,atrim=0:{dur}[a]')
import tempfile; gs = tempfile.mktemp(suffix='.txt'); open(gs, 'w').write(';'.join(fc))
subprocess.run(args + ['-/filter_complex', gs, '-map', '[a]', '-ar', '44100', '-ac', '2', out], check=True)
print(len(ev), 'events')
