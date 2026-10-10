[CmdletBinding()]
param(
    [ValidateSet('context', 'statusline', 'resume-hook')]
    [string]$Mode = 'context',
    [string]$Cwd = ''
)

$ErrorActionPreference = 'SilentlyContinue'

function Read-StdinText {
    try {
        if ([Console]::IsInputRedirected) {
            return [Console]::In.ReadToEnd()
        }
    } catch {
        return ''
    }

    return ''
}

function ConvertFrom-JsonSafe {
    param([string]$Text)

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return $null
    }

    try {
        return $Text | ConvertFrom-Json
    } catch {
        return $null
    }
}

function Resolve-WorkingDirectory {
    param(
        [string]$ExplicitCwd,
        [object]$InputData
    )

    $candidate = $ExplicitCwd
    if ([string]::IsNullOrWhiteSpace($candidate) -and $InputData) {
        $candidate = [string]$InputData.cwd
    }
    if ([string]::IsNullOrWhiteSpace($candidate) -and $InputData) {
        $candidate = [string]$InputData.workspace.current_dir
    }
    if ([string]::IsNullOrWhiteSpace($candidate)) {
        $candidate = (Get-Location).Path
    }

    try {
        return (Resolve-Path -LiteralPath $candidate).Path
    } catch {
        return $candidate
    }
}

function Invoke-Git {
    param(
        [string[]]$GitArgs,
        [string]$RepoCwd
    )

    $output = & git -C $RepoCwd @GitArgs 2>$null
    if ($LASTEXITCODE -ne 0 -or $null -eq $output) {
        return ''
    }

    return (($output | ForEach-Object { [string]$_ }) -join "`n").TrimEnd()
}

function Get-PrSummary {
    param([string]$RepoCwd)

    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        return 'none (gh unavailable)'
    }

    Push-Location -LiteralPath $RepoCwd
    try {
        $json = & gh pr view --json number,title,state,isDraft,url 2>$null
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($json)) {
            return 'none'
        }

        $pr = $json | ConvertFrom-Json
        $draft = ''
        if ($pr.isDraft) {
            $draft = ' draft'
        }

        return ('#{0} {1}{2} - {3} - {4}' -f $pr.number, $pr.state, $draft, $pr.title, $pr.url)
    } catch {
        return 'none'
    } finally {
        Pop-Location
    }
}

function Get-MemorySummary {
    param([string]$RepoCwd)

    $projectsRoot = Join-Path $env:USERPROFILE '.claude\projects'
    if (-not (Test-Path -LiteralPath $projectsRoot)) {
        return $null
    }

    $resolved = $RepoCwd
    try {
        $resolved = (Resolve-Path -LiteralPath $RepoCwd).Path
    } catch {}

    $sanitized = $resolved -replace ':', '-' -replace '[\\/]+', '-'

    # Claude Code keys each project's memory dir by the sanitized absolute path,
    # so map directly to it. A fuzzy "name contains the repo leaf" fallback would
    # bleed memory across unrelated projects and across different checkouts of the
    # same repo (e.g. C:\...\Bana-Share vs D:\...\Bana-Share).
    $memoryDir = Join-Path (Join-Path $projectsRoot $sanitized) 'memory'
    if (-not (Test-Path -LiteralPath $memoryDir)) {
        return $null
    }

    $files = Get-ChildItem -LiteralPath $memoryDir -Filter '*.md' -File -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty Name

    [pscustomobject]@{
        Directory = $memoryDir
        Files = @($files)
    }
}

function Resolve-SprintsRoot {
    param(
        [string]$StartDir,
        [string]$RepoRoot
    )

    # Walk up from the working directory to the repo root. A nested app mirror
    # (Bana-Share\Apps\Banadoo) keeps its own docs\sprints while sharing the hub's
    # git root, so anchoring only on the git root would report "no sprint" for it.
    $current = $StartDir
    for ($i = 0; $i -lt 12 -and -not [string]::IsNullOrWhiteSpace($current); $i++) {
        $candidate = Join-Path $current 'docs\sprints'
        if (Test-Path -LiteralPath $candidate) {
            return $candidate
        }

        if (-not [string]::IsNullOrWhiteSpace($RepoRoot)) {
            $normalizedCurrent = $current.TrimEnd('\', '/') -replace '/', '\'
            $normalizedRoot = $RepoRoot.TrimEnd('\', '/') -replace '/', '\'
            if ($normalizedCurrent -eq $normalizedRoot) {
                return $null
            }
        }

        $parent = Split-Path -Parent $current
        if ($parent -eq $current) {
            return $null
        }
        $current = $parent
    }

    return $null
}

function Get-SprintSummary {
    param(
        [string]$StartDir,
        [string]$RepoRoot
    )

    # Grounds the Debrief's "Avancement" row and the Flight Deck's Etat in a real
    # countable source instead of a guessed ratio. Sprint folders are named
    # "{NNN} {status} {name}" and task files "{sprint}-{seq} {status} {Agent} - {title}.md";
    # status is a leading emoji. Matched by CODE POINT (\u escapes) so this file stays
    # pure ASCII - a .ps1 without a BOM is read as the ANSI codepage by PowerShell 5.1,
    # which would mangle literal emoji and silently break every match below.
    # U+2B1C todo, U+2705 done, U+2611 validated, U+26A0 problem.
    $sprintsRoot = Resolve-SprintsRoot -StartDir $StartDir -RepoRoot $RepoRoot
    if ([string]::IsNullOrWhiteSpace($sprintsRoot)) {
        return $null
    }

    # Sprint numbers are {NNN} (1-3 digits) per sprints-method. Capping at 3 digits keeps
    # year-named folders ("2025") from sorting to the top and being reported as the sprint.
    $folders = Get-ChildItem -LiteralPath $sprintsRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^\s*(\d{1,3})(\D|$)' } |
        Sort-Object -Property @{ Expression = { [int]([regex]::Match($_.Name, '^\s*(\d{1,3})(\D|$)').Groups[1].Value) } }

    if (-not $folders -or $folders.Count -eq 0) {
        return $null
    }

    # Two status vocabularies coexist across the fleet: the METHOD emoji convention and
    # the ASCII checkbox one that most app repos actually use ("023-a [ ] Brian - ...").
    # Count both, or the row silently reports 0/0 on the majority of apps.
    $doneMark = '(\[[xX]\])|[\u2705\u2611]'
    $todoMark = '(\[ ?\])|\u2B1C'
    $problemMark = '(\[!\])|\u26A0'
    $anyMark = "$doneMark|$todoMark|$problemMark"

    # Prefer the highest-numbered sprint that is not itself marked done/validated;
    # if every sprint is closed, report the latest one so the row still says something true.
    $open = @($folders | Where-Object { $_.Name -notmatch $doneMark })
    $target = if ($open.Count -gt 0) { $open[-1] } else { $folders[-1] }

    # The sprint's own index file ("023 <status> <name>.md") is not a task - exclude it,
    # otherwise every sprint reads one task heavier than it is.
    $tasks = @(Get-ChildItem -LiteralPath $target.FullName -Filter '*.md' -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match $anyMark -and $_.Name -match '^\s*\d{1,4}\s*-\s*[a-zA-Z0-9]+\b' })

    if ($tasks.Count -eq 0) {
        return [pscustomobject]@{
            Name = $target.Name
            Total = 0
            Done = 0
            Todo = 0
            Problem = 0
        }
    }

    [pscustomobject]@{
        Name = $target.Name
        Total = $tasks.Count
        Done = @($tasks | Where-Object { $_.Name -match $doneMark }).Count
        Todo = @($tasks | Where-Object { $_.Name -match $todoMark }).Count
        Problem = @($tasks | Where-Object { $_.Name -match $problemMark }).Count
    }
}

function Get-GitSummary {
    param(
        [string]$RepoCwd,
        [switch]$IncludePr
    )

    $inside = Invoke-Git -GitArgs @('rev-parse', '--is-inside-work-tree') -RepoCwd $RepoCwd
    if ($inside -ne 'true') {
        return $null
    }

    $root = Invoke-Git -GitArgs @('rev-parse', '--show-toplevel') -RepoCwd $RepoCwd
    $branch = Invoke-Git -GitArgs @('branch', '--show-current') -RepoCwd $RepoCwd
    if ([string]::IsNullOrWhiteSpace($branch)) {
        $branch = Invoke-Git -GitArgs @('rev-parse', '--short', 'HEAD') -RepoCwd $RepoCwd
    }

    $upstream = Invoke-Git -GitArgs @('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}') -RepoCwd $RepoCwd
    $ahead = 0
    $behind = 0
    if (-not [string]::IsNullOrWhiteSpace($upstream)) {
        $counts = (Invoke-Git -GitArgs @('rev-list', '--left-right', '--count', "$upstream...HEAD") -RepoCwd $RepoCwd) -split '\s+'
        if ($counts.Count -ge 2) {
            [void][int]::TryParse($counts[0], [ref]$behind)
            [void][int]::TryParse($counts[1], [ref]$ahead)
        }
    }

    $statusRaw = Invoke-Git -GitArgs @('status', '--porcelain=v1') -RepoCwd $RepoCwd
    $statusLines = @()
    if (-not [string]::IsNullOrWhiteSpace($statusRaw)) {
        $statusLines = $statusRaw -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    }

    $staged = 0
    $unstaged = 0
    $untracked = 0
    $paths = @()
    foreach ($line in $statusLines) {
        if ($line.StartsWith('??')) {
            $untracked++
        } else {
            if ($line.Length -gt 0 -and $line[0] -ne ' ') {
                $staged++
            }
            if ($line.Length -gt 1 -and $line[1] -ne ' ') {
                $unstaged++
            }
        }

        $path = $line
        if ($line.Length -gt 3) {
            $path = $line.Substring(3).Trim()
        }
        if ($path -match ' -> ') {
            $path = ($path -split ' -> ')[-1]
        }
        $paths += $path
    }

    [pscustomobject]@{
        Root = $root
        Repo = (Split-Path -Leaf $root)
        Branch = $branch
        Upstream = $upstream
        Ahead = $ahead
        Behind = $behind
        ChangedCount = $statusLines.Count
        Staged = $staged
        Unstaged = $unstaged
        Untracked = $untracked
        ChangedPaths = @($paths | Select-Object -First 12)
        LastCommit = (Invoke-Git -GitArgs @('log', '-1', '--pretty=format:%h %s') -RepoCwd $RepoCwd)
        Pr = if ($IncludePr) { Get-PrSummary -RepoCwd $RepoCwd } else { 'not fetched' }
    }
}

function Write-Context {
    param(
        [string]$RepoCwd,
        [object]$Git,
        [object]$Memory,
        [object]$Sprint
    )

    if ($null -eq $Git) {
        @(
            'flight_deck_context:'
            "  cwd: $RepoCwd"
            '  git: not a git repository'
        ) -join "`n"
        return
    }

    $paths = 'none'
    if ($Git.ChangedPaths.Count -gt 0) {
        $paths = ($Git.ChangedPaths -join ', ')
    }

    $memoryDir = 'none'
    $memoryFiles = 'none'
    if ($Memory) {
        $memoryDir = $Memory.Directory
        if ($Memory.Files.Count -gt 0) {
            $memoryFiles = ($Memory.Files -join ', ')
        }
    }

    # Countable ground truth for the Debrief's "Avancement" row - a real n/N, so the
    # card never has to guess where the sprint stands.
    $sprintName = 'none'
    $sprintProgress = 'none'
    if ($Sprint) {
        $sprintName = $Sprint.Name
        if ($Sprint.Total -gt 0) {
            $sprintProgress = ('{0}/{1} tasks done ({2} todo, {3} problem)' -f $Sprint.Done, $Sprint.Total, $Sprint.Todo, $Sprint.Problem)
        } else {
            $sprintProgress = 'no status-tagged task files'
        }
    }

    @(
        'flight_deck_context:'
        "  cwd: $RepoCwd"
        "  repo_root: $($Git.Root)"
        "  repo: $($Git.Repo)"
        "  branch: $($Git.Branch)"
        "  upstream: $($Git.Upstream)"
        "  ahead: $($Git.Ahead)"
        "  behind: $($Git.Behind)"
        "  changed_files: $($Git.ChangedCount)"
        "  staged: $($Git.Staged)"
        "  unstaged: $($Git.Unstaged)"
        "  untracked: $($Git.Untracked)"
        "  changed_paths: $paths"
        "  last_commit: $($Git.LastCommit)"
        "  pr: $($Git.Pr)"
        "  sprint: $sprintName"
        "  sprint_progress: $sprintProgress"
        "  project_memory_dir: $memoryDir"
        "  project_memory_files: $memoryFiles"
    ) -join "`n"
}

function Write-StatusLine {
    param(
        [string]$RepoCwd,
        [object]$Git,
        [object]$InputData
    )

    $model = [string]$InputData.model.display_name
    if ([string]::IsNullOrWhiteSpace($model)) {
        $model = [string]$InputData.model.id
    }

    $ctx = ''
    $pct = $InputData.context_window.used_percentage
    if ($null -ne $pct -and "$pct" -ne '') {
        $ctx = (' | {0}% ctx' -f [int][math]::Round([double]$pct))
    }

    if ($null -eq $Git) {
        $dir = Split-Path -Leaf $RepoCwd
        "$dir | $model$ctx"
        return
    }

    $dirty = 'clean'
    if ($Git.ChangedCount -gt 0) {
        $dirty = ('{0} changed' -f $Git.ChangedCount)
    }

    $sync = ''
    if ($Git.Ahead -gt 0 -or $Git.Behind -gt 0) {
        $sync = (' | +{0}/-{1}' -f $Git.Ahead, $Git.Behind)
    }

    $branch = $Git.Branch
    if ($branch.Length -gt 34) {
        $branch = '...' + $branch.Substring($branch.Length - 31)
    }

    "$($Git.Repo) $branch | $dirty$sync | $model$ctx"
}

# Context mode (used by /brief) must not block on an open-but-empty redirected
# stdin - only statusline/resume-hook get JSON piped in (and closed) by Claude Code.
$inputData = $null
if ($Mode -ne 'context') {
    $inputData = ConvertFrom-JsonSafe -Text (Read-StdinText)
}
$resolvedCwd = Resolve-WorkingDirectory -ExplicitCwd $Cwd -InputData $inputData

# Statusline refreshes every ~30s and never renders PR info, so skip the
# network-bound `gh pr view` call there. Only context/resume-hook need it.
$includePr = ($Mode -ne 'statusline')
$gitSummary = Get-GitSummary -RepoCwd $resolvedCwd -IncludePr:$includePr

switch ($Mode) {
    'statusline' {
        Write-StatusLine -RepoCwd $resolvedCwd -Git $gitSummary -InputData $inputData
        break
    }
    'resume-hook' {
        $memory = Get-MemorySummary -RepoCwd $resolvedCwd
        $sprint = if ($gitSummary) { Get-SprintSummary -StartDir $resolvedCwd -RepoRoot $gitSummary.Root } else { $null }
        $context = Write-Context -RepoCwd $resolvedCwd -Git $gitSummary -Memory $memory -Sprint $sprint
        $additional = @"
Resume Flight Deck context:
$context

On the next assistant reply after this resume, start with the six-line Flight Deck from CLAUDE.md (pickup card). Keep it grounded in this context; read listed memory files only if needed. Close that reply with the Debrief card, using sprint_progress above for its Avancement row.
"@
        @{
            hookSpecificOutput = @{
                hookEventName = 'SessionStart'
                additionalContext = $additional
            }
        } | ConvertTo-Json -Depth 6 -Compress
        break
    }
    default {
        $memory = Get-MemorySummary -RepoCwd $resolvedCwd
        $sprint = if ($gitSummary) { Get-SprintSummary -StartDir $resolvedCwd -RepoRoot $gitSummary.Root } else { $null }
        Write-Context -RepoCwd $resolvedCwd -Git $gitSummary -Memory $memory -Sprint $sprint
        break
    }
}
