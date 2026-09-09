const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { pathToFileURL } = require('url');

const APP_ICON = path.join(__dirname, 'assets', 'icon.png');
const SPLASH_VIDEO = path.join(__dirname, 'assets', 'splash.mp4');
const SPLASH_HTML = path.join(__dirname, 'splash.html');
const SPLASH_MAX_MS = Number(process.env.ELECTRON_SPLASH_MS || 5500);
const CANDIDATE_URLS = [
  process.env.ELECTRON_START_URL,
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

let mainWindow = null;
let splashWindow = null;
let splashDone = false;
let startUrl = CANDIDATE_URLS[0] || 'http://localhost:5174';

function probeUrl(url, timeoutMs = 800) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    try {
      const req = http.get(url, { timeout: timeoutMs }, (res) => {
        res.resume();
        done(true);
      });
      req.on('timeout', () => {
        req.destroy();
        done(false);
      });
      req.on('error', () => done(false));
    } catch {
      done(false);
    }
  });
}

async function resolveStartUrl() {
  for (const url of CANDIDATE_URLS) {
    // eslint-disable-next-line no-await-in-loop
    if (await probeUrl(url)) return url;
  }
  return null;
}

function offlineHtml(triedUrl) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8" /><title>DocCheck AI</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f3d3e;color:#e8f1f1;font-family:Segoe UI,sans-serif}
  .card{max-width:520px;padding:28px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(0,0,0,.22)}
  h1{margin:0 0 10px;font-size:22px} p{margin:0 0 10px;line-height:1.45;opacity:.9}
  code{background:rgba(255,255,255,.08);padding:2px 6px;border-radius:6px}
</style></head><body><div class="card">
  <h1>Client not running</h1>
  <p>Desktop could not open the QA/QC web app.</p>
  <p>Tried: <code>${triedUrl}</code></p>
  <p>In a terminal run:</p>
  <p><code>cd client</code><br/><code>npm run dev</code></p>
  <p>Then restart desktop with:</p>
  <p><code>cd desktop</code><br/><code>Remove-Item Env:ELECTRON_START_URL -ErrorAction SilentlyContinue</code><br/><code>npm start</code></p>
</div></body></html>`;
}

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: 'DocCheck AI',
    icon: APP_ICON,
    backgroundColor: '#0f3d3e',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(APP_ICON);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('Failed to load app URL:', url, code, desc);
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(offlineHtml(url || startUrl))}`);
    showMainWindow();
  });

  mainWindow.once('ready-to-show', () => {
    if (splashDone) showMainWindow();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

async function loadMainApp() {
  createMainWindow();
  const resolved = await resolveStartUrl();
  if (!resolved) {
    console.error('No Vite client found on 5174/5173');
    await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(offlineHtml(startUrl))}`);
    return;
  }
  startUrl = resolved;
  console.log('Loading app from', startUrl);
  await mainWindow.loadURL(startUrl);
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (!mainWindow.isVisible()) {
    mainWindow.show();
    mainWindow.focus();
  }
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.removeAllListeners('closed');
    splashWindow.close();
  }
  splashWindow = null;
}

function finishSplash() {
  if (splashDone) return;
  splashDone = true;
  closeSplash();
  showMainWindow();
}

function createSplashWindow() {
  const hasVideo = fs.existsSync(SPLASH_VIDEO);
  if (!hasVideo) {
    splashDone = true;
    return null;
  }

  splashWindow = new BrowserWindow({
    width: 960,
    height: 540,
    resizable: false,
    movable: true,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    center: true,
    skipTaskbar: true,
    title: 'DocCheck AI',
    icon: APP_ICON,
    backgroundColor: '#050b14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const videoUrl = encodeURIComponent(pathToFileURL(SPLASH_VIDEO).href);
  splashWindow.loadFile(SPLASH_HTML, {
    query: {
      src: videoUrl,
      maxMs: String(SPLASH_MAX_MS),
    },
  });

  splashWindow.on('closed', () => {
    splashWindow = null;
    finishSplash();
  });

  return splashWindow;
}

app.whenReady().then(async () => {
  ipcMain.on('splash-finished', () => finishSplash());

  await loadMainApp();
  const splash = createSplashWindow();
  if (!splash) showMainWindow();

  setTimeout(() => finishSplash(), SPLASH_MAX_MS + 1500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      splashDone = true;
      loadMainApp().then(() => showMainWindow());
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
