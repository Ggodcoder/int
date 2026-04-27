import test from 'node:test';
import assert from 'node:assert/strict';
import { contextLines, introLines, queueProgressLines, rootsLines, startViewLines } from '../src/ui.mjs';
import { blockFrame, createFrame, resultFrame } from '../src/tui/renderer.mjs';
import { createScreenSession } from '../src/tui/session.mjs';

function dbFixture() {
  return {
    app: {
      dayBoundary: '0000',
      sessions: {},
      drill: {}
    },
    roots: [
      {
        id: 'root-1',
        type: 'root',
        title: 'Root',
        createdAt: '2026-04-01T00:00:00.000Z'
      }
    ],
    items: [
      {
        id: 'branch-1',
        type: 'branch',
        title: 'Branch',
        rootId: 'root-1',
        parentId: 'root-1',
        createdAt: '2026-04-01T00:01:00.000Z',
        excluded: false,
        images: [{ id: 'image-1', path: 'one.png', createdAt: '2026-04-01T00:01:30.000Z' }]
      },
      {
        id: 'note-1',
        type: 'note',
        title: 'Done note',
        body: 'Done note',
        rootId: 'root-1',
        parentId: 'branch-1',
        createdAt: '2026-04-01T00:02:00.000Z',
        excluded: true
      },
      {
        id: 'card-1',
        type: 'flashcard',
        cardType: 'basic',
        question: 'Question',
        answer: 'Answer',
        rootId: 'root-1',
        parentId: 'note-1',
        createdAt: '2026-04-01T00:03:00.000Z',
        excluded: false,
        fsrsCard: { due: '2026-04-01T00:00:00.000Z' }
      },
      {
        id: 'card-2',
        type: 'flashcard',
        cardType: 'image-occlusion',
        prompt: 'Image occlusion 1',
        imageId: 'image-1',
        imagePath: 'one.png',
        occlusion: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
        rootId: 'root-1',
        parentId: 'branch-1',
        createdAt: '2026-04-01T00:04:00.000Z',
        excluded: false,
        fsrsCard: { due: '2026-04-01T00:00:00.000Z' }
      }
    ]
  };
}

test('root and context renderers return line frames without printing', () => {
  const db = dbFixture();

  assert.deepEqual(rootsLines(db), ['Roots', '  1. Root (1)']);
  assert.equal(startViewLines({ ...db, roots: [] }, { columns: 40 }).at(-2), 'Create your first root with "new root".');

  const root = contextLines(db, 'root-1').join('\n');
  assert.match(root, /\[root\]/);
  assert.match(root, /Branches 1 \(0\/1\) \| Notes 1 \(1\/1\) \| Flashcards 2/);
  assert.match(root, /\[branch\] Branch \(2\)/);
});

test('intro keeps the activity heatmap by stacking on narrow terminals', () => {
  const db = dbFixture();
  const narrow = introLines(db, { columns: 40 });
  const wide = introLines(db, { columns: 120 });

  assert.ok(narrow.some((line) => line.includes('Avg:')));
  assert.ok(wide.some((line) => line.includes('Avg:')));
  assert.ok(narrow.length > wide.length);
});

test('context renderer keeps done rows in list with muted done marker', () => {
  const db = dbFixture();
  const branch = contextLines(db, 'branch-1').join('\n');

  assert.match(branch, /Images\n  1\. one\.png/);
  assert.match(branch, /Notes\n.*\[note\] Done note \(1\) <done>/s);
  assert.match(branch, /Flashcards\n.*\[flash:image-occlusion\] Image occlusion 1 \/ .*revealed/s);
  assert.match(branch, /\[note\] Done note \(1\) <done>/);
  assert.match(branch, /\x1b\[90m/);
});

test('queue progress shows remaining items from the current cursor', () => {
  assert.deepEqual(queueProgressLines(1, 5), ['Remaining: 5']);
  assert.deepEqual(queueProgressLines(2, 5), ['Remaining: 4']);
  assert.deepEqual(queueProgressLines(5, 5), ['Remaining: 1']);
});

test('frame renderer preserves lines and metadata', () => {
  const frame = createFrame(['one', 'two'], { kind: 'test' });
  const block = blockFrame(['body'], { kind: 'block' });
  const result = resultFrame('a\nb');

  assert.deepEqual(frame.lines, ['one', 'two']);
  assert.equal(frame.meta.kind, 'test');
  assert.deepEqual(block.lines, ['', 'body', '']);
  assert.equal(result.meta.kind, 'result');
});

test('screen session renders and remembers the active frame', () => {
  let output = '';
  const stream = {
    write(value) {
      output += value;
    }
  };
  const session = createScreenSession(stream);
  const frame = createFrame(['active'], { kind: 'screen' });

  session.render(frame);

  assert.equal(output, 'active\n');
  assert.equal(session.current(), frame);
});

test('screen session convenience renderers update the active frame', () => {
  let output = '';
  const stream = {
    write(value) {
      output += value;
    }
  };
  const session = createScreenSession(stream);

  session.renderLines(['help'], { kind: 'help' });
  assert.equal(session.current().meta.kind, 'help');
  assert.equal(output, 'help\n');

  session.renderBlock(['body'], { kind: 'block' });
  assert.deepEqual(session.current().lines, ['', 'body', '']);

  session.renderResult('done');
  assert.equal(session.current().meta.kind, 'result');
});
