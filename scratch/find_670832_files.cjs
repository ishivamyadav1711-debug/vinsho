const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    if (file === 'node_modules' || file === '.git' || file === '.astro' || file === 'dist') continue;
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else {
      files.push(name);
    }
  }
  return files;
}

const allFiles = getFiles(rootDir);
const matches = [];

allFiles.forEach(filePath => {
  if (filePath.endsWith('.jpg') || filePath.endsWith('.png') || filePath.endsWith('.db') || filePath.endsWith('.webp')) return;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (/670832/i.test(content)) {
      matches.push(filePath);
    }
  } catch (err) {}
});

console.log(`Found ${matches.length} files containing #8A174B:`);
matches.forEach(m => console.log(' -', path.relative(rootDir, m)));
