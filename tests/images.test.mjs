import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { attachClipboardImageToItem, canAttachImage, imagesOf } from '../src/images.mjs';
import { imageWindowInternals, openImageWindow } from '../src/imageWindow.mjs';

function dbFixture() {
  return {
    app: {},
    roots: [],
    items: [
      { id: 'branch-1', type: 'branch', title: 'Branch', rootId: 'root-1', parentId: 'root-1', createdAt: '2026-04-01T00:00:00.000Z' },
      { id: 'leaf-1', type: 'leaf', title: 'Leaf', rootId: 'root-1', parentId: 'branch-1', createdAt: '2026-04-01T00:00:30.000Z' },
      { id: 'card-1', type: 'flashcard', cardType: 'basic', question: 'Q', answer: 'A', rootId: 'root-1', parentId: 'branch-1', createdAt: '2026-04-01T00:01:00.000Z' }
    ]
  };
}

test('clipboard images attach to knowledge items and skip duplicates', async () => {
  const db = dbFixture();
  const branch = db.items[0];

  assert.equal(canAttachImage(branch), true);
  assert.equal(canAttachImage(db.items[2]), false);

  const first = await attachClipboardImageToItem(db, branch, {
    async capture(path) {
      writeFileSync(path, Buffer.from('fake-png'));
      return true;
    }
  });

  assert.equal(first.attached, true);
  assert.equal(imagesOf(branch).length, 1);

  const duplicate = await attachClipboardImageToItem(db, branch, {
    async capture(path) {
      writeFileSync(path, Buffer.from('fake-png'));
      return true;
    }
  });

  assert.equal(duplicate.attached, false);
  assert.equal(imagesOf(branch).length, 1);

  const leaf = db.items[1];
  const sameImageOtherItem = await attachClipboardImageToItem(db, leaf, {
    async capture(path) {
      writeFileSync(path, Buffer.from('fake-png'));
      return true;
    }
  });

  assert.equal(sameImageOtherItem.attached, true);
  assert.equal(imagesOf(leaf).length, 1);

  for (const image of [...imagesOf(branch), ...imagesOf(leaf)]) rmSync(image.path, { force: true });
});

test('image window can render and launch attached images', async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'int-image-window-'));
  const imagePath = join(tempDir, 'one.png');
  writeFileSync(imagePath, Buffer.from('png'));

  const html = imageWindowInternals.imagePage({
    title: 'Images',
    images: [{ path: imagePath }]
  });
  assert.match(html, /<img src="\/image\/0"/);

  let launchedUrl = null;
  const result = await openImageWindow({
    title: 'Images',
    images: [{ path: imagePath }],
    async launcher(url) {
      launchedUrl = url;
      return { close: async () => {} };
    }
  });

  assert.equal(result.opened, true);
  assert.match(launchedUrl, /^http:\/\/127\.0\.0\.1:/);
  rmSync(tempDir, { recursive: true, force: true });
});
