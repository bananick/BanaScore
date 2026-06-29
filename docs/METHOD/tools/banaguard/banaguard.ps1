<#
  ██████╗  █████╗ ███╗   ██╗ █████╗  ██████╗ ██╗   ██╗ █████╗ ██████╗ ██████╗
  ██╔══██╗██╔══██╗████╗  ██║██╔══██╗██╔════╝ ██║   ██║██╔══██╗██╔══██╗██╔══██╗
  ██████╔╝███████║██╔██╗ ██║███████║██║  ███╗██║   ██║███████║██████╔╝██║  ██║
  ██╔══██╗██╔══██║██║╚██╗██║██╔══██║██║   ██║██║   ██║██╔══██║██╔══██╗██║  ██║
  ██████╔╝██║  ██║██║ ╚████║██║  ██║╚██████╔╝╚██████╔╝██║  ██║██║  ██║██████╔╝
  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝

  Lightweight RAM Watchdog for Dev Machines
  Sits in system tray. Auto-kills bloat. Alerts on high RAM. Zero footprint.
  Now with always-on mini widget showing CPU + RAM + 1-click optimize.

  Usage:
    .\banaguard.ps1              # Run in foreground
    .\banaguard.ps1 -Hidden      # Run minimized (for startup)

  Config: config.json (same directory)
#>

param(
    [switch]$Hidden
)

# ----- Setup -----
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $scriptDir "config.json"

# CPU performance counter (initialized once, sampled each cycle)
$script:cpuCounter = New-Object System.Diagnostics.PerformanceCounter("Processor", "% Processor Time", "_Total")
$script:cpuCounter.NextValue() | Out-Null  # first call always returns 0, prime it
$script:lastCpuPct = 0

function Load-Config {
    $raw = Get-Content $configPath -Raw | ConvertFrom-Json
    return $raw
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] [$Level] $Message"

    if ($script:config.logToFile -and $script:config.logFile) {
        Add-Content -Path $script:config.logFile -Value $line -ErrorAction SilentlyContinue
    }
    Write-Host $line
}

function Get-RamUsage {
    $os = Get-CimInstance Win32_OperatingSystem
    $totalMB = [math]::Round($os.TotalVisibleMemorySize / 1024, 0)
    $freeMB = [math]::Round($os.FreePhysicalMemory / 1024, 0)
    $usedMB = $totalMB - $freeMB
    $pct = [math]::Round($usedMB / $totalMB * 100, 1)
    return @{
        TotalMB = $totalMB
        FreeMB  = $freeMB
        UsedMB  = $usedMB
        Percent = $pct
    }
}

function Get-CpuUsage {
    try {
        $val = [math]::Round($script:cpuCounter.NextValue(), 0)
        $script:lastCpuPct = $val
        return $val
    } catch {
        return $script:lastCpuPct
    }
}

function Show-Balloon {
    param(
        [string]$Title,
        [string]$Text,
        [string]$Icon = "Warning"  # None, Info, Warning, Error
    )
    if (-not $script:config.showBalloonNotifications) { return }

    $iconType = [System.Windows.Forms.ToolTipIcon]::$Icon
    $script:trayIcon.BalloonTipTitle = $Title
    $script:trayIcon.BalloonTipText = $Text
    $script:trayIcon.BalloonTipIcon = $iconType
    $script:trayIcon.ShowBalloonTip(5000)
}

function Get-BarColor([int]$pct) {
    if ($pct -ge 90) { return [System.Drawing.Color]::FromArgb(244, 67, 54) }     # Red
    if ($pct -ge 70) { return [System.Drawing.Color]::FromArgb(255, 152, 0) }     # Orange
    if ($pct -ge 50) { return [System.Drawing.Color]::FromArgb(255, 193, 7) }     # Yellow
    return [System.Drawing.Color]::FromArgb(76, 175, 80)                           # Green
}

function Update-TrayIcon([int]$pct) {
    if (-not $script:trayIcon) { return }
    $Color = Get-BarColor $pct
    $bmp = New-Object System.Drawing.Bitmap(16, 16)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(50, 50, 50))
    $g.FillEllipse($bgBrush, 1, 1, 14, 14)
    
    $brush = New-Object System.Drawing.SolidBrush($Color)
    $sweep = [math]::Max(1, [math]::Round(360 * $pct / 100))
    $g.FillPie($brush, 1, 1, 14, 14, -90, $sweep)
    
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(80, 0, 0, 0), 1)
    $g.DrawEllipse($pen, 1, 1, 14, 14)
    
    $g.Dispose()
    $bgBrush.Dispose()
    $brush.Dispose()
    $pen.Dispose()
    
    $oldIcon = $script:trayIcon.Icon
    $script:trayIcon.Icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
    if ($oldIcon) {
        $oldIcon.Dispose()
    }
}

# ----- 1-Click Optimize (used by widget + tray menu) -----
function Invoke-OneClickOptimize {
    $killed = @()
    $freedMB = 0

    # Kill everything from autoKill + conditionalKill lists
    $allTargets = @()
    if ($script:config.autoKill) { $allTargets += $script:config.autoKill }
    if ($script:config.conditionalKill) { $allTargets += $script:config.conditionalKill }
    $allTargets = $allTargets | Select-Object -Unique

    foreach ($p in $allTargets) {
        $procs = Get-Process -Name $p -ErrorAction SilentlyContinue
        if ($procs) {
            $mb = [math]::Round(($procs | Measure-Object WorkingSet64 -Sum).Sum / 1MB, 0)
            Stop-Process -Name $p -Force -ErrorAction SilentlyContinue
            $killed += "$p(${mb}MB)"
            $freedMB += $mb
        }
    }

    if ($killed.Count -gt 0) {
        Write-Log "1-CLICK OPTIMIZE: Killed $($killed -join ', ') — freed ~${freedMB}MB" "KILL"
        Show-Balloon "⚡ Optimized!" "Freed ~${freedMB}MB`n$($killed -join ', ')" "Info"
    } else {
        Show-Balloon "⚡ Already Clean" "Nothing to kill — system is lean!" "Info"
    }

    # Refresh widget immediately
    Update-Widget
}

function Invoke-Guard {
    # Reload config each cycle (hot-reload edits)
    try {
        $script:config = Load-Config
    } catch {
        Write-Log "Failed to reload config: $_" "ERROR"
        return
    }

    $ram = Get-RamUsage
    $ramPct = $ram.Percent
    $freeGB = [math]::Round($ram.FreeMB / 1024, 1)

    # Update tray tooltip
    $cpuPct = Get-CpuUsage
    $script:trayIcon.Text = "BanaGuard | CPU: $cpuPct% | RAM: $ramPct% | Free: ${freeGB}GB"

    # ----- Auto-kill (always) -----
    foreach ($procName in $script:config.autoKill) {
        $procs = Get-Process -Name $procName -ErrorAction SilentlyContinue
        if ($procs) {
            $totalMB = [math]::Round(($procs | Measure-Object WorkingSet64 -Sum).Sum / 1MB, 0)
            Stop-Process -Name $procName -Force -ErrorAction SilentlyContinue
            Write-Log "AUTO-KILLED: $procName ($totalMB MB freed)" "KILL"
            Show-Balloon "BanaGuard" "Killed $procName ($totalMB MB)" "Info"
        }
    }

    # ----- Conditional kill (only when RAM is high) -----
    if ($ramPct -ge $script:config.ramAlertThresholdPercent) {
        Write-Log "RAM at $ramPct% (threshold: $($script:config.ramAlertThresholdPercent)%) - scanning for bloat..." "WARN"

        $killedAny = $false
        foreach ($procName in $script:config.conditionalKill) {
            $procs = Get-Process -Name $procName -ErrorAction SilentlyContinue
            if ($procs) {
                $totalMB = [math]::Round(($procs | Measure-Object WorkingSet64 -Sum).Sum / 1MB, 0)
                Stop-Process -Name $procName -Force -ErrorAction SilentlyContinue
                Write-Log "CONDITIONAL-KILLED: $procName ($totalMB MB freed) - RAM was $ramPct%" "KILL"
                $killedAny = $true
            }
        }

        if ($killedAny) {
            Start-Sleep -Seconds 2
            $ramAfter = Get-RamUsage
            Show-Balloon "BanaGuard - RAM Alert" "RAM was $ramPct%, killed bloat.`nNow: $($ramAfter.Percent)% (Free: $([math]::Round($ramAfter.FreeMB/1024,1))GB)" "Warning"
        } else {
            Show-Balloon "BanaGuard - RAM High" "RAM at $ramPct% but nothing to kill.`nFree: ${freeGB}GB" "Warning"
        }
    }

    # ----- Critical RAM alert -----
    if ($ramPct -ge $script:config.ramCriticalThresholdPercent) {
        Write-Log "CRITICAL RAM: $ramPct%!" "CRITICAL"
        Show-Balloon "⚠️ CRITICAL RAM" "RAM at $ramPct%! Only ${freeGB}GB free.`nClose Antigravity windows or Chrome tabs!" "Error"
    }

    # ----- Notify-only for hogs -----
    if ($script:config.notifyIfAboveMB) {
        $notifyRules = $script:config.notifyIfAboveMB.PSObject.Properties
        foreach ($rule in $notifyRules) {
            $procName = $rule.Name
            $thresholdMB = $rule.Value
            $procs = Get-Process -Name $procName -ErrorAction SilentlyContinue
            if ($procs) {
                $totalMB = [math]::Round(($procs | Measure-Object WorkingSet64 -Sum).Sum / 1MB, 0)
                if ($totalMB -gt $thresholdMB) {
                    Write-Log "HOG ALERT: $procName using $totalMB MB (threshold: $thresholdMB MB)" "WARN"
                    Show-Balloon "BanaGuard - Memory Hog" "$procName is using $totalMB MB`n(threshold: $thresholdMB MB)" "Warning"
                }
            }
        }
    }

    # Update icon gauge based on RAM state
    Update-TrayIcon $ramPct

    # Update the always-on widget
    Update-Widget
}

# =============================================
# ===== ALWAYS-ON MINI WIDGET (CPU + RAM) =====
# =============================================

$script:widgetVisible = $true

# -- Build the widget form --
$script:widget = New-Object System.Windows.Forms.Form
$w = $script:widget
$w.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$w.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$w.TopMost = $true
$w.ShowInTaskbar = $false
$w.Size = New-Object System.Drawing.Size(180, 88)
$w.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 36)
$w.Opacity = 0.92
$w.Padding = New-Object System.Windows.Forms.Padding(0)

# Position bottom-right above taskbar
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$w.Location = New-Object System.Drawing.Point(
    ($screen.Right - $w.Width - 12),
    ($screen.Bottom - $w.Height - 12)
)

# Round corners via Region
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinRound {
    [DllImport("Gdi32.dll")] public static extern IntPtr CreateRoundRectRgn(int l, int t, int r, int b, int w, int h);
}
"@
$w.Add_Shown({
    $rgn = [WinRound]::CreateRoundRectRgn(0, 0, $this.Width + 1, $this.Height + 1, 14, 14)
    $this.Region = [System.Drawing.Region]::new([System.Drawing.Rectangle]::Empty)
    $this.Region = New-Object System.Drawing.Region(
        [System.Drawing.Rectangle]::new(0, 0, $this.Width, $this.Height)
    )
    $this.Region = [System.Drawing.Region]::FromHrgn($rgn)
})

# -- Enable drag-to-move --
$script:dragging = $false
$script:dragStart = [System.Drawing.Point]::Empty
$w.Add_MouseDown({
    param($s, $e)
    if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        $script:dragging = $true
        $script:dragStart = $e.Location
    }
})
$w.Add_MouseMove({
    param($s, $e)
    if ($script:dragging) {
        $newX = $s.Left + $e.X - $script:dragStart.X
        $newY = $s.Top + $e.Y - $script:dragStart.Y
        $s.Location = New-Object System.Drawing.Point($newX, $newY)
    }
})
$w.Add_MouseUp({ $script:dragging = $false })

# -- Title row --
$lblTitle = New-Object System.Windows.Forms.Label
$lblTitle.Text = "🛡 BanaGuard"
$lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Bold)
$lblTitle.ForeColor = [System.Drawing.Color]::FromArgb(180, 180, 195)
$lblTitle.AutoSize = $false
$lblTitle.Size = New-Object System.Drawing.Size(120, 16)
$lblTitle.Location = New-Object System.Drawing.Point(10, 6)
$lblTitle.BackColor = [System.Drawing.Color]::Transparent
# Make title draggable too
$lblTitle.Add_MouseDown({ param($s,$e); if($e.Button -eq 'Left'){$script:dragging=$true;$script:dragStart=$e.Location} })
$lblTitle.Add_MouseMove({ param($s,$e); if($script:dragging){$p=$script:widget;$p.Location=New-Object System.Drawing.Point(($p.Left+$e.X-$script:dragStart.X),($p.Top+$e.Y-$script:dragStart.Y))} })
$lblTitle.Add_MouseUp({ $script:dragging=$false })
$w.Controls.Add($lblTitle)

# -- Close (x) button --
$btnClose = New-Object System.Windows.Forms.Label
$btnClose.Text = "✕"
$btnClose.Font = New-Object System.Drawing.Font("Segoe UI", 7)
$btnClose.ForeColor = [System.Drawing.Color]::FromArgb(120, 120, 130)
$btnClose.AutoSize = $false
$btnClose.Size = New-Object System.Drawing.Size(16, 16)
$btnClose.Location = New-Object System.Drawing.Point(158, 4)
$btnClose.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
$btnClose.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnClose.Add_Click({
    $script:widget.Hide()
    $script:widgetVisible = $false
    $script:menuWidget.Text = "Show Widget"
})
$btnClose.Add_MouseEnter({ $this.ForeColor = [System.Drawing.Color]::FromArgb(244, 67, 54) })
$btnClose.Add_MouseLeave({ $this.ForeColor = [System.Drawing.Color]::FromArgb(120, 120, 130) })
$w.Controls.Add($btnClose)

# -- CPU row --
$lblCpu = New-Object System.Windows.Forms.Label
$lblCpu.Text = "CPU"
$lblCpu.Font = New-Object System.Drawing.Font("Segoe UI", 7.5)
$lblCpu.ForeColor = [System.Drawing.Color]::FromArgb(140, 140, 160)
$lblCpu.AutoSize = $false
$lblCpu.Size = New-Object System.Drawing.Size(30, 14)
$lblCpu.Location = New-Object System.Drawing.Point(10, 26)
$lblCpu.BackColor = [System.Drawing.Color]::Transparent
$w.Controls.Add($lblCpu)

$script:lblCpuPct = New-Object System.Windows.Forms.Label
$script:lblCpuPct.Text = "0%"
$script:lblCpuPct.Font = New-Object System.Drawing.Font("Consolas", 7.5, [System.Drawing.FontStyle]::Bold)
$script:lblCpuPct.ForeColor = [System.Drawing.Color]::FromArgb(76, 175, 80)
$script:lblCpuPct.AutoSize = $false
$script:lblCpuPct.Size = New-Object System.Drawing.Size(32, 14)
$script:lblCpuPct.Location = New-Object System.Drawing.Point(130, 26)
$script:lblCpuPct.TextAlign = [System.Drawing.ContentAlignment]::MiddleRight
$script:lblCpuPct.BackColor = [System.Drawing.Color]::Transparent
$w.Controls.Add($script:lblCpuPct)

# CPU bar background
$script:cpuBarBg = New-Object System.Windows.Forms.Panel
$script:cpuBarBg.Size = New-Object System.Drawing.Size(86, 8)
$script:cpuBarBg.Location = New-Object System.Drawing.Point(42, 29)
$script:cpuBarBg.BackColor = [System.Drawing.Color]::FromArgb(50, 50, 58)
$w.Controls.Add($script:cpuBarBg)

$script:cpuBarFg = New-Object System.Windows.Forms.Panel
$script:cpuBarFg.Size = New-Object System.Drawing.Size(0, 8)
$script:cpuBarFg.Location = New-Object System.Drawing.Point(0, 0)
$script:cpuBarFg.BackColor = [System.Drawing.Color]::FromArgb(76, 175, 80)
$script:cpuBarBg.Controls.Add($script:cpuBarFg)

# -- RAM row --
$lblRam = New-Object System.Windows.Forms.Label
$lblRam.Text = "RAM"
$lblRam.Font = New-Object System.Drawing.Font("Segoe UI", 7.5)
$lblRam.ForeColor = [System.Drawing.Color]::FromArgb(140, 140, 160)
$lblRam.AutoSize = $false
$lblRam.Size = New-Object System.Drawing.Size(30, 14)
$lblRam.Location = New-Object System.Drawing.Point(10, 44)
$lblRam.BackColor = [System.Drawing.Color]::Transparent
$w.Controls.Add($lblRam)

$script:lblRamPct = New-Object System.Windows.Forms.Label
$script:lblRamPct.Text = "0%"
$script:lblRamPct.Font = New-Object System.Drawing.Font("Consolas", 7.5, [System.Drawing.FontStyle]::Bold)
$script:lblRamPct.ForeColor = [System.Drawing.Color]::FromArgb(76, 175, 80)
$script:lblRamPct.AutoSize = $false
$script:lblRamPct.Size = New-Object System.Drawing.Size(32, 14)
$script:lblRamPct.Location = New-Object System.Drawing.Point(130, 44)
$script:lblRamPct.TextAlign = [System.Drawing.ContentAlignment]::MiddleRight
$script:lblRamPct.BackColor = [System.Drawing.Color]::Transparent
$w.Controls.Add($script:lblRamPct)

# RAM bar background
$script:ramBarBg = New-Object System.Windows.Forms.Panel
$script:ramBarBg.Size = New-Object System.Drawing.Size(86, 8)
$script:ramBarBg.Location = New-Object System.Drawing.Point(42, 47)
$script:ramBarBg.BackColor = [System.Drawing.Color]::FromArgb(50, 50, 58)
$w.Controls.Add($script:ramBarBg)

$script:ramBarFg = New-Object System.Windows.Forms.Panel
$script:ramBarFg.Size = New-Object System.Drawing.Size(0, 8)
$script:ramBarFg.Location = New-Object System.Drawing.Point(0, 0)
$script:ramBarFg.BackColor = [System.Drawing.Color]::FromArgb(76, 175, 80)
$script:ramBarBg.Controls.Add($script:ramBarFg)

# -- Optimize button --
$script:btnOptimize = New-Object System.Windows.Forms.Button
$b = $script:btnOptimize
$b.Text = "⚡ Optimize"
$b.Font = New-Object System.Drawing.Font("Segoe UI", 7.5, [System.Drawing.FontStyle]::Bold)
$b.ForeColor = [System.Drawing.Color]::FromArgb(255, 255, 255)
$b.BackColor = [System.Drawing.Color]::FromArgb(56, 56, 68)
$b.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$b.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(76, 175, 80)
$b.FlatAppearance.BorderSize = 1
$b.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(76, 175, 80)
$b.FlatAppearance.MouseDownBackColor = [System.Drawing.Color]::FromArgb(56, 142, 60)
$b.Size = New-Object System.Drawing.Size(160, 22)
$b.Location = New-Object System.Drawing.Point(10, 62)
$b.Cursor = [System.Windows.Forms.Cursors]::Hand
$b.Add_Click({ Invoke-OneClickOptimize })
$w.Controls.Add($b)

# -- Update widget display --
function Update-Widget {
    if (-not $script:widgetVisible) { return }

    $ram = Get-RamUsage
    $cpu = Get-CpuUsage
    $ramPct = [int]$ram.Percent
    $cpuPct = [int]$cpu
    $barMax = 86

    # CPU bar
    $cpuW = [math]::Max(1, [math]::Round($barMax * $cpuPct / 100))
    $cpuColor = Get-BarColor $cpuPct
    $script:cpuBarFg.Width = $cpuW
    $script:cpuBarFg.BackColor = $cpuColor
    $script:lblCpuPct.Text = "$cpuPct%"
    $script:lblCpuPct.ForeColor = $cpuColor

    # RAM bar
    $ramW = [math]::Max(1, [math]::Round($barMax * $ramPct / 100))
    $ramColor = Get-BarColor $ramPct
    $script:ramBarFg.Width = $ramW
    $script:ramBarFg.BackColor = $ramColor
    $script:lblRamPct.Text = "$ramPct%"
    $script:lblRamPct.ForeColor = $ramColor

    # Change optimize button border color to match worst metric
    $worstPct = [math]::Max($cpuPct, $ramPct)
    $worstColor = Get-BarColor $worstPct
    $script:btnOptimize.FlatAppearance.BorderColor = $worstColor
    $script:btnOptimize.FlatAppearance.MouseOverBackColor = $worstColor
}

$w.Show()

# =============================================
# ===== END WIDGET =====
# =============================================

# ----- Create system tray icon -----
$script:trayIcon = New-Object System.Windows.Forms.NotifyIcon
Update-TrayIcon 0
$script:trayIcon.Text = "BanaGuard - Starting..."
$script:trayIcon.Visible = $true

# ----- Context menu -----
$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

# Widget toggle (first item for visibility)
$script:menuWidget = $contextMenu.Items.Add("Hide Widget")
$script:menuWidget.Add_Click({
    if ($script:widgetVisible) {
        $script:widget.Hide()
        $script:widgetVisible = $false
        $script:menuWidget.Text = "Show Widget"
    } else {
        $script:widget.Show()
        $script:widgetVisible = $true
        $script:menuWidget.Text = "Hide Widget"
        Update-Widget
    }
})

$menuOptimize = $contextMenu.Items.Add("⚡ 1-Click Optimize")
$menuOptimize.Add_Click({ Invoke-OneClickOptimize })

$contextMenu.Items.Add("-")  # separator

$menuRAM = $contextMenu.Items.Add("Check RAM Now")
$menuRAM.Add_Click({
    Invoke-Guard
    $ram = Get-RamUsage
    Show-Balloon "BanaGuard - RAM Check" "RAM: $($ram.Percent)% | Free: $([math]::Round($ram.FreeMB/1024,1))GB" "Info"
})

$menuKillNode = $contextMenu.Items.Add("Kill All Node.exe")
$menuKillNode.Add_Click({
    $procs = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($procs) {
        $mb = [math]::Round(($procs | Measure-Object WorkingSet64 -Sum).Sum/1MB,0)
        Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
        Show-Balloon "BanaGuard" "Killed all node.exe ($mb MB freed)" "Info"
        Write-Log "MANUAL: Killed all node.exe ($mb MB)" "KILL"
    } else {
        Show-Balloon "BanaGuard" "No node processes found" "Info"
    }
})

$menuDevMode = $contextMenu.Items.Add("Dev Mode (Kill Bloat)")
$menuDevMode.Add_Click({
    $killed = @()
    foreach ($p in @("ChatGPT","msedgewebview2","LockApp","Teams","AdobeCollabSync")) {
        $procs = Get-Process -Name $p -ErrorAction SilentlyContinue
        if ($procs) {
            $mb = [math]::Round(($procs | Measure-Object WorkingSet64 -Sum).Sum/1MB,0)
            Stop-Process -Name $p -Force -ErrorAction SilentlyContinue
            $killed += "$p(${mb}MB)"
        }
    }
    if ($killed.Count -gt 0) {
        Show-Balloon "BanaGuard - Dev Mode" "Killed: $($killed -join ', ')" "Info"
        Write-Log "DEV MODE: Killed $($killed -join ', ')" "KILL"
    } else {
        Show-Balloon "BanaGuard" "Nothing to kill - already clean!" "Info"
    }
})

$contextMenu.Items.Add("-")  # separator

$menuConfig = $contextMenu.Items.Add("Open Config")
$menuConfig.Add_Click({
    Start-Process "notepad.exe" $configPath
})

$menuLog = $contextMenu.Items.Add("Open Log")
$menuLog.Add_Click({
    $logFile = $script:config.logFile
    if (Test-Path $logFile) {
        Start-Process "notepad.exe" $logFile
    } else {
        Show-Balloon "BanaGuard" "No log file yet" "Info"
    }
})

$contextMenu.Items.Add("-")  # separator

$menuExit = $contextMenu.Items.Add("Exit BanaGuard")
$menuExit.Add_Click({
    $script:widget.Close()
    $script:widget.Dispose()
    $script:trayIcon.Visible = $false
    $script:trayIcon.Dispose()
    [System.Windows.Forms.Application]::Exit()
})

$script:trayIcon.ContextMenuStrip = $contextMenu

# Double-click tray icon = toggle widget
$script:trayIcon.Add_DoubleClick({
    if ($script:widgetVisible) {
        $script:widget.Hide()
        $script:widgetVisible = $false
        $script:menuWidget.Text = "Show Widget"
    } else {
        $script:widget.Show()
        $script:widgetVisible = $true
        $script:menuWidget.Text = "Hide Widget"
        Update-Widget
    }
})

# ----- Load config & start -----
$script:config = Load-Config
Write-Log "BanaGuard started. Poll: $($script:config.pollIntervalSeconds)s | Alert: $($script:config.ramAlertThresholdPercent)% | Critical: $($script:config.ramCriticalThresholdPercent)%"
Write-Log "Widget enabled — always-on mini monitor with 1-click optimize"

# ----- Timer for periodic checks -----
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = $script:config.pollIntervalSeconds * 1000
$timer.Add_Tick({ Invoke-Guard })
$timer.Start()

# Widget gets its own faster refresh (every 3 seconds for smooth bars)
$widgetTimer = New-Object System.Windows.Forms.Timer
$widgetTimer.Interval = 3000
$widgetTimer.Add_Tick({ Update-Widget })
$widgetTimer.Start()

# Initial check
Invoke-Guard

# ----- Run the message loop -----
[System.Windows.Forms.Application]::Run()
