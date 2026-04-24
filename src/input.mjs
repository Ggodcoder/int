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
      output.write(`\r${clearLine}`);
      if (!grayLine) {
        output.write(`${prompt} ${value}`);
        return;
      }
      output.write(`${bg}${prompt}${value}${reset}`);
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
