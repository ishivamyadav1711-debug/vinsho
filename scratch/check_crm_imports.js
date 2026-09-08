import fs from 'fs';
import path from 'path';

function checkDir(dirPath) {
  const entries = fs.readdirSync(dirPath);
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      checkDir(fullPath);
    } else if (stat.isFile() && entry.endsWith('.astro')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('import ') && line.includes('from ')) {
          const match = line.match(/from\s+['"]([^'"]+)['"]/);
          if (match) {
            const importPath = match[1];
            if (importPath.startsWith('.')) {
              const resolvedPath = path.resolve(path.dirname(fullPath), importPath);
              let exists = fs.existsSync(resolvedPath);
              if (!exists) {
                // Try with extensions
                exists = fs.existsSync(resolvedPath + '.ts') ||
                         fs.existsSync(resolvedPath + '.astro') ||
                         fs.existsSync(resolvedPath + '.js') ||
                         fs.existsSync(path.join(resolvedPath, 'index.ts'));
              }
              if (!exists) {
                console.error(`X Missing import in ${path.relative(process.cwd(), fullPath)} L${i+1}: ${importPath} -> ${resolvedPath}`);
              }
            }
          }
        }
      }
    }
  }
}

console.log('--- Checking imports in src/pages/crm ---');
checkDir(path.resolve('src/pages/crm'));
console.log('--- Check complete ---');
