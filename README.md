# Cartridge Claude Code plugins

This repo holds the Claude Code plugin marketplaces of the Cartridge team. A
marketplace is a catalog of plugins. Each branch of this repo is one catalog.

| Branch | Catalog name | For | Plugins |
| --- | --- | --- | --- |
| `main` | `cartridge` | The whole team | None yet |
| [`marketing`](https://github.com/cartridge-gg/claude-plugins/tree/marketing) | `cartridge-marketing` | The marketing team | `dango-ugc-factory` |

## How the branches work

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

Claude Code reads a catalog only at the root of a branch. A catalog in a
subfolder does not load (tested with Claude Code 2.1.309). For that reason, each
catalog has its own branch.

Do not merge a catalog branch into another catalog branch. A merge overwrites
the catalog `name` and the plugin list. GitHub can offer to open a PR from one
catalog branch into another. Do not open it.

## Install a catalog

You need read access to this repo and to each repo that a plugin comes from.

1. Make sure that `git` can reach GitHub without a prompt. Use one of these:
   - An SSH key that GitHub accepts, loaded in `ssh-agent`.
   - A stored HTTPS credential: run `gh auth login`, then `gh auth setup-git`.
     Also set `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` in your shell profile.
2. Add the catalog. Put its branch after `#`:

   ```bash
   claude plugin marketplace add cartridge-gg/claude-plugins#marketing
   ```

   For the `cartridge` catalog on `main`, leave out the suffix:
   `claude plugin marketplace add cartridge-gg/claude-plugins`.
3. Install a plugin with its full id:

   ```bash
   claude plugin install dango-ugc-factory@cartridge-marketing
   ```

To do these steps in a running session, put `!` before each command. Then run
`/reload-plugins` to load the plugin in that session.

To see the catalogs that you added, run `claude plugin marketplace list`. A
catalog from a branch shows as `GitHub (cartridge-gg/claude-plugins@<branch>)`.
To remove a catalog, run `claude plugin marketplace remove <catalog-name>`.

### Get updates

Users get a new copy of a plugin only when its version changes.

1. Get the new catalog: `claude plugin marketplace update <catalog-name>`.
2. Update the plugin: `claude plugin update <plugin-name>@<catalog-name>`.
3. Restart Claude Code, or run `/reload-plugins` in the session.

You can also turn on auto-update: open `/plugin`, go to **Marketplaces**,
select the catalog, and select **Enable auto-update**.

### Install a catalog for everyone in a repo

Run the commands in that repo with `--scope project`:

```bash
claude plugin marketplace add cartridge-gg/claude-plugins#marketing --scope project
claude plugin install dango-ugc-factory@cartridge-marketing --scope project
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
    "dango-ugc-factory@cartridge-marketing": true
  }
}
```

Each person who starts Claude Code in that repo gets the catalog. They also
need the `git` access from step 1.

## Add a catalog

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

5. On `main`, add a row for the catalog to the table at the top of this README.

## Add a plugin to the `cartridge` catalog

This section is for the `main` branch. Each other branch gives its own rules in
its README.

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

Do not use a full-repo source (`github` or `url`) for a plugin in
`marketing-engine`. A full clone of that repo is about 1.6 GB.

## Rename or remove a plugin

Do not change a plugin `name` in place. That breaks every existing install. To
rename or remove a plugin, add the old name to a top-level `renames` map:

```json
"renames": {
  "old-name": "new-name",
  "removed-plugin": null
}
```

Keep old entries in `renames`. Do not edit or delete them.
