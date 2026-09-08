import fs from 'fs';
import path from 'path';

console.log('=== AUDITING ALL CART DEPENDENCIES IN CODEBASE ===\n');

function findInDir(dir, filter, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!filePath.includes('node_modules') && !filePath.includes('.astro') && !filePath.includes('.git')) {
        findInDir(filePath, filter, fileList);
      }
    } else if (filter.test(filePath)) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const allFiles = findInDir('.', /\.(astro|ts|js|json|css|md)$/);

const cartKeywords = [
  'cart-store',
  'addLocalCartItem',
  'getLocalCartState',
  'openCartDrawer',
  'syncCartWithBackend',
  'removeLocalCartItem',
  'updateLocalCartItemQty',
  'cartN',
  '/cart',
  '/checkout',
  'Add to Cart',
  'Buy Now',
  'api/cart',
  'api/checkout'
];

const matchesByFile = {};

allFiles.forEach((file) => {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const matched = [];
    cartKeywords.forEach((kw) => {
      if (content.includes(kw)) {
        matched.push(kw);
      }
    });
    if (matched.length > 0) {
      matchesByFile[file] = matched;
    }
  } catch (err) {
    // Ignore binary
  }
});

console.log(`Found ${Object.keys(matchesByFile).length} files containing cart dependencies:\n`);
Object.entries(matchesByFile).forEach(([file, kws]) => {
  console.log(`- ${file}: [${kws.join(', ')}]`);
});
