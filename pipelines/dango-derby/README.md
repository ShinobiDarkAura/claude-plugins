# dango-derby

Alex's creative pipelines for Dango Derby, as one Claude Code plugin in the `cartridge-marketing` marketplace. Each
skill is one pipeline. The `README.md` of each skill gives its stage and owner, what it is for, and the creatives it
makes.

| Skill | Kind | What it makes |
| --- | --- | --- |
| [`reaction-ad`](skills/reaction-ad/) | ad | 30 s reaction ads: an AI actor on top reacts to a real, beat-matched race below |
| [`race`](skills/race/) | capture | A real race, planned and filmed so its crashes, places and finish land on given beats |

The skill ids are `dango-derby:reaction-ad` and `dango-derby:race`. The reaction-ad skill uses the race skill for its
steps 7 and 8.

## Install and set up

You need:

- A Mac with [Homebrew](https://brew.sh) and Claude Code (the desktop app's Code tab or the `claude` CLI).
- Read access to cartridge-gg/claude-plugins and cartridge-gg/dangoderby (`gh auth status` shows your login).
- Tailscale on the cartridge.gg tailnet, for the paid steps of the reaction-ad skill.

You do not need any API key.

1. Install the plugin. In a terminal, run:

   ```bash
   claude plugin marketplace add cartridge-gg/claude-plugins#marketing
   claude plugin install dango-derby@cartridge-marketing
   ```

   You add the marketplace only once. The install needs `git` access to GitHub without a prompt. If you have no
   GitHub SSH key, run `gh auth login` and `gh auth setup-git`, and add
   `export CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` to your shell profile.

2. Set up the Mac. Before the first video, Claude runs the plugin's `scripts/setup.sh`. To run it earlier, ask
   Claude:

   > Set up the Dango Derby reaction ads.

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
   [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json) changes. One version covers all the skills. Run
   `claude plugin marketplace update cartridge-marketing`, then
   `claude plugin update dango-derby@cartridge-marketing`, and start a new session. You can also turn on
   auto-update: open `/plugin`, go to **Marketplaces**, select `cartridge-marketing`, and select **Enable
   auto-update**.

## Move from dango-ugc-factory

Until version 3.0.0, this plugin was `dango-ugc-factory`, with one skill, `dango-ugc-factory:dango-ugc-factory`. The
catalog renames it. To move:

1. Get the new catalog:

   ```bash
   claude plugin marketplace update cartridge-marketing
   ```

2. Install the new plugin. It replaces `dango-ugc-factory`:

   ```bash
   claude plugin install dango-derby@cartridge-marketing
   ```

3. Start a new Claude Code session, or run `/reload-plugins` in a session.

`claude plugin list` then shows `dango-derby@cartridge-marketing`, and not `dango-ugc-factory`. Ask for an ad the
same way as before.

If you do not do step 2, Claude Code moves you itself: the first session after the catalog update installs
`dango-derby`, and the skills load from the next session. This also happens with auto-update.

If you installed the kit with `npx skills add`, delete `~/.claude/skills/dango-ugc-factory`. If that copy stays,
Claude loads the skill twice. If you installed the kit before 2026-10-23, also delete
`~/.claude/skills/codex-imagegen`. That skill used one person's ChatGPT plan, and it is no longer part of the kit.

## Known issues

1. **The source is a zip.** This plugin comes from the kit that Gabe shared on 2026-10-14. The owner's current
   version can differ.

The known issues of each skill are in its `README.md`.

## Files

- [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json): the plugin's name, version and description.
- [`skills/reaction-ad/`](skills/reaction-ad/): the reaction-ad skill: `SKILL.md`, its scripts (take, lip check,
  face finders, compose) and the example `ad.json`.
- [`skills/race/`](skills/race/): the race skill: `SKILL.md`, the planner, the pace stories and the film.
- [`scripts/`](scripts/): the files that every skill uses: `setup.sh` (the Mac setup), `gamesound.py` (the game sound
  from a race trace) and `selfcheck.py` (the offline check that CI runs).
- [`reference/`](reference/): the brand guardrails and the game profile (`games/dango-derby.{md,json}`), with a
  template for another game.
- [`assets/`](assets/): the Dango font.
