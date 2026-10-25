# Cartridge marketing Claude Code plugins

This branch, `marketing`, is the Claude Code plugin marketplace for the
Cartridge marketing team. Its marketplace name is `cartridge-marketing`. It
holds the catalog file, `.claude-plugin/marketplace.json`, and the team's
creative pipelines in `pipelines/`. Each pipeline is one plugin.

| Plugin | What it makes |
| --- | --- |
| [`dango-ugc-factory`](pipelines/dango-ugc-factory/) | 30 s Dango Derby reaction ads |

Each branch of this repo is a separate catalog. The `main` branch is the
`cartridge` marketplace for the whole team. Do not merge this branch into
another catalog branch, or another catalog branch into this one. A merge
overwrites the marketplace `name` and the plugin list.

## Use the marketplace

You need read access to this repo and to each repo that a plugin comes from.

1. Make sure that `git` can reach GitHub without a prompt. Use one of these:
   - An SSH key that is loaded in `ssh-agent`.
   - A stored HTTPS credential: run `gh auth login`, then `gh auth setup-git`.
     Also set `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` in your shell profile.
2. Add the marketplace. The `#marketing` suffix selects this branch:

   ```bash
   claude plugin marketplace add cartridge-gg/claude-plugins#marketing
   ```

3. Install a plugin:

   ```bash
   claude plugin install <plugin-name>@cartridge-marketing
   ```

To get updates, run `/plugin marketplace update cartridge-marketing` in a
session. You can also turn on auto-update: open `/plugin`, go to
**Marketplaces**, select `cartridge-marketing`, and select **Enable
auto-update**.

To add the marketplace for everyone who works in one repo, run the add command
there with `--scope project`. Then commit the `.claude/settings.json` file that
it writes.

## Add a pipeline

Follow [`pipelines/README.md`](pipelines/README.md). Open the PR into
`marketing`, not `main`. The `Pipelines` workflow checks each pipeline and the
catalog.

Every user clones this branch, so keep large files out of it. Keep media that a
run makes, such as takes, gameplay and finished ads, outside the repo.

## Add a plugin from another repo

Use this for a plugin that its owner repo keeps.

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
