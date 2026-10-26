---
globs: ["pipelines/**"]
---
# Pipeline Rules

You are editing a **creative pipeline**: a video template. It is a skill that tells Claude how to generate one kind
of video, owned by a person and run by people, not by CI. Each game is one Claude Code plugin in the
`cartridge-marketing` marketplace, `pipelines/<game>/`, and each pipeline is one skill in it,
`skills/<pipeline>/`. Read `pipelines/README.md` first.

A pipeline is not a generic marketing-engine skill. A pipeline:

- may name its game and use game-specific paths, assets and scripts;
- may use Bash and any tools its `README.md` frontmatter lists under `needs`;
- is not wired to marketing-engine's `brands/`, `scripts/run-skill.sh` or scheduled workflows.

## MUST

- Keep every change inside `pipelines/<game>/`. The one exception is the plugin's entry in
  `.claude-plugin/marketplace.json`.
- Keep the frontmatter in each `skills/<pipeline>/README.md` valid: the fields and values in `pipelines/README.md`.
- Keep the `## Steps` checklist in `skills/<pipeline>/SKILL.md`: one item per step, each with Scope, In, Out, Done
  when and Code. Put a step's details in the `## Step details` section of `SKILL.md`, not in the item.
- Keep each skill's `README.md` current: what the pipeline is for and which creatives it makes, under the 2 headings
  in `pipelines/README.md`. When a format is added, changed or dropped, update it.
- When the plugin changes, bump its `version` in `.claude-plugin/plugin.json`. Users get no update without it. Put
  a new problem in the known issues of the skill's `README.md`.
- Put a file that 2 or more skills use at the plugin root (`scripts/`, `reference/`, `assets/`), not in one skill.
  When you change a shared file, check every skill that uses it.
- Find the skill folder and the plugin root from the script's own path. The installed copy is in the plugin cache,
  and that path changes with each version.
- Run `python3 scripts/pipelines-check.py` and fix every problem it names.
- Keep the owner's code recognisable. Fix in small, separate commits, so a new version from the owner still diffs
  cleanly.

## MUST NOT

- Commit keys, `.env` files, or media that a run makes (takes, gameplay, finished ads).
- Add steps that come after the video exists, such as a re-encode for a platform, an upload, an ad launch or a batch
  report.
- Set `version` in the marketplace entry, or add a `VERSION` file. The version is only in `plugin.json`.
- Rename a plugin without an entry in the catalog's `renames` map, or rename a skill without telling its users.
- Merge this branch into `main` or into another catalog branch. Each branch is a separate marketplace.
