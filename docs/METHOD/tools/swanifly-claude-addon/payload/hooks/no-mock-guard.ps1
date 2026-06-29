# no-mock-guard.ps1 — PostToolUse(Write|Edit) guard.
# Enforces SOUL.md non-negotiable #1: "No mock data. Ever."
# Scans the just-edited source file for mock/fixture-data signals and, if found,
# feeds a warning back to Claude (exit 2) so it removes them. Fails OPEN on any error
# so a hook bug never blocks legitimate edits.

$ErrorActionPreference = 'Stop'
try {
    $raw = [Console]::In.ReadToEnd()
    if (-not $raw) { exit 0 }
    $payload = $raw | ConvertFrom-Json
    $path = $payload.tool_input.file_path
    if (-not $path) { exit 0 }

    # Only scan app source files
    if ($path -notmatch '\.(ts|tsx|js|jsx|mjs)$') { exit 0 }

    # Skip non-app / test / generated / config locations (mock data is legit in tests)
    $skip = @('node_modules', '\.next', '\\out\\', '\\dist\\', '\.claude\\',
              '\\docs\\', '\\qa\\', '__tests__', '\.test\.', '\.spec\.',
              '\\tests?\\', '\.stories\.')
    foreach ($s in $skip) { if ($path -match $s) { exit 0 } }

    if (-not (Test-Path -LiteralPath $path)) { exit 0 }
    $content = Get-Content -LiteralPath $path -Raw -ErrorAction Stop
    if (-not $content) { exit 0 }

    # Curated mock-data signals (kept tight to avoid false positives)
    $patterns = @(
        'mockData', 'mock_data', 'useMockData', 'USE_MOCK', 'MOCK_',
        'fixtures?/', 'faker', 'dummyData', 'sampleData', 'placeholderData',
        'fakeData', 'seedData', 'hardcodedData'
    )

    $lines = $content -split "`n"
    $hits = @()
    for ($i = 0; $i -lt $lines.Count; $i++) {
        foreach ($p in $patterns) {
            if ($lines[$i] -match $p) {
                $hits += ("  line {0}: {1}" -f ($i + 1), $lines[$i].Trim())
                break
            }
        }
    }

    if ($hits.Count -gt 0) {
        $rel = Split-Path -Leaf $path
        $msg = @"
[no-mock-guard] possible mock/fixture data in $rel
$($hits -join "`n")

SOUL.md non-negotiable: never use mock data - wire to live HubSpot/Firestore, or show an
explicit empty/error state. Remove these, or (if this is intentionally test-only code) move
it under a __tests__/ or *.test.* file.
"@
        [Console]::Error.WriteLine($msg)
        exit 2   # surfaces stderr back to Claude as feedback
    }
    exit 0
}
catch {
    # Fail open — never block edits because of a guard error.
    exit 0
}
