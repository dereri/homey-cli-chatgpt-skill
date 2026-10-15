# PowerShell recipes

Use the verified Homey ID in every call. Store household exports outside the public repository.
The examples below work in Windows PowerShell 5.1 and PowerShell 7. Replace placeholders; inspect installed operation help first.

## Export JSON and detect CLI failures

```powershell
$homeyId = 'REPLACE_WITH_VERIFIED_HOMEY_ID'
function Read-HomeyJson {
    param([string[]]$CliArguments)
    $raw = & homey @CliArguments --homey-id $homeyId --json
    if ($LASTEXITCODE -ne 0) { throw 'Homey CLI read failed; do not continue.' }
    $parsed = ($raw -join [Environment]::NewLine) | ConvertFrom-Json
    if ($null -eq $parsed) { throw 'Homey returned no JSON data.' }
    return $parsed
}
$devices = Read-HomeyJson -CliArguments @('api', 'devices', 'get-devices')
$devices.PSObject.Properties.Value |
    Select-Object id, name, zoneName, available, capabilities
```

Do not assume every response is a dictionary; inspect arrays versus objects before projecting.

## Back up one flow before editing

```powershell
$flowId = 'REPLACE_WITH_FLOW_ID'
$backupDir = Join-Path $env:LOCALAPPDATA ('HomeySkill\backups\' + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$before = Read-HomeyJson -CliArguments @('api', 'flow', 'get-advanced-flow', '--id', $flowId)
$beforePath = Join-Path $backupDir 'before.json'
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($beforePath, ($before | ConvertTo-Json -Depth 100), $utf8)
Get-Item -LiteralPath $beforePath | Select-Object FullName, Length
```

Verify the backup is valid JSON and belongs to the expected flow before editing.
Backups contain household configuration; keep them private. For standard flows, use get-flow.

## Prepare, validate, push, read back

Work on a separate after.json; do not overwrite the baseline.
Preserve existing UUIDs during updates. Use `[guid]::NewGuid().ToString()` for newly added cards.
Validate from the skill directory:
```powershell
$afterPath = Join-Path $backupDir 'after.json'
node scripts/validate-flow.mjs $afterPath
if ($LASTEXITCODE -ne 0) { throw 'Flow structure invalid.' }
```

Also resolve live card/device/zone/token references. Review the diff and authorized scope.
Only then:
```powershell
homey select current
homey api flow update-advanced-flow --id $flowId --body ("@" + $afterPath) --homey-id $homeyId
if ($LASTEXITCODE -ne 0) { throw 'Update failed; inspect current state before retrying.' }
$after = Read-HomeyJson -CliArguments @('api', 'flow', 'get-advanced-flow', '--id', $flowId)
```

Compare intended fields, ignoring server-managed metadata. Recheck live references. Keep the baseline until the user is satisfied; a restore is another full update requiring validation and authorization.

## Audit and bulk actions

Fetch current flows and device/zone inventories with explicit ID. Inspect ownerUri, card IDs and typed arguments when resolving references; a raw substring match is only a search aid.
Before bulk changes, show the exact affected items and expected effect. Back up each persistent resource and verify each result; stop on the first failure. Never run a broad loop based on guessed names or classes.
