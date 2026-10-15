# Local setup

## Requirements

Use a skill-capable ChatGPT Work/Codex host with local shell execution, Node.js 20+ and npm, Git, the official `homey` package and network access to the hub or Athom service. Check package engine requirements before installing the latest release. jq is optional and runs on the client.

Check `Get-Command node,npm,homey` in PowerShell. A host's bundled Node executable does not imply npm or Homey CLI is installed. Do not silently change system execution policy or download unrelated tooling to bypass a restriction.

## Authenticate

Run `npm install -g homey` once within the user's authorized setup.
Inspect `homey --version` and `homey api --help` to check the installed command surface.
Have the user complete `homey login` via Athom's browser OAuth. Do not request passwords or tokens in chat.
Verify with `homey whoami` and `homey list --json`.

Identify the intended hub by actual ID. A new Homey Pro and an old Homey can be present simultaneously. Do not target the old hub merely because it is selected or has a familiar name.
Select with `homey select --id <ID>`, then run `homey select current`. The selection only configures the CLI client.

## First read-only smoke test

Run the following with the verified ID:
```powershell
$homeyId = 'REPLACE_WITH_VERIFIED_HOMEY_ID'
homey api system get-info --json --homey-id $homeyId
homey api devices get-devices --json --homey-id $homeyId
homey api apps get-apps --json --homey-id $homeyId
homey api flow get-flows --json --homey-id $homeyId
homey api flow get-advanced-flows --json --homey-id $homeyId
```

Inspect help if a command is unavailable. Do not turn an unsupported read into a raw write.
Summarize hub identity, CLI/firmware versions, counts and unavailable devices without printing full household dumps.
Record which checks ran and which remain untested.

## Files and PowerShell

Use an external private directory for exports, for example a user-selected local folder outside this repository.
Windows PowerShell 5.1 output redirection can write UTF-16; write JSON explicitly as UTF-8 without BOM. See recipes.md.
Pass `--body "@C:\full path\flow.json"` as one argument.
Use `[guid]::NewGuid().ToString()` for new card UUIDs.
Never execute the Bash-specific loops in inherited references directly in PowerShell.

## Failure handling

- CLI not found: report the missing dependency and show the install command; do not claim a connection.
- Login missing/expired: ask the user to complete or renew browser OAuth.
- Multiple hubs with ambiguous identity: obtain the intended ID before any API action.
- Timeout/unreachable: check selected ID, supported CLI options and local/cloud reachability. Never reset the hub or radios to resolve an access test.
- Unsupported commands/schema: use installed help and `homey api schema --manager <manager> --operation <operation> --json`.
- Shell execution or network blocked: explain the restriction and provide commands for the user's local terminal. Do not expose Homey directly to the internet.
- Token/LAN mode: only when explicitly selected and supported by installed help; load credentials securely outside the repository and never include them in logs, prompts or commits.

Do not claim the skill is installed merely because files exist in a checkout. Verify host discovery separately from CLI connectivity.
