import { visibleLength } from './theme.mjs';

export function truncate(value, length) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

export function centerAnsi(text, width) {
  const padding = Math.max(0, Math.floor((width - visibleLength(text)) / 2));
  return `${' '.repeat(padding)}${text}`;
}

export function blockLines(lines) {
  return ['', ...lines, ''];
}

export function resultBlock(message) {
  return blockLines(String(message).split('\n'));
}

export function renderPromptLine({ prompt, value = '', accent = false, promptToken, width = 0 }) {
  const token = accent && promptToken ? promptToken(prompt) : prompt;
  return renderPromptLines({ prompt, value, accent, promptToken, width }).join('\n');
}

function charWidth(char) {
  const code = char.codePointAt(0) ?? 0;
  if (code === 0) return 0;
  if (code < 32 || (code >= 0x7f && code < 0xa0)) return 0;
  if (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe10 && code <= 0xfe19) ||
    (code >= 0xfe30 && code <= 0xfe6f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6)
  ) {
    return 2;
  }
  return 1;
}

function takeVisible(value, width) {
  let used = 0;
  let index = 0;
  const chars = Array.from(value);
  while (index < chars.length) {
    const nextWidth = charWidth(chars[index]);
    if (used > 0 && used + nextWidth > width) break;
    used += nextWidth;
    index += 1;
    if (used >= width) break;
  }
  return {
    head: chars.slice(0, index).join(''),
    tail: chars.slice(index).join('')
  };
}

function wrapPromptValue(value, firstWidth, nextWidth) {
  const lines = [];
  let rest = value;
  let width = Math.max(1, firstWidth);
  const continuationWidth = Math.max(1, nextWidth);
  while (rest.length > 0) {
    const { head, tail } = takeVisible(rest, width);
    lines.push(head);
    rest = tail;
    width = continuationWidth;
  }
  return lines.length > 0 ? lines : [''];
}

export function renderPromptLines({ prompt, value = '', accent = false, promptToken, width = 0 }) {
  const token = accent && promptToken ? promptToken(prompt) : prompt;
  if (!value) return [token];

  const promptWidth = visibleLength(`${prompt} `);
  if (!width || width <= promptWidth + 1) {
    return [`${token} ${value}`];
  }

  const chunks = wrapPromptValue(value, width - promptWidth, width - promptWidth);
  const indent = ' '.repeat(promptWidth);
  return chunks.map((chunk, index) => (index === 0 ? `${token} ${chunk}` : `${indent}${chunk}`));
}
