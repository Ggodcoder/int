import { listForContext } from './queue.mjs';
import { itemById, titleOf, typeLabel } from './items.mjs';

export function editableTextFor(item) {
  if (!item) return null;
  if (item.type === 'flashcard') {
    if (item.cardType === 'basic') return `Q: ${item.question ?? ''}\nA: ${item.answer ?? ''}`;
    if (item.cardType === 'cloze') return clozeMarkupFor(item);
    return null;
  }
  if (item.type === 'note') return item.body ?? item.title ?? '';
  return titleOf(item);
}

export function applyEditedText(item, text) {
  if (!item) return false;
  const value = String(text);
  if (item.type === 'flashcard') {
    if (item.cardType === 'basic') return applyBasicEdit(item, value);
    if (item.cardType === 'cloze') return applyClozeEdit(item, value);
    return false;
  }
  if (item.type === 'note') {
    item.title = value;
    item.body = value;
    return true;
  }
  item.title = value;
  return true;
}

export function editTitleFor(item) {
  return item ? `Edit [${typeLabel(item)}] ${titleOf(item)}` : 'Edit';
}

export function resolveEditTarget(db, rootId, contextId, command) {
  const match = command.match(/^edit(?:\s+(\d+))?$/i);
  if (!match) return { ok: false, message: 'Invalid edit command. Use edit or edit n.' };
  const index = match[1] ? Number.parseInt(match[1], 10) : null;
  if (index === null) {
    const item = itemById(db, contextId);
    return item ? { ok: true, item } : { ok: false, message: 'No active item to edit.' };
  }
  const list = listForContext(db, rootId, contextId);
  const item = list[index - 1];
  return item ? { ok: true, item } : { ok: false, message: 'Invalid edit index.' };
}

function clozeMarkupFor(item) {
  if (item.maskedText?.includes('{{c1::...}}')) {
    return item.maskedText.replaceAll('{{c1::...}}', `{{c1::${item.clozeText ?? ''}}}`);
  }
  return `{{c1::${item.clozeText ?? ''}}}`;
}

function applyBasicEdit(item, value) {
  const lines = value.replace(/\r\n/g, '\n').split('\n');
  const qIndex = lines.findIndex((line) => /^Q\s*:/i.test(line));
  const aIndex = lines.findIndex((line) => /^A\s*:/i.test(line));
  if (qIndex < 0 || aIndex < 0 || aIndex <= qIndex) return false;
  const questionLines = lines.slice(qIndex, aIndex);
  const answerLines = lines.slice(aIndex);
  questionLines[0] = questionLines[0].replace(/^Q\s*:\s*/i, '');
  answerLines[0] = answerLines[0].replace(/^A\s*:\s*/i, '');
  item.question = questionLines.join('\n').trim();
  item.answer = answerLines.join('\n').trim();
  return true;
}

function applyClozeEdit(item, value) {
  const match = value.match(/\{\{c1::([\s\S]+?)\}\}/);
  if (!match) return false;
  item.clozeText = match[1];
  item.maskedText = value.replace(match[0], '{{c1::...}}');
  return true;
}

export const editInternals = {
  clozeMarkupFor,
  applyBasicEdit,
  applyClozeEdit
};
