/* Оболочка ПК (Electron). Ничего не правит в сайте: он загружает тот же site/index.html,
   который лежит на хостинге. Пока есть интернет — берёт свежую версию, без сети — из кэша. */
const { app, BrowserWindow, shell, Menu, nativeTheme, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const REMOTE = 'https://goryachevmatvey812.github.io/goryachevmatvey812.github.io-1-/';
const LOCAL_FILE = path.join(__dirname, 'stage', 'index.html');
let win = null;

nativeTheme.themeSource = 'dark';

function hasLocalBuild() {
  try { return fs.existsSync(LOCAL_FILE); } catch (e) { return false; }
}

async function reachable(url) {
  return new Promise(res => {
    try {
      const r = net.request({ method: 'HEAD', url });
      r.on('response', resp => res(resp.statusCode >= 200 && resp.statusCode < 400));
      r.on('error', () => res(false));
      setTimeout(() => res(false), 4000);
      r.end();
    } catch (e) { res(false); }
  });
}

async function pickURL() {
  if (await reachable(REMOTE)) return REMOTE;
  if (hasLocalBuild()) return 'file://' + LOCAL_FILE.replace(/\\/g, '/');
  return REMOTE;
}

async function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 380,
    minHeight: 560,
    backgroundColor: '#0a0a0c',
    autoHideMenuBar: true,
    title: 'Орден',
    icon: path.join(__dirname, 'stage', 'icon-512.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true
    }
  });
  Menu.setApplicationMenu(null);

  const url = await pickURL();
  win.loadURL(url);

  win.webContents.setWindowOpenHandler(({ url: u }) => {
    if (/^https?:/.test(u)) shell.openExternal(u);
    return { action: 'deny' };
  });

  win.webContents.on('did-fail-load', async (e, code, desc, failedURL, isMainFrame) => {
    if (!isMainFrame) return;
    if (hasLocalBuild() && !String(failedURL).startsWith('file:')) {
      win.loadURL('file://' + LOCAL_FILE.replace(/\\/g, '/'));
    } else {
      win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(
        '<body style="margin:0;background:#0a0a0c;color:#e0e0e0;font:16px system-ui;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center">' +
        '<div><h2 style="color:#c0392b;font-family:monospace;letter-spacing:.2em">ОРДЕН</h2>' +
        '<p>Нет подключения к интернету.</p>' +
        '<p style="color:#8d939b">Проверьте Wi-Fi или мобильный интернет.</p>' +
        '<button onclick="location.reload()" style="margin-top:14px;padding:9px 16px;background:#c0392b;color:#fff;border:0;cursor:pointer">Повторить</button></div></body>'));
    }
  });

  // Обновление: сравниваем версию сборки на сайте с версией приложения
  setInterval(async () => {
    if (!win || win.isDestroyed()) return;
    try {
      const v = await fetch(REMOTE + 'version.json?_=' + Date.now()).then(r => r.ok ? r.json() : null).catch(() => null);
      if (v && v.version && v.version !== app.getVersion().replace(/^0\.0\.0$/, '')) {
        const local = await fetch(REMOTE + 'version.json').then(r => r.json()).catch(() => null);
        if (local && local.version) win.webContents.send('orden-update', local.version);
      }
    } catch (e) {}
  }, 15 * 60 * 1000);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
