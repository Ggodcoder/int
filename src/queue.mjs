import { belongsToRoot, childrenOf, itemById } from './items.mjs';
import { compareLocalDate, dayBoundaryFor, todayKey } from './time.mjs';

const LEARNING_STATES = new Set([1, 3, 'Learning', 'Relearning']);

function dueDateFor(item) {
  return new Date(item.fsrsCard?.due ?? item.due ?? item.createdAt);
}

function lastReviewLog(item) {
  return item.reviewLog?.at?.(-1) ?? item.reviewLog?.[item.reviewLog.length - 1] ?? null;
}

function isShortTermLearningCard(item) {
  if (LEARNING_STATES.has(item.fsrsCard?.state)) return true;
  return lastReviewLog(item)?.scheduled_days === 0;
}

export function isDueFlashcard(item, boundary) {
  if (item.type !== 'flashcard') return false;

  const now = new Date();
  const due = dueDateFor(item);
  if (due <= now) return true;

  const dateOrder = compareLocalDate(due, now, boundary);
  if (dateOrder < 0) return true;
  if (dateOrder > 0) return false;

  return !isShortTermLearningCard(item);
}

function queueSort(boundary) {
  return (a, b) => {
    const aDue = isDueFlashcard(a, boundary);
    const bDue = isDueFlashcard(b, boundary);
    if (aDue !== bDue) return aDue ? -1 : 1;
    if (aDue && bDue) {
      const dueA = dueDateFor(a).getTime();
      const dueB = dueDateFor(b).getTime();
      return dueA - dueB || a.createdAt.localeCompare(b.createdAt);
    }
    return a.createdAt.localeCompare(b.createdAt);
  };
}

export function dueFlashcardsInRoot(db, rootId) {
  const boundary = dayBoundaryFor(db);
  return db.items
    .filter((item) => item.rootId === rootId && !item.excluded)
    .filter((item) => isDueFlashcard(item, boundary))
    .sort(queueSort(boundary));
}

export function rootQueueFor(db, rootId) {
  const boundary = dayBoundaryFor(db);
  const dueIds = new Set(dueFlashcardsInRoot(db, rootId).map((item) => item.id));
  const regular = db.items
    .filter((item) => item.rootId === rootId && !item.excluded && item.type !== 'flashcard')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const due = db.items.filter((item) => dueIds.has(item.id));
  return [...due.sort(queueSort(boundary)), ...regular];
}

export function queueForContext(db, rootId, contextId) {
  const context = itemById(db, contextId);
  if (!context || !belongsToRoot(context, rootId)) return [];
  return childrenOf(db, rootId, contextId);
}

export function sessionFor(db, rootId) {
  const key = todayKey(dayBoundaryFor(db));
  const current = db.app.sessions[rootId];
  if (!current || current.date !== key) {
    db.app.sessions[rootId] = { date: key, cursorByContext: {} };
  }
  return db.app.sessions[rootId];
}

export function cursorFor(db, rootId, contextId, queueLength) {
  const session = sessionFor(db, rootId);
  const cursor = session.cursorByContext[contextId] ?? 0;
  const clamped = Math.max(0, Math.min(cursor, Math.max(0, queueLength - 1)));
  session.cursorByContext[contextId] = clamped;
  return clamped;
}

export function setCursor(db, rootId, contextId, value, queueLength) {
  const session = sessionFor(db, rootId);
  if (queueLength <= 0) {
    session.cursorByContext[contextId] = 0;
    return;
  }
  session.cursorByContext[contextId] = ((value % queueLength) + queueLength) % queueLength;
}

export function selectedQueueItem(db, rootId, contextId) {
  const queue = queueForContext(db, rootId, contextId);
  if (queue.length === 0) return null;
  return queue[cursorFor(db, rootId, contextId, queue.length)];
}
