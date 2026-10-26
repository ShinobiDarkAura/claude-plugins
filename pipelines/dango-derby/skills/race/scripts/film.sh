#!/bin/bash
# film.sh — race skill, step 2: film a planned Dango Derby race in the real game.
#
#   film.sh <work> <name> <shift> <seed> <motif> <player-trail> <rival-trails,comma,separated>
#       films <work>/plans/<name>-<shift> to <work>/gameplay/<name>.mp4 and writes <work>/plans/<name>/film-trace.json
#
# Needs DANGO_WEB, like plan.sh (see its header): by default the worktree that setup.sh makes.
# Film one race at a time: one headless browser. Several at once crawls the machine and drops frames.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
: "${DANGO_WEB:=${DANGO_CACHE:-$HOME/.cache/dango-ugc}/dango-rec/web}"   # where setup.sh puts it
[ -d "$DANGO_WEB/node_modules" ] || { echo "no game at $DANGO_WEB: run setup.sh, or set DANGO_WEB (see the header)" >&2; exit 1; }
[ $# -eq 7 ] || { sed -n 2,5p "$0"; exit 1; }
PORT=${PORT:-5391}
work=$1 n=$2 suf=$3 seed=$4 motif=$5 pt=$6 rt=$7
work=$(cd "$work" && pwd); P="$work/plans/$n"; mkdir -p "$work/gameplay"
rm -rf "$P"; cp -r "$work/plans/$n-$suf" "$P"
# Redirect the whole background job: its subshell lives as long as vite, so it must not hold the caller's stdout.
(curl -s -o /dev/null "http://localhost:$PORT/" || (cd "$DANGO_WEB" && nohup npx vite --port "$PORT" --strictPort &) > "$work/vite.log" 2>&1 < /dev/null)
for i in $(seq 1 60); do curl -s -o /dev/null "http://localhost:$PORT/" && break; sleep 1; done
(cd "$DANGO_WEB" && nice -n 10 node "$HERE/driver-capture.mjs" --you-tape "$P/you-tape.json" --ghosts "$P/field.json" \
  --dress 1 --solo 0 --seed "$seed" --motif "$motif" --seconds 34 --tail 3.3 --port "$PORT" --w 390 --h 844 --scale 2.77 \
  --outw 1080 --outh 2338 --crf 17 --extra '&trails=all' --player-trail "$pt" --rival-trails "$rt" \
  --out "$work/gameplay/$n.mp4" --trace "$P/film-trace.json" > "$P/film.out" 2> "$P/film.err")
python3 -c "
import json; t = json.load(open('$P/film-trace.json'))
print('$n filmed: finish', t['finished'], '| crashes', [g['t'] for g in t['gates'] if g['result'] == 'HIT'], '| places', [(r['t'], r['rank']) for r in t['hudRanks']])"
