import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { basename, extname, join, parse } from 'node:path';
import { DATA_DIR } from './config.mjs';

export const PDF_IMPORT_DIR = join(DATA_DIR, 'imports', 'pdf');

function safeFilePart(value) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'pdf-import'
  );
}

export function normalizePdfPath(filePath) {
  const value = String(filePath ?? '').trim();
  if (!value) return null;
  if (extname(value).toLowerCase() !== '.pdf') throw new Error('Only PDF files can be imported.');
  if (!existsSync(value)) throw new Error('PDF file not found.');
  return value;
}

export function copyPdfIntoLibrary(filePath, outputDir = PDF_IMPORT_DIR) {
  const sourcePath = normalizePdfPath(filePath);
  mkdirSync(outputDir, { recursive: true });
  const parsed = parse(sourcePath);
  const fileName = `${safeFilePart(parsed.name)}-${Date.now().toString(36)}.pdf`;
  const pdfPath = join(outputDir, fileName);
  copyFileSync(sourcePath, pdfPath);
  return {
    title: parsed.name || basename(sourcePath),
    sourcePath,
    pdfPath,
    pdfFileName: fileName
  };
}
