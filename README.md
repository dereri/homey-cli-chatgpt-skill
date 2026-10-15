# Homey CLI skill for ChatGPT and Codex

A local-first adaptation of [timvdhoorn/homey-cli-skill](https://github.com/timvdhoorn/homey-cli-skill), retaining its Homey flow references and templates. Intended initial target: Homey Pro 2026; actual compatibility must be verified against your hub and CLI.

The skill teaches an agent how to use the official Homey CLI. It needs local command execution, authenticated Homey access and network connectivity. Uploading these instructions alone does not connect a cloud chat to your home.

## Install locally on Windows

Install a current supported Node.js LTS release with npm and Git first. Open PowerShell:

```powershell
$skillDir = Join-Path $HOME '.agents\skills\homey-cli'
git clone https://github.com/dereri/homey-cli-chatgpt-skill.git $skillDir
Set-Location $skillDir
npm install -g homey
homey --version
homey api --help
homey login
homey whoami
homey list --json
```

Complete Athom's browser sign-in yourself. Identify the new Homey Pro 2026 in the list, especially if the old hub is still present. Replace the placeholder below with its actual ID:

```powershell
$homeyId = 'REPLACE_WITH_NEW_HOMEY_ID'
homey select --id $homeyId
homey select current
homey api system get-info --json --homey-id $homeyId
homey api devices get-devices --json --homey-id $homeyId
```

See [Local setup](references/local-setup.md) for troubleshooting and host differences.
Restart or refresh your skill-capable local host. In Codex, invoke `$homey-cli`. In ChatGPT Work, use the host's supported skill installation/discovery mechanism; the Codex directory above does not guarantee installation in every ChatGPT surface. For a development session, explicitly ask the agent to read the checkout's SKILL.md.

First request:

> Use the homey-cli skill to inspect my new Homey Pro. Verify its ID, then list devices, apps and standard/advanced flows. Read only; do not change anything.

The skill directory must be named `homey-cli`, matching its metadata.
Keep login credentials, Homey IDs/configuration and household exports outside the checkout. Do not commit them to this public fork.

## What changed from upstream

- Local ChatGPT/Codex shell instructions replace Claude tool names and invocation syntax.
- Chat-based flow suggestions replace the dependency on the superpowers visual-companion server.
- Windows setup and PowerShell UTF-8 file/backup recipes.
- Explicit Homey ID targeting on every API call.
- Correct local jq dependency and current schema-discovery syntax.
- Dependency-free structural validator for standard and Advanced Flow JSON.
- Existing domain references and templates remain available. They are examples, not verified schemas for every firmware. Bash examples need translation on Windows.

The legacy HTML picker remains for upstream traceability; it is not wired into ChatGPT.

## Check the port offline

Requires Node.js 20 or later; no npm dependencies or Homey access:
```powershell
node --test tests/validate-flow.test.mjs
node scripts/validate-flow.mjs "C:\path\to\candidate-flow.json"
```

The validator detects malformed graph structure and unresolved placeholders. It does not validate live card IDs, argument schemas, device/zone existence, tokens, authorization or physical effects. Perform live discovery and read-back verification before using a flow.

## Development and upstream updates

```powershell
git remote add upstream https://github.com/timvdhoorn/homey-cli-skill.git
git fetch upstream
git switch -c feat/my-change
```

Review upstream changes before merging; preserve this fork's host and targeting guidance. Retain upstream attribution and any existing license notices. Upstream's README identifies the project as MIT; the imported tree did not contain a standalone LICENSE file.

## Live validation status

Offline checks can validate the port and flow structure. Installation, Athom sign-in, hub identity and a read-only smoke test must be completed locally before claiming Homey Pro 2026 compatibility. A disabled test flow may then be created and read back when explicitly requested.
