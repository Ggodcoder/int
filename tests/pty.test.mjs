import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import pty from 'node-pty';

const ESCAPE_PATTERN = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1B\\))/g;

function plain(text) {
  return text.replace(ESCAPE_PATTERN, '');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitFor(getOutput, pattern, label, timeoutMs = 8000, from = 0) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const output = plain(getOutput()).slice(from);
      if (pattern.test(output)) {
        resolve({ output, end: plain(getOutput()).length });
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Timed out waiting for ${label}\n\n${output.slice(-2000)}`));
        return;
      }
      setTimeout(tick, 50);
    };
    tick();
  });
}

function spawnInt() {
  const tempDir = mkdtempSync(join(tmpdir(), 'int-pty-'));
  const env = {
    ...process.env,
    INT_DB_FILE: join(tempDir, 'int-db.json'),
    INT_FRAME_PROMPT: '1',
    NO_COLOR: ''
  };
  const shell = process.execPath;
  const term = pty.spawn(shell, ['./src/cli.mjs'], {
    name: 'xterm-256color',
    cols: 100,
    rows: 30,
    cwd: process.cwd(),
    env
  });
  let output = '';
  let exited = false;
  term.onData((data) => {
    output += data;
  });
  term.onExit(() => {
    exited = true;
  });
  return {
    term,
    tempDir,
    write(value) {
      term.write(value);
    },
    resize(cols, rows) {
      term.resize(cols, rows);
    },
    output() {
      return output;
    },
    cleanup() {
      if (!exited) {
        try {
          term.kill();
        } catch {}
      }
      rmSync(tempDir, { recursive: true, force: true });
    }
  };
}

test('real PTY frame prompt handles Korean backspace, long input, escape, and resize', async () => {
  const app = spawnInt();
  try {
    let cursor = 0;
    cursor = (await waitFor(app.output, /Create your first root[\s\S]*int>/, 'first-root prompt', 8000, cursor)).end;

    app.write('new root\r');
    cursor = (await waitFor(app.output, /type>/, 'new root type prompt', 8000, cursor)).end;
    app.write('테스트루트\r');
    cursor = (await waitFor(app.output, /\[root\]\s+테스트루트[\s\S]*int>/, 'Korean root context', 8000, cursor)).end;

    app.write('n\r');
    cursor = (await waitFor(app.output, /type>/, 'new note type prompt', 8000, cursor)).end;
    app.write('한글');
    await delay(100);
    app.write('\x7f');
    await delay(100);
    app.write('자\r');
    await delay(300);
    app.write('\x1b');
    cursor = (await waitFor(app.output, /Created note: 한자[\s\S]*\[note\]\s+한자[\s\S]*int>/, 'Korean backspace note command frame', 8000, cursor)).end;

    app.write('1\r');
    cursor = (await waitFor(app.output, /\[note\][\s\S]*한자[\s\S]*empty[\s\S]*int>/, 'enter note for flashcard', 8000, cursor)).end;
    await delay(200);

    app.write('basic\r');
    cursor = (await waitFor(app.output, /Q\?/, 'basic question prompt', 8000, cursor)).end;
    app.write('질문\r');
    cursor = (await waitFor(app.output, /A\?/, 'basic answer prompt', 8000, cursor)).end;
    app.write('답변\r');
    cursor = (await waitFor(app.output, /Created basic flash card\.[\s\S]*\[flash:basic\][\s\S]*질문[\s\S]*답변/, 'basic command frame', 8000, cursor)).end;

    app.write('root\r');
    cursor = (await waitFor(app.output, /\[root\]\s+테스트루트[\s\S]*\[note\]\s+한자/, 'root after flashcard', 8000, cursor)).end;

    app.write('b\r');
    cursor = (await waitFor(app.output, /type>/, 'new branch type prompt', 8000, cursor)).end;
    const longText = 'long-input-'.repeat(16);
    app.write(`${longText}\r`);
    await delay(300);
    app.write('\x1b');
    cursor = (await waitFor(app.output, /\[branch\][\s\S]*long-input-long-input[\s\S]*int>/, 'long branch input in list', 8000, cursor)).end;

    app.write('2\r');
    cursor = (await waitFor(app.output, /\[branch\][\s\S]*long-input-long-input[\s\S]*empty[\s\S]*int>/, 'enter long branch', 8000, cursor)).end;

    app.write('save link\r');
    cursor = (await waitFor(app.output, /type>/, 'save link prompt', 8000, cursor)).end;
    app.write('https://example.com\r');
    cursor = (await waitFor(app.output, /Saved link: https:\/\/example\.com[\s\S]*\[web\] https:\/\/example\.com/, 'save link command frame', 8000, cursor)).end;

    app.write('d\r');
    cursor = (await waitFor(app.output, /Done: \[branch\] long-input-[\s\S]*\[web\] https:\/\/example\.com/, 'normal d marks current branch, not first child', 8000, cursor)).end;

    app.write('reset\r');
    cursor = (await waitFor(app.output, /Reset: \[branch\] long-input-[\s\S]*\[web\] https:\/\/example\.com/, 'reset restores current done branch without touching child', 8000, cursor)).end;

    app.write('help\r');
    const helpResult = await waitFor(app.output, /edit\s+edit the current item[\s\S]*edit n\s+edit listed item n[\s\S]*Help 1\/\d+ - Enter: next \| q: close[\s\S]*help>/, 'paged help includes edit commands', 8000, cursor);
    assert.equal((helpResult.output.match(/Help 1\/\d+ - Enter: next \| q: close/g) ?? []).length, 1);
    cursor = helpResult.end;

    app.write('q\r');
    cursor = (await waitFor(app.output, /\[branch\][\s\S]*long-input-long-input[\s\S]*\[web\] https:\/\/example\.com[\s\S]*int>/, 'help close restores previous frame', 8000, cursor)).end;

    app.write('wat\r');
    cursor = (await waitFor(app.output, /Unknown command\. Type help\.[\s\S]*int>/, 'unknown command transient frame', 8000, cursor)).end;
    app.write('\r');
    cursor = (await waitFor(app.output, /\[branch\][\s\S]*long-input-long-input[\s\S]*\[web\] https:\/\/example\.com[\s\S]*int>/, 'blank enter restores previous frame after unknown command', 8000, cursor)).end;

    app.write('sort 1 bottom\r');
    cursor = (await waitFor(app.output, /Sorted\.[\s\S]*\[web\] https:\/\/example\.com/, 'sort command frame', 8000, cursor)).end;

    app.write('del 1\r');
    cursor = (await waitFor(app.output, /Deleted 1 selected item\.[\s\S]*empty/, 'delete command frame', 8000, cursor)).end;

    app.write('root\r');
    cursor = (await waitFor(app.output, /\[root\]\s+테스트루트[\s\S]*\[note\]\s+한자[\s\S]*\[branch\]/, 'return root after link flow', 8000, cursor)).end;

    app.write('que\r');
    cursor = (await waitFor(app.output, /1\/3[\s\S]*\[flash:basic\][\s\S]*질문[\s\S]*\[\.\.\.\]/, 'queue flashcard hidden frame', 8000, cursor)).end;

    app.write(' ');
    cursor = (await waitFor(app.output, /1\/3[\s\S]*\[flash:basic\][\s\S]*질문[\s\S]*답변[\s\S]*Rate: 1 Again/, 'queue flashcard reveal frame', 8000, cursor)).end;

    app.write('4');
    cursor = (await waitFor(app.output, /Reviewed: 4[\s\S]*1\/2[\s\S]*\[note\][\s\S]*한자/, 'queue review advances to note frame', 8000, cursor)).end;

    app.write('d\r');
    cursor = (await waitFor(app.output, /Done: \[note\] 한자[\s\S]*1\/1[\s\S]*\[branch\]/, 'queue done advances to restored branch', 8000, cursor)).end;

    app.write('root\r');
    cursor = (await waitFor(app.output, /\[root\]\s+테스트루트[\s\S]*int>/, 'root before drill', 8000, cursor)).end;

    app.write('drill\r');
    cursor = (await waitFor(app.output, /Drill round 1 \(1\/1\)[\s\S]*\[flash:basic\][\s\S]*\[\.\.\.\]/, 'drill hidden frame', 8000, cursor)).end;
    app.write(' ');
    cursor = (await waitFor(app.output, /Drill round 1 \(1\/1\)[\s\S]*답변[\s\S]*Result: 1 Pass/, 'drill reveal frame', 8000, cursor)).end;
    app.write('1');
    cursor = (await waitFor(app.output, /Round 1 all clear\./, 'drill all clear frame', 8000, cursor)).end;

    app.write('n\r');
    cursor = (await waitFor(app.output, /type>/, 'cancel prompt', 8000, cursor)).end;
    app.write('cancel me');
    await delay(100);
    app.write('\x1b');
    cursor = (await waitFor(app.output, /type> canceled[\s\S]*int>/, 'context restored after escape', 8000, cursor)).end;

    app.resize(60, 20);
    await delay(150);
    app.write('help\r');
    cursor = (await waitFor(app.output, /Help 1\/\d+ - Enter: next \| q: close[\s\S]*help>/, 'paged help after resize', 8000, cursor)).end;
    app.write('q\r');
    await delay(250);

    app.write('q\r');
    await delay(250);
    assert.match(plain(app.output()), /\[note\]\s+한자/);
    assert.match(plain(app.output()), /\[branch\][\s\S]*long-input-long-input/);
  } finally {
    app.cleanup();
  }
});
