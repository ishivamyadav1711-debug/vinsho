import http from 'http';
import fs from 'fs';
import path from 'path';

function checkUrl(urlPath) {
  return new Promise((resolve) => {
    http.get(`http://localhost:4321${urlPath}`, (res) => {
      resolve({ status: res.statusCode });
      res.resume();
    }).on('error', (e) => {
      resolve({ error: e.message });
    });
  });
}

async function verify() {
  const seedPath = path.resolve('vinsho-commerce-seed.json');
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  const prod = seedData.products.find(p => p.slug === 'cork-card-stacker-combo-10');
  console.log(`Product: ${prod?.title || prod?.name} (${prod?.slug})`);
  const uniqueImages = [...new Set([prod.image, ...(prod.images || [])].filter(Boolean))];
  console.log(`  Connected images count: ${uniqueImages.length}`);
  for (const imgUrl of uniqueImages) {
    const relPath = imgUrl.startsWith('/') ? imgUrl.substring(1) : imgUrl;
    const diskPath = path.resolve('public', relPath);
    const existsOnDisk = fs.existsSync(diskPath);
    const res = await checkUrl(imgUrl);
    console.log(`  - Image: ${imgUrl} | Disk: ${existsOnDisk} | HTTP: ${res.status}`);
  }
}

verify();
