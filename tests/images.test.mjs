import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  applyImageOrder,
  attachClipboardImageToItem,
  canAttachImage,
  deleteImagesFromItem,
  deleteSelectedImagesFromItem,
  imagesOf
} from '../src/images.mjs';
import { imageWindowInternals, openImageOcclusionReviewWindow, openImageWindow } from '../src/imageWindow.mjs';

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

test('image window posts occlusion masks to the save callback', async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'int-image-occlusion-'));
  const imagePath = join(tempDir, 'one.png');
  writeFileSync(imagePath, Buffer.from('png'));

  let launchedUrl = null;
  let savedOcclusions = null;
  const result = await openImageWindow({
    title: 'Images',
    images: [{ id: 'image-1', path: imagePath }],
    async launcher(url) {
      launchedUrl = url;
      return { close: async () => {} };
    },
    async onOcclusions(occlusions) {
      savedOcclusions = occlusions;
      return { created: occlusions.length };
    }
  });

  assert.equal(result.opened, true);
  const response = await fetch(`${launchedUrl}occlusions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ occlusions: [{ imageIndex: 0, x: 0.1, y: 0.2, width: 0.3, height: 0.4 }] })
  });
  assert.deepEqual(await response.json(), { ok: true, created: 1 });
  assert.deepEqual(savedOcclusions, [{ imageIndex: 0, x: 0.1, y: 0.2, width: 0.3, height: 0.4 }]);
  rmSync(tempDir, { recursive: true, force: true });
});

test('image occlusion review window resolves a 1-4 grade', async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'int-image-review-'));
  const imagePath = join(tempDir, 'one.png');
  writeFileSync(imagePath, Buffer.from('png'));

  let launchedUrl = null;
  const review = openImageOcclusionReviewWindow({
    title: 'Review',
    card: {
      prompt: 'Image occlusion 1',
      imagePath,
      occlusion: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 }
    },
    async launcher(url) {
      launchedUrl = url;
      return { close: async () => {} };
    }
  });

  while (!launchedUrl) await new Promise((resolve) => setTimeout(resolve, 5));
  const response = await fetch(`${launchedUrl}review`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ grade: 4 })
  });

  assert.deepEqual(await response.json(), { ok: true });
  assert.deepEqual(await review, { grade: 4 });
  rmSync(tempDir, { recursive: true, force: true });
});

test('image occlusion view mode has no reveal or rating controls', () => {
  const html = imageWindowInternals.reviewPage({
    title: 'View',
    mode: 'view',
    card: {
      prompt: 'Image occlusion 1',
      imagePath: 'one.png',
      occlusion: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 }
    }
  });

  assert.doesNotMatch(html, /Press Space to reveal/);
  assert.doesNotMatch(html, /1 Again|1 Fail/);
  assert.match(html, /background: #f4cf4d/);
});

test('image occlusion drill window only accepts 1-2 and cancel resolves', async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'int-image-drill-'));
  const imagePath = join(tempDir, 'one.png');
  writeFileSync(imagePath, Buffer.from('png'));

  let launchedUrl = null;
  const review = openImageOcclusionReviewWindow({
    title: 'Drill',
    mode: 'drill',
    card: {
      prompt: 'Image occlusion 1',
      imagePath,
      occlusion: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 }
    },
    async launcher(url) {
      launchedUrl = url;
      return { close: async () => {} };
    }
  });

  while (!launchedUrl) await new Promise((resolve) => setTimeout(resolve, 5));
  const invalid = await fetch(`${launchedUrl}review`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ grade: 4 })
  });
  assert.deepEqual(await invalid.json(), { ok: false });
  const valid = await fetch(`${launchedUrl}review`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ grade: 2 })
  });
  assert.deepEqual(await valid.json(), { ok: true });
  assert.deepEqual(await review, { grade: 2 });

  let cancelUrl = null;
  const canceled = openImageOcclusionReviewWindow({
    title: 'Drill',
    mode: 'drill',
    card: {
      prompt: 'Image occlusion 1',
      imagePath,
      occlusion: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 }
    },
    async launcher(url) {
      cancelUrl = url;
      return { close: async () => {} };
    }
  });
  while (!cancelUrl) await new Promise((resolve) => setTimeout(resolve, 5));
  const canceledResponse = await fetch(`${cancelUrl}cancel`, { method: 'POST' });
  assert.deepEqual(await canceledResponse.json(), { ok: true });
  assert.deepEqual(await canceled, { grade: null });

  rmSync(tempDir, { recursive: true, force: true });
});

test('image deletion removes selected attached files from an item', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'int-delete-image-'));
  const firstPath = join(tempDir, 'one.png');
  const secondPath = join(tempDir, 'two.png');
  writeFileSync(firstPath, Buffer.from('one'));
  writeFileSync(secondPath, Buffer.from('two'));
  const item = {
    images: [
      { id: 'image-1', path: firstPath },
      { id: 'image-2', path: secondPath }
    ]
  };

  const result = deleteImagesFromItem(item, [1]);

  assert.equal(result.deleted.length, 1);
  assert.equal(existsSync(firstPath), false);
  assert.equal(existsSync(secondPath), true);
  assert.deepEqual(item.images, [{ id: 'image-2', path: secondPath }]);
  assert.equal(imagesOf(item).length, 1);
  rmSync(tempDir, { recursive: true, force: true });
});

test('selected image deletion accepts field-selected image objects', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'int-delete-selected-image-'));
  const firstPath = join(tempDir, 'one.png');
  const secondPath = join(tempDir, 'two.png');
  writeFileSync(firstPath, Buffer.from('one'));
  writeFileSync(secondPath, Buffer.from('two'));
  const item = {
    images: [
      { id: 'image-1', path: firstPath, sortOrder: 0 },
      { id: 'image-2', path: secondPath, sortOrder: 1 }
    ]
  };

  const result = deleteSelectedImagesFromItem(item, [{ id: 'image-1', path: firstPath }]);

  assert.deepEqual(result.deleted.map((image) => image.id), ['image-1']);
  assert.equal(existsSync(firstPath), false);
  assert.equal(existsSync(secondPath), true);
  assert.deepEqual(imagesOf(item).map((image) => image.id), ['image-2']);
  rmSync(tempDir, { recursive: true, force: true });
});

test('image ordering is stored and read by sort order', () => {
  const item = {
    images: [
      { id: 'image-1', path: 'one.png', createdAt: '2026-04-01T00:00:00.000Z' },
      { id: 'image-2', path: 'two.png', createdAt: '2026-04-01T00:00:01.000Z' }
    ]
  };

  applyImageOrder(item, [item.images[1], item.images[0]]);

  assert.deepEqual(imagesOf(item).map((image) => image.id), ['image-2', 'image-1']);
  assert.deepEqual(item.images.map((image) => image.sortOrder), [0, 1]);
});
