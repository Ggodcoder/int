import { dirname } from 'node:path';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { DB_FILE, LEGACY_DB_FILE } from './config.mjs';

const DATA_DIR = dirname(DB_FILE);

function freshDb() {
  return {
    version: 1,
    roots: [],
    items: [],
    app: {
      activeRootId: null,
      sessions: {},
      drill: {},
      activity: {},
      cardActivity: {},
      dayBoundary: '0000'
    }
  };
}

export function ensureDb() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DB_FILE) && !process.env.INT_DB_FILE && existsSync(LEGACY_DB_FILE)) {
    copyFileSync(LEGACY_DB_FILE, DB_FILE);
  }
  if (!existsSync(DB_FILE)) writeFileSync(DB_FILE, JSON.stringify(freshDb(), null, 2));
}

export function loadDb() {
  ensureDb();
  const db = JSON.parse(readFileSync(DB_FILE, 'utf8'));
  db.app ??= {};
  db.app.sessions ??= {};
  db.app.drill ??= {};
  db.app.activity ??= {};
  db.app.cardActivity ??= {};
  db.app.dayBoundary ??= '0000';
  return db;
}

export function saveDb(db) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

export { DB_FILE };
