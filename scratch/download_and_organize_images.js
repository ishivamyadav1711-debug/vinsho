import fs from 'fs';
import path from 'path';
import https from 'https';

const BASE_DIR = path.resolve('public/images/vinsho');
const FAILED_TXT = path.resolve('vinsho-images/failed.txt');

// Ensure target directories exist
fs.mkdirSync(path.join(BASE_DIR, 'products'), { recursive: true });
fs.mkdirSync(path.join(BASE_DIR, 'site'), { recursive: true });
fs.mkdirSync(path.join(BASE_DIR, 'brand'), { recursive: true });
fs.mkdirSync(path.dirname(FAILED_TXT), { recursive: true });

// Load JSON data files to categorize URLs
const commerceData = JSON.parse(fs.readFileSync('vinsho-commerce-seed.json', 'utf8'));
const contentData = JSON.parse(fs.readFileSync('vinsho-content.json', 'utf8'));
const taxonomyData = JSON.parse(fs.readFileSync('vinsho-taxonomy.json', 'utf8'));
const aboutData = JSON.parse(fs.readFileSync('vinsho-about-content.json', 'utf8'));

// Extract product image URLs
const productUrls = new Set();
if (Array.isArray(commerceData)) {
  commerceData.forEach(p => {
    if (p.images) p.images.forEach(img => productUrls.add(img));
    if (p.image) productUrls.add(p.image);
  });
}
if (taxonomyData && taxonomyData.subcategories) {
  taxonomyData.subcategories.forEach(s => {
    if (s.image) productUrls.add(s.image);
  });
}

// All URLs extracted across workspace
const allUrlsScript = fs.readFileSync('scratch/extract_all_image_urls.js', 'utf8');
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

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.match(urlRegex) || [];
  matches.forEach(u => allUrls.add(u));
}

// Add logo URLs if present
allUrls.add('https://vinsho.in/vinsho-logo.png');

console.log(`Found ${allUrls.size} total image URLs to download.`);

const manifest = {};
const failed = [];

function downloadFile(url, destPath) {
  return new Promise((resolve) => {
    const fileStream = fs.createWriteStream(destPath);
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadFile(res.headers.location, destPath).then(resolve);
      }
      if (res.statusCode !== 200) {
        fileStream.close();
        fs.unlinkSync(destPath);
        return resolve({ success: false, status: res.statusCode, error: `HTTP ${res.statusCode}` });
      }
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve({ success: true });
      });
    });
    req.on('error', (err) => {
      fileStream.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      resolve({ success: false, error: err.message });
    });
  });
}

async function run() {
  let count = 0;
  for (const url of Array.from(allUrls)) {
    count++;
    const urlObj = new URL(url);
    const originalName = path.basename(urlObj.pathname);
    
    let subfolder = 'site';
    if (url.includes('logo') || originalName.includes('logo')) {
      subfolder = 'brand';
    } else if (productUrls.has(url)) {
      subfolder = 'products';
    }

    const localFileName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const localRelPath = `/images/vinsho/${subfolder}/${localFileName}`;
    const destPath = path.join(BASE_DIR, subfolder, localFileName);

    console.log(`[${count}/${allUrls.size}] Downloading ${url} -> ${subfolder}/${localFileName}...`);

    let res = await downloadFile(url, destPath);
    if (!res.success) {
      console.log(`Retry 1 for ${url}...`);
      res = await downloadFile(url, destPath);
    }

    if (res.success) {
      manifest[url] = localRelPath;
    } else {
      console.error(`FAILED: ${url} (${res.error})`);
      failed.push(url);
    }
  }

  fs.writeFileSync('scratch/image_manifest.json', JSON.stringify(manifest, null, 2));
  fs.writeFileSync(FAILED_TXT, failed.join('\n'));

  console.log('\n=== DOWNLOAD SUMMARY ===');
  console.log(`Downloaded: ${Object.keys(manifest).length}`);
  console.log(`Failed: ${failed.length}`);
  if (failed.length > 0) {
    console.log(`Failed URLs logged to ${FAILED_TXT}`);
  }
}

run();
