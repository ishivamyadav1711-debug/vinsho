import dev from '../node_modules/astro/dist/core/dev/dev.js';

console.log('Starting Astro Dev Server programmatically...');
try {
  const server = await dev({
    root: process.cwd(),
  });
  console.log('SUCCESS! Dev server started programmatically.');
  // Keep process alive
  setInterval(() => {}, 10000);
} catch (err) {
  console.error('Error starting dev server:', err);
}
