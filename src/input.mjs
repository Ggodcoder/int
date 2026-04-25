import { createPrompt, useKeypress, useState, isEnterKey } from '@inquirer/core';

export function splitTypeEntries(value) {
  return value
    .split('//')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const exactLinePrompt = createPrompt((config, done) => {
  const [status, setStatus] = useState('idle');
  const [value, setValue] = useState('');

  useKeypress((key, rl) => {
    if (status !== 'idle') return;
    if (key.name === 'escape' || key.sequence === '\x1b') {
      setValue('canceled');
      setStatus('done');
      done(null);
      return;
    }
    if (isEnterKey(key)) {
      const answer = rl.line.trim();
      setValue(answer);
      setStatus('done');
      done(answer.length > 0 || config.keepEmpty ? answer : null);
      return;
    }
    setValue(rl.line);
  });

  return `${config.prompt}${value ? ` ${value}` : ''}`;
});

async function askPromptLine(prompt, { keepEmpty = false } = {}) {
  try {
    return await exactLinePrompt(
      { prompt, keepEmpty },
      {
        input: process.stdin,
        output: process.stdout,
        clearPromptOnDone: false
      }
    );
  } catch (error) {
    if (error?.name === 'CancelPromptError') return null;
    if (error?.name === 'ExitPromptError') process.exit(130);
    throw error;
  }
}

export async function askValue(rl, prompt) {
  if (rl.input?.isTTY && typeof rl.input.setRawMode === 'function') {
    return askPromptLine(prompt);
  }
  const value = (await rl.question(`${prompt} `)).trim();
  console.log('');
  return value.length > 0 ? value : null;
}

export async function askCommand(rl, prompt = 'int> ') {
  if (rl.input?.isTTY && typeof rl.input.setRawMode === 'function') {
    return askPromptLine(prompt.trimEnd(), { keepEmpty: true });
  }
  return rl.question(prompt);
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
