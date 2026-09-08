import { getAllProducts, getProductBySlug } from '../src/utils/taxonomy.js';

const all = getAllProducts();
console.log('Total products from getAllProducts():', all.length);

const found = getProductBySlug('round-napkin-ring');
console.log('getProductBySlug("round-napkin-ring"):', found);
