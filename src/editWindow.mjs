import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function editPage({ title, text }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: #181818;
      color: #e5e5e5;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      display: grid;
      grid-template-rows: auto 1fr auto;
    }
    header {
      padding: 14px 16px 10px;
      border-bottom: 1px solid #343434;
      color: #bdbdbd;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    textarea {
      width: 100%;
      height: 100%;
      resize: none;
      border: 0;
      outline: 0;
      padding: 18px;
      background: #202020;
      color: #f1f1f1;
      font: inherit;
      line-height: 1.55;
    }
    footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 12px 14px;
      border-top: 1px solid #343434;
      background: #181818;
    }
    button {
      min-width: 84px;
      padding: 8px 12px;
      border: 1px solid #4a4a4a;
      background: #2f2f2f;
      color: #efefef;
      font: inherit;
      cursor: pointer;
    }
    button.primary {
      border-color: #00b8c8;
      background: #006f78;
    }
  </style>
</head>
<body>
  <header>${escapeHtml(title)}</header>
  <textarea id="editor" autofocus spellcheck="false">${escapeHtml(text)}</textarea>
  <footer>
    <button id="cancel" type="button">Cancel</button>
    <button id="save" class="primary" type="button">Save</button>
  </footer>
  <script>
    const editor = document.getElementById('editor');
    async function submit(action) {
      const body = action === 'save' ? JSON.stringify({ text: editor.value }) : '{}';
      await fetch('/' + action, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
      window.close();
      document.body.innerHTML = '<main style="padding:18px">You can close this window.</main>';
    }
    document.getElementById('save').addEventListener('click', () => submit('save'));
    document.getElementById('cancel').addEventListener('click', () => submit('cancel'));
    editor.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        submit('save');
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        submit('cancel');
      }
    });
    editor.focus();
    editor.setSelectionRange(editor.value.length, editor.value.length);
  </script>
</body>
</html>`;
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function commandPath(command, platform = process.platform) {
  const lookup = platform === 'win32' ? 'where.exe' : 'command';
  const args = platform === 'win32' ? [command] : ['-v', command];
  const result = spawnSync(lookup, args, { encoding: 'utf8', shell: platform !== 'win32' });
  if (result.status !== 0) return null;
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) ?? null;
}

function firstExisting(candidates) {
  return candidates.find((candidate) => candidate && existsSync(candidate)) ?? null;
}

function windowsAppBrowserPath(env = process.env) {
  const programFiles = env.PROGRAMFILES ?? 'C:\\Program Files';
  const programFilesX86 = env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)';
  const localAppData = env.LOCALAPPDATA;
  const candidates = [
    env.INT_EDIT_BROWSER,
    `${programFiles}\\Google\\Chrome\\Application\\chrome.exe`,
    `${programFilesX86}\\Google\\Chrome\\Application\\chrome.exe`,
    localAppData && `${localAppData}\\Google\\Chrome\\Application\\chrome.exe`,
    `${programFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${programFilesX86}\\Microsoft\\Edge\\Application\\msedge.exe`,
    localAppData && `${localAppData}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${programFiles}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
    `${programFilesX86}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
    localAppData && `${localAppData}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
    commandPath('chrome.exe', 'win32'),
    commandPath('msedge.exe', 'win32'),
    commandPath('brave.exe', 'win32')
  ];
  return firstExisting(candidates);
}

function macAppBrowserPath(env = process.env) {
  const home = env.HOME;
  const candidates = [
    env.INT_EDIT_BROWSER,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    home && `${home}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    home && `${home}/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`,
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    home && `${home}/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`,
    commandPath('google-chrome', 'darwin'),
    commandPath('microsoft-edge', 'darwin'),
    commandPath('brave-browser', 'darwin')
  ];
  return firstExisting(candidates);
}

function linuxAppBrowserPath(env = process.env) {
  const candidates = [
    env.INT_EDIT_BROWSER,
    commandPath('google-chrome', 'linux'),
    commandPath('google-chrome-stable', 'linux'),
    commandPath('microsoft-edge', 'linux'),
    commandPath('brave-browser', 'linux'),
    commandPath('chromium', 'linux'),
    commandPath('chromium-browser', 'linux')
  ];
  return firstExisting(candidates);
}

function appBrowserPath(platform = process.platform) {
  if (platform === 'win32') return windowsAppBrowserPath();
  if (platform === 'darwin') return macAppBrowserPath();
  return linuxAppBrowserPath();
}

async function openAppWindow(url) {
  const executablePath = appBrowserPath();
  if (!executablePath) {
    throw new Error('Edit window needs an installed Chrome, Edge, Brave, or INT_EDIT_BROWSER path. Playwright Chrome for Testing is intentionally not used for edit windows.');
  }
  if (process.platform === 'win32') {
    const child = spawn('cmd', ['/c', 'start', '', executablePath, `--app=${url}`, '--window-size=900,620'], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    return {
      close: async () => {}
    };
  }

  const child = spawn(
    executablePath,
    [
      `--app=${url}`,
      '--window-size=900,620'
    ],
    {
      detached: true,
      stdio: 'ignore'
    }
  );
  child.unref();
  return {
    close: async () => {
      if (child.killed) return;
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
        return;
      }
      child.kill();
    }
  };
}

export async function openEditWindow({ title = 'Edit', text = '', launcher = openAppWindow } = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let windowHandle = null;
    const closeWindow = async () => {
      if (!windowHandle?.close) return;
      try {
        await windowHandle.close();
      } catch {}
    };
    const server = createServer(async (request, response) => {
      try {
        if (request.method === 'GET' && request.url === '/') {
          response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
          response.end(editPage({ title, text }));
          return;
        }

        if (request.method === 'POST' && request.url === '/save') {
          const body = await readRequestBody(request);
          const parsed = body ? JSON.parse(body) : {};
          response.writeHead(200, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ ok: true }));
          settled = true;
          resolve({ saved: true, text: String(parsed.text ?? '') });
          server.close();
          closeWindow();
          return;
        }

        if (request.method === 'POST' && request.url === '/cancel') {
          response.writeHead(200, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ ok: true }));
          settled = true;
          resolve({ saved: false, text });
          server.close();
          closeWindow();
          return;
        }

        response.writeHead(404);
        response.end('Not found');
      } catch (error) {
        if (!settled) {
          settled = true;
          reject(error);
        }
        server.close();
      }
    });

    server.on('error', reject);
    server.listen(0, '127.0.0.1', async () => {
      const { port } = server.address();
      try {
        windowHandle = await launcher(`http://127.0.0.1:${port}/`);
      } catch (error) {
        if (!settled) {
          settled = true;
          reject(error);
        }
        server.close();
      }
    });
  });
}

export const editWindowInternals = {
  editPage,
  openAppWindow,
  appBrowserPath,
  windowsAppBrowserPath,
  macAppBrowserPath,
  linuxAppBrowserPath
};
