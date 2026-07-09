"""FastAPI meta endpoint that returns cross-platform backup helper scripts.

The admin UI has a "Setup automatischen Backup" button that opens a modal
with the current script text — Nadine can then copy-paste it into
Notepad / TextEdit and set up a task in her OS scheduler.

Endpoint returns a small JSON:
    {
      "windows_batch": "...",
      "mac_bash": "...",
      "linux_bash": "...",
      "backup_url": "https://…/api/backup/mongo",
      "auth_hint": "…"
    }
"""
from fastapi import APIRouter, Depends, Request

from core.security import get_current_admin

router = APIRouter(prefix="/backup/scripts", tags=["backup"])


WINDOWS_BATCH_TEMPLATE = r"""@echo off
REM ---------------------------------------------------------------
REM  Fahrschule Safe Ride – tägliche MongoDB-Sicherung  (Windows)
REM
REM  1) Erstelle einen Ordner z.B. C:\SafeRideBackups
REM  2) Speichere diese Datei dort als "saferide-backup.bat"
REM  3) Öffne den "Task Scheduler" → "Aufgabe erstellen…"
REM     – Name:  Safe Ride DB Backup
REM     – Trigger: Täglich um 03:00 Uhr
REM     – Aktion:  Programm starten → C:\SafeRideBackups\saferide-backup.bat
REM
REM  Die letzten 30 Tage bleiben lokal, ältere werden gelöscht.
REM ---------------------------------------------------------------

set BACKUP_URL={backup_url}
set BACKUP_TOKEN={token_placeholder}
set BACKUP_DIR=%USERPROFILE%\SafeRideBackups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

set DATESTAMP=%date:~-4%-%date:~3,2%-%date:~0,2%
set OUT=%BACKUP_DIR%\saferide-%DATESTAMP%.json.gz

echo Backup wird geladen von %BACKUP_URL% …
curl -s -f -H "Authorization: Bearer %BACKUP_TOKEN%" -o "%OUT%" "%BACKUP_URL%"
if %errorlevel% neq 0 (
    echo FEHLER: Backup konnte nicht heruntergeladen werden.
    exit /b 1
)

echo OK. Datei gespeichert: %OUT%

REM  Rotation: nur die letzten 30 Tage behalten
forfiles /P "%BACKUP_DIR%" /M "saferide-*.json.gz" /D -30 /C "cmd /c del @path" 2>nul
"""


UNIX_BASH_TEMPLATE = r"""#!/usr/bin/env bash
# ---------------------------------------------------------------
#  Fahrschule Safe Ride – tägliche MongoDB-Sicherung  (macOS / Linux)
#
#  1) Speichere diese Datei als ~/saferide-backup.sh
#  2) Ausführbar machen:  chmod +x ~/saferide-backup.sh
#  3) In crontab (crontab -e) folgende Zeile einfügen:
#       0 3 * * *  $HOME/saferide-backup.sh >> $HOME/saferide-backup.log 2>&1
#
#  Die letzten 30 Tage bleiben lokal, ältere werden gelöscht.
# ---------------------------------------------------------------
set -e

BACKUP_URL="{backup_url}"
BACKUP_TOKEN="{token_placeholder}"
BACKUP_DIR="$HOME/SafeRideBackups"
mkdir -p "$BACKUP_DIR"

DATESTAMP=$(date +%Y-%m-%d)
OUT="$BACKUP_DIR/saferide-$DATESTAMP.json.gz"

echo "[$(date)] Lade Backup …"
curl -sfSL \
    -H "Authorization: Bearer $BACKUP_TOKEN" \
    -o "$OUT" \
    "$BACKUP_URL"

echo "[$(date)] OK, gespeichert: $OUT ($(du -h "$OUT" | cut -f1))"

# Rotation: behalte nur die letzten 30 Tage
find "$BACKUP_DIR" -name 'saferide-*.json.gz' -mtime +30 -delete
"""


@router.get("")
async def get_backup_scripts(request: Request, admin=Depends(get_current_admin)):
    """Return ready-to-paste backup scripts for Windows / macOS / Linux."""
    # Reconstruct the public backup URL from the incoming request.
    forwarded_proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    host = request.headers.get("host") or ""
    base = f"{forwarded_proto}://{host}".rstrip("/")
    backup_url = f"{base}/api/backup/mongo"

    token_placeholder = "PASTE-YOUR-ADMIN-JWT-HERE"

    def render(template: str) -> str:
        return template.replace("{backup_url}", backup_url).replace(
            "{token_placeholder}", token_placeholder
        )

    return {
        "backup_url": backup_url,
        "token_placeholder": token_placeholder,
        "auth_hint": (
            "Melde dich einmal im Admin-Panel an und kopiere den Token aus der "
            "Browser-DevTools Console mit: localStorage.getItem('token'). "
            "Ersetze " + token_placeholder + " im Script durch diesen Wert. "
            "Der Token bleibt 30 Tage gültig — im Kalender erinnern lassen, "
            "damit du ihn regelmässig erneuerst."
        ),
        "windows_batch": render(WINDOWS_BATCH_TEMPLATE),
        "mac_bash": render(UNIX_BASH_TEMPLATE),
        "linux_bash": render(UNIX_BASH_TEMPLATE),
    }
