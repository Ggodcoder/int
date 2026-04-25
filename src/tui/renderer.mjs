export function createFrame(lines, meta = {}) {
  return {
    lines: [...lines],
    meta: { ...meta }
  };
}

export function blockFrame(lines, meta = {}) {
  return createFrame(['', ...lines, ''], meta);
}

export function resultFrame(message, meta = {}) {
  return blockFrame(String(message).split('\n'), { kind: 'result', ...meta });
}

export function renderFrame(frame, output = process.stdout) {
  output.write(`${frame.lines.join('\n')}\n`);
}

export function printLines(lines, output = process.stdout) {
  renderFrame(createFrame(lines), output);
}

export function printBlockLines(lines, output = process.stdout) {
  renderFrame(blockFrame(lines), output);
}

export function printResultBlock(message, output = process.stdout) {
  renderFrame(resultFrame(message), output);
}

export function terminalColumns(output = process.stdout) {
  return output.columns ?? 0;
}

export function clearScreen() {
  console.clear();
}
