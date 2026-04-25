import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEditedText, editableTextFor, editInternals, editTitleFor, resolveEditTarget } from '../src/edit.mjs';
import { editWindowInternals, openEditWindow } from '../src/editWindow.mjs';

function dbFixture() {
  return {
    roots: [
      { id: 'root-1', type: 'root', title: 'Root', createdAt: '2026-04-01T00:00:00.000Z' }
    ],
    items: [
      {
        id: 'branch-1',
        type: 'branch',
        title: 'Branch',
        rootId: 'root-1',
        parentId: 'root-1',
        createdAt: '2026-04-01T00:01:00.000Z'
      },
      {
        id: 'note-1',
        type: 'note',
        title: 'Old note',
        body: 'Old note',
        rootId: 'root-1',
        parentId: 'branch-1',
        createdAt: '2026-04-01T00:02:00.000Z'
      },
      {
        id: 'card-1',
        type: 'flashcard',
        cardType: 'basic',
        question: 'Q',
        answer: 'A',
        rootId: 'root-1',
        parentId: 'note-1',
        createdAt: '2026-04-01T00:03:00.000Z'
      },
      {
        id: 'card-2',
        type: 'flashcard',
        cardType: 'cloze',
        clozeText: 'Answer',
        maskedText: 'The value is {{c1::...}}.',
        rootId: 'root-1',
        parentId: 'note-1',
        createdAt: '2026-04-01T00:04:00.000Z'
      }
    ]
  };
}

test('edit target resolves current item and visible child index', () => {
  const db = dbFixture();

  assert.equal(resolveEditTarget(db, 'root-1', 'branch-1', 'edit').item.id, 'branch-1');
  assert.equal(resolveEditTarget(db, 'root-1', 'branch-1', 'edit 1').item.id, 'note-1');
  assert.equal(resolveEditTarget(db, 'root-1', 'branch-1', 'edit 2').ok, false);
});

test('edit application updates simple item titles and note body/title together', () => {
  const db = dbFixture();
  const branch = db.items[0];
  const note = db.items[1];

  assert.equal(editableTextFor(branch), 'Branch');
  assert.equal(applyEditedText(branch, 'New branch'), true);
  assert.equal(branch.title, 'New branch');

  assert.equal(editableTextFor(note), 'Old note');
  assert.equal(applyEditedText(note, 'New note body'), true);
  assert.equal(note.title, 'New note body');
  assert.equal(note.body, 'New note body');
});

test('basic flashcards edit with Q and A fields', () => {
  const db = dbFixture();
  const card = db.items[2];

  assert.equal(editableTextFor(card), 'Q: Q\nA: A');
  assert.equal(applyEditedText(card, 'Q: New question\nA: New answer'), true);
  assert.equal(card.question, 'New question');
  assert.equal(card.answer, 'New answer');
  assert.equal(applyEditedText(card, 'New question without labels'), false);
});

test('cloze flashcards edit with c1 markup', () => {
  const db = dbFixture();
  const card = db.items[3];

  assert.equal(editableTextFor(card), 'The value is {{c1::Answer}}.');
  assert.equal(applyEditedText(card, '{{c1::Term}} is a definition.'), true);
  assert.equal(card.clozeText, 'Term');
  assert.equal(card.maskedText, '{{c1::...}} is a definition.');
  assert.equal(editInternals.clozeMarkupFor(card), '{{c1::Term}} is a definition.');
  assert.equal(applyEditedText(card, 'No cloze marker here'), false);
});

test('edit window page contains a controlled save cancel editor', () => {
  const html = editWindowInternals.editPage({ title: 'Edit <Title>', text: 'hello <world>' });

  assert.match(html, /<textarea/);
  assert.match(html, /Save/);
  assert.match(html, /Cancel/);
  assert.match(html, /hello &lt;world&gt;/);
  assert.match(html, /fetch\('\/' \+ action/);
  assert.equal(editTitleFor(dbFixture().items[0]).startsWith('Edit [branch]'), true);
});

test('edit window helper resolves saved text without launching a real browser', async () => {
  let launchedUrl = null;
  const resultPromise = openEditWindow({
    title: 'Edit',
    text: 'old',
    async launcher(url) {
      launchedUrl = url;
      return { close: async () => {} };
    }
  });

  while (!launchedUrl) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  const response = await fetch(`${launchedUrl}save`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'new text' })
  });

  assert.equal(response.ok, true);
  assert.deepEqual(await resultPromise, { saved: true, text: 'new text' });
});

test('edit window helper resolves cancel without launching a real browser', async () => {
  let launchedUrl = null;
  const resultPromise = openEditWindow({
    title: 'Edit',
    text: 'old',
    async launcher(url) {
      launchedUrl = url;
      return { close: async () => {} };
    }
  });

  while (!launchedUrl) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  const response = await fetch(`${launchedUrl}cancel`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}'
  });

  assert.equal(response.ok, true);
  assert.deepEqual(await resultPromise, { saved: false, text: 'old' });
});

test('default edit launcher is app window based instead of system browser tab based', () => {
  assert.equal(editWindowInternals.openAppWindow.name, 'openAppWindow');
});

test('edit launcher can select an app browser executable', () => {
  const browserPath = editWindowInternals.appBrowserPath();
  assert.match(browserPath, /chrome|msedge|brave/i);
  assert.doesNotMatch(browserPath, /chromium-[0-9]|chrome-win|chrome-mac|chrome-linux/i);
});
