TARMAL IT PORTAL — PORTABLE PACKAGE
====================================

No install required. Copy this folder to a USB drive or any Windows PC and run.


QUICK START
-----------
1. Copy the whole "TarmalTaskTicketing" folder to the PC (example: C:\TarmalITPortal).
   Do not run from inside a ZIP — extract first if you received a ZIP file.

2. Double-click one launcher:
   - TarmalITPortal.exe       (recommended — single executable)
   - TarmalTaskTicketing.cmd  (shows console — good for troubleshooting)
   - TarmalTaskTicketing.vbs  (starts hidden — good for daily use)

3. Your browser opens automatically:
   http://localhost:8080/login.html

4. Sign in with your IT username and password.


COPY TO USB (PENDRIVE)
----------------------
1. Plug in the USB drive.
2. Copy the entire TarmalTaskTicketing folder to the drive.
3. On another PC: paste the folder to C:\TarmalITPortal (or Desktop).
4. Double-click TarmalTaskTicketing.cmd on that PC.
5. Requires Windows 10+, internet for login/sync.


DAILY USE
---------
1. Double-click TarmalTaskTicketing.vbs (or .cmd)
2. Open http://localhost:8080 if the browser did not open
3. Sign in if prompted

Tip: Shortcut TarmalTaskTicketing.vbs in Windows Startup
     (Win+R → shell:startup) to auto-start on login.


REQUIREMENTS
------------
- Windows 10 or later
- Internet access (login and Google Sheets sync)
- Apps Script web app deployed (URL in auth.js)

APPS SCRIPT UPDATE (PERFORMANCE — REQUIRED FOR FAST SYNC)
---------------------------------------------------------
After pulling portal updates that request compact=1 ticket lists, redeploy
google-apps-script-full-merged.gs as the web app (Deploy → Manage deployments
→ Edit → New version). Until redeployed, the portal still works but sync
payloads stay large (full tickets + assets + documents + procurement).

What the compact list endpoint changes:
- Returns tickets + users + hierarchy only (skips assets/documents/procurement)
- Strips base64 image payloads from list note fields (keeps Drive screenshot URLs)
- Reads the Tasks sheet in one batch (faster Apps Script execution)


LOGIN
-----
Users load from the AppUsers sheet on sign-in.
Default admin (if not in list): admin / 1234


INSTALL AS DESKTOP APP (OPTIONAL)
---------------------------------
Chrome or Edge on the same PC where the launcher is running:

1. Start the launcher (.cmd or .vbs)
2. Open http://localhost:8080
3. Address bar → Install app → pin to taskbar

The launcher must stay running in the background.


CHANGE APPS SCRIPT URL (IT ADMIN)
---------------------------------
Edit auth.js in this folder:
  SHEET_WEB_APP_URL: "https://script.google.com/macros/s/...../exec"


NETWORK ACCESS (LAN)
--------------------
After starting, the console may show:
  http://192.168.x.x:8080/login.html

Share with colleagues on the same network.


TROUBLESHOOTING
---------------
- localhost not working / connection refused
  -> Double-click TarmalITPortal.exe (not the ZIP file itself)
  -> Extract the ZIP first, then run the EXE from the extracted folder
  -> Keep the black console window open while using the app
  -> If port 8080 is busy, close other copies or set TARMAL_PORT=8081
- Browser does not open -> go to http://localhost:8080/login.html manually
- Cannot verify credentials → check internet; contact IT
- Port 8080 busy → set TARMAL_PORT=8081 before starting
- Logo missing → ensure assets\tarmal-logo.png is in this folder
- PowerShell blocked → right-click TarmalTaskTicketing.cmd → Run as administrator once,
  or run: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned


WHAT'S IN THIS FOLDER
---------------------
TarmalITPortal.exe              — start the local server (double-click this)
TarmalTaskTicketing.cmd / .vbs  — alternate launchers (no .exe needed)
start-network-server.ps1        — server fallback (PowerShell)
index.html, login.html, *.js    — the portal app
assets\                         — logo and images
