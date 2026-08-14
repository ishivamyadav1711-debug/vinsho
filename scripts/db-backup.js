import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.join(process.cwd(), 'data');
const backupsDir = path.join(dataDir, 'backups');
const dbPath = path.join(dataDir, 'vinsho.db');

if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

const mode = process.argv[2]; // 'backup' or 'restore'
const restoreFileArg = process.argv[3];

if (mode === 'restore') {
  if (!restoreFileArg) {
    console.error('Error: Please specify the backup filename to restore. Example: node scripts/db-backup.js restore vinsho_backup_20260810_120000.db');
    process.exit(1);
  }
  const targetBackup = path.isAbsolute(restoreFileArg) 
    ? restoreFileArg 
    : path.join(backupsDir, restoreFileArg);

  if (!fs.existsSync(targetBackup)) {
    console.error(`Error: Backup file not found at ${targetBackup}`);
    process.exit(1);
  }

  fs.copyFileSync(targetBackup, dbPath);
  console.log(`✓ Database successfully restored from ${path.basename(targetBackup)}.`);
} else {
  // Backup mode (default)
  if (!fs.existsSync(dbPath)) {
    console.error(`Error: Source database ${dbPath} does not exist.`);
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_');
  const backupFileName = `vinsho_backup_${timestamp}.db`;
  const backupPath = path.join(backupsDir, backupFileName);

  fs.copyFileSync(dbPath, backupPath);
  console.log(`✓ Database backup successfully created at data/backups/${backupFileName}.`);
}
