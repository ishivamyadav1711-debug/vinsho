# VINSHO Production Server & Process Management Guide

## Process Manager: PM2

VINSHO uses **PM2** for production process management. This ensures automatic restarts on failure, zero duplicate SQLite writer instances, secure environment variable loading, rotated logging, and graceful shutdown handling.

---

## 1. Process Operations

### Build Production Bundle
```bash
npm run build
```

### Start Server in Production Mode
```bash
pm2 start ecosystem.config.cjs
```

### Check Process Status & Logs
```bash
pm2 status
pm2 logs vinsho
```

### Restart Server (Graceful Restart)
```bash
pm2 restart vinsho
```

### Stop Server (Triggers Graceful SQLite Closure)
```bash
pm2 stop vinsho
```

---

## 2. Server Boot Persistence (Auto-Start on Reboot)

To configure PM2 to automatically start VINSHO when the host server reboots:

```bash
pm2 startup
pm2 save
```

---

## 3. Log Rotation

PM2 log output is written to:
- Standard output: `./logs/pm2-out.log`
- Error output: `./logs/pm2-error.log`

To enable automatic daily log rotation with 14-day retention:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
```
