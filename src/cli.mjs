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
  makePdfImport,
  makeRoots,
  makeWebImport,
  maskText,
  pdfDisplayName,
  sortedRoots,
  titleOf,
  typeLabel,
  webDisplayName
} from './items.mjs';
import { makeFsrsCard, applyReview, applyReviewGrade } from './review.mjs';
import { cursorFor, listForContext, queueForContext, rootQueueFor, selectedQueueItem, sessionFor, setCursor } from './queue.mjs';
import {
  contextLines,
  flashcardLines,
  helpLines,
  queueProgressLines,
  rootsLines,
  studyFlashcardLines,
  startViewLines
} from './ui.mjs';
import { formatDayBoundary, normalizeDayBoundary, nowIso } from './time.mjs';
import { runDrill } from './drill.mjs';
import { recordActivity } from './activity.mjs';
import { normalizeWebUrl, renderWebPageToPdf } from './webImport.mjs';
import { openWithDefaultApp, targetForOpenableItem } from './openTarget.mjs';
import { selectPdfFile } from './fileDialog.mjs';
import { copyPdfIntoLibrary } from './pdfImport.mjs';
import { createFrame } from './tui/renderer.mjs';
import { screenSession } from './tui/session.mjs';
import { applyEditedText, editableTextFor, editTitleFor, resolveEditTarget } from './edit.mjs';
import { openEditWindow } from './editWindow.mjs';

const rl = input.isTTY
  ? {
      input,
      output,
      pause: () => input.pause(),
      resume: () => input.resume(),
      close: async () => {}
    }
  : createInterface({ input, output });
const ROOT_QUEUE_CONTEXT = '__root_queue__';

function printResult(message) {
  screenSession.renderResult(message);
}

function printContextWithGap(db, contextId) {
  screenSession.renderBlock(contextLines(db, contextId), { kind: 'context', contextId });
}

function queueItemFrameLines(db, contextId, current, total, messages = []) {
  const prefix = messageLines(messages);
  const body = [...queueProgressLines(current, total), '', ...contextLines(db, contextId)];
  return prefix.length > 0 ? [...prefix, '', ...body] : body;
}

function studyFrameLines(item, { revealed = false, mode = 'queue', progress = null } = {}) {
  const lines = studyFlashcardLines(item, { revealed, mode });
  return progress ? [...queueProgressLines(progress.current, progress.total), '', ...lines] : lines;
}

function messageLines(messages) {
  return messages.flatMap((message) => String(message).split('\n'));
}

function printCommandContext(db, contextId, messages = []) {
  const prefix = messageLines(messages);
  const lines = prefix.length > 0 ? [...prefix, '', ...contextLines(db, contextId)] : contextLines(db, contextId);
  screenSession.renderBlock(lines, { kind: 'command-context', contextId, messages: prefix });
}

function printCommandRoots(db, messages = []) {
  const prefix = messageLines(messages);
  const lines = prefix.length > 0 ? [...prefix, '', ...rootsLines(db)] : rootsLines(db);
  screenSession.renderBlock(lines, { kind: 'command-roots', messages: prefix });
}

function helpPageSize(output = process.stdout) {
  const rows = output.rows ?? 24;
  return Math.max(8, rows - 3);
}

function helpPageLines(lines, pageIndex, pageSize) {
  const totalPages = Math.max(1, Math.ceil(lines.length / pageSize));
  const start = pageIndex * pageSize;
  const page = lines.slice(start, start + pageSize);
  return {
    totalPages,
    lines: [
      ...page,
      '',
      `Help ${pageIndex + 1}/${totalPages} - Enter: next | q: close`
    ]
  };
}

async function showPagedHelp(rl) {
  const lines = helpLines();
  const pageSize = helpPageSize(process.stdout);
  const previousFrame = screenSession.current();
  let pageIndex = 0;

  while (true) {
    const page = helpPageLines(lines, pageIndex, pageSize);
    screenSession.clear();
    screenSession.renderLines(page.lines, { kind: 'help', transient: true, page: pageIndex + 1, totalPages: page.totalPages });
    const action = await askCommand(rl, 'help> ');
    const normalized = String(action ?? '').trim().toLowerCase();
    if (normalized === 'q' || normalized === 'quit' || normalized === 'exit') break;
    if (normalized === 'p' || normalized === 'prev' || normalized === '[') {
      pageIndex = Math.max(0, pageIndex - 1);
      continue;
    }
    if (pageIndex >= page.totalPages - 1) break;
    pageIndex += 1;
  }

  screenSession.clear();
  if (previousFrame) screenSession.render(previousFrame);
}

function pluralType(type) {
  if (type === 'branch') return 'branches';
  if (type === 'leaf') return 'leaves';
  return `${type}s`;
}

async function newRoot(db) {
  const titles = await askTypeEntries(rl);
  if (titles.length === 0) {
    printResult('Canceled.');
    return null;
  }
  const roots = makeRoots(titles);
  db.roots.push(...roots);
  db.app.activeRootId = roots[0].id;
  saveDb(db);
  return {
    contextId: roots[0].id,
    messages: [roots.length === 1 ? `Created root: ${roots[0].title}` : `Created ${roots.length} roots.`]
  };
}

async function setRoot(db) {
  screenSession.render(createFrame(rootsLines(db), { kind: 'roots' }));
  if (db.roots.length === 0) return null;
  const choice = await askValue(rl, 'type>');
  if (!choice) return null;
  const roots = sortedRoots(db);
  const byNumber = Number.parseInt(choice, 10);
  const root = Number.isInteger(byNumber) && roots[byNumber - 1]
    ? roots[byNumber - 1]
    : db.roots.find((candidate) => candidate.title.toLowerCase() === choice.toLowerCase());
  if (!root) {
    printResult('Root not found.');
    return null;
  }
  db.app.activeRootId = root.id;
  saveDb(db);
  return root.id;
}

async function createItem(db, contextId, type) {
  const context = itemById(db, contextId);
  if (!canCreate(context, type)) {
    printResult(`Cannot create ${type} here.`);
    return { contextId, messages: [] };
  }
  const items = [];
  while (true) {
    const titles = await askTypeEntries(rl);
    if (titles.length === 0) break;
    const batch = makeItems(context, type, titles);
    db.items.push(...batch);
    items.push(...batch);
    saveDb(db);
  }
  if (items.length === 0) return { contextId, messages: [] };
  return {
    contextId,
    messages: [items.length === 1 ? `Created ${type}: ${items[0].title}` : `Created ${items.length} ${pluralType(type)}.`]
  };
}

async function createBasic(db, contextId) {
  const context = itemById(db, contextId);
  if (!canCreate(context, 'flashcard')) {
    printResult('Basic cards can be created inside a note.');
    return [];
  }
  const question = await askValue(rl, 'Q?');
  if (!question) return [];
  const answer = await askValue(rl, 'A?');
  if (!answer) return [];
  db.items.push(makeBasicCard(context, question, answer, makeFsrsCard()));
  saveDb(db);
  return ['Created basic flash card.'];
}

async function createCloze(db, contextId) {
  const context = itemById(db, contextId);
  if (!canCreate(context, 'flashcard')) {
    printResult('Cloze cards can be created inside a note.');
    return [];
  }
  const clozeText = await askValue(rl, 'clozing?');
  if (!clozeText) return [];
  const noteBody = context.body ?? context.title;
  const maskedText = maskText(noteBody, clozeText);
  const messages = [];
  if (maskedText === noteBody) messages.push('Text was not found; saving the original note body as the prompt.');
  db.items.push(makeClozeCard(context, clozeText, maskedText, makeFsrsCard()));
  saveDb(db);
  messages.push('Created cloze flash card.');
  return messages;
}

async function importWeb(db, contextId) {
  const context = itemById(db, contextId);
  if (context?.type !== 'branch') {
    printResult('Web imports can be attached inside a branch.');
    return { contextId, messages: [] };
  }

  const rawUrl = await askValue(rl, 'type>');
  if (!rawUrl) return { contextId, messages: [] };

  let url;
  try {
    url = normalizeWebUrl(rawUrl);
  } catch (error) {
    printResult(error.message);
    return { contextId, messages: [] };
  }

  printResult('Importing web page as PDF...');
  try {
    const result = await renderWebPageToPdf({ url, filePrefix: rawUrl });
    const item = makeWebImport(context, {
      title: result.title,
      sourceUrl: url,
      pdfPath: result.pdfPath,
      pdfFileName: result.pdfFileName,
      pageSize: result.pageSize
    });
    db.items.push(item);
    saveDb(db);
    const name = webDisplayName(item);
    return { contextId, messages: [`Imported web: ${name}`, `PDF: ${name}`] };
  } catch (error) {
    const item = makeWebImport(context, {
      title: url,
      sourceUrl: url,
      pdfPath: null,
      pdfFileName: null,
      pageSize: null
    });
    item.captureError = error.message;
    db.items.push(item);
    saveDb(db);
    return { contextId, messages: [`Saved web link only: ${webDisplayName(item)}`, `PDF: not captured (${error.message})`] };
  }
}

async function saveLink(db, contextId) {
  const context = itemById(db, contextId);
  if (context?.type !== 'branch') {
    printResult('Links can be saved inside a branch.');
    return { contextId, messages: [] };
  }

  const rawUrl = await askValue(rl, 'type>');
  if (!rawUrl) return { contextId, messages: [] };

  let url;
  try {
    url = normalizeWebUrl(rawUrl);
  } catch (error) {
    printResult(error.message);
    return { contextId, messages: [] };
  }

  const item = makeWebImport(context, {
    title: url,
    sourceUrl: url,
    pdfPath: null,
    pdfFileName: null,
    pageSize: null
  });
  db.items.push(item);
  saveDb(db);
  return { contextId, messages: [`Saved link: ${webDisplayName(item)}`] };
}

async function importPdf(db, contextId) {
  const context = itemById(db, contextId);
  if (context?.type !== 'branch') {
    printResult('PDF imports can be attached inside a branch.');
    return { contextId, messages: [] };
  }

  let selectedPath;
  try {
    selectedPath = selectPdfFile();
  } catch (error) {
    printResult(`PDF selection failed: ${error.message}`);
    return { contextId, messages: [] };
  }

  if (!selectedPath) {
    return { contextId, messages: ['Canceled.'] };
  }

  try {
    const result = copyPdfIntoLibrary(selectedPath);
    const item = makePdfImport(context, result);
    db.items.push(item);
    saveDb(db);
    return { contextId, messages: [`Imported PDF: ${pdfDisplayName(item)}`] };
  } catch (error) {
    return { contextId, messages: [`PDF import failed: ${error.message}`] };
  }
}

function openCurrent(db, contextId) {
  const item = itemById(db, contextId);
  const target = targetForOpenableItem(item);
  if (!target) {
    printResult('Nothing openable here.');
    return;
  }
  openWithDefaultApp(target.target);
  const name = item.type === 'pdf' ? pdfDisplayName(item) : webDisplayName(item);
  printResult(`Opened ${target.kind}: ${name}`);
}

async function setLearningTime(db) {
  const value = await askValue(rl, 'type>');
  const boundary = normalizeDayBoundary(value);
  if (!boundary) {
    printResult('Invalid time. Use 0000-2359.');
    return;
  }
  db.app.dayBoundary = boundary;
  saveDb(db);
  printResult(`Learning day starts at ${formatDayBoundary(boundary)}.`);
}

function findInQueue(db, rootId, contextId, token) {
  const queue = listForContext(db, rootId, contextId);
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
  const queue = listForContext(db, rootId, contextId);
  if (queue.length === 0) return { ok: false, messages: ['Queue is empty.'] };

  const { indices, invalid } = parseDeleteSpec(spec, queue.length);
  if (indices.length === 0) {
    return { ok: false, messages: [invalid.length > 0 ? `Nothing deleted. Invalid index: ${invalid.join(', ')}` : 'Nothing deleted.'] };
  }

  const selectedIds = indices.map((index) => queue[index - 1].id);
  const deletedIds = deleteSubtrees(db, rootId, selectedIds);
  removeDeletedIdsFromDrill(db, rootId, deletedIds);
  removeDeletedIdsFromSessions(db, deletedIds);
  setCursor(db, rootId, contextId, 0, queueForContext(db, rootId, contextId).length);
  saveDb(db);

  const selectedText = indices.length === 1 ? '1 selected item' : `${indices.length} selected items`;
  const totalText = deletedIds.size === indices.length ? '' : ` (${deletedIds.size} total with children)`;
  const messages = [`Deleted ${selectedText}${totalText}.`];
  if (invalid.length > 0) messages.push(`Skipped invalid index: ${invalid.join(', ')}`);
  return { ok: true, messages };
}

function deleteFromRootList(db, spec) {
  if (db.roots.length === 0) return { ok: false, messages: ['Root list is empty.'] };

  const roots = sortedRoots(db);
  const { indices, invalid } = parseDeleteSpec(spec, roots.length);
  if (indices.length === 0) {
    return { ok: false, messages: [invalid.length > 0 ? `Nothing deleted. Invalid index: ${invalid.join(', ')}` : 'Nothing deleted.'] };
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
  const messages = [`Deleted ${selectedText}${totalText}.`];
  if (invalid.length > 0) messages.push(`Skipped invalid index: ${invalid.join(', ')}`);
  return { ok: true, messages };
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
    return { handled: true, ok: false, messages: [result.message] };
  }
  saveDb(db);
  return { handled: true, ok: true, messages: ['Sorted.'] };
}

function sortContextList(db, rootId, contextId, command) {
  const spec = parseSortSpec(command);
  if (!spec) return false;
  const list = listForContext(db, rootId, contextId);
  const result = moveListItem(list, spec.source, spec.destination);
  if (!result.ok) {
    return { handled: true, ok: false, messages: [result.message] };
  }
  setCursor(db, rootId, contextId, 0, list.length);
  saveDb(db);
  return { handled: true, ok: true, messages: ['Sorted.'] };
}

function moveQueue(db, rootId, contextId, delta) {
  const queue = queueForContext(db, rootId, contextId);
  if (queue.length === 0) return printResult('Queue is empty.');
  const current = cursorFor(db, rootId, contextId, queue.length);
  setCursor(db, rootId, contextId, current + delta, queue.length);
  saveDb(db);
  const item = selectedQueueItem(db, rootId, contextId);
  const lines = [`[${typeLabel(item)}] ${titleOf(item)}`];
  if (item.type === 'flashcard') lines.push(...flashcardLines(item));
  screenSession.renderBlock(lines, { kind: 'queue-item', itemId: item.id });
}

function excludeCurrentContextItem(db, contextId) {
  const item = itemById(db, contextId);
  if (!item || item.type === 'root') return { messages: ['Current item cannot be marked done.'] };
  if (item.type === 'flashcard') return { messages: ['Flash cards cannot be marked done. Review them instead.'] };
  item.excluded = true;
  item.excludedAt = nowIso();
  saveDb(db);
  return { messages: [`Done: [${typeLabel(item)}] ${titleOf(item)}`] };
}

function resetCurrentContextItem(db, contextId) {
  const item = itemById(db, contextId);
  if (!item || item.type === 'root') return { messages: ['Current item cannot be reset.'] };
  if (item.type === 'flashcard') return { messages: ['Flash cards are not done items. Review them instead.'] };
  if (!item.excluded) return { messages: ['Current item is not done.'] };
  item.excluded = false;
  delete item.excludedAt;
  saveDb(db);
  return { messages: [`Reset: [${typeLabel(item)}] ${titleOf(item)}`] };
}

async function editItem(db, rootId, contextId, command) {
  const target = resolveEditTarget(db, rootId, contextId, command);
  if (!target.ok) return { contextId, messages: [target.message] };
  const text = editableTextFor(target.item);
  if (text === null) return { contextId, messages: ['This item cannot be edited here.'] };
  const result = await openEditWindow({ title: editTitleFor(target.item), text });
  if (!result.saved) return { contextId, messages: ['Canceled.'] };
  if (!applyEditedText(target.item, result.text)) {
    return { contextId, messages: [`Edit failed: invalid ${typeLabel(target.item)} format.`] };
  }
  saveDb(db);
  return { contextId, messages: [`Edited: [${typeLabel(target.item)}] ${titleOf(target.item)}`] };
}

function reviewSelected(db, rootId, contextId, passed) {
  const item = selectedQueueItem(db, rootId, contextId);
  if (!item || item.type !== 'flashcard') return printResult('Selected queue item is not a flash card.');
  applyReview(item, passed);
  recordActivity(db);
  saveDb(db);
  printResult(passed ? 'Reviewed: pass' : 'Reviewed: fail');
}

function reviewCurrent(db, contextId, passed) {
  const item = itemById(db, contextId);
  if (!item || item.type !== 'flashcard') return printResult('Current queue item is not a flash card.');
  applyReview(item, passed);
  recordActivity(db);
  saveDb(db);
  printResult(passed ? 'Reviewed: pass' : 'Reviewed: fail');
}

async function studyFlashcard(db, item, { applySchedule = false, progress = null } = {}) {
  screenSession.renderLines(studyFrameLines(item, { revealed: false, progress }), {
    kind: 'study-flashcard',
    itemId: item.id,
    revealed: false,
    mode: 'queue',
    progress
  });
  const grade = await askStudyGrade(rl, () => screenSession.renderLines(studyFrameLines(item, { revealed: true, progress }), {
    kind: 'study-flashcard',
    itemId: item.id,
    revealed: true,
    mode: 'queue',
    progress
  }));
  if (!grade) return { grade: null, messages: [] };
  const messages = [];
  if (applySchedule) {
    applyReviewGrade(item, grade);
    recordActivity(db);
    messages.push(`Reviewed: ${grade}`);
  }
  return { grade, messages };
}

function enterRootQueue(db, rootId, contextId, { resume = false } = {}) {
  const queue = rootQueueFor(db, rootId);
  if (queue.length === 0) {
    printResult('Root queue is empty.');
    return { contextId, entered: false };
  }
  const session = sessionFor(db, rootId);
  const shouldResume = resume || session.rootQueueStarted === true;
  const index = shouldResume ? cursorFor(db, rootId, ROOT_QUEUE_CONTEXT, queue.length) : 0;
  session.rootQueueStarted = true;
  setCursor(db, rootId, ROOT_QUEUE_CONTEXT, index, queue.length);
  saveDb(db);
  return { contextId: queue[index].id, entered: true };
}

async function showRootQueueItem(db, rootId, contextId, messages = []) {
  const item = itemById(db, contextId);
  if (!item) return contextId;
  const queue = rootQueueFor(db, rootId);
  const currentIndex = Math.max(0, queue.findIndex((candidate) => candidate.id === contextId));
  if (item.type !== 'flashcard') {
    screenSession.renderBlock(queueItemFrameLines(db, contextId, currentIndex + 1, queue.length, messages), {
      kind: 'queue-item',
      contextId,
      current: currentIndex + 1,
      total: queue.length,
      messages
    });
    return contextId;
  }

  const review = await studyFlashcard(db, item, {
    applySchedule: true,
    progress: { current: currentIndex + 1, total: queue.length }
  });
  if (!review.grade) return contextId;
  saveDb(db);

  const nextDb = loadDb();
  const nextQueue = rootQueueFor(nextDb, rootId);
  setCursor(nextDb, rootId, ROOT_QUEUE_CONTEXT, currentIndex, nextQueue.length);
  saveDb(nextDb);
  const nextItem = nextQueue[cursorFor(nextDb, rootId, ROOT_QUEUE_CONTEXT, nextQueue.length)];
  if (!nextItem) {
    printResult('Root queue is empty.');
    return rootId;
  }
  return showRootQueueItem(nextDb, rootId, nextItem.id, review.messages);
}

function moveRootQueue(db, rootId, delta) {
  const queue = rootQueueFor(db, rootId);
  if (queue.length === 0) {
    printResult('Root queue is empty.');
    return null;
  }
  const current = cursorFor(db, rootId, ROOT_QUEUE_CONTEXT, queue.length);
  setCursor(db, rootId, ROOT_QUEUE_CONTEXT, current + delta, queue.length);
  saveDb(db);
  return rootQueueFor(db, rootId)[cursorFor(db, rootId, ROOT_QUEUE_CONTEXT, queue.length)]?.id ?? null;
}

function excludeCurrentQueueItem(db, rootId, contextId) {
  const item = itemById(db, contextId);
  if (!item || item.type === 'root') return { nextId: null, messages: ['Current queue item cannot be marked done.'] };
  if (item.type === 'flashcard') return { nextId: null, messages: ['Flash cards cannot be marked done. Review them instead.'] };
  const previousQueue = rootQueueFor(db, rootId);
  const previousIndex = Math.max(0, previousQueue.findIndex((candidate) => candidate.id === contextId));
  item.excluded = true;
  item.excludedAt = nowIso();
  const nextQueue = rootQueueFor(db, rootId);
  setCursor(db, rootId, ROOT_QUEUE_CONTEXT, previousIndex, nextQueue.length);
  saveDb(db);
  const messages = [`Done: [${typeLabel(item)}] ${titleOf(item)}`];
  if (nextQueue.length === 0) messages.push('Root queue is empty.');
  return {
    nextId: nextQueue[cursorFor(db, rootId, ROOT_QUEUE_CONTEXT, nextQueue.length)]?.id ?? null,
    messages
  };
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
  let restoreFrameOnBlank = null;

  if (process.argv.includes('--smoke')) {
    console.log(`db=${DB_FILE}`);
    console.log(`roots=${db.roots.length}`);
    await rl.close();
    return;
  }

  screenSession.render(createFrame(startViewLines(db), { kind: 'start' }));
  if (db.roots.length > 0) {
    needsPromptGap = false;
  }

  while (true) {
    db = loadDb();
    if (needsPromptGap) console.log('');
    const rawCommand = await askCommand(rl);
    if (rawCommand === null) {
      printResult('Canceled.');
      needsPromptGap = false;
      continue;
    }
    const command = rawCommand.trim();
    needsPromptGap = true;
    const normalized = command.toLowerCase();
    if (!normalized) {
      if (restoreFrameOnBlank) {
        screenSession.clear();
        screenSession.render(restoreFrameOnBlank);
        restoreFrameOnBlank = null;
        needsPromptGap = false;
      }
      continue;
    }
    restoreFrameOnBlank = null;
    console.log('');
    if (normalized === 'quit' || normalized === 'exit' || normalized === 'q') break;

    if (normalized === 'help') {
      await showPagedHelp(rl);
      needsPromptGap = false;
      continue;
    }

    if (normalized === 'clear') {
      screenSession.clear();
      db = loadDb();
      contextId = null;
      inRootQueue = false;
      screenSession.render(createFrame(startViewLines(db), { kind: 'start' }));
      needsPromptGap = false;
      continue;
    }

    if (normalized === 'set time') {
      await setLearningTime(db);
      continue;
    }

    if (normalized === 'new root') {
      const result = await newRoot(db);
      if (result?.contextId) contextId = result.contextId;
      inRootQueue = false;
      if (contextId) printCommandContext(loadDb(), contextId, result?.messages ?? []);
      continue;
    }

    if (normalized === 'set root') {
      const rootId = await setRoot(db);
      if (rootId) {
        contextId = rootId;
        inRootQueue = false;
        printContextWithGap(db, contextId);
      }
      continue;
    }

    if (!contextId) {
      if (normalized.startsWith('sort ')) {
        const result = sortRootList(db, command);
        if (result?.handled) {
          printCommandRoots(loadDb(), result.messages);
          continue;
        }
      }

      if (normalized.startsWith('del ')) {
        const result = deleteFromRootList(db, command.slice(4).trim());
        printCommandRoots(loadDb(), result.messages);
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
        printContextWithGap(db, contextId);
        continue;
      }
    }

    if (!contextId) {
      printResult('Use "new root" or "set root" first.');
      continue;
    }

    const context = itemById(db, contextId);
    const rootId = context.type === 'root' ? context.id : context.rootId;

    if (normalized === 'where') {
      printContextWithGap(db, contextId);
      continue;
    }
    if (normalized === 'open') {
      openCurrent(db, contextId);
      continue;
    }
    if (normalized === 'home' || normalized === 'root') {
      contextId = rootId;
      inRootQueue = false;
      printContextWithGap(db, contextId);
      continue;
    }
    if (normalized === 'que') {
      const result = enterRootQueue(db, rootId, contextId, { resume: inRootQueue });
      contextId = result.contextId;
      inRootQueue = result.entered;
      if (result.entered) contextId = await showRootQueueItem(loadDb(), rootId, contextId);
      continue;
    }
    if (normalized === 'back') {
      contextId = parentIdFor(db, contextId);
      inRootQueue = false;
      printContextWithGap(db, contextId);
      continue;
    }
    if (normalized === 'new branch' || normalized === 'b' || normalized === 'ㅠ') {
      const result = await createItem(db, contextId, 'branch');
      contextId = result.contextId;
      printCommandContext(loadDb(), contextId, result.messages);
      continue;
    }
    if (normalized === 'new leaf' || normalized === 'l' || normalized === 'ㅣ') {
      const result = await createItem(db, contextId, 'leaf');
      contextId = result.contextId;
      printCommandContext(loadDb(), contextId, result.messages);
      continue;
    }
    if (normalized === 'new note' || normalized === 'n' || normalized === 'ㅜ') {
      const result = await createItem(db, contextId, 'note');
      contextId = result.contextId;
      printCommandContext(loadDb(), contextId, result.messages);
      continue;
    }
    if (normalized === 'import web') {
      const result = await importWeb(db, contextId);
      contextId = result.contextId;
      printCommandContext(loadDb(), contextId, result.messages);
      continue;
    }
    if (normalized === 'save link') {
      const result = await saveLink(db, contextId);
      contextId = result.contextId;
      printCommandContext(loadDb(), contextId, result.messages);
      continue;
    }
    if (normalized === 'import pdf') {
      const result = await importPdf(db, contextId);
      contextId = result.contextId;
      printCommandContext(loadDb(), contextId, result.messages);
      continue;
    }
    if (normalized === 'basic') {
      const messages = await createBasic(db, contextId);
      printCommandContext(loadDb(), contextId, messages);
      continue;
    }
    if (normalized === 'cloze') {
      const messages = await createCloze(db, contextId);
      printCommandContext(loadDb(), contextId, messages);
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
        const result = excludeCurrentQueueItem(db, rootId, contextId);
        if (result.nextId) {
          contextId = result.nextId;
          contextId = await showRootQueueItem(loadDb(), rootId, contextId, result.messages);
        } else {
          printResult(result.messages.join('\n'));
        }
      } else {
        const result = excludeCurrentContextItem(db, contextId);
        printCommandContext(loadDb(), contextId, result.messages);
      }
      continue;
    }
    if (normalized === 'reset') {
      const result = resetCurrentContextItem(db, contextId);
      printCommandContext(loadDb(), contextId, result.messages);
      continue;
    }
    if (normalized === 'edit' || /^edit\s+\d+$/i.test(command)) {
      const result = await editItem(db, rootId, contextId, command);
      printCommandContext(loadDb(), result.contextId, result.messages);
      continue;
    }
    if (normalized.startsWith('del ')) {
      const result = deleteFromQueue(db, rootId, contextId, command.slice(4).trim());
      printCommandContext(loadDb(), contextId, result.messages);
      continue;
    }
    if (normalized.startsWith('sort ')) {
      const result = sortContextList(db, rootId, contextId, command);
      if (result?.handled) {
        printCommandContext(loadDb(), contextId, result.messages);
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
      printContextWithGap(db, contextId);
      continue;
    }

    restoreFrameOnBlank = screenSession.current();
    printResult('Unknown command. Type help.', { transient: true });
  }

  await rl.close();
}

run().catch(async (error) => {
  console.error(error?.stack ?? error);
  await rl.close();
  process.exitCode = 1;
});
