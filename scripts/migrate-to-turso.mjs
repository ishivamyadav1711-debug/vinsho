import { createClient } from '@libsql/client';
import 'dotenv/config';

async function migrate() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env file.');
    process.exit(1);
  }

  console.log('📦 Connecting to local database (data/vinsho.db)...');
  const localDb = createClient({ url: 'file:data/vinsho.db' });

  console.log('☁️  Connecting to Turso Cloud database...');
  const remoteDb = createClient({ 
    url: process.env.TURSO_DATABASE_URL, 
    authToken: process.env.TURSO_AUTH_TOKEN 
  });

  try {
    // 1. Get all tables from local DB
    console.log('🔍 Discovering tables...');
    const tablesRes = await localDb.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    
    const tables = tablesRes.rows.map(r => r.name);
    console.log(`Found ${tables.length} tables:`, tables.join(', '));

    // 2. We don't need to create schemas, the application will create them if missing.
    // Actually, to be safe, let's grab the schemas.
    const schemasRes = await localDb.execute(`
      SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    
    console.log('🏗️  Creating tables on Turso...');
    for (const row of schemasRes.rows) {
      if (row.sql) {
        await remoteDb.execute(row.sql);
      }
    }

    // 3. Copy all data
    console.log('🚀 Starting data migration...');
    
    for (const table of tables) {
      console.log(`\nMigrating table: ${table}...`);
      const data = await localDb.execute(`SELECT * FROM ${table}`);
      
      if (data.rows.length === 0) {
        console.log(`   - 0 rows (Skipping)`);
        continue;
      }

      const columns = data.columns.join(', ');
      const placeholders = data.columns.map(() => '?').join(', ');
      const insertSql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;

      // Insert rows in batches
      let tx = await remoteDb.transaction('write');
      let count = 0;
      
      for (const row of data.rows) {
        const args = data.columns.map(col => row[col]);
        await tx.execute({ sql: insertSql, args });
        count++;
        
        if (count % 50 === 0) {
          await tx.commit();
          tx = await remoteDb.transaction('write');
        }
      }
      await tx.commit();
      console.log(`   ✅ Copied ${count} rows`);
    }

    console.log('\n🎉 Migration complete! Your Turso database is ready for production.');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error during migration:', error);
    process.exit(1);
  }
}

migrate();
