// Deletes the E2E SQLite file and creates its folder. The API then starts with an empty database.
// Usage: node e2e/reset-db.mjs <path to db file>
import fs from 'node:fs';
import path from 'node:path';

const dbFile = process.argv[2];
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
fs.rmSync(dbFile, { force: true });
