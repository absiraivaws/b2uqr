const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const express = require('express');
const bodyParser = require('body-parser');

function resolveAppUrl() {
  // Priority: APP_URL env, --appUrl= argument, fallback to localhost:9002
  const fromEnv = process.env.APP_URL;
  if (fromEnv) return fromEnv;
  const arg = process.argv.find(a => a.startsWith('--appUrl='));
  if (arg) return arg.split('=')[1];
  // For development of overlay against the vercel preview site use that by default
  return 'https://lanka-qr-demo.vercel.app/overlay';
}

let win = null;
let overlayToken = null;

function createWindow() {
  const appUrl = resolveAppUrl();

  win = new BrowserWindow({
    width: 420,
    height: 640,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadURL(appUrl).catch(err => console.error('Failed to load URL', err));

  if (process.env.DEBUG) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  win.on('closed', () => { win = null; });
}

function tokenFilePath() {
  return path.join(app.getPath('userData'), 'overlay-token.json');
}

function ensureToken() {
  try {
    const p = tokenFilePath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      const obj = JSON.parse(raw);
      overlayToken = obj?.token || null;
    }
    if (!overlayToken) {
      overlayToken = crypto.randomBytes(16).toString('hex');
      const obj = { token: overlayToken, createdAt: new Date().toISOString() };
      try { fs.mkdirSync(path.dirname(p), { recursive: true }); } catch (e) { }
      fs.writeFileSync(p, JSON.stringify(obj), { encoding: 'utf8' });
      console.log('Generated overlay token and stored at', p);
    }
  } catch (e) {
    console.warn('Failed to ensure overlay token', e);
    overlayToken = process.env.OVERLAY_TOKEN || null;
  }
}

function handleProtocolArg(argv) {
  try {
    // argv may include lankaqr://open?payload=...
    const proto = argv.find(a => typeof a === 'string' && a.startsWith('lankaqr://'));
    if (!proto) return;
    // parse payload param
    const url = new URL(proto);
    const payloadParam = url.searchParams.get('payload');
    if (payloadParam) {
      try {
        const json = JSON.parse(Buffer.from(payloadParam, 'base64').toString('utf8'));
        if (win && !win.isDestroyed()) win.webContents.send('overlay:transaction', json);
      } catch (e) {
        console.warn('Failed to parse protocol payload', e);
      }
    } else {
      // just ensure window is visible
      if (!win || win.isDestroyed()) createWindow();
      try { win.show(); win.focus(); } catch (e) { }
    }
  } catch (e) {
    console.warn('handleProtocolArg error', e);
  }
}

function startLocalServer(port = 3333) {
  try {
    const server = express();
    server.use(bodyParser.json({ limit: '1mb' }));

    // Simple CORS for local dev: allow requests from localhost dev server origins
    server.use((req, res, next) => {
      const origin = req.headers.origin;
      // Allowed origins: local dev, the vercel preview, and production QR site
      const allowed = [
        'http://localhost:9002',
        'http://127.0.0.1:9002',
        'https://lanka-qr-demo.vercel.app',
        'https://qr.b2u.app'
      ];
      if (origin && allowed.some(a => origin.startsWith(a))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else if (allowed.length) {
        res.setHeader('Access-Control-Allow-Origin', allowed[0]);
      }
      res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Overlay-Token');
      if (req.method === 'OPTIONS') return res.sendStatus(204);
      next();
    });

    server.post('/open', async (req, res) => {
      console.log('Local /open called from', req.ip, 'origin=', req.headers.origin);
      try {
        const payload = req.body?.transaction ?? req.body;
        if (!payload) return res.status(400).json({ error: 'Missing transaction payload' });

        const tokenHeader = (req.headers['x-overlay-token'] || req.headers['X-Overlay-Token'] || req.headers['X-Overlay-token']);
        // validate token: allow env override or stored token
        const expected = process.env.OVERLAY_TOKEN || overlayToken;
        if (expected && tokenHeader && String(tokenHeader) !== expected) {
          console.warn('Local /open invalid token from', req.ip);
          return res.status(403).json({ error: 'invalid token' });
        }

        if (!win || win.isDestroyed()) {
          createWindow();
          // wait for content to load before sending
          app.once('browser-window-created', () => {
            setTimeout(() => {
              try {
                if (win && !win.isDestroyed()) win.webContents.send('overlay:transaction', payload);
              } catch (e) { console.warn('send overlay after create failed', e); }
            }, 600);
          });
        } else {
          try { win.show(); win.focus(); } catch (e) { /* ignore */ }
          try { win.webContents.send('overlay:transaction', payload); } catch (e) { console.warn('send overlay failed', e); }
        }

        return res.json({ ok: true });
      } catch (err) {
        console.error('Local /open failed', err);
        return res.status(500).json({ error: 'internal' });
      }
    });

    server.listen(port, '127.0.0.1', () => {
      console.log(`Overlay local server listening on http://127.0.0.1:${port}`);
    });
  } catch (e) {
    console.warn('Failed to start local server', e);
  }
}

app.whenReady().then(() => {
  createWindow();

  // start local IPC server for dev quick-open
  const port = process.env.OVERLAY_LOCAL_PORT ? Number(process.env.OVERLAY_LOCAL_PORT) : 3333;
  startLocalServer(port);
  // Ensure token exists
  ensureToken();
  // Register custom protocol handler
  try {
    if (app.isPackaged) {
      app.setAsDefaultProtocolClient('lankaqr');
    } else {
      // developer: registering protocol on dev may require extra args on Windows
      app.setAsDefaultProtocolClient('lankaqr', process.execPath, [path.resolve(process.argv[1] || '')]);
    }
  } catch (e) {
    console.warn('Failed to register protocol handler', e);
  }
  // handle protocol args passed on start
  handleProtocolArg(process.argv || []);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('close-overlay', () => {
  if (win && !win.isDestroyed()) win.close();
});

ipcMain.on('focus-overlay', () => {
  if (win && !win.isDestroyed()) {
    try { win.focus(); } catch (e) { /* ignore */ }
  }
});
