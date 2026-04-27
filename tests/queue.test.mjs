import test from 'node:test';
import assert from 'node:assert/strict';
import { cursorFor, rootQueueFor, setCursor } from '../src/queue.mjs';
import { queueProgressLines } from '../src/ui.mjs';

const ROOT_QUEUE_CONTEXT = '__root_queue__';

function dbFixture() {
  return {
    app: {
      dayBoundary: '0000',
      sessions: {},
      drill: {}
    },
    roots: [
      { id: 'root-1', type: 'root', title: 'Root', createdAt: '2026-04-01T00:00:00.000Z' }
    ],
    items: [
      { id: 'branch-1', type: 'branch', title: 'One', rootId: 'root-1', parentId: 'root-1', createdAt: '2026-04-01T00:01:00.000Z', excluded: false },
      { id: 'branch-2', type: 'branch', title: 'Two', rootId: 'root-1', parentId: 'root-1', createdAt: '2026-04-01T00:02:00.000Z', excluded: false },
      { id: 'branch-3', type: 'branch', title: 'Three', rootId: 'root-1', parentId: 'root-1', createdAt: '2026-04-01T00:03:00.000Z', excluded: false }
    ]
  };
}

function remainingLine(db) {
  const queue = rootQueueFor(db, 'root-1');
  const cursor = cursorFor(db, 'root-1', ROOT_QUEUE_CONTEXT, queue.length);
  return queueProgressLines(cursor + 1, queue.length)[0];
}

test('root queue remaining count decreases on next and done', () => {
  const db = dbFixture();

  assert.equal(remainingLine(db), 'Remaining: 3');

  const initialQueue = rootQueueFor(db, 'root-1');
  setCursor(db, 'root-1', ROOT_QUEUE_CONTEXT, 1, initialQueue.length);
  assert.equal(remainingLine(db), 'Remaining: 2');

  const queueBeforeDone = rootQueueFor(db, 'root-1');
  const cursorBeforeDone = cursorFor(db, 'root-1', ROOT_QUEUE_CONTEXT, queueBeforeDone.length);
  queueBeforeDone[cursorBeforeDone].excluded = true;
  const queueAfterDone = rootQueueFor(db, 'root-1');
  setCursor(db, 'root-1', ROOT_QUEUE_CONTEXT, cursorBeforeDone, queueAfterDone.length);

  assert.deepEqual(queueAfterDone.map((item) => item.id), ['branch-1', 'branch-3']);
  assert.equal(remainingLine(db), 'Remaining: 1');
});
