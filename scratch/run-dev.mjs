import { cli } from '../node_modules/astro/dist/cli/index.js';

process.argv = ['node', 'astro', 'dev', '--port', '4321', '--host', '0.0.0.0'];

console.log('Starting Astro CLI directly...');
try {
  await cli(process.argv);
  console.log('CLI call resolved');
} catch (e) {
  console.error('CLI call error:', e);
}
