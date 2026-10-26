#!/bin/bash
# setup.sh — one-time setup of a Mac for 30 s reaction ads. Claude runs it on first use. Safe to re-run: it skips
# what is already done.
#
#   bash setup.sh          # install what is missing, then list what still needs a person (exit 1 if anything does)
#   bash setup.sh --check  # only list what is missing; install nothing
#
# No API keys: the paid steps (start frame, take, word timings) run on Joystick's shared keys through the joystick
# MCP server. This script installs ffmpeg, node, gh, Python pillow + numpy, the Xcode command line tools (the face
# finder), and a dangoderby worktree at the filmed commit with Playwright's Chromium, in $DANGO_CACHE
# (default ~/.cache/dango-ugc). It registers the joystick MCP server.
set -uo pipefail
CACHE="${DANGO_CACHE:-$HOME/.cache/dango-ugc}"
REPO="$CACHE/dangoderby"; REC="$CACHE/dango-rec"
DANGO_SHA=de4035b327e7aa5a7dceb8f2bec07e911664a183   # 2026-10-08: dangoderby#1590 removed the browser game after it
MCP_URL=https://agent-centaur-api.yattle-moth.ts.net/mcp
CHECK=0; [ "${1:-}" = --check ] && CHECK=1
todo=0
ok() { echo "  ✓ $1"; }
no() { echo "  ✗ $1: $2"; todo=1; }
run() { [ $CHECK = 1 ] && return 1; echo "  → $*"; "$@" > "$CACHE/setup.log" 2>&1 || { echo "    failed, see $CACHE/setup.log"; return 1; }; }
mkdir -p "$CACHE"

echo "Tools"
if ! command -v brew > /dev/null; then
  no Homebrew "install it from https://brew.sh (it asks for your Mac password), then run this again"
else
  for p in ffmpeg node gh; do
    command -v $p > /dev/null || run brew install $p
    command -v $p > /dev/null && ok $p || no $p "brew install $p"
  done
fi
if ! python3 -c 'import PIL, numpy' 2> /dev/null; then
  if command -v brew > /dev/null && [[ "$(command -v python3)" == "$(brew --prefix)"/* ]]; then run brew install pillow numpy
  else run python3 -m pip install --user --quiet pillow numpy; fi
fi
python3 -c 'import PIL, numpy' 2> /dev/null && ok "python3: pillow + numpy" || no "python3: pillow + numpy" "python3 -m pip install --user pillow numpy"
if xcrun --find swiftc > /dev/null 2>&1; then ok "swiftc (face finder)"
else
  [ $CHECK = 0 ] && xcode-select --install > /dev/null 2>&1
  no "swiftc (face finder)" "finish the Xcode command line tools install window, then run this again"
fi

echo "Game: dangoderby at ${DANGO_SHA:0:9}, in $REC"
if [ ! -d "$REPO/.git" ] && [ $CHECK = 0 ]; then
  if gh auth status > /dev/null 2>&1; then run gh repo clone cartridge-gg/dangoderby "$REPO" -- --filter=blob:none --no-checkout --quiet
  else no "GitHub login" "run  gh auth login  (you need read access to cartridge-gg/dangoderby)"; fi
fi
[ -d "$REPO/.git" ] && [ ! -d "$REC" ] && run git -C "$REPO" worktree add --detach "$REC" $DANGO_SHA
if [ "$(git -C "$REC" rev-parse HEAD 2> /dev/null)" = $DANGO_SHA ]; then ok "worktree"
elif [ $CHECK = 1 ]; then no "dangoderby worktree" "not set up yet: run setup.sh without --check (about 15 min the first time)"
else no "dangoderby worktree" "needs read access to cartridge-gg/dangoderby (details in $CACHE/setup.log)"; fi
for d in sdk web; do   # web/ imports ../sdk/dist, so both need their packages
  [ -d "$REC/$d" ] && [ ! -d "$REC/$d/node_modules" ] && run sh -c "cd '$REC/$d' && npm install --silent"
  [ -d "$REC/$d/node_modules" ] && ok "$d/ packages" || no "$d/ packages" "(cd $REC/$d && npm install)"
done
# The recorder launches Playwright's headless shell; it is not in node_modules.
shell_ok() { (cd "$REC/web" 2> /dev/null && node -e "
const fs = require('fs'), p = require('path')   // the package's exports block require('playwright-core/browsers.json')
const core = p.dirname(require.resolve('playwright-core'))
const b = JSON.parse(fs.readFileSync(p.join(core, 'browsers.json'))).browsers.find(x => x.name === 'chromium-headless-shell')
const dir = process.env.PLAYWRIGHT_BROWSERS_PATH || p.join(require('os').homedir(), 'Library/Caches/ms-playwright')
process.exit(fs.existsSync(p.join(dir, 'chromium_headless_shell-' + b.revision)) ? 0 : 1)") > /dev/null 2>&1; }
[ -d "$REC/web/node_modules" ] && ! shell_ok && run sh -c "cd '$REC/web' && npx playwright install chromium"
shell_ok && ok "Playwright Chromium" || no "Playwright Chromium" "(cd $REC/web && npx playwright install chromium)"

echo "Joystick (shared keys for the paid steps)"
registered() { python3 -c "import json, os, sys; sys.exit('joystick' not in json.load(open(os.path.expanduser('~/.claude.json'))).get('mcpServers', {}))" 2> /dev/null; }
if registered; then ok "MCP server joystick"
elif [ $CHECK = 0 ] && command -v claude > /dev/null && claude mcp add --transport http --scope user joystick $MCP_URL > /dev/null 2>&1 && registered; then
  ok "MCP server joystick added: restart Claude Code, then run /mcp, select joystick and sign in"
else no "MCP server joystick" "claude mcp add --transport http --scope user joystick $MCP_URL"; fi
# 15 s: through a Tailscale relay (DERP) the first request can take 7 s or more.
[ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 $MCP_URL)" != 000 ] && ok "cartridge.gg tailnet" ||
  no "cartridge.gg tailnet" "connect Tailscale to the cartridge.gg tailnet (tailscale switch to the cartridge.gg account)"

echo
if [ $todo = 0 ]; then echo "Ready."; else echo "Fix the ✗ lines, then run this again."; fi
exit $todo
