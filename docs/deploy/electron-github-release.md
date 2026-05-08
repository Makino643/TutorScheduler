# TutorFlow Electron Packaging + GitHub Releases (Windows + macOS)

This guide shows how to package TutorFlow as a desktop app with Electron and publish installers through GitHub Releases.

macOS is treated as the primary release target.

---

## 0) Decide app architecture first

For this project (Next.js + Prisma SQLite), use this production pattern:

- Build Next.js once (`next build`)
- Run Next server in production mode on localhost inside Electron (`next start -p 3989`)
- Load `http://127.0.0.1:3989` in the Electron `BrowserWindow`
- Keep SQLite in app data folder (or your existing data path)

This avoids fragile static-export limitations and preserves your full server/API behavior.

---

## 1) Install desktop packaging dependencies

From project root:

```powershell
npm install electron electron-builder wait-on concurrently cross-env
```

---

## 2) Add Electron entry files

Create `electron/main.js`:

```js
const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

const PORT = 3989;
const START_URL = `http://127.0.0.1:${PORT}`;
let nextProc = null;

function startNextServer() {
  const isDev = !app.isPackaged;
  if (isDev) {
    return;
  }
  const nextBin = path.join(process.resourcesPath, "app.asar.unpacked", "node_modules", "next", "dist", "bin", "next");
  nextProc = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
    cwd: process.resourcesPath + "/app.asar.unpacked",
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production" },
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  await win.loadURL(START_URL);
}

app.whenReady().then(async () => {
  startNextServer();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (nextProc) nextProc.kill();
});
```

Create `electron/preload.js` (minimal):

```js
// add secure IPC exposure later when needed
```

---

## 3) Update package scripts and electron-builder config

Update `package.json`:

- Add scripts:
  - `desktop:build`: `npm run build`
  - `desktop:dev`: run Next dev + Electron together
  - `desktop:pack`: build desktop artifacts via electron-builder
  - `desktop:release`: publish to GitHub Releases
- Add `build` block for electron-builder targets.

Example snippet:

```json
{
  "main": "electron/main.js",
  "scripts": {
    "desktop:build": "npm run build",
    "desktop:dev": "concurrently \"next dev -p 3989\" \"wait-on http://127.0.0.1:3989 && electron .\"",
    "desktop:pack": "npm run desktop:build && electron-builder --publish never",
    "desktop:release": "npm run desktop:build && electron-builder --publish always"
  },
  "build": {
    "appId": "com.tutorflow.app",
    "productName": "TutorFlow",
    "directories": {
      "output": "release"
    },
    "files": [
      ".next/**/*",
      "public/**/*",
      "node_modules/**/*",
      "package.json",
      "prisma/**/*",
      "electron/**/*"
    ],
    "asarUnpack": [
      "node_modules/next/**/*",
      "node_modules/@prisma/**/*",
      "node_modules/.prisma/**/*"
    ],
    "mac": {
      "target": ["dmg", "zip"],
      "category": "public.app-category.education",
      "hardenedRuntime": true,
      "gatekeeperAssess": false
    },
    "win": {
      "target": ["nsis", "zip"]
    },
    "publish": [
      {
        "provider": "github",
        "owner": "YOUR_GH_USER",
        "repo": "YOUR_REPO"
      }
    ]
  }
}
```

---

## 4) macOS signing + notarization (most important)

You need:

- Apple Developer Program account
- Developer ID Application certificate installed on macOS keychain
- App-specific credentials for notarization

Set these GitHub secrets:

- `CSC_LINK` (base64 `.p12` certificate or file URL)
- `CSC_KEY_PASSWORD`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

Without notarization, macOS users will see strong security warnings and poor install UX.

---

## 5) GitHub Actions workflow for Releases

Create `.github/workflows/release-desktop.yml`:

```yaml
name: Release Desktop

on:
  push:
    tags:
      - "v*"

permissions:
  contents: write

jobs:
  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run desktop:release
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CSC_LINK: ${{ secrets.CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}

  build-windows:
    runs-on: windows-latest
    needs: build-macos
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run desktop:release
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Notes:

- `vX.Y.Z` tag triggers release publish.
- macOS job runs first as primary target.
- Windows artifacts are appended to the same GitHub Release.

---

## 6) Local developer flow

- Dev run:
  - `npm run desktop:dev`
- Build test package (no publish):
  - `npm run desktop:pack`

Artifacts appear in `release/`.

---

## 7) Release flow (step by step)

1. Ensure working tree is clean and all checks pass:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test`
2. Bump version in `package.json` (example `0.2.0`).
3. Commit and push.
4. Create git tag:
   - `git tag v0.2.0`
   - `git push origin v0.2.0`
5. GitHub Actions builds macOS then Windows.
6. Check GitHub Release page for:
   - macOS `.dmg` and `.zip`
   - Windows `.exe` and `.zip`
7. Download and smoke-test both installers.

---

## 8) macOS-focused quality checklist

- App opens without "damaged app" warning.
- Notarization ticket is stapled (or accepted online).
- Auto-update metadata (optional next step) works.
- SQLite path is writable and persists data between app relaunches.
- Login/session handling survives app restart.

---

## 9) Common pitfalls for this stack

- Prisma engine missing in packaged app:
  - fix with `asarUnpack` for `.prisma` and `@prisma` directories.
- Next start not found in packaged app:
  - ensure `next` runtime files are included in `files`.
- App flashes blank on startup:
  - wait for server readiness before loading URL (`wait-on` or retry loop).
- macOS install blocked:
  - signing/notarization secrets missing or invalid.

---

## 10) Recommended rollout plan

1. Complete local `desktop:dev`.
2. Complete local `desktop:pack` on macOS and verify DMG.
3. Add GitHub workflow and secrets.
4. Publish first macOS-only tag (`v0.2.0-macos-rc1`) if desired.
5. Add Windows in same pipeline after macOS is stable.

