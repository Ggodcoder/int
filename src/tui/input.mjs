import { promptToken } from './theme.mjs';
import { renderPromptLine } from './layout.mjs';
import { createFrame } from './renderer.mjs';

export function renderLinePrompt({ prompt, value = '', accent = true }) {
  return renderPromptLine({ prompt, value, accent, promptToken });
}

export function renderRevealPrompt({ revealed = false, mode = 'queue' } = {}) {
  if (!revealed) return 'space>';
  return mode === 'drill' ? 'result>' : 'rate>';
}

export function promptRow({ prompt, value = '', accent = true } = {}) {
  return renderLinePrompt({ prompt, value, accent });
}

export function promptFrame(baseFrame, { prompt, value = '', accent = true, meta = {} } = {}) {
  const baseLines = baseFrame?.lines ?? [];
  const baseMeta = baseFrame?.meta ?? {};
  return createFrame(
    [...baseLines, promptRow({ prompt, value, accent })],
    {
      ...baseMeta,
      ...meta,
      prompt: {
        label: prompt,
        value,
        accent
      }
    }
  );
}

export function promptContent(baseFrame, options = {}) {
  return promptFrame(baseFrame, options).lines.join('\n');
}
