const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

const APP_ICON = path.join(__dirname, 'assets', 'icon.png');
const SPLASH_HTML = path.join(__dirname, 'splash.html');
const SPLASH_MAX_MS = Number(process.env.ELECTRON_SPLASH_MS || 11000);

function resolveSplashVideo() {
  const candidates = [
    process.env.ELECTRON_SPLASH_VIDEO,
    process.resourcesPath ? path.join(process.resourcesPath, 'splash.mp4') : null,
    path.join(__dirname, '..', 'client', 'public', 'Splash.mp4'),
    path.join(__dirname, '..', 'client', 'public', 'splash.mp4'),
    path.join(__dirname, 'assets', 'splash.mp4'),
  ].filter(Boolean);
  return candidates.find((filePath) => fs.existsSync(filePath)) || null;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.map': 'application/json',
};

const CANDIDATE_URLS = [
  process.env.ELECTRON_START_URL,
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

const LOCAL_API_HEALTH = 'http://127.0.0.1:5000/api/health';
const LOCAL_API_BASE = 'http://127.0.0.1:5000/api';
const HOSTED_API_BASE = 'https://doccheck-3qw4.onrender.com/api';

let mainWindow = null;
let splashWindow = null;
let splashDone = false;
let rendererServer = null;
let apiChild = null;
let apiBaseUrl = HOSTED_API_BASE;
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
      const lib = String(url).startsWith('https:') ? https : http;
      const req = lib.get(url, { timeout: timeoutMs }, (res) => {
        res.resume();
        done(Boolean(res.statusCode && res.statusCode < 500));
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findServerDir() {
  const candidates = [
    path.join(__dirname, '..', 'server'),
    path.join(process.cwd(), '..', 'server'),
    path.join(process.cwd(), 'server'),
  ];
  return candidates.find((dir) => fs.existsSync(path.join(dir, 'index.js'))) || null;
}

function envFlag(name) {
  const v = String(process.env[name] || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

async function resolveProductApiBaseUrl() {
  const override = String(process.env.ELECTRON_API_URL || '').trim();
  if (override) {
    console.log('Using ELECTRON_API_URL', override);
    return override.replace(/\/$/, '');
  }

  // Packaged EXE: prefer live Render. Fall back to local only if hosted is down.
  if (app.isPackaged) {
    if (await probeUrl(`${HOSTED_API_BASE}/health`, 2500)) {
      console.log('Using hosted API', HOSTED_API_BASE);
      return HOSTED_API_BASE;
    }
    if (await probeUrl(LOCAL_API_HEALTH, 1200)) {
      console.log('Hosted API unreachable; using local API', LOCAL_API_BASE);
      return LOCAL_API_BASE;
    }
    console.log('Using hosted API (default)', HOSTED_API_BASE);
    return HOSTED_API_BASE;
  }

  // Dev desktop: prefer local API so OTP uses server/.env SMTP.
  if (!envFlag('ELECTRON_FORCE_HOSTED') && (await probeUrl(LOCAL_API_HEALTH, 1200))) {
    console.log('Using local API', LOCAL_API_BASE);
    return LOCAL_API_BASE;
  }

  if (await probeUrl(`${HOSTED_API_BASE}/health`, 2500)) {
    console.log('Using hosted API', HOSTED_API_BASE);
    return HOSTED_API_BASE;
  }

  console.log('Using local API (default)', LOCAL_API_BASE);
  return LOCAL_API_BASE;
}

async function ensureLocalApi() {
  if (app.isPackaged || envFlag('ELECTRON_FORCE_HOSTED')) return false;
  if (await probeUrl(LOCAL_API_HEALTH, 1200)) {
    console.log('Local API already running at', LOCAL_API_HEALTH);
    return true;
  }

  const serverDir = findServerDir();
  if (!serverDir) {
    console.warn('Local API is down and server/ was not found next to the desktop app.');
    return false;
  }

  const nodeBin = process.env.npm_node_execpath || 'node';
  console.log('Starting local API from', serverDir);
  apiChild = spawn(nodeBin, ['index.js'], {
    cwd: serverDir,
    env: { ...process.env },
    stdio: 'ignore',
    windowsHide: true,
    detached: true,
  });
  apiChild.on('error', (err) => {
    console.error('Failed to start local API:', err.message);
  });
  apiChild.unref();

  for (let i = 0; i < 40; i += 1) {
    await sleep(400);
    if (await probeUrl(LOCAL_API_HEALTH, 800)) {
      console.log('Local API is ready');
      return true;
    }
  }
  console.warn('Local API did not become ready on http://127.0.0.1:5000');
  return false;
}

function rendererRoot() {
  return path.join(__dirname, 'renderer');
}

function startRendererServer(rootDir) {
  const root = path.resolve(rootDir);
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || '/').split('?')[0] || '/');
        let target = path.resolve(root, `.${urlPath === '/' ? '/index.html' : urlPath}`);
        if (!target.toLowerCase().startsWith(root.toLowerCase())) {
          res.writeHead(403);
          res.end();
          return;
        }
        if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
          target = path.join(root, 'index.html');
        }
        const stream = fs.createReadStream(target);
        stream.on('open', () => {
          res.writeHead(200, { 'Content-Type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream' });
          stream.pipe(res);
        });
        stream.on('error', () => {
          res.writeHead(404);
          res.end();
        });
      } catch {
        res.writeHead(500);
        res.end();
      }
    });
    const preferredPort = Number(process.env.ELECTRON_RENDERER_PORT || 19200);
    const bind = (port) => {
      const onError = (err) => {
        if (port !== 0 && err && err.code === 'EADDRINUSE') {
          bind(0);
          return;
        }
        reject(err);
      };
      server.once('error', onError);
      server.listen(port, '127.0.0.1', () => {
        server.removeListener('error', onError);
        rendererServer = server;
        resolve(`http://127.0.0.1:${server.address().port}`);
      });
    };
    bind(Number.isFinite(preferredPort) && preferredPort > 0 ? preferredPort : 19200);
  });
}

async function resolveStartUrl() {
  if (app.isPackaged) {
    const built = path.join(rendererRoot(), 'index.html');
    if (!fs.existsSync(built)) return null;
    return startRendererServer(rendererRoot());
  }
  for (const url of CANDIDATE_URLS) {
    // eslint-disable-next-line no-await-in-loop
    if (await probeUrl(url)) return url;
  }
  if (fs.existsSync(path.join(rendererRoot(), 'index.html'))) {
    return startRendererServer(rendererRoot());
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
      additionalArguments: [`--doccheck-api=${apiBaseUrl}`],
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
  apiBaseUrl = await resolveProductApiBaseUrl();
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
  const splashVideo = resolveSplashVideo();
  if (!splashVideo) {
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

  const videoUrl = encodeURIComponent(pathToFileURL(splashVideo).href);
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
  ipcMain.handle('app-version', () => app.getVersion());

  if (!app.isPackaged) await ensureLocalApi();
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
  if (rendererServer) {
    rendererServer.close();
    rendererServer = null;
  }
  if (process.platform !== 'darwin') app.quit();
});
