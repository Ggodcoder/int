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

export function renderPromptLine({ prompt, value = '', accent = false, promptToken }) {
  const token = accent && promptToken ? promptToken(prompt) : prompt;
  return value ? `${token} ${value}` : token;
}
