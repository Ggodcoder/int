import { createPrompt, useKeypress, useRef, useState, isEnterKey } from '@inquirer/core';

export function splitTypeEntries(value) {
  return value
    .split('//')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export const exactLinePrompt = createPrompt((config, done) => {
  const [status, setStatus] = useState('idle');
  const [value, setValue] = useState('');
  const latestValue = useRef('');

  useKeypress((key, rl) => {
    if (status !== 'idle') return;
    if (key.name === 'escape' || key.sequence === '\x1b') {
      latestValue.current = 'canceled';
      setValue('canceled');
      setStatus('done');
      done(null);
      return;
    }
    if (isEnterKey(key)) {
      const answer = latestValue.current.trim();
      setValue(answer);
      setStatus('done');
      done(answer.length > 0 || config.keepEmpty ? answer : null);
      return;
    }
    latestValue.current = rl.line;
    setValue(rl.line);
  });

  return `${config.prompt}${value ? ` ${value}` : ''}`;
});

export const studyGradePrompt = createPrompt((config, done) => {
  const [status, setStatus] = useState('idle');
  const [revealed, setRevealed] = useState(false);

  useKeypress((key) => {
    if (status !== 'idle') return;
    if (key.name === 'escape' || key.sequence === '\x1b') {
      setStatus('done');
      done(null);
      return;
    }
    if (!revealed && (key.name === 'space' || key.sequence === ' ')) {
      config.onReveal?.();
      setRevealed(true);
      return;
    }
    if (revealed && /^[1-4]$/.test(key.name ?? key.sequence ?? '')) {
      const grade = Number.parseInt(key.name ?? key.sequence, 10);
      setStatus('done');
      done(grade);
    }
  });

  return revealed ? 'rate>' : 'space>';
});

export const drillResultPrompt = createPrompt((config, done) => {
  const [status, setStatus] = useState('idle');
  const [revealed, setRevealed] = useState(false);

  useKeypress((key) => {
    if (status !== 'idle') return;
    if (key.name === 'escape' || key.sequence === '\x1b') {
      setStatus('done');
      done(null);
      return;
    }
    if (!revealed && (key.name === 'space' || key.sequence === ' ')) {
      config.onReveal?.();
      setRevealed(true);
      return;
    }
    if (revealed && key.name === '1') {
      setStatus('done');
      done('pass');
    }
    if (revealed && key.name === '2') {
      setStatus('done');
      done('fail');
    }
  });

  return revealed ? 'result>' : 'space>';
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
    try {
      return await studyGradePrompt({ onReveal }, { input: process.stdin, output: process.stdout, clearPromptOnDone: false });
    } catch (error) {
      if (error?.name === 'CancelPromptError') return null;
      if (error?.name === 'ExitPromptError') process.exit(130);
      throw error;
    }
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
    try {
      return await drillResultPrompt({ onReveal }, { input: process.stdin, output: process.stdout, clearPromptOnDone: false });
    } catch (error) {
      if (error?.name === 'CancelPromptError') return null;
      if (error?.name === 'ExitPromptError') process.exit(130);
      throw error;
    }
  }
  await rl.question('space> ');
  onReveal?.();
  const value = (await rl.question('1-2> ')).trim();
  console.log('');
  if (value === '1') return 'pass';
  if (value === '2') return 'fail';
  return null;
}
