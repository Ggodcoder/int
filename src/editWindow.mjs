import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

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

function windowsAppBrowserPath() {
  const candidates = [
    `${process.env.PROGRAMFILES ?? 'C:\\Program Files'}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)'}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env.PROGRAMFILES ?? 'C:\\Program Files'}\\Microsoft\\Edge\\Application\\msedge.exe`
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? chromium.executablePath();
}

function appBrowserPath(platform = process.platform) {
  if (platform === 'win32') return windowsAppBrowserPath();
  return chromium.executablePath();
}

async function openAppWindow(url) {
  const executablePath = appBrowserPath();
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
  windowsAppBrowserPath
};
