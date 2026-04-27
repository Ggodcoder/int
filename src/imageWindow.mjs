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

function imagePage({ title, images }) {
  const body = images
    .map((image, index) => `<figure data-image-index="${index}">
      <div class="image-wrap"><img src="/image/${index}" alt="${escapeHtml(basename(image.path))}"></div>
      <figcaption>${index + 1}. ${escapeHtml(basename(image.path))}</figcaption>
    </figure>`)
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
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      white-space: nowrap;
      overflow: hidden;
    }
    .title {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .actions {
      flex: 0 0 auto;
      display: flex;
      gap: 8px;
      align-items: center;
    }
    button {
      min-width: 86px;
      padding: 7px 10px;
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
    .image-wrap {
      position: relative;
      width: fit-content;
      max-width: 100%;
      background: #0f0f0f;
      line-height: 0;
      cursor: default;
    }
    body.occlusion .image-wrap {
      cursor: crosshair;
    }
    img {
      max-width: 100%;
      height: auto;
      border: 1px solid #3a3a3a;
      background: #0f0f0f;
      user-select: none;
      -webkit-user-drag: none;
    }
    .mask {
      position: absolute;
      border: 2px solid #f4cf4d;
      background: rgba(244, 207, 77, 0.36);
      pointer-events: none;
      min-width: 4px;
      min-height: 4px;
    }
    figcaption {
      color: #a7a7a7;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <header>
    <div class="title">${escapeHtml(title)}</div>
    <div class="actions">
      <button id="occlusion" type="button">Occlusion</button>
      <button id="clear" type="button">Clear</button>
      <button id="save" class="primary" type="button">Save</button>
    </div>
  </header>
  <main>${body}</main>
  <script>
    const occlusions = [];
    let drawing = null;
    let occlusionMode = false;
    const occlusionButton = document.getElementById('occlusion');
    const clearButton = document.getElementById('clear');
    const saveButton = document.getElementById('save');

    function rectFor(event, wrap) {
      const box = wrap.getBoundingClientRect();
      const x = Math.max(0, Math.min(event.clientX - box.left, box.width));
      const y = Math.max(0, Math.min(event.clientY - box.top, box.height));
      return { box, x, y };
    }

    function applyMaskElement(element, start, current) {
      const left = Math.min(start.x, current.x);
      const top = Math.min(start.y, current.y);
      const width = Math.abs(current.x - start.x);
      const height = Math.abs(current.y - start.y);
      element.style.left = left + 'px';
      element.style.top = top + 'px';
      element.style.width = width + 'px';
      element.style.height = height + 'px';
      return { left, top, width, height };
    }

    occlusionButton.addEventListener('click', () => {
      occlusionMode = !occlusionMode;
      document.body.classList.toggle('occlusion', occlusionMode);
      occlusionButton.textContent = occlusionMode ? 'Masking' : 'Occlusion';
    });

    clearButton.addEventListener('click', () => {
      occlusions.length = 0;
      document.querySelectorAll('.mask').forEach((node) => node.remove());
    });

    document.querySelectorAll('figure').forEach((figure) => {
      const wrap = figure.querySelector('.image-wrap');
      wrap.addEventListener('pointerdown', (event) => {
        if (!occlusionMode) return;
        event.preventDefault();
        wrap.setPointerCapture(event.pointerId);
        const start = rectFor(event, wrap);
        const element = document.createElement('div');
        element.className = 'mask';
        wrap.appendChild(element);
        drawing = { figure, wrap, element, start };
      });
      wrap.addEventListener('pointermove', (event) => {
        if (!drawing || drawing.wrap !== wrap) return;
        applyMaskElement(drawing.element, drawing.start, rectFor(event, wrap));
      });
      wrap.addEventListener('pointerup', (event) => {
        if (!drawing || drawing.wrap !== wrap) return;
        const current = rectFor(event, wrap);
        const rect = applyMaskElement(drawing.element, drawing.start, current);
        const width = rect.width / current.box.width;
        const height = rect.height / current.box.height;
        if (width < 0.01 || height < 0.01) {
          drawing.element.remove();
        } else {
          occlusions.push({
            imageIndex: Number.parseInt(figure.dataset.imageIndex, 10),
            x: rect.left / current.box.width,
            y: rect.top / current.box.height,
            width,
            height
          });
        }
        drawing = null;
      });
    });

    saveButton.addEventListener('click', async () => {
      const response = await fetch('/occlusions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ occlusions })
      });
      const result = await response.json();
      saveButton.textContent = result.created === 1 ? 'Saved 1' : 'Saved ' + result.created;
      setTimeout(() => window.close(), 350);
    });
  </script>
</body>
</html>`;
}

function maskStyle(occlusion) {
  const x = Math.max(0, Math.min(1, Number(occlusion?.x) || 0)) * 100;
  const y = Math.max(0, Math.min(1, Number(occlusion?.y) || 0)) * 100;
  const width = Math.max(0, Math.min(1, Number(occlusion?.width) || 0)) * 100;
  const height = Math.max(0, Math.min(1, Number(occlusion?.height) || 0)) * 100;
  return `left:${x}%;top:${y}%;width:${width}%;height:${height}%;`;
}

function reviewPage({ title, card, mode }) {
  const isDrill = mode === 'drill';
  const ratingText = isDrill
    ? '1 Fail | 2 Pass | 3 Pass | 4 Pass'
    : '1 Again | 2 Hard | 3 Good | 4 Easy';
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
    header, footer {
      padding: 12px 16px;
      border-color: #343434;
      background: #181818;
      color: #cfcfcf;
    }
    header { border-bottom: 1px solid #343434; }
    footer {
      border-top: 1px solid #343434;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    main {
      padding: 18px;
      display: grid;
      place-items: center;
      overflow: auto;
    }
    .wrap {
      position: relative;
      width: fit-content;
      max-width: 100%;
      line-height: 0;
      background: #0f0f0f;
    }
    img {
      max-width: 100%;
      max-height: calc(100vh - 150px);
      border: 1px solid #3a3a3a;
      user-select: none;
      -webkit-user-drag: none;
    }
    .mask {
      position: absolute;
      ${maskStyle(card.occlusion)}
      border: 2px solid #f4cf4d;
      background: rgba(244, 207, 77, 0.9);
    }
    body.revealed .mask {
      background: rgba(244, 207, 77, 0.12);
      border-style: dashed;
    }
    .hint { color: #a7a7a7; }
    .rating { color: #f4cf4d; }
  </style>
</head>
<body>
  <header>${escapeHtml(title)}</header>
  <main>
    <div class="wrap">
      <img src="/review-image" alt="${escapeHtml(card.prompt ?? 'Image occlusion')}">
      <div class="mask"></div>
    </div>
  </main>
  <footer>
    <span id="hint" class="hint">Press Space to reveal.</span>
    <span id="rating" class="rating" hidden>${escapeHtml(ratingText)}</span>
  </footer>
  <script>
    let revealed = false;
    async function rate(grade) {
      await fetch('/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ grade })
      });
      window.close();
      document.body.innerHTML = '<main style="padding:18px">Saved.</main>';
    }
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        fetch('/cancel', { method: 'POST' }).finally(() => window.close());
        return;
      }
      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        revealed = true;
        document.body.classList.add('revealed');
        document.getElementById('hint').textContent = 'Revealed.';
        document.getElementById('rating').hidden = false;
        return;
      }
      if (revealed && /^[1-4]$/.test(event.key)) {
        event.preventDefault();
        rate(Number.parseInt(event.key, 10));
      }
    });
    window.focus();
  </script>
</body>
</html>`;
}

export async function openImageWindow({ title = 'Images', images = [], launcher = editWindowInternals.openAppWindow, onOcclusions = async () => ({ created: 0 }) } = {}) {
  if (images.length === 0) throw new Error('No images attached.');
  return new Promise((resolve, reject) => {
    const server = createServer(async (request, response) => {
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

      if (request.method === 'POST' && request.url === '/occlusions') {
        try {
          const body = await readRequestBody(request);
          const parsed = body ? JSON.parse(body) : {};
          const result = await onOcclusions(Array.isArray(parsed.occlusions) ? parsed.occlusions : []);
          response.writeHead(200, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ ok: true, created: result.created ?? 0 }));
        } catch (error) {
          response.writeHead(500, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ ok: false, error: error.message }));
        }
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

export async function openImageOcclusionReviewWindow({ title = 'Image occlusion', card, mode = 'queue', launcher = editWindowInternals.openAppWindow } = {}) {
  if (!card?.imagePath) throw new Error('Image occlusion card has no image path.');
  return new Promise((resolve, reject) => {
    let settled = false;
    let windowHandle = null;
    const settle = async (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
      server.close();
      try {
        await windowHandle?.close?.();
      } catch {}
    };
    const server = createServer(async (request, response) => {
      try {
        if (request.method === 'GET' && request.url === '/') {
          response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
          response.end(reviewPage({ title, card, mode }));
          return;
        }

        if (request.method === 'GET' && request.url === '/review-image') {
          if (!existsSync(card.imagePath)) {
            response.writeHead(404);
            response.end('Not found');
            return;
          }
          response.writeHead(200, { 'content-type': 'image/png' });
          createReadStream(card.imagePath).pipe(response);
          return;
        }

        if (request.method === 'POST' && request.url === '/review') {
          const body = await readRequestBody(request);
          const parsed = body ? JSON.parse(body) : {};
          const grade = Number.parseInt(parsed.grade, 10);
          response.writeHead(200, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ ok: grade >= 1 && grade <= 4 }));
          await settle({ grade: grade >= 1 && grade <= 4 ? grade : null });
          return;
        }

        if (request.method === 'POST' && request.url === '/cancel') {
          response.writeHead(200, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ ok: true }));
          await settle({ grade: null });
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

export const imageWindowInternals = { imagePage, readRequestBody, reviewPage };
