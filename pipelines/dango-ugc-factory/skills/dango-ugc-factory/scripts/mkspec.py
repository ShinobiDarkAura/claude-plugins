# mkspec.py <work> <name> <seed> <motif> <base story> <shift> <finish> '<crashes json>' '<ranks json>' '<margins json>' [seedRng]
# Writes a planner spec for a 30 s ad whose video starts <shift> s into the race, plus a pace story: one of the bundled
# approved runs (stories/<base>.json) stretched so its finish lands at <finish> (ad seconds).
#   <work>     a folder for this batch; the spec goes to <work>/specs/<name>.json, the story to <work>/stories/<name>/
#   crashes    ad seconds the player crashes, e.g. '[6.3,14.8]'           (from the actor's flinches)
#   ranks      [[ad seconds, place], ...] e.g. '[[0.02,2],[21.6,2],[23.3,1]]'  (from the actor's lines)
#   margins    {RIVAL: seconds behind you at the line}; negative = that rival beats you, e.g. '{"NAN":-0.2,"TARO":0.8}'
import json, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
work, n, seed, motif, base, shift, fin = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4], sys.argv[5], float(sys.argv[6]), float(sys.argv[7])
crashes, ranks, margins = json.loads(sys.argv[8]), json.loads(sys.argv[9]), json.loads(sys.argv[10])
rng = int(sys.argv[11]) if len(sys.argv) > 11 else 71
old = json.load(open(f'{HERE}/stories/{base}.json')); k = (fin + shift) / old['finished']
os.makedirs(f'{work}/stories/{n}', exist_ok=True); os.makedirs(f'{work}/specs', exist_ok=True)
json.dump({'samples': [{'t': round(x['t'] * k, 3), 's': x['s']} for x in old['samples']], 'finished': fin + shift, 'gates': []}, open(f'{work}/stories/{n}/you-final.json', 'w'))
json.dump(dict(actor=n, seed=seed, motif=motif, tick0=24 + int(shift * 60), shift=shift, story=os.path.abspath(f'{work}/stories/{n}'), names=list(margins), margins=margins,
               ranks=ranks, crashes=crashes, finish=fin, oldCup=5814, seedRng=rng), open(f'{work}/specs/{n}.json', 'w'), indent=1)
print('spec', f'{work}/specs/{n}.json')
