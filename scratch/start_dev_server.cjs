const { spawn } = require('child_process');
const path = require('path');

console.log('Spawning Astro dev server detached...');
const child = spawn('npx', ['astro', 'dev', '--host', '127.0.0.1', '--port', '4321'], {
  cwd: process.cwd(),
  detached: true,
  stdio: 'ignore',
  shell: true
});

child.unref();
console.log('Astro dev server process spawned with PID:', child.pid);
