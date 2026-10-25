---
globs: ["pipelines/**"]
---
# Pipeline Rules

You are editing a **creative pipeline**: a video template. It is a skill that tells Claude how to generate one kind
of video, owned by a person and run by people, not by CI. Read `pipelines/README.md` first.

Pipelines are the one exception to the generic-skill rules in `skills.md` and `architecture.md`. A pipeline:

- may name its game and use game-specific paths, assets and scripts;
- may use Bash and any tools its `README.md` frontmatter lists under `needs`;
- is not wired to `brands/`, `scripts/run-skill.sh` or the scheduled workflows.

## MUST

- Keep every change inside `pipelines/<name>/`.
- Keep the `README.md` frontmatter valid: the fields and values in `pipelines/README.md`.
- Keep the `## Steps` checklist in `SKILL.md`: one item per step, each with Scope, In, Out, Done when and Code.
  Put a step's details in the `## Step details` section of `SKILL.md`, not in the item.
- Keep `README.md` current: what the pipeline is for and which creatives it makes, under the 2 headings in
  `pipelines/README.md`. When a format is added, changed or dropped, update it.
- When the pipeline changes, bump its version in the `README.md` frontmatter (and the skill's `VERSION` when
  present). Put a new problem in the known issues in `README.md`.
- Run `python3 scripts/pipelines-check.py` and fix every problem it names.
- Keep the owner's code recognisable. Fix in small, separate commits, so a new version from the owner still diffs
  cleanly.

## MUST NOT

- Commit keys, `.env` files, or media that a run makes (takes, gameplay, finished ads).
- Add steps that come after the video exists, such as a re-encode for a platform, an upload, an ad launch or a batch
  report.
- Move a pipeline's skill into `skills/`: that folder is for generic, brand-agnostic prompts.
