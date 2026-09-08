import fs from 'fs';
import path from 'path';

function fixTableInDir(dirPath) {
  const entries = fs.readdirSync(dirPath);
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      fixTableInDir(fullPath);
    } else if (stat.isFile() && entry.endsWith('.astro')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('FROM users')) {
        content = content.replaceAll('FROM users', 'FROM admin_users');
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated FROM users -> FROM admin_users in ${path.relative(process.cwd(), fullPath)}`);
      }
    }
  }
}

fixTableInDir(path.resolve('src/pages/crm'));
fixTableInDir(path.resolve('src/pages/admin'));
console.log('Table query fixes complete!');
