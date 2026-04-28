const FIELD_SELECTOR_TYPES = {
  b: 'branch',
  'ㅠ': 'branch',
  l: 'leaf',
  'ㅣ': 'leaf',
  n: 'note',
  'ㅜ': 'note',
  f: 'flashcard',
  'ㄹ': 'flashcard',
  i: 'image',
  'ㅑ': 'image',
  w: 'web',
  p: 'pdf'
};

export function parseFieldSelector(token) {
  const match = String(token).trim().toLowerCase().match(/^([a-zㄱ-ㅎㅏ-ㅣ가-힣])\s*(\d+)$/u);
  if (!match) return null;
  const type = FIELD_SELECTOR_TYPES[match[1]];
  const index = Number.parseInt(match[2], 10);
  if (!type || index < 1) return null;
  return { type, index };
}

export function fieldSelectorType(item) {
  return item.type === 'flashcard' ? 'flashcard' : item.type;
}

export function itemsForField(list, type) {
  return list.filter((item) => fieldSelectorType(item) === type);
}

export function itemForFieldSelector(list, selector) {
  return itemsForField(list, selector.type)[selector.index - 1] ?? null;
}

export function parseFieldDeleteSpec(spec, list) {
  const selected = [];
  const selectedIds = new Set();
  const invalid = [];
  const parts = spec.split('//').map((part) => part.trim()).filter(Boolean);

  for (const part of parts) {
    const range = part.toLowerCase().match(/^([a-zㄱ-ㅎㅏ-ㅣ가-힣])\s*(\d+)\s*:\s*(?:([a-zㄱ-ㅎㅏ-ㅣ가-힣])\s*)?(\d+)$/u);
    if (range) {
      const start = parseFieldSelector(`${range[1]}${range[2]}`);
      const endPrefix = range[3] ?? range[1];
      const end = parseFieldSelector(`${endPrefix}${range[4]}`);
      if (!start || !end || start.type !== end.type) {
        invalid.push(part);
        continue;
      }
      const scopedItems = itemsForField(list, start.type);
      const low = Math.min(start.index, end.index);
      const high = Math.max(start.index, end.index);
      for (let index = low; index <= high; index += 1) {
        const item = scopedItems[index - 1];
        if (!item) {
          invalid.push(`${range[1]}${index}`);
          continue;
        }
        if (!selectedIds.has(item.id)) {
          selected.push(item);
          selectedIds.add(item.id);
        }
      }
      continue;
    }

    const selector = parseFieldSelector(part);
    const item = selector ? itemForFieldSelector(list, selector) : null;
    if (item) {
      if (!selectedIds.has(item.id)) {
        selected.push(item);
        selectedIds.add(item.id);
      }
    } else {
      invalid.push(part);
    }
  }

  return { selected, invalid };
}

export function normalizeSortDestination(destination, sourceType) {
  if (destination === 'top' || destination === 'bottom') return { ok: true, destination };
  const range = destination.match(/^([a-zㄱ-ㅎㅏ-ㅣ가-힣])\s*(\d+)\s*:\s*(?:([a-zㄱ-ㅎㅏ-ㅣ가-힣])\s*)?(\d+)$/u);
  if (!range) return { ok: false, message: 'Invalid sort target. Use top, bottom, or b1:b2.' };
  const left = parseFieldSelector(`${range[1]}${range[2]}`);
  const rightPrefix = range[3] ?? range[1];
  const right = parseFieldSelector(`${rightPrefix}${range[4]}`);
  if (!left || !right || left.type !== sourceType || right.type !== sourceType) {
    return { ok: false, message: 'Sort target must use the same field as the source.' };
  }
  return { ok: true, destination: `${left.index}:${right.index}` };
}
