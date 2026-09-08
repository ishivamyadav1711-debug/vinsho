# VINSHO Database Backup & Disaster Recovery Guide

## Overview
VINSHO uses SQLite in WAL (Write-Ahead Logging) mode. This guide documents the production automated backup procedures, integrity verification, off-site replication, and step-by-step restoration procedures.

---

## 1. Automated Safe Online Backups

Backups are executed using SQLite's online backup API (`better-sqlite3` `.backup()`), which guarantees zero table lock errors and zero WAL log corruption while the server is live and servicing requests.

### Execution Command
```bash
node scripts/db-backup.js
```

### What Happens During Backup
1. **Online Lock & Copy:** The active database is safely copied online to `data/backups/vinsho_backup_YYYYMMDD_HHMMSS.db`.
2. **Integrity Verification:** Immediate execution of `PRAGMA integrity_check;` on the newly generated backup file. If any corrupt pages are detected, the file is automatically deleted and an alert is raised.
3. **Off-Site Replication:** If S3/R2 storage environment variables are configured (`S3_BACKUP_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`), the backup is synced to object storage.
4. **Retention Policy Pruning:** Automatically prunes local backups beyond the 30-day retention threshold.

---

## 2. Restoration Procedure

To restore the live database from a verified backup:

### Step 1: Stop the Application Server
```bash
pm2 stop vinsho
```

### Step 2: Perform Restore
```bash
node scripts/db-backup.js restore vinsho_backup_20260901_014220.db
```

### Step 3: Verify Integrity & Restart
```bash
node scripts/test-backup-restore.js
pm2 start vinsho
```

---

## 3. Automated Test Verification

To run an isolated end-to-end test of backup creation, integrity verification, and restoration without modifying the live database:

```bash
node scripts/test-backup-restore.js
```
