import fs from 'fs';
import path from 'path';

const BASE_DIR = path.resolve('public/images/vinsho');

const productsDir = path.join(BASE_DIR, 'products');
const siteDir = path.join(BASE_DIR, 'site');
const brandDir = path.join(BASE_DIR, 'brand');

fs.mkdirSync(productsDir, { recursive: true });
fs.mkdirSync(siteDir, { recursive: true });
fs.mkdirSync(brandDir, { recursive: true });

const commerceData = JSON.parse(fs.readFileSync('vinsho-commerce-seed.json', 'utf8'));
const taxonomyData = JSON.parse(fs.readFileSync('vinsho-taxonomy.json', 'utf8'));

const productUrls = new Set();

const productsList = commerceData.products || (Array.isArray(commerceData) ? commerceData : []);
productsList.forEach(p => {
  if (p.images) p.images.forEach(img => productUrls.add(path.basename(img.trim())));
  if (p.image) productUrls.add(path.basename(p.image.trim()));
});

if (taxonomyData && taxonomyData.subcategories) {
  taxonomyData.subcategories.forEach(s => {
    if (s.image) productUrls.add(path.basename(s.image.trim()));
  });
}

console.log(`Identified ${productUrls.size} unique product image filenames.`);

// Move files between site, products, brand based on filenames
const allImageFiles = [
  ...fs.readdirSync(siteDir).map(f => ({ name: f, dir: siteDir })),
  ...fs.readdirSync(productsDir).map(f => ({ name: f, dir: productsDir })),
  ...fs.readdirSync(brandDir).map(f => ({ name: f, dir: brandDir }))
];

allImageFiles.forEach(({ name, dir }) => {
  let targetDir = siteDir;
  if (productUrls.has(name)) {
    targetDir = productsDir;
  } else if (name.includes('logo')) {
    targetDir = brandDir;
  }

  const currentPath = path.join(dir, name);
  const targetPath = path.join(targetDir, name);

  if (currentPath !== targetPath) {
    fs.renameSync(currentPath, targetPath);
    console.log(`Moved ${name} -> ${path.basename(targetDir)}/`);
  }
});

// Build accurate manifest mapping for all remote URLs in workspace
const workspaceFiles = [
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

for (const file of workspaceFiles) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.match(urlRegex) || [];
  matches.forEach(u => allUrls.add(u.trim()));
}

const manifest = {};

for (const url of allUrls) {
  const fileName = path.basename(url);
  if (fs.existsSync(path.join(productsDir, fileName))) {
    manifest[url] = `/images/vinsho/products/${fileName}`;
  } else if (fs.existsSync(path.join(siteDir, fileName))) {
    manifest[url] = `/images/vinsho/site/${fileName}`;
  } else if (fs.existsSync(path.join(brandDir, fileName))) {
    manifest[url] = `/images/vinsho/brand/${fileName}`;
  } else {
    console.warn(`MISSING LOCAL ASSET FOR: ${url}`);
  }
}

fs.writeFileSync('scratch/image_manifest.json', JSON.stringify(manifest, null, 2));

console.log('\n=== REORGANIZATION SUMMARY ===');
console.log(`Products images count: ${fs.readdirSync(productsDir).length}`);
console.log(`Site images count: ${fs.readdirSync(siteDir).length}`);
console.log(`Brand images count: ${fs.readdirSync(brandDir).length}`);
console.log(`Manifest URL mappings: ${Object.keys(manifest).length}`);
