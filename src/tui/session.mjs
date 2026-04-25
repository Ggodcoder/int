import { blockFrame, clearScreen, createFrame, renderFrame, resultFrame } from './renderer.mjs';

export function createScreenSession(output = process.stdout) {
  let currentFrame = null;

  return {
    render(frame) {
      currentFrame = frame;
      renderFrame(frame, output);
    },
    renderLines(lines, meta = {}) {
      this.render(createFrame(lines, meta));
    },
    renderBlock(lines, meta = {}) {
      this.render(blockFrame(lines, meta));
    },
    renderResult(message, meta = {}) {
      this.render(resultFrame(message, meta));
    },
    clear() {
      currentFrame = null;
      clearScreen();
    },
    current() {
      return currentFrame;
    }
  };
}

export const screenSession = createScreenSession();
