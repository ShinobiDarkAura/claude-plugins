---
name: race
kind: capture
stage: production
owner: alex
last_verified: 2026-10-25
inputs: [beats, base story]
outputs: [1080x2338 60fps race film, film trace json]
needs: [macOS with Homebrew, read access to cartridge-gg/claude-plugins, read access to cartridge-gg/dangoderby]
---

# race

Alex's race planner and race film for Dango Derby: the skill `dango-derby:race`. Until version 3.0.0 of the plugin,
it was steps 7 and 8 of the `dango-ugc-factory` skill. To install and set it up, see the plugin's
[`README.md`](../../README.md).

## What it is for

A Dango Derby ad needs gameplay that matches its take: a crash on a flinch, a new place on "second!", and the finish
on the scream. This skill plans a real race to those beats with the game's own physics, and films it in the real
browser game. The brand rules do not permit generated gameplay, so this skill is where the ads get their gameplay.

The `reaction-ad` skill uses it for its steps 7 and 8. A person can also use it alone, to film a race to their own
beats. It runs on a Mac with Claude Code, calls no API and costs nothing.

## Creatives it makes

### Race film

The phone screen of one real Dango Derby race: the player and 5 rivals with the names from the script, each with its
own trail, on its own map, with the game's own HUD and place bar.

- **Output:** `gameplay/<name>.mp4` at 1080×2338 and 60 fps, and `plans/<name>/film-trace.json` with the finish,
  the crashes and the places in the film.
- **Use:** it is not an ad. An ad skill crops it under the take, cuts the place bar from its HUD, and builds the game
  sound from its trace.
- **Fit:** the crashes, the places and the finish land within about 0.1 s of the beats.
- **Cost:** none.

The playbook is [`SKILL.md`](SKILL.md): a checklist with the 2 steps, then the details of each step.

## Make a race film

Open Claude Code and say something like:

> Film a Dango Derby race: the player crashes at 6.3 s, is 2nd at 21.6 s, and wins at 23.6 s, just ahead of a rival
> called MOMO.

## Known issues

1. **Filming needs the browser game.** The race tools film `web/` of dangoderby. dangoderby#1590 (2026-10-10)
   replaced it with the native app, so film from a worktree on `de4035b32` (2026-10-08). New game changes do not
   reach ads until there is a native film mode.
