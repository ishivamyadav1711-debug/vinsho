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
  console.log('--- Verifying 28 Products Image Integration ---');
  
  const seedPath = path.resolve('vinsho-commerce-seed.json');
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  const targetTitles = [
    'Cork Tablemat ChocoChip',
    'Cork Tablemat Abstract',
    'Cork Tablemat Oval Red Assiago',
    'Cork Tablemat Red Assiago',
    'Smoky Black Small Round Tray',
    'Box Print Table Top T.T. Planter',
    'Box Print Table Top Test Tube Planter Combo-46',
    'ChocoChip Square Planter',
    'Cork Belly Planter',
    'Cork Conical Flask Planter',
    'Diamond Square Planter',
    'Feather Printed Tabletop T.T. Planter',
    'Multi Printed Tabletop T.T. Planter',
    'Natural Bark Planter',
    'Round Linear Planter',
    'Rectangular Test Tube Planter',
    'Round Fine Grain Planter',
    'Wall Frame Test Tube Planter',
    'Ecodesk Diary A5 Combo 10',
    'Cork Tea Light Holder Assorted C-46',
    'Natural Tray 9x9 Inch Combo-46',
    'Mouse Pad Super Fine Grain C-36',
    'Small Calender Combo-36',
    'Passport Holder Granco Combo-19',
    'Cork Bottle Granco Combo-19',
    'Jet Case Brown Bag Combo-19',
    'Cork Bottle Ocean Mist Combo-18',
    'Cork Canvas Sleeve Combo 10'
  ];

  let totalProductsChecked = 0;
  let totalImagesChecked = 0;
  let failedImages = 0;

  const normalize = (str) => (str || '').toLowerCase().replace(/[*x×]/g, 'x').replace(/\s+/g, ' ').trim();

  for (const title of targetTitles) {
    const targetNorm = normalize(title);
    const prods = seedData.products.filter(p => {
      const pTitle = normalize(p.title);
      const pName = normalize(p.name);
      return pTitle.includes(targetNorm) || targetNorm.includes(pTitle) || pName.includes(targetNorm);
    });
    if (prods.length === 0) {
      console.error(`X Missing product: ${title}`);
      continue;
    }
    
    for (const prod of prods) {
      totalProductsChecked++;
      console.log(`\nProduct: ${prod.title} (slug: ${prod.slug})`);
      const imagesToCheck = [prod.image, ...(prod.images || [])];
      const uniqueImages = [...new Set(imagesToCheck.filter(Boolean))];
      
      console.log(`  Connected images: ${uniqueImages.length}`);
      for (const imgUrl of uniqueImages) {
        if (!imgUrl.includes('cork_product_images_mapping')) continue;
        totalImagesChecked++;
        // Check if file exists on disk
        const relPath = imgUrl.startsWith('/') ? imgUrl.substring(1) : imgUrl;
        const diskPath = path.resolve('public', relPath);
        const existsOnDisk = fs.existsSync(diskPath);
        
        // Check via HTTP
        const encodedUrl = imgUrl.split('/').map(encodeURIComponent).join('/');
        const res = await checkUrl(encodedUrl);
        
        if (existsOnDisk && res.status === 200) {
          console.log(`  ✓ Image OK: ${imgUrl}`);
        } else {
          failedImages++;
          console.error(`  X Image Failed: ${imgUrl} (Disk: ${existsOnDisk}, HTTP: ${res.status})`);
        }
      }
    }
  }

  console.log('\n================ VERIFICATION SUMMARY ================');
  console.log(`Products verified: ${totalProductsChecked}`);
  console.log(`Total image URLs checked: ${totalImagesChecked}`);
  console.log(`Failed images: ${failedImages}`);
  console.log('======================================================');
}

verify();
