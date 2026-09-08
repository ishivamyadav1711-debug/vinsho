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
let modifiedCount = 0;

allFiles.forEach(filePath => {
  if (filePath.endsWith('.jpg') || filePath.endsWith('.png') || filePath.endsWith('.db') || filePath.endsWith('.webp')) return;

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace #8A174B (case insensitive) -> #8A174B
    content = content.replace(/#8A174B/gi, '#8A174B');

    // Replace rgba(138, 23, 75) -> rgb(138, 23, 75)
    content = content.replace(/rgba?\(103,\s*8,\s*50/g, 'rgba(138, 23, 75');
    content = content.replace(/rgba?\(103,8,50/g, 'rgba(138,23,75');

    // Replace darker maroon hover variants #6B0E38 / #4E0526 / #6B0E38 -> #6B0E38
    content = content.replace(/#6B0E38/gi, '#6B0E38');
    content = content.replace(/#6B0E38/gi, '#6B0E38');
    content = content.replace(/#720E3B/gi, '#720E3B');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      modifiedCount++;
      console.log('✓ Updated:', path.relative(rootDir, filePath));
    }
  } catch (err) {
    console.error('Error reading/writing', filePath, err.message);
  }
});

console.log(`\nReplacement complete! Total files updated: ${modifiedCount}`);
