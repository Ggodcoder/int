import test from 'node:test';
import assert from 'node:assert/strict';
import {
  itemForFieldSelector,
  normalizeSortDestination,
  parseFieldDeleteSpec,
  parseFieldSelector
} from '../src/fieldSelectors.mjs';

const list = [
  { id: 'branch-1', type: 'branch' },
  { id: 'note-1', type: 'note' },
  { id: 'branch-2', type: 'branch' },
  { id: 'card-1', type: 'flashcard' },
  { id: 'image-1', type: 'image' },
  { id: 'branch-3', type: 'branch' },
  { id: 'card-2', type: 'flashcard' },
  { id: 'image-2', type: 'image' }
];

test('field selectors parse English and Korean prefixes', () => {
  assert.deepEqual(parseFieldSelector('b1'), { type: 'branch', index: 1 });
  assert.deepEqual(parseFieldSelector('ㅠ2'), { type: 'branch', index: 2 });
  assert.deepEqual(parseFieldSelector('n1'), { type: 'note', index: 1 });
  assert.deepEqual(parseFieldSelector('ㅜ1'), { type: 'note', index: 1 });
  assert.deepEqual(parseFieldSelector('f2'), { type: 'flashcard', index: 2 });
  assert.deepEqual(parseFieldSelector('ㄹ2'), { type: 'flashcard', index: 2 });
  assert.deepEqual(parseFieldSelector('i1'), { type: 'image', index: 1 });
  assert.deepEqual(parseFieldSelector('ㅑ2'), { type: 'image', index: 2 });
  assert.equal(parseFieldSelector('1'), null);
});

test('field selector resolves against field-local numbering', () => {
  assert.equal(itemForFieldSelector(list, parseFieldSelector('b2')).id, 'branch-2');
  assert.equal(itemForFieldSelector(list, parseFieldSelector('f1')).id, 'card-1');
  assert.equal(itemForFieldSelector(list, parseFieldSelector('n1')).id, 'note-1');
  assert.equal(itemForFieldSelector(list, parseFieldSelector('i2')).id, 'image-2');
});

test('field delete specs support same-field ranges and mixed selectors', () => {
  const result = parseFieldDeleteSpec('b1:3 // f2 // n1 // i1', list);

  assert.deepEqual(result.selected.map((item) => item.id), ['branch-1', 'branch-2', 'branch-3', 'card-2', 'note-1', 'image-1']);
  assert.deepEqual(result.invalid, []);
});

test('field delete specs reject bare numbers and cross-field ranges', () => {
  const result = parseFieldDeleteSpec('1 // b1:n1 // f9', list);

  assert.deepEqual(result.selected, []);
  assert.deepEqual(result.invalid, ['1', 'b1:n1', 'f9']);
});

test('sort destinations are field-local', () => {
  assert.deepEqual(normalizeSortDestination('top', 'branch'), { ok: true, destination: 'top' });
  assert.deepEqual(normalizeSortDestination('b1:b3', 'branch'), { ok: true, destination: '1:3' });
  assert.deepEqual(normalizeSortDestination('b1:3', 'branch'), { ok: true, destination: '1:3' });
  assert.deepEqual(normalizeSortDestination('i1:i2', 'image'), { ok: true, destination: '1:2' });
  assert.equal(normalizeSortDestination('n1:n2', 'branch').ok, false);
  assert.equal(normalizeSortDestination('1:2', 'branch').ok, false);
});
