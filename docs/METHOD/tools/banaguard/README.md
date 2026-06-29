# BanaGuard — METHOD Toolkit for Dev Machines

> Lightweight RAM & CPU watchdog with an always-on widget, auto-kill bloat, and 1-click optimization.

## What It Does

BanaGuard runs silently in the background and monitors your system every 30 seconds. It shows an **always-on mini widget** with live CPU + RAM bars and a **1-click optimize** button, plus a system tray icon with a full menu.

### Core Features

- **Always-on widget** — Dark, semi-transparent overlay (bottom-right) showing live CPU% and RAM% with color-coded bars. Draggable, closeable, toggleable.
- **1-click optimize** — Kills all bloat from both autoKill and conditionalKill lists in one shot. Available on the widget and tray menu.
- **Auto-kill** — Always kills known useless processes (LockApp, Canva agent) the moment they appear
- **Conditional kill** — Kills heavier bloat (ChatGPT desktop, MS Teams, Edge WebView) only when RAM exceeds the alert threshold
- **Balloon notifications** for memory hogs
- **Right-click tray menu** for manual actions

## Quick Start

```powershell
# Launch BanaGuard (silently, no console window)
wscript.exe "D:\Apps\BanaShare\docs\METHOD\tools\banaguard\start.vbs"
```

Or double-click `start.vbs` in Explorer.

BanaGuard auto-starts on login via a shortcut in `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\`.

## Mini Widget

The always-on widget shows:

| Element | Description |
|---|---|
| 🛡 Title bar | Drag to reposition, ✕ to hide |
| CPU bar | Live CPU usage with color-coded fill |
| RAM bar | Live RAM usage with color-coded fill |
| ⚡ Optimize | Kills all configured bloat in one click |

**Bar colors**: 🟢 <50% → 🟡 50-69% → 🟠 70-89% → 🔴 90%+

Widget refreshes every **3 seconds** for smooth updates. Toggle visibility via tray menu or double-click the tray icon.

## Tray Icon Colors

| Color | Meaning |
|---|---|
| 🟢 Green | RAM usage below alert threshold |
| 🟡 Yellow | RAM above alert threshold (conditional kills active) |
| 🔴 Red | RAM above critical threshold (urgent) |

## Right-Click Tray Menu

| Action | What it does |
|---|---|
| Hide/Show Widget | Toggle the always-on mini widget |
| ⚡ 1-Click Optimize | Kill all configured bloat immediately |
| Check RAM Now | Shows a popup with current RAM usage |
| Kill All Node.exe | Kills every node.exe (MCP servers, dev servers) |
| Dev Mode | Kills all configured bloat in one shot |
| Open Config | Opens `config.json` in Notepad |
| Open Log | Opens the kill log |
| Exit | Stops BanaGuard |

**Double-click** the tray icon to toggle the widget.

## Configuration

Edit `config.json` — changes apply automatically on the next 30s cycle, no restart needed.

```json
{
  "pollIntervalSeconds": 30,
  "ramAlertThresholdPercent": 80,
  "ramCriticalThresholdPercent": 90,

  "autoKill": ["LockApp", "CanvaAutoLaunchAvailabilityCheckAgent"],
  "conditionalKill": ["ChatGPT", "msedgewebview2", "Teams", "AdobeCollabSync"],
  "protected": ["Antigravity", "chrome", "node", "explorer"],

  "notifyIfAboveMB": {
    "chrome": 1500,
    "node": 3000,
    "Antigravity": 5000
  }
}
```

| Key | Description |
|---|---|
| `autoKill` | Always killed on sight, no questions |
| `conditionalKill` | Only killed when RAM > `ramAlertThresholdPercent` |
| `protected` | Never killed under any condition |
| `notifyIfAboveMB` | Popup alert when process group exceeds MB threshold |

## Files

| File | Purpose |
|---|---|
| `banaguard.ps1` | Main watchdog script (tray + widget) |
| `config.json` | Rules and thresholds |
| `start.vbs` | Silent launcher (no console) |
| `banaguard.log` | Kill history log |

## Requirements

- **Windows 10/11**
- **PowerShell 5+** (built-in, no install needed)
- No Node.js or other dependencies

## Where Is It?

Lives in `docs/METHOD/tools/banaguard/` and is **synced to all apps** via the METHOD sync system. Pull any app repo → it's there.

