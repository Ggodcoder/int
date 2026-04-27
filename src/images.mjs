import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { DATA_DIR } from './config.mjs';
import { id, nowIso } from './time.mjs';

export const IMAGE_DIR = join(DATA_DIR, 'images');
const IMAGE_TYPES = new Set(['branch', 'leaf', 'note']);

export function canAttachImage(item) {
  return Boolean(item && IMAGE_TYPES.has(item.type));
}

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'ignore', windowsHide: true, ...options });
    child.on('error', () => resolve(false));
    child.on('exit', (code) => resolve(code === 0));
  });
}

async function captureWindowsClipboardImage(outputPath) {
  const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$path = $args[0]
if (-not [System.Windows.Forms.Clipboard]::ContainsImage()) { exit 2 }
$image = [System.Windows.Forms.Clipboard]::GetImage()
if ($null -eq $image) { exit 2 }
$image.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
`;
  return run('powershell.exe', ['-NoProfile', '-STA', '-Command', script, outputPath]);
}

async function captureMacClipboardClass(outputPath, clipboardClass) {
  const script = `
on run argv
  set outPath to item 1 of argv
  set imageData to the clipboard as «class ${clipboardClass}»
  set outFile to open for access (POSIX file outPath) with write permission
  try
    set eof outFile to 0
    write imageData to outFile
    close access outFile
  on error errMsg number errNum
    try
      close access outFile
    end try
    error errMsg number errNum
  end try
end run
`;
  return run('osascript', ['-e', script, outputPath]);
}

async function captureMacClipboardImage(outputPath) {
  if (await captureMacClipboardClass(outputPath, 'PNGf')) return true;
  const tiffPath = `${outputPath}.tiff`;
  if (!(await captureMacClipboardClass(tiffPath, 'TIFF'))) return false;
  const converted = await run('sips', ['-s', 'format', 'png', tiffPath, '--out', outputPath]);
  rmSync(tiffPath, { force: true });
  return converted;
}

export async function captureClipboardImage(outputPath, platform = process.platform) {
  mkdirSync(IMAGE_DIR, { recursive: true });
  if (platform === 'win32') return captureWindowsClipboardImage(outputPath);
  if (platform === 'darwin') return captureMacClipboardImage(outputPath);
  return false;
}

export function fileHash(path) {
  const hash = createHash('sha256');
  return new Promise((resolve, reject) => {
    const stream = createReadStream(path);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export async function attachClipboardImageToItem(db, item, { capture = captureClipboardImage } = {}) {
  if (!canAttachImage(item)) return { attached: false, message: 'Images can be attached to branch, leaf, and note items.' };
  mkdirSync(IMAGE_DIR, { recursive: true });
  const imageId = id('image');
  const imagePath = join(IMAGE_DIR, `${item.id}-${imageId}.png`);
  const captured = await capture(imagePath);
  if (!captured || !existsSync(imagePath) || statSync(imagePath).size <= 0) {
    rmSync(imagePath, { force: true });
    return { attached: false, message: 'No clipboard image found.' };
  }

  const hash = await fileHash(imagePath);
  if (db.app.lastClipboardImageHash === hash && db.app.lastClipboardImageItemId === item.id) {
    rmSync(imagePath, { force: true });
    return { attached: false, message: 'Clipboard image already attached.' };
  }

  item.images ??= [];
  item.images.push({
    id: imageId,
    path: imagePath,
    hash,
    createdAt: nowIso()
  });
  db.app.lastClipboardImageHash = hash;
  db.app.lastClipboardImageItemId = item.id;
  return { attached: true, message: `Attached image (${item.images.length}).`, imagePath };
}

export function imagesOf(item) {
  return Array.isArray(item?.images) ? item.images.filter((image) => image?.path) : [];
}
