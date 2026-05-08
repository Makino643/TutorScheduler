"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const { app, BrowserWindow, Menu } = require("electron");
const { spawn } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const net = require("net");
const path = require("path");

const APP_HOST = "127.0.0.1";

let nextProcess = null;
let mainWindow = null;
let appPort = null;
let logStream = null;

function getLogPath() {
  const dir = path.join(app.getPath("userData"), "logs");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "main.log");
}

function log(...parts) {
  const line = `[${new Date().toISOString()}] ${parts
    .map((p) => (typeof p === "string" ? p : JSON.stringify(p)))
    .join(" ")}\n`;
  try {
    if (!logStream) {
      logStream = fs.createWriteStream(getLogPath(), { flags: "a" });
    }
    logStream.write(line);
  } catch {
    // ignore log write failure
  }
  // Also print to stdio in dev
  process.stdout.write(line);
}

function pickFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, APP_HOST, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.number ?? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

function getOrCreateAuthSecret() {
  const file = path.join(app.getPath("userData"), "auth-secret");
  try {
    if (fs.existsSync(file)) {
      const value = fs.readFileSync(file, "utf8").trim();
      if (value) return value;
    }
  } catch {
    // fall through to regenerate
  }
  const value = crypto.randomBytes(48).toString("base64");
  try {
    fs.writeFileSync(file, value, { encoding: "utf8" });
  } catch (err) {
    log("warn: failed to persist auth secret:", String(err));
  }
  return value;
}

function getResourcesAppDir() {
  return path.join(process.resourcesPath, "app.asar");
}

function getUnpackedAppDir() {
  return path.join(process.resourcesPath, "app.asar.unpacked");
}

function getStandaloneDir() {
  // The standalone tree must be a real on-disk folder for `cwd` to work,
  // because Windows cannot chdir into a path inside an asar archive.
  // We list `**/.next/standalone/**/*` in asarUnpack so this exists for
  // packaged builds.
  const unpacked = path.join(getUnpackedAppDir(), ".next", "standalone");
  if (fs.existsSync(unpacked)) return unpacked;
  return path.join(getResourcesAppDir(), ".next", "standalone");
}

function getServerJsPath() {
  return path.join(getStandaloneDir(), "server.js");
}

function ensureWritableDataDir() {
  const dataDir = path.join(app.getPath("userData"), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  return dataDir;
}

function copySeedDbIfMissing(dataDir) {
  const target = path.join(dataDir, "dev.db");
  if (fs.existsSync(target)) return target;

  const candidates = [
    path.join(process.resourcesPath, "prisma", "dev.db"),
    path.join(getUnpackedAppDir(), ".next", "standalone", "prisma", "dev.db"),
    path.join(getStandaloneDir(), "prisma", "dev.db"),
    path.join(getResourcesAppDir(), "prisma", "dev.db"),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        fs.copyFileSync(candidate, target);
        log("seeded dev.db copied from", candidate, "to", target);
        return target;
      }
    } catch (err) {
      log("warn: candidate copy failed:", candidate, String(err));
    }
  }

  log("warn: no seed dev.db found; runtime starts with empty DB at", target);
  return target;
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.status > 0) {
        return true;
      }
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(
    "Timed out waiting for app server at " +
      url +
      (lastError ? " — last error: " + String(lastError) : ""),
  );
}

function showSplash() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 980,
    minHeight: 720,
    backgroundColor: "#0b0b10",
    show: true,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  mainWindow.setMenuBarVisibility(false);
  const splashHtml =
    "<!doctype html><html><head><meta charset='utf-8'><title>TutorFlow</title>" +
    "<style>body{margin:0;background:#0b0b10;color:#e8eaf3;font-family:system-ui,'Segoe UI',sans-serif;display:grid;place-items:center;height:100vh}" +
    ".card{padding:32px 40px;border:1px solid #2a2a35;border-radius:14px;text-align:center;min-width:280px}" +
    ".dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:#7c5cff;margin-right:10px;vertical-align:middle;animation:p 1.2s infinite ease-in-out}" +
    "@keyframes p{0%,100%{transform:scale(.8);opacity:.6}50%{transform:scale(1.1);opacity:1}}" +
    "h1{font-size:18px;margin:0 0 8px}p{margin:0;color:#9aa1b2;font-size:13px}</style>" +
    "</head><body><div class='card'><h1><span class='dot'></span>TutorFlow</h1><p>Starting local server...</p></div></body></html>";
  mainWindow.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(splashHtml),
  );
  return mainWindow;
}

function showFatalError(message) {
  if (!mainWindow) {
    mainWindow = showSplash();
  }
  const safe = String(message).replace(/[<>&]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;",
  );
  const html =
    "<!doctype html><html><head><meta charset='utf-8'><title>TutorFlow — startup error</title>" +
    "<style>body{margin:0;background:#0b0b10;color:#e8eaf3;font-family:system-ui,'Segoe UI',sans-serif;padding:32px}" +
    "h1{font-size:18px;margin:0 0 12px}pre{white-space:pre-wrap;background:#161620;border:1px solid #2a2a35;border-radius:10px;padding:14px;color:#ffb4b4;font-size:12px}" +
    "p{color:#9aa1b2;font-size:13px;margin:8px 0}</style></head>" +
    "<body><h1>TutorFlow failed to start.</h1>" +
    "<p>Log file:</p><pre>" +
    getLogPath() +
    "</pre><p>Details:</p><pre>" +
    safe +
    "</pre></body></html>";
  mainWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
}

async function startProductionServer() {
  const standaloneDir = getStandaloneDir();
  const serverJs = getServerJsPath();
  if (!fs.existsSync(serverJs)) {
    throw new Error("server.js not found at: " + serverJs);
  }

  const dataDir = ensureWritableDataDir();
  const dbPath = copySeedDbIfMissing(dataDir);
  const port = await pickFreePort();
  appPort = port;

  const env = {
    ...process.env,
    NODE_ENV: "production",
    ELECTRON_RUN_AS_NODE: "1",
    HOSTNAME: APP_HOST,
    PORT: String(port),
    DATABASE_URL: "file:" + dbPath.replace(/\\/g, "/"),
    NEXTAUTH_URL: `http://${APP_HOST}:${port}`,
    AUTH_SECRET: process.env.AUTH_SECRET || getOrCreateAuthSecret(),
    ICAL_FEED_TOKEN: process.env.ICAL_FEED_TOKEN || "tutorflow-local-feed",
  };

  log("spawning standalone server", {
    serverJs,
    cwd: standaloneDir,
    cwdExists: fs.existsSync(standaloneDir),
    port,
    dbPath,
  });

  nextProcess = spawn(process.execPath, [serverJs], {
    cwd: standaloneDir,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  log("server spawned, pid=", nextProcess.pid);

  nextProcess.on("error", (err) => {
    log("[server-spawn-error]", String(err && err.stack ? err.stack : err));
  });
  nextProcess.stdout.on("data", (chunk) => log("[server]", chunk.toString().trimEnd()));
  nextProcess.stderr.on("data", (chunk) => log("[server-err]", chunk.toString().trimEnd()));
  nextProcess.on("exit", (code, signal) => {
    log("server exited", { code, signal });
    nextProcess = null;
  });

  await waitForServer(`http://${APP_HOST}:${port}`);
  return port;
}

async function startApp() {
  showSplash();

  if (!app.isPackaged) {
    appPort = 3989;
    try {
      await waitForServer(`http://${APP_HOST}:${appPort}`);
      await mainWindow.loadURL(`http://${APP_HOST}:${appPort}`);
    } catch (err) {
      log("dev server load failed:", String(err));
      showFatalError(String(err));
    }
    return;
  }

  try {
    const port = await startProductionServer();
    await mainWindow.loadURL(`http://${APP_HOST}:${port}`);
  } catch (err) {
    log("startup error:", String(err && err.stack ? err.stack : err));
    showFatalError(err && err.message ? err.message : String(err));
  }
}

app.whenReady().then(() => {
  log("app ready, packaged=", app.isPackaged);
  // Remove the default File/Edit/View/Window menu bar across all windows
  // (only takes effect on Windows/Linux; macOS keeps the system-required menu).
  if (process.platform !== "darwin") {
    Menu.setApplicationMenu(null);
  }
  startApp();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      startApp();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (nextProcess) {
    log("terminating server child process");
    try {
      nextProcess.kill();
    } catch (err) {
      log("warn: kill failed:", String(err));
    }
    nextProcess = null;
  }
  if (logStream) {
    try {
      logStream.end();
    } catch {
      // ignore
    }
    logStream = null;
  }
});
