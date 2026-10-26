# Cartridge Claude Code plugins

Claude Code plugins for the Cartridge team. The plugins are in catalogs, and
each catalog is for one team. Add the catalog for your team, then install the
plugins that you need.

| Catalog | For | Plugins |
| --- | --- | --- |
| [`cartridge-marketing`](#cartridge-marketing) | The marketing team | [`dango-derby`](#dango-derby) |
| [`cartridge`](#cartridge) | The whole team | None yet |

## Before you start

Do these steps one time on each computer.

1. Make sure that your GitHub account can read this repo,
   `cartridge-gg/claude-plugins`. Some plugins also need other repos. The
   section of each plugin names them.
2. Make sure that `git` can get this repo from GitHub without a prompt. If you
   use a GitHub SSH key, this is done. If not, run these commands, then open a
   new terminal:

   ```bash
   gh auth login
   gh auth setup-git
   echo 'export CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1' >> ~/.zshrc
   ```

## `cartridge-marketing`

For the marketing team. To install the catalog and all its plugins, run:

```bash
claude plugin marketplace add cartridge-gg/claude-plugins#marketing
claude plugin install dango-derby@cartridge-marketing
```

Then start a new Claude Code session.

### `dango-derby`

Makes Dango Derby video ads on your Mac. Owner: Alex.

| Skill | What it does |
| --- | --- |
| `dango-derby:reaction-ad` | Makes a finished 30 s vertical video ad. An AI actor reacts on top, and a real race from the game plays below. |
| `dango-derby:race` | Plans and films a real Dango Derby race, so that its crashes, places and finish land on given seconds. The reaction-ad skill uses it. |
| `dango-derby:endcard` | Puts the one official end card on any finished vertical ad with the ball-roll wipe, checks that ads end on it, and fixes ads that still have the old 5-cosmetic card. |

To make an ad, ask Claude something like this:

> Make a Dango Derby reaction ad: a Welsh dad on a park bench feeding the
> pigeons, sure he's winning, overtaken at the line by a rival called
> GRANDMASTER.

Claude writes the script, makes the actor and the race, and builds the video.
It asks you to approve the script, the actor's picture, the take and the
finished video.

You need:

- A Mac with [Homebrew](https://brew.sh).
- Read access to `cartridge-gg/dangoderby`.
- Tailscale, connected to the cartridge.gg tailnet.

You do not need an API key. Before the first video, Claude runs a setup script
on your Mac. The script installs what is missing and tells you what only you
can do. The first setup takes about 15 min.

Each video costs about $14 on Joystick's fal account. Before each paid step,
Claude tells you the cost and waits for your yes.

If you have the old plugin `dango-ugc-factory`, `dango-derby` replaces it. Run
`claude plugin marketplace update cartridge-marketing`, then the install
command above.

## `cartridge`

For the whole team. It has no plugins yet. To add it, run:

```bash
claude plugin marketplace add cartridge-gg/claude-plugins
```

## Get updates

You get a new copy of a plugin only when its version changes. Run these 2
commands, then start a new session. The example is for `dango-derby`:

```bash
claude plugin marketplace update cartridge-marketing
claude plugin update dango-derby@cartridge-marketing
```

To get updates automatically, open `/plugin`, go to **Marketplaces**, select
the catalog, and select **Enable auto-update**.

## Other commands

To run a `claude plugin` command from inside a session, put `!` before it.
Then run `/reload-plugins`.

| To do this | Run |
| --- | --- |
| See your plugins | `claude plugin list` |
| See your catalogs | `claude plugin marketplace list` |
| Remove a plugin | `claude plugin uninstall <plugin>@<catalog>` |
| Remove a catalog | `claude plugin marketplace remove <catalog>` |

---

## Repo details

The rest of this README is for people who change this repo, or who set up a
catalog for everyone in a repo.

### How the branches work

| Branch | Catalog |
| --- | --- |
| `main` | `cartridge` |
| [`marketing`](https://github.com/cartridge-gg/claude-plugins/tree/marketing) | `cartridge-marketing` |

- Each branch has its own catalog file, `.claude-plugin/marketplace.json`, at
  the root. The `name` in that file is the catalog name.
- The add command selects a branch with a `#<branch>` suffix. Without the
  suffix, Claude Code uses the default branch, `main`.
- A plugin id is `<plugin-name>@<catalog-name>`. The part after `@` selects the
  catalog.
- Each catalog that you add gets its own copy of its branch, in
  `~/.claude/plugins/marketplaces/<catalog-name>`. You can add several catalogs
  from this repo at the same time.
- An update of one catalog fetches only its branch.
- `claude plugin marketplace list` shows a catalog from a branch as
  `GitHub (cartridge-gg/claude-plugins@<branch>)`.

Claude Code reads a catalog only at the root of a branch. A catalog in a
subfolder does not load (tested with Claude Code 2.1.309). For that reason, each
catalog has its own branch.

Do not merge a catalog branch into another catalog branch. A merge overwrites
the catalog `name` and the plugin list. GitHub can offer to open a PR from one
catalog branch into another. Do not open it.

### Keep this README current

People read only this README, on `main`. They do not look at the other
branches. So when a catalog changes, change this README too:

- When you add, rename or remove a plugin or a skill on any catalog branch,
  open a PR into `main` that makes the same change here.
- Give each plugin a section under its catalog: what it makes, its owner, a
  table of its skills, an example request, what a person needs, and its cost if
  it has one.
- Keep the install commands complete, so that a person can copy them as they
  are.

The README on each catalog branch can have more details, for the people who
work on that branch.

### Install a catalog for everyone in a repo

Run the commands in that repo with `--scope project`:

```bash
claude plugin marketplace add cartridge-gg/claude-plugins#marketing --scope project
claude plugin install dango-derby@cartridge-marketing --scope project
```

Then commit the `.claude/settings.json` file that they write. The branch is in
`ref`:

```json
{
  "extraKnownMarketplaces": {
    "cartridge-marketing": {
      "source": {
        "source": "github",
        "repo": "cartridge-gg/claude-plugins",
        "ref": "marketing"
      }
    }
  },
  "enabledPlugins": {
    "dango-derby@cartridge-marketing": true
  }
}
```

Each person who starts Claude Code in that repo gets the catalog. They also
need the `git` access from "Before you start".

### Add a catalog

1. Make a branch from `main`:

   ```bash
   git switch -c <team> origin/main
   ```

2. In `.claude-plugin/marketplace.json`, set `name` to `cartridge-<team>`,
   change the `description`, and keep `plugins` empty. Use a name that no other
   branch uses. Claude Code knows a catalog by its name.
3. Replace the README on the new branch with one for that catalog. Give its
   name, who it is for, and its add command with `#<team>`. The `marketing`
   branch README is an example.
4. Validate the catalog, then push the branch:

   ```bash
   claude plugin validate .
   ```

5. On `main`, add the catalog to this README: a row in the table at the top,
   and a section with its add command and its plugins.

### Add a plugin to the `cartridge` catalog

This section is for the `main` branch.

1. Put the plugin in its owner repo, in its own directory. The directory must
   contain `.claude-plugin/plugin.json`.
2. Set `version` in that `plugin.json`. Change it on each release. Users get an
   update only when the version changes.
3. Test the plugin from the owner repo before you list it:

   ```bash
   claude --plugin-dir claude-plugins/my-plugin
   ```

4. Merge the plugin into the owner repo's default branch. A `git-subdir`
   source fetches that branch, unless the entry sets `ref`.
5. Add an entry to `plugins` in `.claude-plugin/marketplace.json`. Use a
   `git-subdir` source, so that an install fetches only the plugin directory:

   ```json
   {
     "name": "my-plugin",
     "description": "One line that people see in /plugin",
     "source": {
       "source": "git-subdir",
       "url": "cartridge-gg/marketing-engine",
       "path": "claude-plugins/my-plugin"
     }
   }
   ```

   The entry `name` must be the same as the `name` in the plugin's
   `plugin.json`. Do not set `version` in the entry.
6. Validate the catalog:

   ```bash
   claude plugin validate .
   ```

7. Add the plugin to the `cartridge` section of this README.

Do not use a full-repo source (`github` or `url`) for a plugin in
`marketing-engine`. A full clone of that repo is about 1.6 GB.

### Add a plugin to another catalog

Follow the README on that catalog's branch. For `cartridge-marketing`, that is
[`pipelines/README.md`](https://github.com/cartridge-gg/claude-plugins/blob/marketing/pipelines/README.md)
on `marketing`. Then add the plugin to this README on `main`.

### Rename or remove a plugin

Do not change a plugin `name` in place. That breaks every existing install. To
rename or remove a plugin, add the old name to a top-level `renames` map:

```json
"renames": {
  "old-name": "new-name",
  "removed-plugin": null
}
```

Keep old entries in `renames`. Do not edit or delete them. Then change this
README on `main`.
