import { promptToken } from './theme.mjs';
import { renderPromptLine, renderPromptLines } from './layout.mjs';
import { createFrame } from './renderer.mjs';

export function renderLinePrompt({ prompt, value = '', accent = true, width = 0 }) {
  return renderPromptLine({ prompt, value, accent, promptToken, width });
}

export function renderRevealPrompt({ revealed = false, mode = 'queue' } = {}) {
  if (!revealed) return 'space>';
  return mode === 'drill' ? 'result>' : 'rate>';
}

export function promptRows({ prompt, value = '', accent = true, width = 0 } = {}) {
  return renderPromptLines({ prompt, value, accent, promptToken, width });
}

export function promptRow({ prompt, value = '', accent = true, width = 0 } = {}) {
  return promptRows({ prompt, value, accent, width }).join('\n');
}

export function promptFrame(baseFrame, { prompt, value = '', accent = true, meta = {}, width = 0 } = {}) {
  const baseLines = baseFrame?.lines ?? [];
  const baseMeta = baseFrame?.meta ?? {};
  return createFrame(
    [...baseLines, ...promptRows({ prompt, value, accent, width })],
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
