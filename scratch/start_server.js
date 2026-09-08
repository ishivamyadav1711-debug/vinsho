import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

console.log('Starting standalone Astro server in detached background mode...');

const logFile = path.join(process.cwd(), 'server.log');
const out = fs.openSync(logFile, 'a');
const err = fs.openSync(logFile, 'a');

// Spawn node dist/server/entry.mjs detached
const serverProcess = spawn('node', ['./dist/server/entry.mjs'], {
  cwd: process.cwd(),
  detached: true,
  stdio: ['ignore', out, err],
  env: {
    ...process.env,
    HOST: '0.0.0.0',
    PORT: '4321'
  }
});

serverProcess.unref();

console.log(`Server process started with PID ${serverProcess.pid}`);
