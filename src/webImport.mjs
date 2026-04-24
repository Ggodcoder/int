import { mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { chromium } from 'playwright';
import { DATA_DIR } from './config.mjs';

const MAX_PDF_EDGE_PX = 14400;
const DEFAULT_CAPTURE_TIMEOUT_MS = 30000;
export const WEB_IMPORT_DIR = join(DATA_DIR, 'imports', 'web');

export function normalizeWebUrl(rawUrl) {
  const value = rawUrl.trim();
  if (!value) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  const url = new URL(withScheme);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https URLs can be imported.');
  }
  return url.toString();
}

function safeFilePart(value) {
  return (
    value
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'web-import'
  );
}

function clampPdfEdge(value) {
  return Math.max(1, Math.min(Math.ceil(value), MAX_PDF_EDGE_PX));
}

export async function renderWebPageToPdf({ url, outputDir = WEB_IMPORT_DIR, filePrefix, timeoutMs = DEFAULT_CAPTURE_TIMEOUT_MS }) {
  mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.setDefaultTimeout(timeoutMs);
    page.setDefaultNavigationTimeout(timeoutMs);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForLoadState('load', { timeout: Math.min(10000, timeoutMs) }).catch(() => {});
    await page.waitForTimeout(1500);

    const metrics = await page.evaluate(() => {
      const body = document.body;
      const element = document.documentElement;
      const width = Math.max(
        body?.scrollWidth ?? 0,
        body?.offsetWidth ?? 0,
        element?.clientWidth ?? 0,
        element?.scrollWidth ?? 0,
        element?.offsetWidth ?? 0
      );
      const height = Math.max(
        body?.scrollHeight ?? 0,
        body?.offsetHeight ?? 0,
        element?.clientHeight ?? 0,
        element?.scrollHeight ?? 0,
        element?.offsetHeight ?? 0
      );
      return {
        title: document.title || location.href,
        width,
        height
      };
    });

    const pdfWidth = clampPdfEdge(metrics.width || 1280);
    const pdfHeight = clampPdfEdge(metrics.height || 900);
    const fileName = `${safeFilePart(filePrefix ?? url)}-${Date.now().toString(36)}.pdf`;
    const pdfPath = join(outputDir, fileName);

    await page.pdf({
      path: pdfPath,
      width: `${pdfWidth}px`,
      height: `${pdfHeight}px`,
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });

    return {
      title: metrics.title,
      pdfPath,
      pdfFileName: basename(pdfPath),
      pageSize: { width: pdfWidth, height: pdfHeight }
    };
  } finally {
    await browser.close();
  }
}
