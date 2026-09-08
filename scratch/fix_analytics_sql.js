import fs from 'fs';
import path from 'path';

function fixAnalytics(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace("db.prepare('SELECT COALESCE(SUM(grand_total), 0) as val FROM orders WHERE payment_status = 'paid'')", "db.prepare(`SELECT COALESCE(SUM(grand_total), 0) as val FROM orders WHERE payment_status = 'paid'`)");
  content = content.replace("db.prepare('SELECT COALESCE(SUM(grand_total), 0) as val FROM orders WHERE payment_status = 'paid' AND strftime(\"%Y-%m\", placed_at) = ?')", "db.prepare(`SELECT COALESCE(SUM(grand_total), 0) as val FROM orders WHERE payment_status = 'paid' AND strftime('%Y-%m', placed_at) = ?`)");
  content = content.replace("db.prepare('SELECT COUNT(*) as cnt FROM orders WHERE payment_status = 'paid'')", "db.prepare(`SELECT COUNT(*) as cnt FROM orders WHERE payment_status = 'paid'`)");
  content = content.replace("db.prepare('SELECT COUNT(*) as cnt FROM enquiries WHERE status = 'Converted'')", "db.prepare(`SELECT COUNT(*) as cnt FROM enquiries WHERE status = 'Converted'`)");

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed syntax in ${path.relative(process.cwd(), filePath)}`);
}

fixAnalytics(path.resolve('src/pages/crm/analytics.astro'));
fixAnalytics(path.resolve('src/pages/admin/analytics.astro'));
console.log('Analytics fix complete!');
