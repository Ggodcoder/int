import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir, platform } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));

function defaultDataDir() {
  if (platform() === 'win32') return join(process.env.APPDATA || homedir(), 'Int');
  if (platform() === 'darwin') return join(homedir(), 'Library', 'Application Support', 'Int');
  return join(process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share'), 'int');
}

const DEFAULT_DATA_DIR = defaultDataDir();
export const LEGACY_DB_FILE = join(__dirname, '..', 'data', 'int-db.json');
export const DB_FILE = process.env.INT_DB_FILE || join(DEFAULT_DATA_DIR, 'int-db.json');
export const DATA_DIR = dirname(DB_FILE);
export const LOCAL_TIMEZONE = 'Asia/Seoul';
