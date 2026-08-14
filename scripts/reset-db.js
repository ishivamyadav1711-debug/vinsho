import fs from 'node:fs';
import path from 'node:path';

const dbPath = path.join(process.cwd(), 'data', 'vinsho.db');
const shmPath = path.join(process.cwd(), 'data', 'vinsho.db-shm');
const walPath = path.join(process.cwd(), 'data', 'vinsho.db-wal');

[dbPath, shmPath, walPath].forEach((p) => {
  if (fs.existsSync(p)) {
    try {
      fs.unlinkSync(p);
      console.log(`Deleted old database file: ${path.basename(p)}`);
    } catch (err) {
      console.warn(`Could not delete ${p}: ${err.message}`);
    }
  }
});

console.log('Database reset complete.');
