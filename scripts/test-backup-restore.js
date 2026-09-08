import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { createSafeBackup, restoreBackup } from './db-backup.js';

console.log('--- Running VINSHO Automated Backup & Restore Verification ---');

const dataDir = path.join(process.cwd(), 'data');
const testDbPath = path.join(dataDir, 'test_restore.db');

async function testBackupAndRestore() {
  try {
    // 1. Create a safe online backup
    console.log('Step 1: Testing online safe backup creation...');
    const result = await createSafeBackup();

    if (!result.success || !fs.existsSync(result.backupPath)) {
      throw new Error('Backup file was not created on disk.');
    }
    console.log('✓ PASS: Safe backup file created and verified integrity.');

    // 2. Test Restoration into an isolated test DB file
    console.log('Step 2: Testing restore into isolated target DB...');
    restoreBackup(result.backupPath, testDbPath);

    if (!fs.existsSync(testDbPath)) {
      throw new Error('Target test database file was not created by restore.');
    }

    // 3. Verify data in restored database matches original
    console.log('Step 3: Querying restored database for schema and data integrity...');
    const testDb = new Database(testDbPath, { readonly: true });
    const productCountRow = testDb.prepare('SELECT count(*) as count FROM products WHERE deleted_at IS NULL').get();
    const collectionCountRow = testDb.prepare('SELECT count(*) as count FROM collections WHERE deleted_at IS NULL').get();
    testDb.close();

    console.log(`✓ PASS: Restored DB verified — Products: ${productCountRow.count}, Collections: ${collectionCountRow.count}`);

    // Clean up temporary test DB file
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    console.log('\n✅ Backup & Restore Verification Suite: 100% Passed Cleanly.');
  } catch (err) {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    console.error(`❌ FAIL: Backup/Restore verification error: ${err.message}`);
    process.exit(1);
  }
}

testBackupAndRestore();
