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

    # proto/ is the design workspace — the one place fake data is allowed (SOUL.md non-negotiable #1). Only the
    # app-root proto/: a `proto` folder under src\, components\ or an app\ route folder is shipped code that
    # merely carries the name (app\proto\page.tsx is a live Next.js route). Judged on the path INSIDE the project
    # when CLAUDE_PROJECT_DIR is known, so a checkout that itself lives under C:\src\ keeps its proto/.
    $rel = $path.Replace('/', '\')
    $proj = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR.Replace('/', '\').TrimEnd('\') } else { '' }
    if ($proj -and $rel.StartsWith($proj + '\', [System.StringComparison]::OrdinalIgnoreCase)) { $rel = $rel.Substring($proj.Length) }
    if ($rel -match '\\proto\\' -and $rel -notmatch '\\(src|components|app|pages|lib|features)\\([^\\]+\\)*proto\\') { exit 0 }

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
