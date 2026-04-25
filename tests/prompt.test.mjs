import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from '@inquirer/testing';
import { drillResultPrompt, exactLinePrompt, shouldUseFramePrompt, studyGradePrompt, typeEntriesRelayPrompt } from '../src/input.mjs';
import { promptContent, promptFrame, renderLinePrompt, renderRevealPrompt } from '../src/tui/input.mjs';
import { createFrame } from '../src/tui/renderer.mjs';

test('line prompt submits typed numeric command', async () => {
  const { answer, events } = await render(exactLinePrompt, { prompt: 'int>', keepEmpty: true });

  events.type('1');
  events.keypress('enter');

  assert.equal(await answer, '1');
});

test('line prompt can render inside a base frame', async () => {
  const baseFrame = createFrame(['body'], { kind: 'context' });
  const { answer, events, getScreen, nextRender } = await render(exactLinePrompt, {
    prompt: 'int>',
    keepEmpty: true,
    framePrompt: true,
    baseFrame
  });

  assert.equal(getScreen(), 'body\nint>');
  events.type('1');
  await nextRender();
  assert.equal(getScreen(), 'body\nint> 1');
  events.keypress('enter');

  assert.equal(await answer, '1');
});

test('frame prompt supports Korean backspace without stale submitted text', async () => {
  const baseFrame = createFrame(['body'], { kind: 'context' });
  const { answer, events, getScreen, nextRender } = await render(exactLinePrompt, {
    prompt: 'type>',
    keepEmpty: false,
    framePrompt: true,
    baseFrame
  });

  events.type('한글');
  await nextRender();
  assert.equal(getScreen().endsWith('type> 한글'), true);
  events.keypress('backspace');
  await nextRender();
  assert.equal(getScreen().endsWith('type> 한'), true);
  events.type('자');
  await nextRender();
  assert.equal(getScreen().endsWith('type> 한자'), true);
  events.keypress('enter');

  assert.equal(await answer, '한자');
});

test('frame prompt supports escape cancel', async () => {
  const baseFrame = createFrame(['body'], { kind: 'context' });
  const { answer, events } = await render(exactLinePrompt, {
    prompt: 'type>',
    keepEmpty: false,
    framePrompt: true,
    baseFrame
  });

  events.type('cancel me');
  events.keypress('escape');

  assert.equal(await answer, null);
});

test('frame prompt renders long input in the active frame payload', async () => {
  const baseFrame = createFrame(['header', 'body'], { kind: 'context' });
  const longText = 'long-input-'.repeat(18);
  const { answer, events, getScreen, nextRender } = await render(exactLinePrompt, {
    prompt: 'int>',
    keepEmpty: true,
    framePrompt: true,
    baseFrame
  });

  events.type(longText);
  await nextRender();

  const screen = getScreen();
  assert.equal(screen.startsWith('header\nbody\n'), true);
  assert.equal(screen.includes(`int> ${longText}`), true);
  events.keypress('enter');

  assert.equal(await answer, longText);
});

test('frame prompt is default with explicit classic fallbacks', () => {
  assert.equal(shouldUseFramePrompt({}), true);
  assert.equal(shouldUseFramePrompt({ INT_FRAME_PROMPT: '1' }), true);
  assert.equal(shouldUseFramePrompt({ INT_FRAME_PROMPT: '0' }), false);
  assert.equal(shouldUseFramePrompt({ INT_FRAME_PROMPT: 'false' }), false);
  assert.equal(shouldUseFramePrompt({ INT_FRAME_PROMPT: 'classic' }), false);
});

test('command prompt accents only the prompt token', () => {
  assert.equal(renderLinePrompt({ prompt: 'int>', value: '1', accent: false }), 'int> 1');
  assert.equal(renderLinePrompt({ prompt: 'int>', value: '1', accent: true }).endsWith(' 1'), true);
  assert.equal(renderLinePrompt({ prompt: 'int>', value: '1', accent: true }).includes('\x1b[48;5;236m'), true);
});

test('review prompt labels are centralized in the TUI input renderer', () => {
  assert.equal(renderRevealPrompt({ revealed: false, mode: 'queue' }), 'space>');
  assert.equal(renderRevealPrompt({ revealed: true, mode: 'queue' }), 'rate>');
  assert.equal(renderRevealPrompt({ revealed: true, mode: 'drill' }), 'result>');
});

test('prompt row can be composed into a frame', () => {
  const base = createFrame(['body'], { kind: 'context' });
  const frame = promptFrame(base, { prompt: 'type>', value: 'abc' });

  assert.equal(frame.lines.length, 2);
  assert.equal(frame.lines[0], 'body');
  assert.equal(frame.lines[1].endsWith(' abc'), true);
  assert.equal(frame.meta.kind, 'context');
  assert.deepEqual(frame.meta.prompt, { label: 'type>', value: 'abc', accent: true });
  assert.equal(promptContent(base, { prompt: 'int>', value: '1', accent: false }), 'body\nint> 1');
});

test('line prompt supports Korean text and cancel', async () => {
  const typed = await render(exactLinePrompt, { prompt: 'type>', keepEmpty: false });
  typed.events.type('프롬프트 테스트');
  typed.events.keypress('enter');
  assert.equal(await typed.answer, '프롬프트 테스트');

  const canceled = await render(exactLinePrompt, { prompt: 'type>', keepEmpty: false });
  canceled.events.keypress('escape');
  assert.equal(await canceled.answer, null);
});

test('type relay prompt keeps collecting entries until empty enter', async () => {
  const baseFrame = createFrame(['body'], { kind: 'context' });
  const { answer, events, getScreen, nextRender } = await render(typeEntriesRelayPrompt, {
    prompt: 'type>',
    framePrompt: true,
    baseFrame
  });

  events.type('note 1');
  await nextRender();
  assert.equal(getScreen().endsWith('type> note 1'), true);
  events.keypress('enter');
  await nextRender();
  assert.equal(getScreen().endsWith('type>'), true);
  events.type('note 2 // note 3');
  events.keypress('enter');
  await nextRender();
  events.keypress('enter');

  assert.deepEqual(await answer, ['note 1', 'note 2', 'note 3']);
});

test('type relay prompt returns collected entries on escape', async () => {
  const { answer, events } = await render(typeEntriesRelayPrompt, { prompt: 'type>' });

  events.type('branch 1');
  events.keypress('enter');
  events.keypress('escape');

  assert.deepEqual(await answer, ['branch 1']);
});

test('study grade prompt reveals then accepts 1-4 grade', async () => {
  let revealed = false;
  const { answer, events, getScreen, nextRender } = await render(studyGradePrompt, {
    onReveal: () => {
      revealed = true;
    }
  });

  assert.equal(getScreen(), 'space>');
  events.keypress('space');
  await nextRender();
  assert.equal(revealed, true);
  assert.equal(getScreen(), 'rate>');
  events.keypress('4');

  assert.equal(await answer, 4);
});

test('drill prompt reveals then accepts pass/fail result', async () => {
  let revealed = false;
  const { answer, events, nextRender } = await render(drillResultPrompt, {
    onReveal: () => {
      revealed = true;
    }
  });

  events.keypress('space');
  await nextRender();
  assert.equal(revealed, true);
  events.keypress('2');

  assert.equal(await answer, 'fail');
});
