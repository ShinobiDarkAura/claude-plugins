---
name: reaction-ad
kind: ad
stage: production
owner: alex
last_verified: 2026-10-23
inputs: [one-line brief]
outputs: [30 s 1080x1920 60fps mp4]
needs: [macOS with Homebrew, joystick MCP server (shared fal key), cartridge.gg tailnet, read access to cartridge-gg/claude-plugins, read access to cartridge-gg/dangoderby]
---

# reaction-ad

Alex's ad pipeline for Dango Derby: the skill `dango-derby:reaction-ad`. Until version 3.0.0 of the plugin, it was
the `dango-ugc-factory` plugin. To install and set it up, see the plugin's [`README.md`](../../README.md).

## What it is for

The pipeline makes short vertical video ads for Dango Derby, for TikTok, Instagram Reels and other paid placements.
It starts from a one-line concept and ends with a finished, captioned 30 s video. Steps after that, such as a
re-encode for a platform, an upload or a launch, are not part of it.

The ads look like user-generated content (UGC): a real-looking person reacts to the game. The pipeline generates
that person with AI. It records the gameplay from the real game with the plugin's `race` skill and never generates
it, because the brand rules do not permit fabricated gameplay. One generated take can be cut against many recorded
races, so more variants do not need more generation.

A person runs it on a Mac with Claude Code. Every API call goes through Joystick, on Joystick's shared fal key, so
nobody needs an API key.

## Creatives it makes

### 30 s reaction ad

A real-looking actor, aged 30 or older and wearing earphones, reacts in one continuous 30 s take. The take fills
the top of the frame. The race they "play" fills the bottom. The pipeline plans and films a real race so that its
crashes, place changes and finish land on the actor's flinches, lines and scream. In the last 2 s, the actor looks
into the lens for the first time, and the joke lands.

- **Frame:** split screen at 1080×1920. The actor's face is on top. The game's own place bar sits across the seam.
  One-word captions appear just under the seam, and the footer "18+ • AI Actor" shows on every ad.
- **Output:** one mp4 at 1080×1920 and 60 fps, about 38 MB for 30 s, from `compose.py`.
- **Examples:** the approved batches of 2026-09-29 to 2026-10-01 (Dublin bus, Glasgow maw, Aussie lunch break, his
  nan, quiet coach). 8–10 ads shipped.
- **Cost:** about $14 for each video if every paid call works the first time. See [Cost](#cost).

### 30 s reaction ad, anime style or another language (experiment)

The same ad, with an original adult anime character, or with dialogue in another language and captions in English.
The test ad "rooftop" (2026-10-23) went through all 10 steps: KAITO, 32, plays on his office roof, and his friend
REN speaks off camera, in Japanese with English captions. No ad in this style has passed step 10 yet. The frame,
the output and the cost are the same as above. See "Anime and other languages" in [`SKILL.md`](SKILL.md).

The playbook is [`SKILL.md`](SKILL.md): a checklist with one item per step, then the details of each step.

## Make a video

Open Claude Code and say something like:

> Make a Dango Derby reaction ad: a Welsh dad on a park bench feeding the pigeons, sure he's winning,
> overtaken at the line by a rival called GRANDMASTER.

Claude follows the playbook's 10 steps. Each step has one scope, and you approve the results of steps 1, 2, 3, 5
and 10:

| # | Step | What it does |
| --- | --- | --- |
| 1 | Script | Writes the ad: who, where, every line on a 0–30 s grid, and the race event for each line |
| 2 | Start frame | Makes the actor's still with gpt-image-2 |
| 3 | Take | Makes the 30 s take with Seedance 2.5 |
| 4 | Transcript | Gets the word timings with fal-ai/whisper |
| 5 | Take review | Keeps or remakes the take, and picks the lines to mute and bleep |
| 6 | Beats | Fixes the word times and sets the race targets |
| 7 | Race plan | Plans a real race to the targets with the game's physics (the `race` skill, step 1) |
| 8 | Race film | Films that race in the real game (the `race` skill, step 2) |
| 9 | Compose | Builds the 1080×1920 video |
| 10 | Check | Checks frames at the beats against the plan |

Everything runs on your Mac, except the 3 paid steps: the start frame, the take and the word timings
(fal-ai/whisper). Claude makes those calls through the `joystick` MCP server (`mcp__joystick__fal_ai`). It tells you
the cost of each paid step and waits for your yes.

Questions: ask Alex.

## Cost

Each video pays for 3 fal calls. Everything else runs on your Mac and costs nothing. The prices are fal's list prices
on 2026-10-26.

| Step | Call | fal's price | For each call |
| --- | --- | --- | --- |
| 2. Start frame | gpt-image-2, high quality, 1152×2048 | $0.158 at 1920×1080 and $0.222 at 2560×1440 | about $0.20 |
| 3. Take | Seedance 2.5 US, 30 s, 720p | $0.0214 for each 1,000 tokens; a 30 s take at 720p is 648,000 tokens | $13.87 |
| 4. Word timings | fal-ai/whisper | $0.0011 for each compute second | under $0.01 |
| 6–10 | Beats, race plan, race film, compose, check | none: they run on your Mac | $0 |

Rough estimates:

| Run | Cost |
| --- | --- |
| A video where every paid call works the first time | about $14 |
| A video with one new take | about $28 |
| A batch of 5 videos, each with its first take | about $70 |
| Another cut of a take that you have, against a new race | $0 |

- The take is about 98 % of the cost. So approve the script and the start frame before you approve a take.
- Each new start frame or frame edit adds about $0.20. Each new take adds $13.87.
- It is not known whether fal charges for a take that it rejects.

Time: a take renders in 8–25 min. On 2026-10-26 it took 25 min. The free steps take about 5 min on a Mac.

## Known issues

1. **The full run has not gone through Joystick yet.** On 2026-10-23 the pipeline made 2 full videos (the pigeons
   ad and the anime rooftop ad) with a direct fal key, because Joystick's shared fal account still had no credit
   (`User is locked. Reason: Exhausted balance.`). Every step worked. Not checked through Joystick: the 3 paid calls,
   and `status` and `result` for Seedance 2.5 with the parent path `bytedance/seedance-2.5`. That is the path in
   fal's own `status_url`, but Joystick's tool builds the URL from the full path for its `seedance-2.5-*` presets.
2. **Seedance's default endpoint rejects realistic faces.** `bytedance/seedance-2.5/image-to-video` (Joystick's
   preset `seedance-2.5-i2v`) rejected an AI-generated start frame with `content_policy_violation` and the reason
   `partner_validation_failed`, and still gave the status `COMPLETED`. The US endpoint,
   `bytedance/seedance-2.5/us/image-to-video`, rendered the same frame. The skill uses the US endpoint. Whether fal
   charges for a rejected take is not known.
3. **The Joystick tool cannot upload a file from the Mac.** A start frame or a take must come from a fal result. So
   you cannot edit an image from your disk, and Whisper cannot run again on a local cut.

For the race film, see the known issues of the [`race`](../race/README.md) skill.
