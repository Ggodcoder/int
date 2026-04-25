import { createPrompt, useKeypress, useRef, useState, isEnterKey } from '@inquirer/core';
import { promptContent, renderLinePrompt, renderRevealPrompt } from './tui/input.mjs';
import { clearScreen } from './tui/renderer.mjs';
import { screenSession } from './tui/session.mjs';

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

  const syncLine = (rl, next) => {
    latestValue.current = next;
    setValue(next);
    rl.line = next;
    rl.cursor = Array.from(next).length;
  };

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
    if (key.name === 'backspace' || key.sequence === '\x7f' || key.sequence === '\b') {
      syncLine(rl, Array.from(latestValue.current).slice(0, -1).join(''));
      return;
    }
    if (key.ctrl || key.meta || key.name === 'tab' || key.name === 'delete') return;
    if (key.sequence && !/[\r\n\x1b\x7f\b]/.test(key.sequence)) {
      syncLine(rl, `${latestValue.current}${key.sequence}`);
    }
  });

  if (config.framePrompt && config.baseFrame) {
    return promptContent(config.baseFrame, { prompt: config.prompt, value, accent: config.accent !== false });
  }
  return renderLinePrompt({ prompt: config.prompt, value, accent: config.accent !== false });
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

  return renderLinePrompt({ prompt: renderRevealPrompt({ revealed, mode: 'queue' }) });
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

  return renderLinePrompt({ prompt: renderRevealPrompt({ revealed, mode: 'drill' }) });
});

export function shouldUseFramePrompt(env = process.env) {
  const value = String(env.INT_FRAME_PROMPT ?? '').trim().toLowerCase();
  return !['0', 'false', 'off', 'classic'].includes(value);
}

async function askPromptLine(prompt, { keepEmpty = false } = {}) {
  const currentFrame = shouldUseFramePrompt() ? screenSession.current() : null;
  const baseFrame = currentFrame?.meta?.transient ? null : currentFrame;
  if (baseFrame) clearScreen();
  try {
    return await exactLinePrompt(
      { prompt, keepEmpty, accent: true, framePrompt: Boolean(baseFrame), baseFrame },
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
