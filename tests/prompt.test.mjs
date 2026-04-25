import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from '@inquirer/testing';
import { drillResultPrompt, exactLinePrompt, studyGradePrompt } from '../src/input.mjs';

test('line prompt submits typed numeric command', async () => {
  const { answer, events } = await render(exactLinePrompt, { prompt: 'int>', keepEmpty: true });

  events.type('1');
  events.keypress('enter');

  assert.equal(await answer, '1');
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
