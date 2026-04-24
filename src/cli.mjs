#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { loadDb, saveDb, DB_FILE } from './db.mjs';
import { askCommand, askStudyGrade, askTypeEntries, askValue } from './input.mjs';
import {
  canCreate,
  deleteSubtrees,
  itemById,
  makeBasicCard,
  makeClozeCard,
  makeItems,
  makeRoots,
  maskText,
  sortedRoots,
  titleOf,
  typeLabel
} from './items.mjs';
import { makeFsrsCard, applyReview, applyReviewGrade } from './review.mjs';
import { cursorFor, queueForContext, rootQueueFor, selectedQueueItem, setCursor } from './queue.mjs';
import { printContext, printFlashcard, printHelp, printRoots, printStartView, printStudyFlashcard } from './ui.mjs';
import { formatDayBoundary, normalizeDayBoundary, nowIso } from './time.mjs';
import { runDrill } from './drill.mjs';
import { recordActivity } from './activity.mjs';

const rl = createInterface({ input, output });
const ROOT_QUEUE_CONTEXT = '__root_queue__';

function pluralType(type) {
  if (type === 'branch') return 'branches';
  if (type === 'leaf') return 'leaves';
  return `${type}s`;
}

async function newRoot(db) {
  const titles = await askTypeEntries(rl);
  if (titles.length === 0) {
    console.log('Canceled.');
    return null;
  }
  const roots = makeRoots(titles);
  db.roots.push(...roots);
  db.app.activeRootId = roots[0].id;
  saveDb(db);
  console.log(roots.length === 1 ? `Created root: ${roots[0].title}` : `Created ${roots.length} roots.`);
  return roots[0].id;
}

async function setRoot(db) {
  printRoots(db);
  if (db.roots.length === 0) return null;
  const choice = await askValue(rl, 'type>');
  if (!choice) return null;
  const roots = sortedRoots(db);
  const byNumber = Number.parseInt(choice, 10);
  const root = Number.isInteger(byNumber) && roots[byNumber - 1]
    ? roots[byNumber - 1]
    : db.roots.find((candidate) => candidate.title.toLowerCase() === choice.toLowerCase());
  if (!root) {
    console.log('Root not found.');
    return null;
  }
  db.app.activeRootId = root.id;
  saveDb(db);
  return root.id;
}

async function createItem(db, contextId, type) {
  const context = itemById(db, contextId);
  if (!canCreate(context, type)) {
    console.log(`Cannot create ${type} here.`);
    return contextId;
  }
  const titles = await askTypeEntries(rl);
  if (titles.length === 0) return contextId;
  const items = makeItems(context, type, titles);
  db.items.push(...items);
  saveDb(db);
  console.log(items.length === 1 ? `Created ${type}: ${items[0].title}` : `Created ${items.length} ${pluralType(type)}.`);
  return contextId;
}

async function createBasic(db, contextId) {
  const context = itemById(db, contextId);
  if (!canCreate(context, 'flashcard')) return console.log('Basic cards can be created inside a note.');
  const question = await askValue(rl, 'Q?');
  if (!question) return;
  const answer = await askValue(rl, 'A?');
  if (!answer) return;
  db.items.push(makeBasicCard(context, question, answer, makeFsrsCard()));
  saveDb(db);
  console.log('Created basic flash card.');
}

async function createCloze(db, contextId) {
  const context = itemById(db, contextId);
  if (!canCreate(context, 'flashcard')) return console.log('Cloze cards can be created inside a note.');
  const clozeText = await askValue(rl, 'clozing?');
  if (!clozeText) return;
  const noteBody = context.body ?? context.title;
  const maskedText = maskText(noteBody, clozeText);
  if (maskedText === noteBody) console.log('Text was not found; saving the original note body as the prompt.');
  db.items.push(makeClozeCard(context, clozeText, maskedText, makeFsrsCard()));
  saveDb(db);
  console.log('Created cloze flash card.');
}

async function setLearningTime(db) {
  const value = await askValue(rl, 'type>');
  const boundary = normalizeDayBoundary(value);
  if (!boundary) {
    console.log('Invalid time. Use 0000-2359.');
    return;
  }
  db.app.dayBoundary = boundary;
  saveDb(db);
  console.log(`Learning day starts at ${formatDayBoundary(boundary)}.`);
}

function findInQueue(db, rootId, contextId, token) {
  const queue = queueForContext(db, rootId, contextId);
  const asNumber = Number.parseInt(token, 10);
  if (Number.isInteger(asNumber) && queue[asNumber - 1]) return queue[asNumber - 1];
  return queue.find((item) => titleOf(item).toLowerCase() === token.toLowerCase());
}

function parseDeleteSpec(spec, queueLength) {
  const indices = new Set();
  const invalid = [];
  const parts = spec.split('//').map((part) => part.trim()).filter(Boolean);

  for (const part of parts) {
    const range = part.match(/^(\d+)\s*:\s*(\d+)$/);
    if (range) {
      const start = Number.parseInt(range[1], 10);
      const end = Number.parseInt(range[2], 10);
      const low = Math.min(start, end);
      const high = Math.max(start, end);
      for (let index = low; index <= high; index += 1) {
        if (index >= 1 && index <= queueLength) indices.add(index);
        else invalid.push(String(index));
      }
      continue;
    }

    const index = Number.parseInt(part, 10);
    if (Number.isInteger(index) && String(index) === part && index >= 1 && index <= queueLength) {
      indices.add(index);
    } else {
      invalid.push(part);
    }
  }

  return { indices: [...indices].sort((a, b) => a - b), invalid };
}

function removeDeletedIdsFromDrill(db, rootId, deletedIds) {
  const state = db.app.drill[rootId];
  if (!state?.active) return;
  state.cardIds = state.cardIds.filter((id) => !deletedIds.has(id));
  state.failedIds = state.failedIds.filter((id) => !deletedIds.has(id));
  state.index = Math.min(state.index, Math.max(0, state.cardIds.length - 1));
  state.updatedAt = nowIso();
}

function removeDeletedIdsFromSessions(db, deletedIds) {
  for (const session of Object.values(db.app.sessions)) {
    for (const id of deletedIds) delete session.cursorByContext[id];
  }
}

function deleteFromQueue(db, rootId, contextId, spec) {
  const queue = queueForContext(db, rootId, contextId);
  if (queue.length === 0) return console.log('Queue is empty.');

  const { indices, invalid } = parseDeleteSpec(spec, queue.length);
  if (indices.length === 0) {
    console.log(invalid.length > 0 ? `Nothing deleted. Invalid index: ${invalid.join(', ')}` : 'Nothing deleted.');
    return;
  }

  const selectedIds = indices.map((index) => queue[index - 1].id);
  const deletedIds = deleteSubtrees(db, rootId, selectedIds);
  removeDeletedIdsFromDrill(db, rootId, deletedIds);
  removeDeletedIdsFromSessions(db, deletedIds);
  setCursor(db, rootId, contextId, 0, queueForContext(db, rootId, contextId).length);
  saveDb(db);

  const selectedText = indices.length === 1 ? '1 selected item' : `${indices.length} selected items`;
  const totalText = deletedIds.size === indices.length ? '' : ` (${deletedIds.size} total with children)`;
  console.log(`Deleted ${selectedText}${totalText}.`);
  if (invalid.length > 0) console.log(`Skipped invalid index: ${invalid.join(', ')}`);
}

function deleteFromRootList(db, spec) {
  if (db.roots.length === 0) return console.log('Root list is empty.');

  const roots = sortedRoots(db);
  const { indices, invalid } = parseDeleteSpec(spec, roots.length);
  if (indices.length === 0) {
    console.log(invalid.length > 0 ? `Nothing deleted. Invalid index: ${invalid.join(', ')}` : 'Nothing deleted.');
    return;
  }

  const rootIds = new Set(indices.map((index) => roots[index - 1].id));
  const childCount = db.items.filter((item) => rootIds.has(item.rootId)).length;
  db.roots = db.roots.filter((root) => !rootIds.has(root.id));
  db.items = db.items.filter((item) => !rootIds.has(item.rootId));

  for (const rootId of rootIds) {
    delete db.app.sessions[rootId];
    delete db.app.drill[rootId];
  }
  if (rootIds.has(db.app.activeRootId)) db.app.activeRootId = null;

  saveDb(db);

  const selectedText = indices.length === 1 ? '1 selected root' : `${indices.length} selected roots`;
  const totalText = childCount > 0 ? ` (${childCount + indices.length} total with children)` : '';
  console.log(`Deleted ${selectedText}${totalText}.`);
  if (invalid.length > 0) console.log(`Skipped invalid index: ${invalid.join(', ')}`);
}

function parseSortSpec(command) {
  const match = command.match(/^sort\s+(\d+)\s+(.+)$/i);
  if (!match) return null;
  return { source: Number.parseInt(match[1], 10), destination: match[2].trim().toLowerCase() };
}

function applyListOrder(list) {
  list.forEach((item, index) => {
    item.sortOrder = index;
  });
}

function moveListItem(list, sourceIndex, destination) {
  if (list.length === 0) return { ok: false, message: 'List is empty.' };
  if (!Number.isInteger(sourceIndex) || sourceIndex < 1 || sourceIndex > list.length) {
    return { ok: false, message: 'Invalid source index.' };
  }

  const moving = list[sourceIndex - 1];
  const remaining = list.filter((item) => item.id !== moving.id);

  if (destination === 'top') {
    applyListOrder([moving, ...remaining]);
    return { ok: true };
  }

  if (destination === 'bottom') {
    applyListOrder([...remaining, moving]);
    return { ok: true };
  }

  const between = destination.match(/^(\d+)\s*:\s*(\d+)$/);
  if (!between) return { ok: false, message: 'Invalid sort target. Use top, bottom, or x:y.' };

  const leftIndex = Number.parseInt(between[1], 10);
  const rightIndex = Number.parseInt(between[2], 10);
  if (
    leftIndex < 1 ||
    leftIndex > list.length ||
    rightIndex < 1 ||
    rightIndex > list.length ||
    leftIndex === sourceIndex ||
    rightIndex === sourceIndex
  ) {
    return { ok: false, message: 'Invalid sort target.' };
  }

  const left = list[leftIndex - 1];
  const right = list[rightIndex - 1];
  const leftRemainingIndex = remaining.findIndex((item) => item.id === left.id);
  const rightRemainingIndex = remaining.findIndex((item) => item.id === right.id);
  if (leftRemainingIndex < 0 || rightRemainingIndex < 0) {
    return { ok: false, message: 'Invalid sort target.' };
  }

  const insertAt = Math.max(leftRemainingIndex, rightRemainingIndex);
  remaining.splice(insertAt, 0, moving);
  applyListOrder(remaining);
  return { ok: true };
}

function sortRootList(db, command) {
  const spec = parseSortSpec(command);
  if (!spec) return false;
  const roots = sortedRoots(db);
  const result = moveListItem(roots, spec.source, spec.destination);
  if (!result.ok) {
    console.log(result.message);
    return true;
  }
  saveDb(db);
  console.log('Sorted.');
  return true;
}

function sortContextList(db, rootId, contextId, command) {
  const spec = parseSortSpec(command);
  if (!spec) return false;
  const list = queueForContext(db, rootId, contextId);
  const result = moveListItem(list, spec.source, spec.destination);
  if (!result.ok) {
    console.log(result.message);
    return true;
  }
  setCursor(db, rootId, contextId, 0, list.length);
  saveDb(db);
  console.log('Sorted.');
  return true;
}

function moveQueue(db, rootId, contextId, delta) {
  const queue = queueForContext(db, rootId, contextId);
  if (queue.length === 0) return console.log('Queue is empty.');
  const current = cursorFor(db, rootId, contextId, queue.length);
  setCursor(db, rootId, contextId, current + delta, queue.length);
  saveDb(db);
  const item = selectedQueueItem(db, rootId, contextId);
  console.log(`[${typeLabel(item)}] ${titleOf(item)}`);
  if (item.type === 'flashcard') printFlashcard(item);
}

function excludeSelected(db, rootId, contextId) {
  const item = selectedQueueItem(db, rootId, contextId);
  if (!item) return console.log('Queue is empty.');
  item.excluded = true;
  item.excludedAt = nowIso();
  setCursor(db, rootId, contextId, 0, queueForContext(db, rootId, contextId).length);
  saveDb(db);
  console.log(`Excluded forever: [${typeLabel(item)}] ${titleOf(item)}`);
}

function reviewSelected(db, rootId, contextId, passed) {
  const item = selectedQueueItem(db, rootId, contextId);
  if (!item || item.type !== 'flashcard') return console.log('Selected queue item is not a flash card.');
  applyReview(item, passed);
  recordActivity(db);
  saveDb(db);
  console.log(passed ? 'Reviewed: pass' : 'Reviewed: fail');
}

function reviewCurrent(db, contextId, passed) {
  const item = itemById(db, contextId);
  if (!item || item.type !== 'flashcard') return console.log('Current queue item is not a flash card.');
  applyReview(item, passed);
  recordActivity(db);
  saveDb(db);
  console.log(passed ? 'Reviewed: pass' : 'Reviewed: fail');
}

async function studyFlashcard(db, item, { applySchedule = false } = {}) {
  printStudyFlashcard(item, { revealed: false });
  const grade = await askStudyGrade(rl, () => printStudyFlashcard(item, { revealed: true }));
  if (!grade) return null;
  if (applySchedule) {
    applyReviewGrade(item, grade);
    recordActivity(db);
    console.log(`Reviewed: ${grade}`);
  }
  return grade;
}

function enterRootQueue(db, rootId, contextId) {
  const queue = rootQueueFor(db, rootId);
  if (queue.length === 0) {
    console.log('Root queue is empty.');
    return { contextId, entered: false };
  }
  const currentIndex = queue.findIndex((item) => item.id === contextId);
  const index = currentIndex >= 0 ? currentIndex : cursorFor(db, rootId, ROOT_QUEUE_CONTEXT, queue.length);
  setCursor(db, rootId, ROOT_QUEUE_CONTEXT, index, queue.length);
  saveDb(db);
  return { contextId: queue[index].id, entered: true };
}

async function showRootQueueItem(db, rootId, contextId) {
  const item = itemById(db, contextId);
  if (!item) return contextId;
  if (item.type !== 'flashcard') {
    printContext(db, contextId);
    return contextId;
  }

  const queue = rootQueueFor(db, rootId);
  const currentIndex = Math.max(0, queue.findIndex((candidate) => candidate.id === contextId));
  const grade = await studyFlashcard(db, item, { applySchedule: true });
  if (!grade) return contextId;
  saveDb(db);

  const nextDb = loadDb();
  const nextQueue = rootQueueFor(nextDb, rootId);
  setCursor(nextDb, rootId, ROOT_QUEUE_CONTEXT, currentIndex, nextQueue.length);
  saveDb(nextDb);
  const nextItem = nextQueue[cursorFor(nextDb, rootId, ROOT_QUEUE_CONTEXT, nextQueue.length)];
  if (!nextItem) {
    console.log('Root queue is empty.');
    return rootId;
  }
  console.log('');
  printContext(nextDb, nextItem.id);
  return nextItem.id;
}

function moveRootQueue(db, rootId, delta) {
  const queue = rootQueueFor(db, rootId);
  if (queue.length === 0) {
    console.log('Root queue is empty.');
    return null;
  }
  const current = cursorFor(db, rootId, ROOT_QUEUE_CONTEXT, queue.length);
  setCursor(db, rootId, ROOT_QUEUE_CONTEXT, current + delta, queue.length);
  saveDb(db);
  return rootQueueFor(db, rootId)[cursorFor(db, rootId, ROOT_QUEUE_CONTEXT, queue.length)]?.id ?? null;
}

function excludeCurrentQueueItem(db, rootId, contextId) {
  const item = itemById(db, contextId);
  if (!item || item.type === 'root') return console.log('Current queue item cannot be excluded.');
  const previousQueue = rootQueueFor(db, rootId);
  const previousIndex = Math.max(0, previousQueue.findIndex((candidate) => candidate.id === contextId));
  item.excluded = true;
  item.excludedAt = nowIso();
  const nextQueue = rootQueueFor(db, rootId);
  setCursor(db, rootId, ROOT_QUEUE_CONTEXT, previousIndex, nextQueue.length);
  saveDb(db);
  console.log(`Excluded forever: [${typeLabel(item)}] ${titleOf(item)}`);
  return nextQueue[cursorFor(db, rootId, ROOT_QUEUE_CONTEXT, nextQueue.length)]?.id ?? null;
}

function parentIdFor(db, contextId) {
  const context = itemById(db, contextId);
  if (!context || context.type === 'root') return contextId;
  return context.parentId ?? context.rootId;
}

async function run() {
  let db = loadDb();
  let contextId = null;
  let needsPromptGap = false;
  let inRootQueue = false;

  if (process.argv.includes('--smoke')) {
    console.log(`db=${DB_FILE}`);
    console.log(`roots=${db.roots.length}`);
    await rl.close();
    return;
  }

  printStartView(db);
  if (db.roots.length > 0) {
    needsPromptGap = true;
  }

  while (true) {
    db = loadDb();
    if (needsPromptGap) console.log('');
    const command = (await askCommand(rl)).trim();
    needsPromptGap = true;
    const normalized = command.toLowerCase();
    if (!normalized) continue;
    console.log('');
    if (normalized === 'quit' || normalized === 'exit' || normalized === 'q') break;

    if (normalized === 'help') {
      printHelp();
      continue;
    }

    if (normalized === 'clear') {
      console.clear();
      db = loadDb();
      contextId = null;
      inRootQueue = false;
      printStartView(db);
      needsPromptGap = db.roots.length > 0;
      continue;
    }

    if (normalized === 'set time') {
      await setLearningTime(db);
      continue;
    }

    if (normalized === 'new root') {
      const rootId = await newRoot(db);
      if (rootId) contextId = rootId;
      inRootQueue = false;
      printContext(loadDb(), contextId);
      continue;
    }

    if (normalized === 'set root') {
      const rootId = await setRoot(db);
      if (rootId) {
        contextId = rootId;
        inRootQueue = false;
        printContext(db, contextId);
      }
      continue;
    }

    if (!contextId) {
      if (normalized.startsWith('sort ')) {
        if (sortRootList(db, command)) {
          console.log('');
          printRoots(loadDb());
          continue;
        }
      }

      if (normalized.startsWith('del ')) {
        deleteFromRootList(db, command.slice(4).trim());
        console.log('');
        printRoots(loadDb());
        continue;
      }

      const byNumber = Number.parseInt(command, 10);
      const roots = sortedRoots(db);
      const root = Number.isInteger(byNumber) && roots[byNumber - 1]
        ? roots[byNumber - 1]
        : db.roots.find((candidate) => candidate.title.toLowerCase() === command.toLowerCase());
      if (root) {
        db.app.activeRootId = root.id;
        saveDb(db);
        contextId = root.id;
        inRootQueue = false;
        printContext(db, contextId);
        continue;
      }
    }

    if (!contextId) {
      console.log('Use "new root" or "set root" first.');
      continue;
    }

    const context = itemById(db, contextId);
    const rootId = context.type === 'root' ? context.id : context.rootId;

    if (normalized === 'where') {
      printContext(db, contextId);
      continue;
    }
    if (normalized === 'home' || normalized === 'root') {
      contextId = rootId;
      inRootQueue = false;
      printContext(db, contextId);
      continue;
    }
    if (normalized === 'que') {
      const result = enterRootQueue(db, rootId, contextId);
      contextId = result.contextId;
      inRootQueue = result.entered;
      if (result.entered) contextId = await showRootQueueItem(loadDb(), rootId, contextId);
      continue;
    }
    if (normalized === 'back') {
      contextId = parentIdFor(db, contextId);
      inRootQueue = false;
      printContext(db, contextId);
      continue;
    }
    if (normalized === 'new branch' || normalized === 'b' || normalized === 'ㅠ') {
      contextId = await createItem(db, contextId, 'branch');
      printContext(loadDb(), contextId);
      continue;
    }
    if (normalized === 'new leaf' || normalized === 'l' || normalized === 'ㅣ') {
      contextId = await createItem(db, contextId, 'leaf');
      printContext(loadDb(), contextId);
      continue;
    }
    if (normalized === 'new note' || normalized === 'n' || normalized === 'ㅜ') {
      contextId = await createItem(db, contextId, 'note');
      printContext(loadDb(), contextId);
      continue;
    }
    if (normalized === 'basic') {
      await createBasic(db, contextId);
      printContext(loadDb(), contextId);
      continue;
    }
    if (normalized === 'cloze') {
      await createCloze(db, contextId);
      printContext(loadDb(), contextId);
      continue;
    }
    if (normalized === ']' || normalized === 'next') {
      if (inRootQueue) {
        const nextId = moveRootQueue(db, rootId, 1);
        if (nextId) {
          contextId = nextId;
          contextId = await showRootQueueItem(loadDb(), rootId, contextId);
        }
      } else {
        moveQueue(db, rootId, contextId, 1);
      }
      continue;
    }
    if (normalized === '[' || normalized === 'prev' || normalized === 'previous') {
      if (inRootQueue) {
        const previousId = moveRootQueue(db, rootId, -1);
        if (previousId) {
          contextId = previousId;
          contextId = await showRootQueueItem(loadDb(), rootId, contextId);
        }
      } else {
        moveQueue(db, rootId, contextId, -1);
      }
      continue;
    }
    if (normalized === 'd') {
      if (inRootQueue) {
        const nextId = excludeCurrentQueueItem(db, rootId, contextId);
        if (nextId) {
          contextId = nextId;
          console.log('');
          printContext(loadDb(), contextId);
        }
      } else {
        excludeSelected(db, rootId, contextId);
      }
      continue;
    }
    if (normalized.startsWith('del ')) {
      deleteFromQueue(db, rootId, contextId, command.slice(4).trim());
      console.log('');
      printContext(loadDb(), contextId);
      continue;
    }
    if (normalized.startsWith('sort ')) {
      if (sortContextList(db, rootId, contextId, command)) {
        console.log('');
        printContext(loadDb(), contextId);
        continue;
      }
    }
    if (normalized === 'pass' || normalized === 'fail') {
      if (inRootQueue) reviewCurrent(db, contextId, normalized === 'pass');
      else reviewSelected(db, rootId, contextId, normalized === 'pass');
      continue;
    }
    if (normalized === 'drill') {
      await runDrill(rl, db, rootId);
      continue;
    }

    const selected = findInQueue(db, rootId, contextId, command);
    if (selected) {
      contextId = selected.id;
      inRootQueue = false;
      printContext(db, contextId);
      continue;
    }

    console.log('Unknown command. Type help.');
  }

  await rl.close();
}

run().catch(async (error) => {
  console.error(error?.stack ?? error);
  await rl.close();
  process.exitCode = 1;
});
