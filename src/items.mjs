import { id, nowIso } from './time.mjs';

export function titleOf(item) {
  if (!item) return '';
  if (item.type === 'flashcard') {
    if (item.cardType === 'basic') return item.question;
    return item.maskedText;
  }
  return item.title;
}

export function typeLabel(item) {
  if (item.type !== 'flashcard') return item.type;
  return `flash:${item.cardType}`;
}

export function itemById(db, itemId) {
  return db.roots.find((root) => root.id === itemId) ?? db.items.find((item) => item.id === itemId);
}

export function listSort(a, b) {
  const createdA = Date.parse(a.createdAt);
  const createdB = Date.parse(b.createdAt);
  const orderA = Number.isFinite(a.sortOrder) ? a.sortOrder : Number.isFinite(createdA) ? createdA : 0;
  const orderB = Number.isFinite(b.sortOrder) ? b.sortOrder : Number.isFinite(createdB) ? createdB : 0;
  return orderA - orderB || a.createdAt.localeCompare(b.createdAt);
}

export function sortedRoots(db) {
  return [...db.roots].sort(listSort);
}

export function rootIdOf(item) {
  if (!item) return null;
  return item.type === 'root' ? item.id : item.rootId;
}

export function belongsToRoot(item, rootId) {
  return rootIdOf(item) === rootId;
}

export function ancestorsOf(db, itemId) {
  const path = [];
  let current = itemById(db, itemId);
  const rootId = rootIdOf(current);
  while (current) {
    if (!belongsToRoot(current, rootId)) break;
    path.push(current);
    if (current.type === 'root') break;
    current = itemById(db, current.parentId ?? current.rootId);
  }
  return path.reverse();
}

export function childrenOf(db, rootId, parentId) {
  return db.items
    .filter((item) => item.rootId === rootId && item.parentId === parentId && !item.excluded)
    .sort(listSort);
}

export function descendantsOf(db, rootId, parentId = rootId) {
  const direct = db.items.filter((item) => item.rootId === rootId && item.parentId === parentId && !item.excluded);
  return direct.flatMap((item) => [item, ...descendantsOf(db, rootId, item.id)]);
}

export function subtreeIdsOf(db, rootId, itemId) {
  const ids = new Set([itemId]);
  const visit = (parentId) => {
    const children = db.items.filter((item) => item.rootId === rootId && item.parentId === parentId);
    for (const child of children) {
      ids.add(child.id);
      visit(child.id);
    }
  };
  visit(itemId);
  return ids;
}

export function deleteSubtrees(db, rootId, itemIds) {
  const ids = new Set();
  for (const itemId of itemIds) {
    for (const id of subtreeIdsOf(db, rootId, itemId)) ids.add(id);
  }
  db.items = db.items.filter((item) => !ids.has(item.id));
  return ids;
}

export function flashcardsOfRoot(db, rootId, includeExcluded = false) {
  return db.items
    .filter((item) => item.rootId === rootId && item.type === 'flashcard' && (includeExcluded || !item.excluded))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function statsForRoot(db, rootId) {
  return db.items.reduce(
    (stats, item) => {
      if (item.rootId !== rootId || item.excluded) return stats;
      if (item.type === 'branch') stats.branches += 1;
      if (item.type === 'note') stats.notes += 1;
      if (item.type === 'flashcard') stats.flashcards += 1;
      return stats;
    },
    { branches: 0, notes: 0, flashcards: 0 }
  );
}

export function canCreate(context, type) {
  if (type === 'branch') return context.type === 'root' || context.type === 'branch';
  if (type === 'leaf') return context.type === 'branch' || context.type === 'leaf';
  if (type === 'note') return context.type === 'leaf' || context.type === 'note';
  if (type === 'flashcard') return context.type === 'note';
  return false;
}

export function parentForNewItem(context) {
  if (context.type === 'root') return { parentId: context.id, rootId: context.id };
  return { parentId: context.id, rootId: context.rootId };
}

export function makeRoots(titles) {
  return titles.map((title, index) => ({
    id: id('root'),
    type: 'root',
    title,
    createdAt: nowIso(index)
  }));
}

export function makeItems(context, type, titles) {
  const parent = parentForNewItem(context);
  return titles.map((title, index) => ({
    id: id(type),
    type,
    title,
    body: type === 'note' ? title : undefined,
    ...parent,
    createdAt: nowIso(index),
    excluded: false
  }));
}

export function makeBasicCard(context, question, answer, fsrsCard) {
  const card = {
    id: id('card'),
    type: 'flashcard',
    cardType: 'basic',
    question,
    answer,
    parentId: context.id,
    rootId: context.rootId,
    createdAt: nowIso(),
    excluded: false,
    fsrsCard
  };
  card.due = card.fsrsCard.due;
  return card;
}

export function makeClozeCard(context, clozeText, maskedText, fsrsCard) {
  const card = {
    id: id('card'),
    type: 'flashcard',
    cardType: 'cloze',
    clozeText,
    maskedText,
    parentId: context.id,
    rootId: context.rootId,
    createdAt: nowIso(),
    excluded: false,
    fsrsCard
  };
  card.due = card.fsrsCard.due;
  return card;
}

export function maskText(body, cloze) {
  if (!body.includes(cloze)) return body;
  return body.split(cloze).join('{{c1::...}}');
}
