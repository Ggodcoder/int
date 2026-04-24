import { existsSync } from 'node:fs';
import { platform } from 'node:os';
import { spawn } from 'node:child_process';

export function commandForTarget(target, os = platform()) {
  if (os === 'win32') {
    return { command: 'cmd', args: ['/c', 'start', '', target], options: { windowsHide: true } };
  }
  if (os === 'darwin') {
    return { command: 'open', args: [target], options: {} };
  }
  return { command: 'xdg-open', args: [target], options: {} };
}

export function targetForWebItem(item) {
  if (!item || item.type !== 'web') return null;
  if (item.pdfPath && existsSync(item.pdfPath)) return { target: item.pdfPath, kind: 'PDF' };
  if (item.sourceUrl) return { target: item.sourceUrl, kind: 'URL' };
  return null;
}

export function targetForPdfItem(item) {
  if (!item || item.type !== 'pdf') return null;
  if (item.pdfPath && existsSync(item.pdfPath)) return { target: item.pdfPath, kind: 'PDF' };
  return null;
}

export function targetForOpenableItem(item) {
  return targetForPdfItem(item) ?? targetForWebItem(item);
}

export function openWithDefaultApp(target) {
  const { command, args, options } = commandForTarget(target);
  const child = spawn(command, args, { ...options, detached: true, stdio: 'ignore' });
  child.unref();
}
