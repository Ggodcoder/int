import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const DB_FILE = process.env.INT_DB_FILE || join(__dirname, '..', 'data', 'int-db.json');
export const LOCAL_TIMEZONE = 'Asia/Seoul';
