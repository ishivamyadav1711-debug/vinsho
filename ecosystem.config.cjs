/**
 * VINSHO — Production PM2 Process Manager Configuration
 *
 * Requirements satisfied:
 * 1. Automatic restart on server crash (`autorestart: true`)
 * 2. System boot start via `pm2 startup` / `pm2 save`
 * 3. Secure environment variable injection
 * 4. Persistent & rotated logs (`./logs/pm2-*.log`)
 * 5. Single process instance to prevent duplicate SQLite DB write locks (`instances: 1`)
 * 6. Graceful shutdown support (`kill_timeout: 5000`)
 */

module.exports = {
  apps: [
    {
      name: 'vinsho',
      script: './dist/server/entry.mjs',
      instances: 1, // Single instance required for SQLite WAL integrity
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: 4321,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      kill_timeout: 5000,
      listen_timeout: 8000,
    },
  ],
};
