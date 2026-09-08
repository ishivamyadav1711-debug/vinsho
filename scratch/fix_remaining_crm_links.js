import fs from 'fs';
import path from 'path';

function replaceInDir(dirPath) {
  const entries = fs.readdirSync(dirPath);
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      replaceInDir(fullPath);
    } else if (stat.isFile() && entry.endsWith('.astro')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;

      content = content.replaceAll("'/admin/customers'", "'/crm/customers'");
      content = content.replaceAll('"/admin/customers"', '"/crm/customers"');
      content = content.replaceAll("'/admin/leads'", "'/crm/leads'");
      content = content.replaceAll('"/admin/leads"', '"/crm/leads"');
      content = content.replaceAll("'/admin/products'", "'/crm/products'");
      content = content.replaceAll('"/admin/products"', '"/crm/products"');
      content = content.replaceAll("'/admin/login'", "'/crm/login'");
      content = content.replaceAll('"/admin/login"', '"/crm/login"');
      content = content.replaceAll("'/admin/crm'", "'/crm/dashboard'");
      content = content.replaceAll('"/admin/crm"', '"/crm/dashboard"');

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${path.relative(process.cwd(), fullPath)}`);
      }
    }
  }
}

replaceInDir(path.resolve('src/pages/crm'));
console.log('Finished fixing remaining frontend /admin links in src/pages/crm');
