import fs from 'fs';
import path from 'path';

function inspect(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(item => {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      console.log('Subdir:', item, fs.readdirSync(full));
    } else {
      console.log('File:', item);
    }
  });
}

inspect('public/images/vinsho/products/Corporate-gifting/trivet_website_assets');
