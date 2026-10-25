#!/usr/bin/env python3
"""Check every pipelines/<name>/ folder: the README.md frontmatter and sections, VERSION, and SKILL.md's checklist.

    python3 scripts/pipelines-check.py   # exits 1 and names each problem; CI runs it on every pipelines/ change

The frontmatter is a small YAML subset: `key: value` and `key: [a, b, c]`, with `#` comments.
List items cannot contain commas. Standard library only, so it runs on any machine and in CI.
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PIPELINES = ROOT / "pipelines"

KINDS = ("ad", "scene", "capture")
STAGES = ("experimenting", "graduated", "production", "retired")
SCALARS = ("name", "kind", "stage", "owner", "version", "last_verified")
LISTS = ("inputs", "outputs", "needs")
FILES = ("README.md",)
# Every README.md says what the pipeline is for and which creatives it makes, under these headings.
README_SECTIONS = ("## What it is for", "## Creatives it makes")
# SKILL.md has a "## Steps" checklist; every item has these lines (pipelines/README.md, "Steps").
STEP_FIELDS = ("Scope", "In", "Out", "Done when", "Code")


def checklist(text):
    """Return [(number, [lines of the item])] for each "- [ ] **N. Name**" item in SKILL.md."""
    items, cur = [], None
    for l in text.splitlines():
        m = re.match(r"- \[ \] \*\*(\d+)\. ", l)
        if m:
            cur = (int(m.group(1)), []); items.append(cur)
        elif cur and l.startswith("  "):
            cur[1].append(l.strip())
        else:
            cur = None
    return items


def frontmatter(text):
    m = re.match(r"---\n(.*?)\n---\n", text, re.S)
    if not m:
        raise ValueError("no frontmatter block between --- lines at the top")
    out = {}
    for n, line in enumerate(m.group(1).splitlines(), 2):
        line = re.sub(r"\s+#.*$", "", line).rstrip()
        if not line or line.startswith("#"):
            continue
        k = re.match(r"([a-z_]+):\s*(.*)$", line)
        if not k:
            raise ValueError(f"line {n}: expected `key: value`, got {line!r}")
        key, val = k.groups()
        if key in out:
            raise ValueError(f"line {n}: {key} is set twice")
        if val.startswith("["):
            if not val.endswith("]"):
                raise ValueError(f"line {n}: {key}: a list must open and close on one line")
            out[key] = [v.strip() for v in val[1:-1].split(",") if v.strip()]
        else:
            out[key] = val
    return out


def check(folder):
    """Return the problems of one pipeline folder."""
    problems = [f"missing {f}" for f in FILES if not (folder / f).exists()]
    fm = {}
    if (folder / "README.md").exists():
        text = (folder / "README.md").read_text()
        lines = {l.rstrip() for l in text.splitlines()}
        problems += [f"README.md: missing the section {h!r}" for h in README_SECTIONS if h not in lines]
        try:
            fm = frontmatter(text)
        except ValueError as e:
            return problems + [f"README.md: {e}"]
    for k in SCALARS + LISTS:
        if k not in fm:
            problems.append(f"README.md: missing {k}")
    for k in SCALARS:
        if isinstance(fm.get(k), list):
            problems.append(f"README.md: {k} must be a single value")
    for k in LISTS:
        if k in fm and not isinstance(fm[k], list):
            problems.append(f"README.md: {k} must be a list, e.g. {k}: [a, b]")
    for k in set(fm) - set(SCALARS + LISTS):
        problems.append(f"README.md: unknown key {k}")
    if fm.get("name") not in (None, folder.name):
        problems.append(f"README.md: name is {fm['name']!r} but the folder is {folder.name!r}")
    if fm.get("kind") not in (None,) + KINDS:
        problems.append(f"README.md: kind must be one of {', '.join(KINDS)}")
    if fm.get("stage") not in (None,) + STAGES:
        problems.append(f"README.md: stage must be one of {', '.join(STAGES)}")
    if "version" in fm and not re.fullmatch(r"\d+\.\d+\.\d+", fm["version"]):
        problems.append("README.md: version must look like 1.2.3")
    if "last_verified" in fm and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", fm["last_verified"]):
        problems.append("README.md: last_verified must be a date, YYYY-MM-DD")

    # The pipeline folder is the skill: SKILL.md next to README.md.
    if not (folder / "SKILL.md").exists() and fm.get("stage") not in (None, "experimenting"):
        problems.append(f"stage is {fm['stage']} but there is no SKILL.md")
    vf = folder / "VERSION"   # when the skill has a VERSION file, it must agree with README.md
    if vf.exists() and "version" in fm and vf.read_text().strip() != fm["version"]:
        problems.append(f"VERSION is {vf.read_text().strip()} but README.md says {fm['version']}")
    # Each step is one checklist item in SKILL.md, and it states its scope.
    if (folder / "SKILL.md").exists():
        text = (folder / "SKILL.md").read_text()
        items = checklist(text)
        if "## Steps" not in text.splitlines() or not items:
            problems.append("SKILL.md: no '## Steps' checklist ('- [ ] **1. <name>**' items)")
        if [n for n, _ in items] != list(range(1, len(items) + 1)):
            problems.append(f"SKILL.md: the steps are numbered {[n for n, _ in items]}, not 1, 2, 3 and on")
        for n, lines in items:
            for field in STEP_FIELDS:
                if not any(l.startswith(f"- **{field}:**") for l in lines):
                    problems.append(f"SKILL.md: step {n} has no '- **{field}:**' line")
    return problems



def main():
    folders = sorted(p for p in PIPELINES.iterdir() if p.is_dir())
    failed = False
    for folder in folders:
        for p in check(folder):
            print(f"{folder.relative_to(ROOT)}: {p}", file=sys.stderr)
            failed = True
    if failed:
        sys.exit(1)
    print(f"{len(folders)} pipeline(s) ok")


if __name__ == "__main__":
    main()
