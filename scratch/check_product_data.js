import { getProductBySlug } from '../src/utils/taxonomy.ts';

const p = getProductBySlug('comforter-set');
console.log('=== COMFORTER SET DATA FROM TAXONOMY ===');
console.log('Name:', p?.name);
console.log('Tagline:', p?.tagline);
console.log('Description:', p?.description);
console.log('Features:', p?.features);
console.log('Closing Line:', p?.closing_line);
