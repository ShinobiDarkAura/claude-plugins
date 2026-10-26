# Game profile — <Game name>

Copy this file and `dango-derby.json` to `<game>.md` / `<game>.json`, then fill them in. The playbook
(`SKILL.md`) is the same for every game; only these answers change.

## Layout (`<game>.json`)

| Key | What it is | How to choose it |
|---|---|---|
| `top_height` | Face panel height (px of 1920) | ~845. Less if the game needs more room. |
| `game_bottom` | Bottom edge of the game crop in the gameplay video | Put the player's avatar and the action at the panel's centre. |
| `hud_strip` | `[x, y, height]` of the game's status bar to cut out | Use the one element that tells the story at a glance (place, score, timer, health). |
| `hud_offset` | Where the strip sits relative to the seam | -100 straddles the seam half and half. |

## Captions (`caption` in the JSON)

Pick a style that matches the game's audience, then lock it:

- A cute or casual game → bold sans with a black stroke, one word per card (the Dango style).
- A competitive or esports game → tighter, punchier caps.
- A cosy or narrative game → softer type, possibly two to three words per card.

Set `curses`, and `slang` for the substitutions your players actually use.

## Footer

`"18+ • AI Actor"`, or what your platforms and age rating need. Keep an AI-actor disclosure on every ad.

## Gameplay capture

How the race, match or level is recorded so its moments land on the actor's beats. Write down:

- The tool and how to run it.
- How beats map to game events (crash, kill, combo, level-up, loss, win).
- What "a unique map/level per ad" means for this game.
- How the cosmetics (skins, trails) vary per ad.

**Never generate gameplay.**

## Casting and setting notes

Who plays this game? Write the age, the vibe, and the places they would really be playing. Every actor wears
earphones, is clearly 30+, and is average-looking. Note which accents and settings suit the audience.

## Guardrails

The game's own compliance and brand rules: words to avoid, claims not to make, and IP to stay away from.
