# Game profile — Dango Derby

The machine-readable half is `dango-derby.json` (layout, captions, footer, curses, game sound), used by
`scripts/compose.py`. This file covers the parts a person or agent has to understand.

## The look

- **Top panel**: 845 px of the take. **Place bar**: the game's own "2nd of 6" HUD strip, cut from the filmed race
  (`hud_strip`: y 28, height 200) and laid across the seam at y 745–945, half on the face and half on the game. It
  leaves at the finish.
- **Game panel**: the bottom 1075 px of the filmed 1080×2338 race, ending at y 1675 of the race video, so the dango
  and the track sit centred.
- **Captions**: one word per card, white Helvetica Neue Bold, 112 px, 8 px black stroke, centred at y 1120 (on the
  game, just under the seam). `first` → `1st`, `second` → `2nd`, `you` → `u`. Curses → `#####`.
- **Footer**: "18+ • AI Actor", white, 36 px, at y 1856: "18+" and "AI Actor" in the Dango font
  (`assets/fonts/Dango.ttf`), with the "•" in Helvetica because the Dango font has no bullet.
- **Snapchat-bar captions** (an alternative style for some ads) sit at y H+110, under the place bar.

## The race: record, never generate

Ads use real races replayed in the real game, planned so the crashes, place changes and finish land on the actor's
beats. The tools are in `scripts/`:

| File | What it does |
|---|---|
| `scripts/plan.sh …` | Writes a spec per candidate start offset, runs the planner, prints the fit |
| `scripts/plan.ts` | The offline planner: the game's own wasm physics, a human-like thumb, five rivals |
| `scripts/mkspec.py` | Turns beats into a planner spec and a pace story |
| `scripts/stories/*.json` | Pace curves of five approved runs: `crash-comeback`, `photo-finish`, `heartbreaker`, `heartbreaker-bubbles`, `flawless` |
| `scripts/film.sh …` | Films the chosen plan in a headless browser at phone size and writes the trace |
| `scripts/driver-capture.mjs` | The frozen-clock browser recorder (60 fps, every frame rendered exactly once) |
| `scripts/gamesound.py` | Rebuilds the in-game music and SFX from the race trace (reads the game's `web/public`). `compose.py` calls it in step 9. |

Setup: `scripts/setup.sh` makes a **separate worktree** of the dangoderby repo on `de4035b32` (2026-10-08) in
`~/.cache/dango-ugc/dango-rec`, with `sdk/` and `web/` packages and Playwright's Chromium. `plan.sh`, `film.sh`
and `gamesound.py` use it by default. dangoderby#1590 (2026-10-10) replaced the web game with the native app, so later
commits have no browser race to film.

To film another commit, make your own worktree and point the tools at it:

```bash
git -C <dangoderby clone> worktree add ~/dango-rec <sha> && (cd ~/dango-rec/sdk && npm i) && (cd ~/dango-rec/web && npm i && npx playwright install chromium)
export DANGO_WEB=~/dango-rec/web DANGO_REPO=~/dango-rec
```

Example (the quiet coach):

```bash
<skill>/scripts/plan.sh work coach 505 rotor crash-comeback 23.6 '[6.3,14.8]' \
  '[[0.02,2],[6.5,4],[15.0,5],[17.6,4],[19.6,3],[21.6,2],[23.3,1]]' \
  '{"MOMO":0.08,"YUZU":0.8,"KUMA":1.4,"KARII":2.1,"TARO":2.9}' 17 19 20.5
# shift 20.5: you: finish 23.45 (story 23.6), hits [6.12,14.92] planned places: [[0,2],…,[23.36,1]]   <- pick the best fit
<skill>/scripts/film.sh work coach 20.5 505 rotor sparkle-trail mst-taiko,mst-wataame,ink-brush,mst-hanabi,lumen
```

Spec arguments:

| Argument | Example | Meaning |
|---|---|---|
| seed + motif | `505 rotor` | The map. Every map is a `map(tier, seed, motif, 'Name')` in `web/src/chase/mapStyles.ts`. Give each ad its own map. |
| base story | `crash-comeback` | Which approved run's pacing to stretch: comebacks, photo-finish wins, or losses at the line (`heartbreaker*`). |
| finish | `23.6` | The ad second the player crosses the line. |
| crashes | `[6.3,14.8]` | Ad seconds the player crashes. |
| ranks | `[[0.02,2],…,[23.3,1]]` | `[ad second, place]` pairs; place 1 is a win. |
| margins | `{"MOMO":0.08,"YUZU":0.8,…}` | Each rival's seconds behind at the line; negative means that rival beats you. **The names show in game**: use them for jokes (NAN, KEVO, BUBBLES). |
| shifts | `17 19 20.5` | How far into the race the 30 s video starts. Try 3 and keep the best fit. |

To move the deciding pass later, shrink the margin of the rival you pass last (0.12 → 0.08).

Trails: `--player-trail` one id, `--rival-trails` five ids, all different, and different from the batch's other
ads. The ids are in `web/src/ui/dashboard/cosmetics.ts`. Examples: `puff sparkle-trail comet-trail flame-trail
icicle meteor-trail rainbow bubblegum-hearts lantern-glow hanabi mst-lanterns mst-hanabi mst-kingyo mst-wataame
mst-uchiwa mst-kamifubuki mst-taiko mst-kakigori mst-fukinagashi ink-brush lumen sakura-drift thunder-arc`.

### Capture learnings: why the tools are the way they are

- **The game ignores input on the race's first tick.** The planner never presses on tick 0; doing so desynced a replay
  into an unplanned crash.
- **Free the wasm sim** (`sim.dispose()`) after every look-ahead, or long maps (Piston Works) run out of memory.
- **The browser clock is frozen between frames.** Every frame renders once, so there is no lag and no dropped frame. Any
  timed animation is stepped and then `finish()`ed at its end time; otherwise the "+X SPEED" lightning bolts stacked up
  in captures in a way the real game never shows.
- **Pre-roll is long enough to start mid-race.** Ads start 15–21 s into a race (the "shift"), so the driver fast-forwards
  up to 6000 ticks before recording. The old 600-tick cap made 30 s films start early.
- **Warp moves pace only**, never crashes, so an earlier finish doesn't shift where the crashes land.
- **Rivals are time-lagged copies of your run**, corrected over a few iterations so places change on cue without a rank
  flicker.
- **The driver patches the game's JS in flight** (ghost field, player trail, map backdrop, HUD rank). When the game
  changes, `film.err` prints `WARN: capture patch missing: …`. Re-point the patch in `driver-capture.mjs` at the new
  source before trusting the film.
- **Phone viewport** 390×844 at 2.77× gives a 1080×2338 output: the real phone layout and HUD, not a desktop render.
- Check the trace line `film.sh` prints against the plan before composing. Crashes, places and finish should all
  be within ~0.1 s.

## Guardrails

Dango-specific compliance (no gambling words, no golf, async races) is in `reference/brand-guardrails.md`. Rivals
in ads are replays, so never imply a live opponent with money on it.
