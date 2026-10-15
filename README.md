# Homey CLI skill for ChatGPT and Codex

A local-first adaptation of [timvdhoorn/homey-cli-skill](https://github.com/timvdhoorn/homey-cli-skill) for inspecting and managing Homey Pro through the official Homey CLI. The initial target is Homey Pro 2026.

The skill packages instructions, references and templates. Running it requires a host with local command execution, an installed Homey CLI, Athom authentication and network access to the hub or Athom service.

## Refactoring status

**Use the `feat/chatgpt-local` branch for the ChatGPT/Codex version.** The default `master` branch still contains the upstream Claude implementation; [PR #1](https://github.com/dereri/homey-cli-chatgpt-skill/pull/1) was closed without merging. The installation commands below explicitly select the refactored branch.

The port has passed 13 offline tests. Live authentication, hub connectivity and flow behavior on Homey Pro 2026 remain unverified.

## Capabilities

- Inspect devices, zones, installed apps, standard flows and Advanced Flows.
- Discover actual flow-card definitions, arguments and tokens before designing automations.
- Prepare, structurally validate, create and update standard or Advanced Flow JSON.
- Suggest automations from the connected hub's inventory and existing flow behavior, with selection in chat.
- Control device capabilities and manage apps within the user's authorized scope.
- Use supported raw API operations or HomeyScript when the normal flow workflow is insufficient.
- Explore supported Zigbee and other manager diagnostics through installed CLI help and schemas.

Available operations depend on the installed CLI, Homey firmware, apps and permissions. Templates contain placeholders that must be replaced using live discovery.

## Requirements

- A ChatGPT Work/Codex environment that can run commands on your local computer.
- Git and a supported Node.js LTS release with npm. The bundled validator and tests require Node.js 20 or later; also check the Homey package's engine requirements.
- The official `homey` npm package and an Athom account with access to the intended hub.
- Network access from the local execution environment to Homey or Athom.
- Optionally, jq for CLI filtering. `--jq` runs locally and requires the jq executable; it is not server-side filtering.

A normal cloud chat does not gain local shell or Homey access by receiving this README or the skill files.

## Install on Windows

Open PowerShell. Choose a new directory named `homey-cli` so the folder matches the skill's metadata:

```powershell
$skillDir = Join-Path $HOME '.agents\skills\homey-cli'
New-Item -ItemType Directory -Path (Split-Path -Parent $skillDir) -Force | Out-Null
git clone --branch feat/chatgpt-local --single-branch https://github.com/dereri/homey-cli-chatgpt-skill.git $skillDir
Set-Location $skillDir

npm install -g homey
homey --version
homey api --help
```

The `.agents\skills` location is for local Codex discovery. Refresh or restart the host, then invoke `$homey-cli`. ChatGPT Work installation/discovery depends on the host; placing files in this directory alone does not prove the skill is available there. In a development session with local file access, ask the agent to read the checkout's `SKILL.md` explicitly.

If you already cloned the repository elsewhere, keep that checkout and switch branches:

```powershell
git fetch origin
git switch feat/chatgpt-local
git pull --ff-only
```

Run those commands from the existing checkout. Do not clone over a directory containing local work.

## Authenticate and identify the new hub

```powershell
homey login
homey whoami
homey list --json
```

Complete Athom's browser sign-in yourself. Find the actual ID of the new Homey Pro 2026, especially if the old Homey remains on the account. Replace the placeholder below:

```powershell
$homeyId = 'REPLACE_WITH_NEW_HOMEY_ID'
homey select --id $homeyId
homey select current
```

Use an explicit ID rather than an interactive selection prompt. The selected hub is cached locally, so every subsequent API call must also include `--homey-id $homeyId`.

## Verify read-only access

```powershell
homey api system get-info --json --homey-id $homeyId
homey api devices get-devices --json --homey-id $homeyId
homey api apps get-apps --json --homey-id $homeyId
homey api flow get-flows --json --homey-id $homeyId
homey api flow get-advanced-flows --json --homey-id $homeyId
```

Check the command's exit status and output before continuing. If an operation is unavailable, inspect the installed command surface:

```powershell
homey api --help
homey api devices get-devices --help
homey api schema --manager devices --operation get-devices --json --homey-id $homeyId
```

First agent request:

> Use the homey-cli skill to inspect my new Homey Pro. Verify its ID, then list devices, apps and standard/advanced flows. Read only; do not change anything.

See [local setup](https://github.com/dereri/homey-cli-chatgpt-skill/blob/feat/chatgpt-local/references/local-setup.md) for troubleshooting and [PowerShell recipes](https://github.com/dereri/homey-cli-chatgpt-skill/blob/feat/chatgpt-local/references/recipes.md) for JSON exports and backups.

## Flow validation and writes

The refactored workflow discovers live card definitions, resolves arguments, prepares JSON, validates it, backs up existing configuration, writes within the authorized scope and reads the result back.

Run these commands from the refactored skill directory:

```powershell
node --test tests/validate-flow.test.mjs
node scripts/validate-flow.mjs "C:\path\to\candidate-flow.json"
```

No npm dependencies or Homey access are needed for these offline checks.

The structural validator checks required fields, placeholders, UUID format, graph references, supported output names, join inputs and executable-card reachability. Decorative notes need not be reachable. Existing card UUIDs are preserved when editing; newly added cards receive fresh UUIDs.

**A structural pass does not establish that a flow works on Homey.** Live card IDs, argument schemas, device/zone existence, tokens, capabilities, authorization and physical effects require separate checks. Do not rely on `broken: false` alone.

New test flows are prepared disabled by default. Creating, activating or triggering them must be covered by the user's request. Back up persistent configuration before updates and verify the hub identity immediately before each write.

## Changes from the Claude version

| Area | ChatGPT/Codex adaptation |
|---|---|
| Agent tools | Uses the local shell exposed by the host; removes reliance on Claude-specific invocation and tool names |
| Automation selection | Numbered suggestions and selections in chat |
| Windows support | PowerShell setup, quoted JSON-file arguments and explicit UTF-8 backup recipes |
| Hub targeting | Verified Homey ID on every API call |
| Validation | Dependency-free Node structural checker plus separate live-reference checks |
| Skill metadata | `agents/openai.yaml` for OpenAI host UI metadata |

Upstream Homey references, flow templates, community examples and HomeyScript starters remain available. Some domain references still contain Bash examples; translate these before using them in PowerShell.

The legacy HTML picker remains as an upstream asset. It is not connected to ChatGPT and does not provide click-to-resume interaction or automatic continuation. No Claude superpowers server is required.

## Repository guide

The links below point to the refactored branch.

| Path | Purpose |
|---|---|
| [SKILL.md](https://github.com/dereri/homey-cli-chatgpt-skill/blob/feat/chatgpt-local/SKILL.md) | Agent entry point and workflow |
| [agents/openai.yaml](https://github.com/dereri/homey-cli-chatgpt-skill/blob/feat/chatgpt-local/agents/openai.yaml) | Display name, description and starter prompt |
| [references/](https://github.com/dereri/homey-cli-chatgpt-skill/tree/feat/chatgpt-local/references) | Setup, PowerShell recipes, discovery, schemas and troubleshooting |
| [assets/flow-templates/](https://github.com/dereri/homey-cli-chatgpt-skill/tree/feat/chatgpt-local/assets/flow-templates) | Standard/advanced skeletons, card primitives and community examples |
| [assets/homeyscript-templates/](https://github.com/dereri/homey-cli-chatgpt-skill/tree/feat/chatgpt-local/assets/homeyscript-templates) | HomeyScript starters |
| [scripts/validate-flow.mjs](https://github.com/dereri/homey-cli-chatgpt-skill/blob/feat/chatgpt-local/scripts/validate-flow.mjs) | Offline structural validator |
| [tests/validate-flow.test.mjs](https://github.com/dereri/homey-cli-chatgpt-skill/blob/feat/chatgpt-local/tests/validate-flow.test.mjs) | Validator and skill-integrity tests |

## Updating and contributing

Update an existing refactored checkout with:

```powershell
git switch feat/chatgpt-local
git pull --ff-only
```

To review upstream improvements, add the original repository once and fetch its changes:

```powershell
git remote add upstream https://github.com/timvdhoorn/homey-cli-skill.git
git fetch upstream
```

Review changes before merging so Claude-specific dependencies are not reintroduced. When the port is integrated into the default branch, update this README's branch status, clone command and branch-specific links together.

Keep credentials, authentication files, household exports and backups outside this public checkout. The refactored branch's ignore rules cover common local export/configuration paths, but they do not replace checking staged files.

## Attribution

Adapted from [timvdhoorn/homey-cli-skill](https://github.com/timvdhoorn/homey-cli-skill). The upstream README identifies the project as MIT; the imported tree did not include a standalone LICENSE file. Preserve upstream attribution and any license notices.
