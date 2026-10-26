# Creative pipelines

A pipeline is a video template: a skill that tells Claude how to generate one kind of video, from its inputs to
the finished video file. It has declared inputs and outputs, and its own scripts and QA. This folder is the one
place where the team keeps pipelines, so they are versioned and anyone can install and run them. Before, pipelines
lived in zips and Downloads folders.

Each folder here is one game's plugin in the `cartridge-marketing` marketplace (the `marketing` branch of this
repo). Each skill in a plugin is one pipeline. The skill's `README.md` frontmatter gives its stage and owner. The
plugin's `.claude-plugin/plugin.json` gives the one version of all its skills.

The pipelines of one game share one plugin, because a plugin can use only the files in its own folder. The files
that the pipelines of a game share, such as the game setup, the brand rules and the fonts, are at the plugin root.
A pipeline that other pipelines use, such as the Dango Derby race film, is a skill of its own (`kind: capture`).

Pipelines are not the generic skills in marketing-engine's `skills/`. Those run unattended in CI against any brand.
A pipeline belongs to one game, a person runs it (today on a Mac with Claude Code), and it runs scripts. See
`.claude/rules/pipelines.md`.

## Layout

```text
pipelines/
  <game>/                       one plugin: the game's pipelines
    .claude-plugin/plugin.json  the plugin's name (the folder name), version and description
    README.md                   the install, the setup, the list of skills, known issues for all of them
    scripts/                    optional: code that the skills share, such as setup.sh; optional selfcheck.py
    reference/                  optional: what the skills share, such as brand rules or a game profile
    assets/                     optional: files that the scripts use, such as fonts
    skills/<pipeline>/          one pipeline
      README.md                 frontmatter, what it is for, the creatives it makes, how to run it, known issues
      SKILL.md                  the skill that Claude runs, with the checklist of its steps
      scripts/                  the code of its steps; optional scripts/selfcheck.py
      reference/                optional: what only this pipeline uses
```

The scripts find their skill folder and the plugin root from their own path, for example
`os.path.abspath(__file__)` or `dirname "$0"`. In `SKILL.md`, write `<this skill>` for the skill folder and
`<plugin>` for the plugin root, two levels up. Do not write a fixed install path such as `~/.claude/skills/<name>`.
The plugin cache path changes with each version.

## `README.md`

Every pipeline has one document: `skills/<pipeline>/README.md`. GitHub shows it when someone opens the folder. It
starts with the frontmatter below, and it has 2 sections with these exact headings:

- `## What it is for`: the problem the pipeline solves, the game, where the ads run, and who runs the pipeline.
- `## Creatives it makes`: each format it delivers, with what the viewer sees, the length, the size, the files
  delivered, examples and the cost. Mark the formats that are only experiments.

It can also have sections for how to make a video and the known issues. `scripts/pipelines-check.py` fails if the
file, the frontmatter or one of the 2 headings is missing.

The plugin's own `README.md` has the install, the setup, a table of its skills, and the known issues that apply to
all of them.

## Steps

A pipeline makes its video in steps, and each step has one clearly defined scope. `skills/<pipeline>/SKILL.md` has
a `## Steps` section with a checklist: one item per step, in run order. Claude copies the checklist into its reply
and checks off each step when it is done. Each item looks like this:

```markdown
- [ ] **1. Script**
  - **Scope:** what the step does, and what it does not do.
  - **In:** what it needs from earlier steps.
  - **Out:** what it writes, with the file names.
  - **Done when:** how to know the step is finished.
  - **Cost:** only for a paid step.
  - **Code:** the scripts the step runs, the skill it uses, or "none".
```

Keep the items short, so Claude can copy the list. Put the details of each step (prompts, rules, commands) in
`SKILL.md` too, in a `## Step details` section after the checklist, with one `### <N>. <name>` part per step.
`scripts/pipelines-check.py` fails if the checklist, an item, or a Scope, In, Out, Done when or Code line is
missing, or if the items are not numbered 1, 2, 3 and on.

When a step uses another skill, such as the race film, keep the step in the checklist. Its `Code` line names the
skill and its step, and its details tell Claude to load that skill.

## Frontmatter

```yaml
name: reaction-ad         # the skill folder name
kind: ad                  # ad | scene | capture
stage: production         # experimenting | graduated | production | retired
owner: alex
last_verified: 2026-10-10 # the last date a full run was checked
inputs: [concept script, start frame, race plan]
outputs: [30 s 1080x1920 60fps mp4]
needs: [macOS, ffmpeg, swiftc]
```

Lists go on one line, and list items cannot contain commas. The frontmatter has no version. The version is only in
the plugin's `.claude-plugin/plugin.json`.

## Stages

1. **experimenting**: an idea or an experiment. The skill folder can start with only `README.md`.
2. **graduated**: a fresh session that starts only from the plugin runs it twice, and the owner approves both
   results.
3. **production**: the inputs and the prompt template are fixed, so the pipeline can be run in batches and, later,
   automated.
4. **retired**: kept for reference; not run.

Check a pipeline again when a model or the game changes. Move it back a stage if it fails.

## Install a pipeline

```bash
claude plugin marketplace add cartridge-gg/claude-plugins#marketing   # once per machine
claude plugin install <game>@cartridge-marketing
```

The install gives all the pipelines of that game. Read the plugin's `README.md` for the rest of its setup.

## Make a video

With the plugin installed, ask Claude for a video. Each pipeline's `README.md` has an example request.

## Change a pipeline

1. Change only files inside `pipelines/<game>/`. If you change a shared file at the plugin root, check every skill
   that uses it.
2. Bump the `version` in `.claude-plugin/plugin.json`. Users get a change only when the version changes.
3. If you found a new problem, add it to the known issues in the skill's `README.md`.
4. Run `python3 scripts/pipelines-check.py`.
5. Open a PR into `marketing`, not `main`. Say in it what changed. The `Pipelines` workflow checks each
   `plugin.json`, `README.md` and `SKILL.md`, checks that the version changed, and runs each `selfcheck.py`.

## Add a pipeline

For a game that has a plugin:

1. Create `pipelines/<game>/skills/<pipeline>/README.md` with the frontmatter and the 2 sections. Start at
   `stage: experimenting`.
2. When the pipeline works, add its `SKILL.md`, and add it to the table of skills in the plugin's `README.md`.
3. Follow "Change a pipeline".

For a new game:

1. Create `pipelines/<game>/` with a `README.md` and the first pipeline in `skills/<pipeline>/`, as above.
2. When a skill is past `experimenting`, add `.claude-plugin/plugin.json` with `"name": "<game>"` and a `version`,
   and add an entry to `.claude-plugin/marketplace.json`:

   ```json
   { "name": "<game>", "source": "./pipelines/<game>", "category": "creative pipeline" }
   ```

   Do not set `version` in the entry.
3. Follow "Change a pipeline".

Do not rename a plugin or a skill in place. A plugin rename needs an entry in the catalog's `renames` map, and a
skill rename changes the skill id that people use.

## Rules

- A pipeline ends when the video file exists and passes its own check. Steps after that, such as a re-encode for a
  platform, an upload, an ad launch or a batch report, belong to other tools.

- Never commit keys, or media that a run makes (takes, gameplay, finished ads). Keep run output in a batch folder
  outside the repo. Small assets that the pipelines need, such as fonts or an end card, belong in the plugin.
  Every user clones this branch, so keep large files out of it.
