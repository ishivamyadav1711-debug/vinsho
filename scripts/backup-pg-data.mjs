import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const prisma = new PrismaClient();

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve('backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupPath = path.join(backupDir, `pg-backup-before-crm-clean-${timestamp}.json`);

  console.log('Starting PostgreSQL safety backup to:', backupPath);

  const data = {
    timestamp: new Date().toISOString(),
    collections: await prisma.collections.findMany(),
    subcategories: await prisma.subcategories.findMany(),
    products: await prisma.products.findMany(),
    productVariants: await prisma.productVariants.findMany(),
    productImages: await prisma.productImages.findMany(),
    adminUsers: await prisma.adminUsers.findMany(),
    customers: await prisma.customers.findMany(),
    addresses: await prisma.addresses.findMany(),
    orders: await prisma.orders.findMany(),
    orderItems: await prisma.orderItems.findMany(),
    payments: await prisma.payments.findMany(),
    paymentEvents: await prisma.paymentEvents.findMany(),
    returns: await prisma.returns.findMany(),
    returnItems: await prisma.returnItems.findMany(),
    carts: await prisma.carts.findMany(),
    cartItems: await prisma.cartItems.findMany(),
    enquiries: await prisma.enquiries.findMany(),
    subscribers: await prisma.newsletterSubscribers.findMany(),
    crmActivities: await prisma.crmActivities.findMany(),
    inventoryTxns: await prisma.inventoryTxns.findMany(),
    gaplessSequences: await prisma.gaplessSequences.findMany(),
    auditLogs: await prisma.auditLogs.findMany()
  };

  fs.writeFileSync(backupPath, JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2), 'utf8');
  console.log(`Backup completed successfully! Size: ${(fs.statSync(backupPath).size / 1024).toFixed(2)} KB`);
}

backup().catch(console.error).finally(() => prisma.$disconnect());
