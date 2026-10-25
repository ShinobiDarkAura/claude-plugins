---
name: dango-ugc-factory
kind: ad
stage: production
owner: alex
last_verified: 2026-10-23
inputs: [one-line brief]
outputs: [30 s 1080x1920 60fps mp4]
needs: [macOS with Homebrew, joystick MCP server (shared fal key), cartridge.gg tailnet, read access to cartridge-gg/claude-plugins, read access to cartridge-gg/dangoderby]
---

# dango-ugc-factory

Alex's ad pipeline for Dango Derby.

## What it is for

The pipeline makes short vertical video ads for Dango Derby, for TikTok, Instagram Reels and other paid placements.
It starts from a one-line concept and ends with a finished, captioned 30 s video. Steps after that, such as a
re-encode for a platform, an upload or a launch, are not part of it.

The ads look like user-generated content (UGC): a real-looking person reacts to the game. The pipeline generates
that person with AI. It records the gameplay from the real game and never generates it,
because the brand rules do not permit fabricated gameplay. One generated take can be cut against many recorded
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
- **Cost:** about $13.87 for each 30 s take, plus a few cents for the start frame and the word timings.

The playbook is [`SKILL.md`](skills/dango-ugc-factory/SKILL.md): a checklist with one item per step, then the
details of each step.

## Install and set up

You need:

- A Mac with [Homebrew](https://brew.sh) and Claude Code (the desktop app's Code tab or the `claude` CLI).
- Read access to cartridge-gg/claude-plugins and cartridge-gg/dangoderby (`gh auth status` shows your login).
- Tailscale on the cartridge.gg tailnet.

You do not need any API key.

1. Install the plugin. In a terminal, run:

   ```bash
   claude plugin marketplace add cartridge-gg/claude-plugins#marketing
   claude plugin install dango-ugc-factory@cartridge-marketing
   ```

   You add the marketplace only once. The install needs `git` access to GitHub without a prompt. If you have no
   GitHub SSH key, run `gh auth login` and `gh auth setup-git`, and add
   `export CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` to your shell profile.

   If you installed the kit with `npx skills add`, delete `~/.claude/skills/dango-ugc-factory`. If that copy stays,
   Claude loads the skill twice. If you installed the kit before 2026-10-23, also delete
   `~/.claude/skills/codex-imagegen`. That skill used one person's ChatGPT plan, and it is no longer part of the kit.

2. Set up the Mac. Before the first video, Claude runs the skill's `scripts/setup.sh`. To run it earlier, ask Claude:

   > Set up the Dango UGC factory.

   It installs what is missing and skips what is done: ffmpeg, node and gh (Homebrew), Pillow + numpy, the Xcode
   command line tools (for the face finder), the game on the filmed commit `de4035b32` with Playwright's Chromium
   (in `~/.cache/dango-ugc/`), and the `joystick` MCP server. The first run takes about 15 min, because it
   downloads the game. Later runs take a few seconds.

   It prints a ✗ line for each thing only you can do:

   - **Homebrew is missing:** install it from https://brew.sh. It asks for your Mac password.
   - **The Xcode window opens:** click Install and wait for it to finish.
   - **GitHub login:** run `gh auth login`.
   - **The tailnet:** connect Tailscale to the cartridge.gg tailnet.
   - **The `joystick` server is new:** restart Claude Code, run `/mcp`, select `joystick` and sign in.

   Run it again until it prints `Ready.`

3. Get updates. You get a new version only when the version in
   [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json) changes. Run
   `claude plugin update dango-ugc-factory@cartridge-marketing`, or turn on auto-update: open `/plugin`, go to
   **Marketplaces**, select `cartridge-marketing`, and select **Enable auto-update**.

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
| 7 | Race plan | Plans a real race to the targets with the game's physics |
| 8 | Race film | Films that race in the real game |
| 9 | Compose | Builds the 1080×1920 video |
| 10 | Check | Checks frames at the beats against the plan |

Everything runs on your Mac, except the 3 paid steps: the start frame, the take and the word timings
(fal-ai/whisper). Claude makes those calls through the `joystick` MCP server (`mcp__joystick__fal_ai`). It tells you
the cost of each paid step and waits for your yes.

Questions: ask Alex.

## Known issues

1. **Filming needs the browser game.** The race tools film `web/` of dangoderby. dangoderby#1590 (2026-10-10)
   replaced it with the native app, so film from a worktree on `de4035b32` (2026-10-08). New game changes do not
   reach ads until there is a native film mode.
2. **The source is a zip.** This folder comes from the kit that Gabe shared on 2026-10-14. The owner's current
   version can differ.
3. **The full run has not gone through Joystick yet.** On 2026-10-23 the pipeline made a full video (the pigeons
   ad) with a direct fal key, because Joystick's shared fal account still had no credit
   (`User is locked. Reason: Exhausted balance.`). Every step worked. Not checked through Joystick: the 3 paid calls,
   and `status` and `result` for Seedance 2.5 with the parent path `bytedance/seedance-2.5`. That is the path in
   fal's own `status_url`, but Joystick's tool builds the URL from the full path for its `seedance-2.5-*` presets.
4. **Seedance's default endpoint rejects realistic faces.** `bytedance/seedance-2.5/image-to-video` (Joystick's
   preset `seedance-2.5-i2v`) rejected an AI-generated start frame with `content_policy_violation` and the reason
   `partner_validation_failed`, and still gave the status `COMPLETED`. The US endpoint,
   `bytedance/seedance-2.5/us/image-to-video`, rendered the same frame. The skill uses the US endpoint. Whether fal
   charges for a rejected take is not known.
5. **The Joystick tool cannot upload a file from the Mac.** A start frame or a take must come from a fal result. So
   you cannot edit an image from your disk, and Whisper cannot run again on a local cut.

## Files

This folder is a Claude Code plugin in the `cartridge-marketing` marketplace. The skill is in
`skills/dango-ugc-factory/`.

- [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json): the plugin's name, version and description.
- [`SKILL.md`](skills/dango-ugc-factory/SKILL.md): the skill that Claude runs: the checklist of the 10 steps, and the
  details of each step (prompts, rules, commands).
- [`reference/`](skills/dango-ugc-factory/reference/): the brand guardrails, the game profile and the example
  `ad.json`.
- [`scripts/`](skills/dango-ugc-factory/scripts/): the code of the steps, `setup.sh` (the Mac setup) and
  `selfcheck.py` (the check that CI runs).
- [`assets/`](skills/dango-ugc-factory/assets/): the Dango font.
