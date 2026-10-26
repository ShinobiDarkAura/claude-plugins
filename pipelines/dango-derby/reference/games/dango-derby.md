# Game profile — Dango Derby

The machine-readable half is `dango-derby.json` (layout, captions, footer, curses, game sound), used by
the reaction-ad skill's `scripts/compose.py`. This file covers the parts a person or agent has to understand.

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
beats. The plugin's `race` skill (`skills/race/SKILL.md`) plans and films them. Its tools, setup, arguments, trails
and capture learnings are in that file.

`scripts/gamesound.py` rebuilds the in-game music and SFX from the race trace. It reads the game's `web/public`. The
reaction-ad skill's `compose.py` calls it in step 9.

## Guardrails

Dango-specific compliance (no gambling words, no golf, async races) is in `reference/brand-guardrails.md`. Rivals
in ads are replays, so never imply a live opponent with money on it.
