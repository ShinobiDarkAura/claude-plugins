#!/usr/bin/env python3
"""Check every pipelines/<name>/ folder: the README.md frontmatter and sections, .claude-plugin/plugin.json, the
pipeline's entry in .claude-plugin/marketplace.json, and the checklist in skills/<name>/SKILL.md.

    python3 scripts/pipelines-check.py                       # exits 1 and names each problem
    python3 scripts/pipelines-check.py --base origin/marketing  # also: a changed pipeline must change its version

CI runs it on every pipelines/ change, with --base on pull requests. Users get a new copy of a plugin only when
its plugin.json version changes, so a change without a new version never reaches them.

The frontmatter is a small YAML subset: `key: value` and `key: [a, b, c]`, with `#` comments.
List items cannot contain commas. Standard library only, so it runs on any machine and in CI.
"""
import json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PIPELINES = ROOT / "pipelines"
MARKETPLACE = ROOT / ".claude-plugin" / "marketplace.json"

KINDS = ("ad", "scene", "capture")
STAGES = ("experimenting", "graduated", "production", "retired")
SCALARS = ("name", "kind", "stage", "owner", "last_verified")
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


def plugin_json(folder):
    """Return the folder's plugin.json as a dict, None when it is missing, or a problem string when it is not JSON."""
    p = folder / ".claude-plugin" / "plugin.json"
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text())
    except ValueError as e:
        return f"plugin.json: not valid JSON: {e}"


def catalog():
    """Return the plugin entries of the marketplace file."""
    return json.loads(MARKETPLACE.read_text()).get("plugins", [])


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
    if "last_verified" in fm and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", fm["last_verified"]):
        problems.append("README.md: last_verified must be a date, YYYY-MM-DD")

    # The pipeline folder is a plugin: plugin.json has its name and its only version, and the marketplace lists it.
    if (folder / "VERSION").exists():
        problems.append("VERSION: delete it; the version is only in .claude-plugin/plugin.json")
    manifest = plugin_json(folder)
    if manifest is None and fm.get("stage") not in (None, "experimenting"):
        problems.append(f"stage is {fm['stage']} but there is no .claude-plugin/plugin.json")
    elif isinstance(manifest, str):
        problems.append(manifest)
    elif isinstance(manifest, dict):
        if manifest.get("name") != folder.name:
            problems.append(f"plugin.json: name is {manifest.get('name')!r} but the folder is {folder.name!r}")
        if not re.fullmatch(r"\d+\.\d+\.\d+", str(manifest.get("version", ""))):
            problems.append("plugin.json: version must look like 1.2.3")
        entries = [e for e in catalog() if e.get("name") == folder.name]
        if not entries:
            problems.append(f"{MARKETPLACE.relative_to(ROOT)}: no entry named {folder.name!r}")
        for e in entries:
            if e.get("source") != f"./pipelines/{folder.name}":
                problems.append(f"marketplace entry: source must be './pipelines/{folder.name}'")
            if "version" in e:
                problems.append("marketplace entry: remove version; it is only in plugin.json")

    # The skill is skills/<name>/SKILL.md. Each step is one checklist item in it, and it states its scope.
    skill = folder / "skills" / folder.name / "SKILL.md"
    if not skill.exists() and fm.get("stage") not in (None, "experimenting"):
        problems.append(f"stage is {fm['stage']} but there is no skills/{folder.name}/SKILL.md")
    if skill.exists():
        text = skill.read_text()
        m = re.match(r"---\n(.*?)\n---\n", text, re.S)
        name = re.search(r"^name:\s*(\S+)", m.group(1), re.M) if m else None
        if not name or name.group(1) != folder.name:
            problems.append(f"SKILL.md: the frontmatter must have name: {folder.name}")
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


def bumped(folder, base):
    """Return a problem when the folder changed since base but its plugin.json version did not."""
    rel = folder.relative_to(ROOT).as_posix()
    git = lambda *a: subprocess.run(["git", "-C", str(ROOT), *a], capture_output=True, text=True)
    diff = git("diff", "--quiet", f"{base}...HEAD", "--", rel).returncode
    if diff not in (0, 1):
        return [f"cannot compare with {base} (git diff exit {diff}); fetch the base branch with full history"]
    old = git("show", f"{base}:{rel}/.claude-plugin/plugin.json")
    if diff == 0 or old.returncode:
        return []   # unchanged, or new since base: nothing to compare
    new = plugin_json(folder)
    if isinstance(new, dict) and json.loads(old.stdout).get("version") == new.get("version"):
        return [f"changed since {base}, but plugin.json version is still {new.get('version')}: bump it"]
    return []


def main():
    base = sys.argv[sys.argv.index("--base") + 1] if "--base" in sys.argv else None
    folders = sorted(p for p in PIPELINES.iterdir() if p.is_dir())
    failed = False
    for folder in folders:
        for p in check(folder) + (bumped(folder, base) if base else []):
            print(f"{folder.relative_to(ROOT)}: {p}", file=sys.stderr)
            failed = True
    for e in catalog():   # an entry for a pipeline folder that is not there
        src = str(e.get("source", ""))
        if src.startswith("./pipelines/") and not (ROOT / src).is_dir():
            print(f"{MARKETPLACE.relative_to(ROOT)}: {e.get('name')}: no folder {src}", file=sys.stderr)
            failed = True
    if failed:
        sys.exit(1)
    print(f"{len(folders)} pipeline(s) ok")


if __name__ == "__main__":
    main()
