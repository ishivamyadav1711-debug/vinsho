import fs from 'fs';

const files = [
  'vinsho-content.json.bak',
  'vinsho-commerce-seed.json.bak',
  'vinsho-taxonomy.json.bak',
  'vinsho-about-content.json.bak'
];

const urlRegex = /https?:\/\/[^\s"'`,>)]+vinsho\.in[^\s"'`,>)]*/g;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.match(urlRegex) || [];
  console.log(`${file}: ${matches.length} vinsho.in matches`);
  matches.forEach(m => console.log('  -', m));
}
