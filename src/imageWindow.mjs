import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { basename } from 'node:path';
import { editWindowInternals } from './editWindow.mjs';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function imagePage({ title, images }) {
  const body = images
    .map((image, index) => `<figure><img src="/image/${index}" alt="${escapeHtml(basename(image.path))}"><figcaption>${index + 1}. ${escapeHtml(basename(image.path))}</figcaption></figure>`)
    .join('\n');

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
      background: #181818;
      color: #e5e5e5;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    }
    header {
      position: sticky;
      top: 0;
      padding: 12px 16px;
      border-bottom: 1px solid #343434;
      background: #181818;
      color: #cfcfcf;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    main {
      display: grid;
      gap: 18px;
      padding: 18px;
    }
    figure {
      margin: 0;
      display: grid;
      gap: 8px;
    }
    img {
      max-width: 100%;
      height: auto;
      border: 1px solid #3a3a3a;
      background: #0f0f0f;
    }
    figcaption {
      color: #a7a7a7;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <header>${escapeHtml(title)}</header>
  <main>${body}</main>
</body>
</html>`;
}

export async function openImageWindow({ title = 'Images', images = [], launcher = editWindowInternals.openAppWindow } = {}) {
  if (images.length === 0) throw new Error('No images attached.');
  return new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      if (request.method === 'GET' && request.url === '/') {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        response.end(imagePage({ title, images }));
        return;
      }

      const match = request.url?.match(/^\/image\/(\d+)$/);
      if (request.method === 'GET' && match) {
        const image = images[Number.parseInt(match[1], 10)];
        if (!image?.path || !existsSync(image.path)) {
          response.writeHead(404);
          response.end('Not found');
          return;
        }
        response.writeHead(200, { 'content-type': 'image/png' });
        createReadStream(image.path).pipe(response);
        return;
      }

      response.writeHead(404);
      response.end('Not found');
    });

    server.on('error', reject);
    server.listen(0, '127.0.0.1', async () => {
      server.unref();
      const { port } = server.address();
      try {
        await launcher(`http://127.0.0.1:${port}/`);
        resolve({ opened: true, port });
      } catch (error) {
        server.close();
        reject(error);
      }
    });
  });
}

export const imageWindowInternals = { imagePage };
