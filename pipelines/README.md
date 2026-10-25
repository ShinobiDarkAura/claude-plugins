# Creative pipelines

A pipeline is a video template: a skill that tells Claude how to generate one kind of video, from its inputs to
the finished video file. It has declared inputs and outputs, and its own scripts and QA. This folder is the one
place where the team keeps pipelines, so they are versioned and anyone can install and run them. Before, pipelines
lived in zips and Downloads folders.

Each folder here is one pipeline. Its `README.md` frontmatter gives its stage, owner and version.

Pipelines are not the generic skills in `skills/`. Those run unattended in CI against any brand. A pipeline belongs
to one game, a person runs it (today on a Mac with Claude Code), and it runs scripts. See
`.claude/rules/pipelines.md`.

## Layout

```text
pipelines/
  <name>/              the pipeline, and also the skill that npx skills add installs
    README.md          frontmatter, what it is for, the creatives it makes, setup, how to run it, known issues
    SKILL.md           the skill that Claude runs, with the checklist of its steps
    VERSION            optional: the skill's version, the same as the README.md frontmatter
    reference/         optional: what SKILL.md points to, such as brand rules or a game profile
    scripts/           the code of the steps; optional scripts/selfcheck.py, an offline check that CI runs
    assets/            optional: files the scripts use, such as fonts
```

## `README.md`

Every pipeline has one document: its `README.md`. GitHub shows it when someone opens the folder. It starts with
the frontmatter below, and it has 2 sections with these exact headings:

- `## What it is for`: the problem the pipeline solves, the game, where the ads run, and who runs the pipeline.
- `## Creatives it makes`: each format it delivers, with what the viewer sees, the length, the size, the files
  delivered, examples and the cost. Mark the formats that are only experiments.

It can also have sections for the setup, how to make a video, and the known issues. `scripts/pipelines-check.py`
fails if the file, the frontmatter or one of the 2 headings is missing.

## Steps

A pipeline makes its video in steps, and each step has one clearly defined scope. `SKILL.md` has a `## Steps`
section with a checklist: one item per step, in run order. Claude copies the checklist into its reply and checks
off each step when it is done. Each item looks like this:

```markdown
- [ ] **1. Script**
  - **Scope:** what the step does, and what it does not do.
  - **In:** what it needs from earlier steps.
  - **Out:** what it writes, with the file names.
  - **Done when:** how to know the step is finished.
  - **Cost:** only for a paid step.
  - **Code:** the scripts the step runs, or "none".
```

Keep the items short, so Claude can copy the list. Put the details of each step (prompts, rules, commands) in
`SKILL.md` too, in a `## Step details` section after the checklist, with one `### <N>. <name>` part per step. `scripts/pipelines-check.py` fails if the checklist, an item, or a Scope, In, Out, Done when
or Code line is missing, or if the items are not numbered 1, 2, 3 and on.

## Frontmatter

```yaml
name: dango-ugc-factory   # the folder name
kind: ad                  # ad | scene | capture
stage: production         # experimenting | graduated | production | retired
owner: alex
version: 1.0.1            # must match VERSION when that file exists
last_verified: 2026-10-10 # the last date a full run was checked
inputs: [concept script, start frame, race plan]
outputs: [30 s 1080x1920 60fps mp4]
needs: [macOS, ffmpeg, swiftc]
```

Lists go on one line, and list items cannot contain commas.

## Stages

1. **experimenting**: an idea or an experiment. The folder can start with only `README.md`.
2. **graduated**: a fresh session that starts only from this folder runs it twice, and the owner approves both
   results. The pipeline then gets a version.
3. **production**: the inputs and the prompt template are fixed, so the pipeline can be run in batches and, later,
   automated.
4. **retired**: kept for reference; not run.

Check a pipeline again when a model or the game changes. Move it back a stage if it fails.

## Install a pipeline

```bash
npx -y skills@1.7.0 add https://github.com/cartridge-gg/marketing-engine/tree/main/pipelines/<name> \
  --skill '*' -g -a claude-code
```

This installs the pipeline folder as a skill in `~/.claude/skills/<name>/`. Read the pipeline's `README.md` for the
rest of its setup.

## Make a video

With the skill installed, ask Claude for a video. The pipeline's `README.md` has an example request.

## Change a pipeline

1. Change only files inside `pipelines/<name>/`.
2. Bump the version in the `README.md` frontmatter (and `VERSION` in the skill, if it has one).
3. If you found a new problem, add it to the known issues in `README.md`.
4. Run `python3 scripts/pipelines-check.py`.
5. Open a PR. Say in it what changed. The `Pipelines` workflow checks each `README.md` and `SKILL.md`, and runs
   each `scripts/selfcheck.py`.

## Add a pipeline

Create `pipelines/<name>/README.md` with the frontmatter and the 2 sections, start at `stage: experimenting`, and
follow "Change a pipeline".

## Rules

- A pipeline ends when the video file exists and passes its own check. Steps after that, such as a re-encode for a
  platform, an upload, an ad launch or a batch report, belong to other tools.

- Never commit keys, or media that a run makes (takes, gameplay, finished ads). Keep run output in a batch folder
  outside the repo. Small assets that the pipeline itself needs, such as fonts or an end card, belong in the skill.
