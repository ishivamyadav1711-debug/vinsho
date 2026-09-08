import fs from 'fs';
import path from 'path';

const files = [
  'vinsho-content.json',
  'vinsho-commerce-seed.json',
  'vinsho-taxonomy.json',
  'vinsho-about-content.json',
  'src/pages/blog/index.astro',
  'src/lib/blog.ts',
  'src/components/NewsSection.astro',
  'src/pages/about.astro'
];

const urlRegex = /https:\/\/vinsho\.in\/wp-content\/uploads\/[^\s"'`,>)]+/g;

const allUrls = new Set();
const fileMap = {};

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.match(urlRegex) || [];
  fileMap[file] = matches.length;
  matches.forEach(u => allUrls.add(u));
}

console.log('=== MATCH COUNTS PER FILE ===');
console.log(fileMap);

console.log(`\n=== UNIQUE VINSHO.IN IMAGE URLS (${allUrls.size}) ===`);
Array.from(allUrls).sort().forEach((url, idx) => console.log(`${idx + 1}. ${url}`));
