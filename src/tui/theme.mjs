export const ANSI = {
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  muted: '\x1b[90m',
  reset: '\x1b[0m',
  promptBg: '\x1b[48;5;236m',
  promptFg: '\x1b[37m'
};

const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;

export function stripAnsi(text) {
  return text.replace(ANSI_PATTERN, '');
}

export function visibleLength(text) {
  return stripAnsi(text).length;
}

export function promptToken(text) {
  return `${ANSI.promptBg}${ANSI.promptFg}${text}${ANSI.reset}`;
}

export function muted(text) {
  return `${ANSI.muted}${text}${ANSI.reset}`;
}

export function cyan(text) {
  return `${ANSI.cyan}${text}${ANSI.reset}`;
}

export function yellow(text) {
  return `${ANSI.yellow}${text}${ANSI.reset}`;
}
