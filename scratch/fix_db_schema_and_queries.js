import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = path.resolve('data/vinsho.db');
const db = new Database(dbPath);

console.log('--- Step 1: Ensuring leads view/table exists ---');
// Check if leads table/view exists
const hasLeads = db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name = 'leads'").get();
if (!hasLeads) {
  // Create view leads pointing to enquiries table so queries for leads work seamlessly
  db.exec(`
    CREATE VIEW IF NOT EXISTS leads AS
    SELECT 
      id,
      customer_id,
      customer_name as name,
      customer_phone as phone,
      customer_email as email,
      company,
      location,
      source,
      collection_key,
      product_slug,
      status,
      assigned_to,
      last_contact_at,
      next_follow_up_at,
      created_at,
      updated_at
    FROM enquiries;
  `);
  console.log('Created SQL view "leads" pointing to enquiries table.');
}

db.close();

console.log('\n--- Step 2: Fixing double-quoted string literals in SQL queries ---');
function fixDoubleQuotes(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  // Replace payment_status = "paid" with payment_status = 'paid'
  content = content.replaceAll('payment_status = "paid"', "payment_status = 'paid'");
  content = content.replaceAll('status = "Converted"', "status = 'Converted'");
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed SQL string literals in ${path.relative(process.cwd(), filePath)}`);
  }
}

fixDoubleQuotes(path.resolve('src/pages/crm/analytics.astro'));
fixDoubleQuotes(path.resolve('src/pages/admin/analytics.astro'));
fixDoubleQuotes(path.resolve('src/pages/crm/dashboard.astro'));
fixDoubleQuotes(path.resolve('src/pages/admin/crm.astro'));

console.log('\nSchema & Query Fix Complete!');
