import fs from 'fs';

const manifest = JSON.parse(fs.readFileSync('scratch/image_manifest.json', 'utf8'));

const codeFiles = [
  'src/pages/blog/index.astro',
  'src/lib/blog.ts',
  'src/components/NewsSection.astro',
  'src/pages/about.astro'
];

let totalHits = 0;

for (const file of codeFiles) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  let fileHits = 0;

  for (const [remoteUrl, localPath] of Object.entries(manifest)) {
    if (content.includes(remoteUrl)) {
      const count = content.split(remoteUrl).length - 1;
      content = content.replaceAll(remoteUrl, localPath);
      fileHits += count;
    }
  }

  if (fileHits > 0) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}: ${fileHits} references replaced.`);
    totalHits += fileHits;
  }
}

// Update astro.config.mjs to remove vinsho.in from image domain allowlist
const astroConfigPath = 'astro.config.mjs';
if (fs.existsSync(astroConfigPath)) {
  let configContent = fs.readFileSync(astroConfigPath, 'utf8');
  if (configContent.includes("'vinsho.in',")) {
    configContent = configContent.replace("'vinsho.in', ", "").replace("'vinsho.in',", "");
    fs.writeFileSync(astroConfigPath, configContent, 'utf8');
    console.log(`Updated ${astroConfigPath}: removed 'vinsho.in' from image domains allowlist.`);
  }
}

console.log(`\n=== SWEEP COMPLETED: ${totalHits} code references updated ===`);
