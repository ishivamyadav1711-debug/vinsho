import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve('data/vinsho.db');
const db = new Database(dbPath);

db.exec(`
  DROP VIEW IF EXISTS leads;
  CREATE VIEW leads AS
  SELECT 
    id,
    customer_id,
    name,
    phone,
    email,
    '' as company,
    '' as location,
    source,
    '' as collection_key,
    '' as product_slug,
    status,
    assigned_to,
    created_at as last_contact_at,
    created_at as next_follow_up_at,
    created_at,
    updated_at
  FROM enquiries;
`);

console.log('Fixed VIEW leads definition!');

const leads = db.prepare('SELECT * FROM leads LIMIT 1').all();
console.log('Sample lead from view:', leads);

db.close();
