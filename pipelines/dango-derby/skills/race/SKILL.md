---
name: race
description: Plans and films a real Dango Derby race so that its crashes, place changes and finish land on given beats (ad seconds), and gives a 1080×2338, 60 fps film and its trace. It uses the game's own physics and the real browser game on the user's Mac, never generates gameplay, and calls no API. Use when a Dango Derby ad needs gameplay that matches a take (steps 7 and 8 of the reaction-ad skill), or when someone asks to plan or film a Dango Derby race to given beats.
---

# Dango Derby race

Plans a real Dango Derby race to a list of beats, then films it in the real game. The crashes, the place changes and
the finish land on the beats within about 0.1 s. The output is the gameplay of an ad: a 1080×2338, 60 fps film of the
phone screen, and a trace of what happens in it.

**Never generate gameplay.** The planner uses the game's own wasm physics, and the film comes from the real game. A
model never makes gameplay, game UI or the wordmark (brand rule 8 in `<plugin>/reference/brand-guardrails.md`).

`<this skill>` is this skill's folder. `<plugin>` is the plugin folder, two levels up from it.

## Setup

Run `bash <plugin>/scripts/setup.sh`. The race needs its "Tools" and "Game" lines. The script makes a separate
worktree of dangoderby on `de4035b32` (2026-10-08) in `~/.cache/dango-ugc/dango-rec`, with the `sdk/` and `web/`
packages and Playwright's Chromium. `plan.sh`, `film.sh` and `<plugin>/scripts/gamesound.py` use that worktree by
default. The race calls no API, so the "Joystick" lines are not necessary for this skill.

dangoderby#1590 (2026-10-10) replaced the browser game with the native app, so later commits have no browser race to
film. To film another commit, make your own worktree and point the tools at it:

```bash
git -C <dangoderby clone> worktree add ~/dango-rec <sha> && (cd ~/dango-rec/sdk && npm i) && (cd ~/dango-rec/web && npm i && npx playwright install chromium)
export DANGO_WEB=~/dango-rec/web DANGO_REPO=~/dango-rec
```

## In and out

In:

- `<batch>`, the batch folder, and `<name>`, the ad's short name. In an ad run, the ad skill gives both.
- The beats, in seconds of the 30 s video:
  - the finish: the second the player crosses the line;
  - the crashes: the seconds the player crashes;
  - the places: `[second, place]` pairs, where place 1 is a win;
  - the margins: each rival's seconds behind the player at the line. A negative margin means that rival wins;
  - the base story: one of the pace stories in `<this skill>/scripts/stories/` (see step 1).

  In an ad run, the beats are in `<batch>/<name>.md`, from step 6 of the ad skill.

Out, in `<batch>`:

```
specs/<name>.json, stories/<name>/      1 the planner spec and the pace story; each shift writes them again
plans/<name>-<shift>/                   1 one plan for each shift
gameplay/<name>.mp4                     2 the film: 1080×2338, 60 fps
plans/<name>/film-trace.json            2 what the film shows: the finish, the crashes and the places
<name>.md                               1 adds the map and the chosen shift; 2 adds the trails (if the file exists)
```

## Steps

Copy this checklist into your reply, and check off a step when its "Done when" is true. In an ad run, do not copy it:
steps 7 and 8 of the ad skill's checklist are these 2 steps.

- [ ] **1. Race plan**
  - **Scope:** choose the map, and plan the race at 3 start offsets ("shifts"). No filming.
  - **In:** the beats and the base story.
  - **Out:** `plans/<name>-<shift>/` for each shift, and the chosen shift and map in `<name>.md`.
  - **Done when:** one shift lands the crashes, places and finish within about 0.2 s of the beats.
  - **Code:** `scripts/plan.sh`, which runs `scripts/plan.ts` (the planner, on the game's own wasm physics) and
    `scripts/mkspec.py` (the beats as a planner spec, on a pace story from `scripts/stories/`).
- [ ] **2. Race film**
  - **Scope:** film the chosen plan with its trails in the real game. No compose.
  - **In:** the chosen plan, the map, 1 player trail and 5 rival trails.
  - **Out:** `gameplay/<name>.mp4` (1080×2338, 60 fps) and `plans/<name>/film-trace.json`.
  - **Done when:** the trace line that `film.sh` prints matches the plan within about 0.1 s, and `film.err` has no
    `capture patch missing` line.
  - **Code:** `scripts/film.sh`, which runs `scripts/driver-capture.mjs` (the frozen-clock browser recorder).

## Step details

### 1. Race plan

`plan.sh` writes a spec for each shift, runs the planner, and prints how well each shift fits. Example (the quiet
coach):

```bash
<this skill>/scripts/plan.sh <batch> coach 505 rotor crash-comeback 23.6 '[6.3,14.8]' \
  '[[0.02,2],[6.5,4],[15.0,5],[17.6,4],[19.6,3],[21.6,2],[23.3,1]]' \
  '{"MOMO":0.08,"YUZU":0.8,"KUMA":1.4,"KARII":2.1,"TARO":2.9}' 17 19 20.5
# shift 20.5: you: finish 23.45 (story 23.6), hits [6.12,14.92] planned places: [[0,2],…,[23.36,1]]   <- pick the best fit
```

| Argument | Example | Meaning |
|---|---|---|
| seed + motif | `505 rotor` | The map. Every map is a `map(tier, seed, motif, 'Name')` in `web/src/chase/mapStyles.ts`. Give each ad its own map. |
| base story | `crash-comeback` | Which approved run's pacing to stretch: comebacks, photo-finish wins, or losses at the line (`heartbreaker*`). |
| finish | `23.6` | The ad second the player crosses the line. |
| crashes | `[6.3,14.8]` | Ad seconds the player crashes. |
| ranks | `[[0.02,2],…,[23.3,1]]` | `[ad second, place]` pairs; place 1 is a win. |
| margins | `{"MOMO":0.08,"YUZU":0.8,…}` | Each rival's seconds behind at the line; negative means that rival beats you. **The names show in game**: use them for jokes (NAN, KEVO, BUBBLES). |
| shifts | `17 19 20.5` | How far into the race the 30 s video starts. Try 3 and keep the best fit. |

The base stories are the pace curves of 5 approved runs: `crash-comeback`, `photo-finish`, `heartbreaker`,
`heartbreaker-bubbles` and `flawless`.

- **Every ad gets its own map.**
- Try 3 shifts, and keep the best fit. Ads start 15–21 s into a race.
- If no shift fits, change a margin and plan again. To move the deciding pass later, shrink the margin of the rival
  that the player passes last (0.12 → 0.08).

### 2. Race film

`film.sh` films the chosen plan in a headless browser at phone size, and writes the trace. Example:

```bash
<this skill>/scripts/film.sh <batch> coach 20.5 505 rotor sparkle-trail mst-taiko,mst-wataame,ink-brush,mst-hanabi,lumen
```

- **Trails on the player and on every rival, all different**, and different from the batch's other ads. Give 1
  player trail and 5 rival trails. The ids are in `web/src/ui/dashboard/cosmetics.ts`. Examples: `puff sparkle-trail
  comet-trail flame-trail icicle meteor-trail rainbow bubblegum-hearts lantern-glow hanabi mst-lanterns mst-hanabi
  mst-kingyo mst-wataame mst-uchiwa mst-kamifubuki mst-taiko mst-kakigori mst-fukinagashi ink-brush lumen
  sakura-drift thunder-arc`.
- Film one race at a time (one headless browser). Several at once dropped frames and crawled the machine.
- Compare the trace line that `film.sh` prints with the plan before the ad uses the film. The crashes, the places and
  the finish must all be within about 0.1 s.
- If `film.err` has `WARN: capture patch missing: …`, the game changed. Re-point the patch in `driver-capture.mjs` at
  the new source before you trust the film.

## Why the tools are the way they are

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
  changes, `film.err` prints `WARN: capture patch missing: …`.
- **Phone viewport** 390×844 at 2.77× gives a 1080×2338 output: the real phone layout and HUD, not a desktop render.

## Files

| File | What it does |
|---|---|
| `scripts/plan.sh` | Writes a spec for each shift, runs the planner, and prints the fit |
| `scripts/plan.ts` | The offline planner: the game's own wasm physics, a human-like thumb, five rivals |
| `scripts/mkspec.py` | Turns the beats into a planner spec and a pace story |
| `scripts/stories/*.json` | The pace curves of the 5 approved runs |
| `scripts/film.sh` | Films the chosen plan in a headless browser at phone size and writes the trace |
| `scripts/driver-capture.mjs` | The frozen-clock browser recorder (60 fps, every frame rendered exactly once) |
| `<plugin>/scripts/gamesound.py` | Rebuilds the in-game music and SFX from the trace (it reads the game's `web/public`). The ad skill's compose step calls it. |

## Guardrails

Rivals in ads are replays, so never imply a live opponent with money on it. The full Dango Derby rules are in
`<plugin>/reference/brand-guardrails.md`.
