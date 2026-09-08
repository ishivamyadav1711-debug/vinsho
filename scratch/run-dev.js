import { dev } from 'astro';

async function start() {
  console.log('Starting Astro dev server programmatically...');
  const server = await dev({
    root: '.',
    server: {
      host: '127.0.0.1',
      port: 4321
    }
  });
  console.log('Astro dev server running!');
}

start().catch((err) => {
  console.error('Error starting server:', err);
});
