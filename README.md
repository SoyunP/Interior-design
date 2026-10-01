# Interior Design

Interior design concepts and visualizations, generated and reviewed with
[Banana Claude](https://github.com/AgriciDaniel/banana-claude), a Claude Code
plugin for Google Gemini image models.

## Setup

Requirements: Claude Code 2.1.199 or newer, Python 3.11+ with `python3` on
`PATH`, and a Gemini API key for a billing-enabled Google AI project.

This repository's `.claude/settings.json` registers the
`banana-claude-marketplace` and enables the `banana-claude` plugin. Open the
project in Claude Code, trust the folder, accept the plugin install prompt,
enter your Gemini API key when asked (stored as a sensitive plugin value, never
in this repo), then run `/reload-plugins`.

In Claude Code on the web, add `GEMINI_API_KEY` as an environment variable in
the cloud environment settings instead. Never commit keys to this repository.

### Project skill (`/banana`)

The standalone Banana Claude skill is also vendored at `.claude/skills/banana`
(copied from AgriciDaniel/banana-claude v3.0.0, commit `6a2b1b5`, MIT license
included). It works in any Claude Code session on this repo, including the
web, with no plugin install: it uses `/banana` and the bundled Python scripts
(standard library only), and reads the key from the `GEMINI_API_KEY`
environment variable. Check the setup with:

```bash
python3 .claude/skills/banana/scripts/doctor.py
```

`installation_layout` reports `unrecognized` because the skill wasn't placed by
the upstream `install.sh`; that check doesn't affect generation.

### Manual plugin install

To install the plugin manually instead:

```text
/plugin marketplace add AgriciDaniel/banana-claude
/plugin install banana-claude@banana-claude-marketplace
/plugin enable banana-claude@banana-claude-marketplace
/reload-plugins
```

## Example requests

```text
/banana-claude:banana generate a 16:9 Scandinavian living room, oak floors, linen sofa, soft morning light
/banana-claude:banana edit renders/kitchen.png: swap the cabinets to matte sage green, keep layout and lighting
/banana-claude:banana compare three japandi bedroom mood boards across Flash and Pro
/banana-claude:banana review renders/bathroom.png for geometry and scale artifacts
```

Every paid request shows its plan, prompt, and cost estimate first and needs
your approval. Generated images are concepts, not construction drawings:
check dimensions, fixtures, and materials before using them with clients.
