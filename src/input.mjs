export function splitTypeEntries(value) {
  return value
    .split('//')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function dropLastGrapheme(value) {
  if (typeof Intl?.Segmenter === 'function') {
    const segments = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)];
    return segments.slice(0, -1).map((segment) => segment.segment).join('');
  }
  return [...value].slice(0, -1).join('');
}

function graphemes(value) {
  if (typeof Intl?.Segmenter === 'function') {
    return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)].map((segment) => segment.segment);
  }
  return [...value];
}

function charWidth(char) {
  const code = char.codePointAt(0) ?? 0;
  if (code === 0) return 0;
  if (code < 32 || (code >= 0x7f && code < 0xa0)) return 0;
  if (
    code >= 0x1100 &&
    (code <= 0x115f ||
      code === 0x2329 ||
      code === 0x232a ||
      (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe19) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x1f300 && code <= 0x1f64f) ||
      (code >= 0x1f900 && code <= 0x1f9ff))
  ) {
    return 2;
  }
  return 1;
}

function textWidth(value) {
  return graphemes(value).reduce((sum, char) => sum + charWidth(char), 0);
}

function fitTail(value, width) {
  if (width <= 0) return '';
  const chars = graphemes(value);
  let output = '';
  let used = 0;
  for (let index = chars.length - 1; index >= 0; index -= 1) {
    const char = chars[index];
    const next = used + charWidth(char);
    if (next > width) break;
    output = `${char}${output}`;
    used = next;
  }
  return output === value ? output : `…${fitTail(output, width - 1)}`;
}

export async function askValue(rl, prompt) {
  if (rl.input?.isTTY && typeof rl.input.setRawMode === 'function') {
    return askRawLine(rl, prompt);
  }
  const value = (await rl.question(`${prompt} `)).trim();
  console.log('');
  return value.length > 0 ? value : null;
}

export async function askCommand(rl, prompt = 'int> ') {
  if (rl.input?.isTTY && typeof rl.input.setRawMode === 'function') {
    return askRawLine(rl, prompt, { grayLine: true, keepEmpty: true });
  }
  return rl.question(prompt);
}

function askRawLine(rl, prompt, { grayLine = false, keepEmpty = false } = {}) {
  return new Promise((resolve) => {
    const input = rl.input;
    const output = rl.output ?? process.stdout;
    const wasRaw = input.isRaw;
    const dataListeners = input.listeners('data');
    let value = '';
    const bg = '\x1b[48;5;236m';
    const reset = '\x1b[0m';
    const clearLine = '\x1b[2K';

    const renderLine = () => {
      const columns = output.columns ?? 0;
      const renderedPrompt = grayLine ? prompt : `${prompt} `;
      const maxValueWidth = columns > 0 ? Math.max(0, columns - textWidth(renderedPrompt) - 1) : Infinity;
      const renderedValue = Number.isFinite(maxValueWidth) ? fitTail(value, maxValueWidth) : value;
      output.write(`\r${clearLine}`);
      if (!grayLine) {
        output.write(`${renderedPrompt}${renderedValue}`);
        return;
      }
      output.write(`${bg}${renderedPrompt}${renderedValue}${reset}`);
    };

    const finish = (result) => {
      input.off('data', onData);
      for (const listener of dataListeners) input.on('data', listener);
      input.setRawMode(wasRaw);
      output.write(`${reset}\n`);
      rl.resume();
      resolve(result);
    };

    const onData = (chunk) => {
      const text = chunk.toString('utf8');
      if (text === '\x03') {
        input.setRawMode(wasRaw);
        output.write(`${reset}\n`);
        process.exit(130);
      }
      if (text === '\x1b') {
        output.write(' canceled');
        finish(null);
        return;
      }
      if (text === '\r' || text === '\n') {
        const trimmed = value.trim();
        finish(trimmed.length > 0 || keepEmpty ? trimmed : null);
        return;
      }
      if (text === '\x7f' || text === '\b') {
        if (value.length > 0) {
          value = dropLastGrapheme(value);
          renderLine();
        }
        return;
      }
      value += text;
      renderLine();
    };

    rl.pause();
    for (const listener of dataListeners) input.off('data', listener);
    renderLine();
    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
  });
}

export async function askTypeEntries(rl) {
  const value = await askValue(rl, 'type>');
  return value ? splitTypeEntries(value) : [];
}

export async function askStudyGrade(rl, onReveal) {
  if (rl.input?.isTTY && typeof rl.input.setRawMode === 'function') {
    return askRawStudyGrade(rl, onReveal);
  }
  await rl.question('space> ');
  onReveal?.();
  const value = (await rl.question('1-4> ')).trim();
  console.log('');
  const grade = Number.parseInt(value, 10);
  return grade >= 1 && grade <= 4 ? grade : null;
}

export async function askDrillResult(rl, onReveal) {
  if (rl.input?.isTTY && typeof rl.input.setRawMode === 'function') {
    return askRawDrillResult(rl, onReveal);
  }
  await rl.question('space> ');
  onReveal?.();
  const value = (await rl.question('1-2> ')).trim();
  console.log('');
  if (value === '1') return 'pass';
  if (value === '2') return 'fail';
  return null;
}

function askRawStudyGrade(rl, onReveal) {
  return new Promise((resolve) => {
    const input = rl.input;
    const output = rl.output ?? process.stdout;
    const wasRaw = input.isRaw;
    const dataListeners = input.listeners('data');
    let revealed = false;

    const finish = (result) => {
      input.off('data', onData);
      for (const listener of dataListeners) input.on('data', listener);
      input.setRawMode(wasRaw);
      console.log('');
      rl.resume();
      resolve(result);
    };

    const onData = (chunk) => {
      const text = chunk.toString('utf8');
      if (text === '\x03') {
        input.setRawMode(wasRaw);
        console.log('');
        process.exit(130);
      }
      if (text === '\x1b') {
        output.write('canceled');
        finish(null);
        return;
      }
      if (!revealed && text === ' ') {
        revealed = true;
        console.log('');
        onReveal?.();
        output.write('rate> ');
        return;
      }
      if (revealed && /^[1-4]$/.test(text)) {
        finish(Number.parseInt(text, 10));
      }
    };

    rl.pause();
    for (const listener of dataListeners) input.off('data', listener);
    output.write('space> ');
    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
  });
}

function askRawDrillResult(rl, onReveal) {
  return new Promise((resolve) => {
    const input = rl.input;
    const output = rl.output ?? process.stdout;
    const wasRaw = input.isRaw;
    const dataListeners = input.listeners('data');
    let revealed = false;

    const finish = (result) => {
      input.off('data', onData);
      for (const listener of dataListeners) input.on('data', listener);
      input.setRawMode(wasRaw);
      console.log('');
      rl.resume();
      resolve(result);
    };

    const onData = (chunk) => {
      const text = chunk.toString('utf8');
      if (text === '\x03') {
        input.setRawMode(wasRaw);
        console.log('');
        process.exit(130);
      }
      if (text === '\x1b') {
        output.write('canceled');
        finish(null);
        return;
      }
      if (!revealed && text === ' ') {
        revealed = true;
        console.log('');
        onReveal?.();
        output.write('result> ');
        return;
      }
      if (revealed && text === '1') finish('pass');
      if (revealed && text === '2') finish('fail');
    };

    rl.pause();
    for (const listener of dataListeners) input.off('data', listener);
    output.write('space> ');
    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
  });
}
