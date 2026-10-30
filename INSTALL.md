# Install Flutter Skills

Copy a skill folder into the directory your coding agent already scans. Each skill is the directory that contains `SKILL.md`, including its `references/` and `examples/` files. Do not add these folders to `pubspec.yaml`.

Pick one scope:

- **This Flutter app.** Put the skill in the app repository. Teammates get it when they clone the app.
- **Every project on this machine.** Put the skill in your home directory. It stays on your computer.

Install the skills you expect to use. Installing all 71 makes the agent's skill list long.

Replace `flutter-go-router-engineering` in the commands below with any folder name from the [catalog](README.md#skill-catalog).

## Install with one command

[skills](https://github.com/vercel-labs/skills) copies or links a skill into the directories used by many agents. It needs Node.js 22.20 or later.

From the Flutter app:

```sh
npx skills add ariaramin/flutter-skills --skill flutter-go-router-engineering
```

The command asks which agents to target. To skip the questions, name them:

```sh
npx skills add ariaramin/flutter-skills \
  --skill flutter-go-router-engineering \
  -a cursor -a claude-code -a codex -a github-copilot -a gemini-cli -a opencode \
  -y
```

| Goal | Flag |
| --- | --- |
| Every project on this machine | `-g` or `--global` |
| One named skill | `--skill <folder-name>` |
| Every skill in this repository | `--skill '*'` or `--all` |
| A real copy instead of a symlink | `--copy` |
| Skip prompts | `-y` |
| See the skill names first | `--list` |

Use `--copy` on Windows when creating a symlink fails. Add `-g` when the skill should follow you across apps.

Examples:

```sh
# List what this repository publishes
npx skills add ariaramin/flutter-skills --list

# Personal install for Claude Code
npx skills add ariaramin/flutter-skills \
  --skill flutter-production-engineering \
  -g -a claude-code -y --copy

# One skill from its GitHub path
npx skills add https://github.com/ariaramin/flutter-skills/tree/main/skills/flutter-go-router-engineering
```

Update or remove later with `npx skills update` and `npx skills remove`. The CLI prints the destination path.

## Install with GitHub CLI

[`gh skill install`](https://cli.github.com/manual/gh_skill_install) supports the same kind of multi-agent install. It copies files and writes source metadata into the skill frontmatter so `gh skill update` can find them.

```sh
# This app, GitHub Copilot, interactive if the agent is omitted
gh skill install ariaramin/flutter-skills flutter-go-router-engineering

# Every project, Claude Code
gh skill install ariaramin/flutter-skills flutter-go-router-engineering \
  --agent claude-code --scope user

# Project scope writes the shared .agents/skills directory
gh skill install ariaramin/flutter-skills flutter-go-router-engineering \
  --agent cursor --scope project
```

GitHub CLI accepts one `--agent` in the documented examples. Omit it in an interactive terminal to pick the agent. A project install for Cursor, Codex, Copilot, Gemini CLI, OpenCode, and the other agents that share `.agents/skills/` only needs to be written there once.

Without a version, GitHub CLI uses the latest release tag when one exists, then the default branch. `--agent` defaults to `github-copilot` when the command is not interactive. `--scope` defaults to `project`.

Agent flags from the GitHub CLI manual:

`github-copilot`, `claude-code`, `cursor`, `codex`, `gemini-cli`, `antigravity`, `antigravity-cli`, `antigravity2.0`, `adal`, `amp`, `augment`, `bob`, `cline`, `codebuddy`, `command-code`, `continue`, `cortex`, `crush`, `deepagents`, `devin`, `droid`, `firebender`, `goose`, `grok`, `iflow-cli`, `junie`, `kilo`, `kimi-cli`, `kiro-cli`, `kode`, `mcpjam`, `mistral-vibe`, `mux`, `neovate`, `openclaw`, `opencode`, `openhands`, `pi`, `pochi`, `qoder`, `qwen-code`, `replit`, `roo`, `trae`, `trae-cn`, `universal`, `warp`, `zencoder`.

At project scope, GitHub CLI places Copilot, Cursor, Codex, Gemini CLI, Antigravity, Amp, Cline, OpenCode, and Warp skills in `.agents/skills/`. Pass `--dir` when you need a different folder.

## Where each agent looks

These paths come from the vendor docs linked in the last column. `~` is your home directory. On Windows that is `%USERPROFILE%`.

| Agent | This project | Every project | Docs |
| --- | --- | --- | --- |
| Cursor | `.cursor/skills/` or `.agents/skills/` | `~/.cursor/skills/` or `~/.agents/skills/` | [Cursor skills](https://cursor.com/docs/skills) |
| Claude Code | `.claude/skills/` | `~/.claude/skills/` | [Claude Code skills](https://code.claude.com/docs/en/skills) |
| Codex | `.agents/skills/` | `~/.agents/skills/` | [Build skills](https://learn.chatgpt.com/docs/build-skills) |
| GitHub Copilot | `.agents/skills/`, `.github/skills/`, or `.claude/skills/` | `~/.agents/skills/`, `~/.copilot/skills/`, or `~/.claude/skills/` | [Copilot skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills) |
| Gemini CLI | `.agents/skills/` or `.gemini/skills/` | `~/.agents/skills/` or `~/.gemini/skills/` | [Gemini CLI skills](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/skills.md) |
| OpenCode | `.agents/skills/`, `.opencode/skills/`, or `.claude/skills/` | `~/.agents/skills/`, `~/.config/opencode/skills/`, or `~/.claude/skills/` | [OpenCode skills](https://opencode.ai/docs/skills/) |

Cursor also loads `.claude/skills/`, `.codex/skills/`, `~/.claude/skills/`, and `~/.codex/skills/`. A Claude Code install is visible to Cursor. Codex still reads the older `~/.codex/skills/` directory; new installs should use `~/.agents/skills/`.

When Gemini CLI finds the same skill name in both `.agents/skills/` and `.gemini/skills/`, the `.agents` copy wins. The same rule applies under your home directory.

Cursor and OpenCode require the `name` in `SKILL.md` to match the skill folder. In this repository that is already true except for `skills/flutter-caching-engineering`, whose manifest name is `flutter-caching`. Copy that folder as it is, and expect those two agents to ignore it until the name and folder match.

Windsurf, Cline, Continue, Amp, Roo Code, and the other flags above do not all share one official directory. Install them with `npx skills add -a <agent>` or `gh skill install --agent <agent>` so the tool writes to the path it supports. The [skills CLI agent table](https://github.com/vercel-labs/skills#supported-agents) lists the directories that CLI uses.

## Copy a skill yourself

Clone this repository, then run the commands from its root:

```sh
git clone https://github.com/ariaramin/flutter-skills.git
cd flutter-skills
SKILL=flutter-go-router-engineering
```

If the skill is already in `./selected-skills/$SKILL`, use that path as the source instead of `skills/$SKILL`.

### Every project

```sh
# Cursor
mkdir -p ~/.cursor/skills
cp -R "skills/$SKILL" ~/.cursor/skills/

# Claude Code
mkdir -p ~/.claude/skills
cp -R "skills/$SKILL" ~/.claude/skills/

# Codex, Copilot, Gemini CLI, and OpenCode
mkdir -p ~/.agents/skills
cp -R "skills/$SKILL" ~/.agents/skills/
```

Copilot also reads `~/.copilot/skills/`. Gemini CLI also reads `~/.gemini/skills/`. OpenCode also reads `~/.config/opencode/skills/`. One copy in `~/.agents/skills/` covers those three, plus Cursor and Codex.

PowerShell:

```powershell
$Skill = "flutter-go-router-engineering"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.agents\skills" | Out-Null
Copy-Item -Recurse -Force "skills\$Skill" "$env:USERPROFILE\.agents\skills\"
```

### This Flutter app

```sh
cd /path/to/your-flutter-app
SKILL=flutter-go-router-engineering
SRC=/path/to/flutter-skills/skills/$SKILL

mkdir -p .agents/skills
cp -R "$SRC" .agents/skills/

# Claude Code does not scan .agents/skills
mkdir -p .claude/skills
cp -R "$SRC" .claude/skills/
```

Commit `.agents/skills/` or `.claude/skills/` when the team should share the skill. Cursor also accepts `.cursor/skills/` in the app. Copilot also accepts `.github/skills/`.

## Download without Node or GitHub CLI

These commands only download files. Move the folder into one of the directories above afterward.

One skill:

```sh
mkdir -p ./selected-skills
curl -fL "https://codeload.github.com/ariaramin/flutter-skills/tar.gz/refs/heads/main" \
  | tar -xz -C ./selected-skills --strip-components=2 \
    flutter-skills-main/skills/flutter-go-router-engineering
```

The same download with `wget`:

```sh
mkdir -p ./selected-skills
wget -qO- "https://codeload.github.com/ariaramin/flutter-skills/tar.gz/refs/heads/main" \
  | tar -xz -C ./selected-skills --strip-components=2 \
    flutter-skills-main/skills/flutter-go-router-engineering
```

Every skill folder:

```sh
npx degit ariaramin/flutter-skills/skills ./selected-skills
```

`npx degit` does not install a single skill and does not place files where an agent can see them.

One skill with a sparse clone:

```sh
mkdir -p ./selected-skills
git clone --filter=blob:none --sparse https://github.com/ariaramin/flutter-skills.git ./flutter-skills-install
git -C ./flutter-skills-install sparse-checkout set --no-cone skills/flutter-go-router-engineering
cp -R ./flutter-skills-install/skills/flutter-go-router-engineering ./selected-skills/
```

The landing page builds the same four download commands for the skills it lists.

## Check the install

Confirm the manifest is in place:

```sh
find .agents/skills .claude/skills .cursor/skills \
  ~/.agents/skills ~/.claude/skills ~/.cursor/skills \
  -name SKILL.md -path "*flutter-go-router-engineering*" 2>/dev/null
```

Start a new agent session. Codex reloads skills on its own and should be restarted if the new skill is missing. Then ask for the task in normal language, or name the skill:

> Use the flutter-go-router-engineering skill. Add an auth redirect so signed-out users cannot open `/account`.

Claude Code and Copilot CLI can also list skills with `/skills`. Copilot CLI invokes one with a slash command such as `/flutter-go-router-engineering`. Codex uses `/skills` or a `$` mention. Cursor uses the skill when the request matches its description.

## If the skill does not appear

- The copied object must be the skill directory. `SKILL.md` alone is not enough, because the manifest links to files beside it.
- The folder must sit directly inside the agent's skills directory: `~/.cursor/skills/flutter-go-router-engineering/SKILL.md`, not `~/.cursor/skills/SKILL.md`.
- A directory directly under this repository's `skills/` is not an installed skill. Agents do not scan that checkout unless you point them at it or copy the folder.
- Cursor and OpenCode skip a skill whose `name` does not match its folder. See `flutter-caching-engineering` above.
- On Windows, a failed symlink looks like a missing skill. Install again with `npx skills add --copy`.
- Personal Cursor skills stay on your machine. Cloud Agents do not receive `~/.agents/skills/` or an unsynced `~/.cursor/skills/`. For a cloud session, put the skill in the project or sync `~/.cursor/skills/` from Cursor's Agents settings.
- Product paths change. If a command here disagrees with the agent, follow the vendor page in the table.
