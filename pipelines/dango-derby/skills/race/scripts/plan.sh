#!/bin/bash
# plan.sh — step 7: plan a Dango Derby race that hits an actor's beats, once per candidate shift.
#
#   plan.sh <work> <name> <seed> <motif> <base> <finish> '<crashes>' '<ranks>' '<margins>' <shift...>
#       plans the race once per candidate shift into <work>/plans/<name>-<shift> and prints how well each fits
#
# Needs DANGO_WEB: the web/ folder of a dangoderby checkout ON THE COMMIT YOU WANT TO FILM, with node_modules
# installed. The default is the worktree that setup.sh makes: ~/.cache/dango-ugc/dango-rec/web (de4035b32).
# To film another commit, use a separate worktree, not the one you develop in:  git worktree add ~/dango-rec <sha>
#   && (cd ~/dango-rec/sdk && npm i) && cd ~/dango-rec/web && npm i && npx playwright install chromium
# (de4035b32, 2026-10-08, still has the browser game. dangoderby#1590 replaced it with the native app.)
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
: "${DANGO_WEB:=${DANGO_CACHE:-$HOME/.cache/dango-ugc}/dango-rec/web}"   # where setup.sh puts it
[ -d "$DANGO_WEB/node_modules" ] || { echo "no game at $DANGO_WEB: run setup.sh, or set DANGO_WEB (see the header)" >&2; exit 1; }
[ $# -ge 10 ] || { sed -n 2,5p "$0"; exit 1; }
mkdir -p "$DANGO_WEB/_rec"; cp "$HERE/plan.ts" "$DANGO_WEB/_rec/plan.ts"
work=$1 n=$2 seed=$3 motif=$4 base=$5 fin=$6 cr=$7 rk=$8 mg=$9; shift 9
work=$(cd "$work" && pwd)
for sh in "$@"; do
  python3 "$HERE/mkspec.py" "$work" "$n" "$seed" "$motif" "$base" "$sh" "$fin" "$cr" "$rk" "$mg" > /dev/null
  r=$(cd "$DANGO_WEB" && nice -n 10 npx vite-node _rec/plan.ts "$work/specs/$n.json" "$work/plans/$n-$sh" 2>&1 | grep -E "^you|planned")
  echo "shift $sh: $r" | tr '\n' ' '; echo
done
