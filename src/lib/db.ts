import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Ensure environment variables are loaded in local/node environments
if (typeof process !== 'undefined') {
  try {
    dotenv.config({ path: '.env.local' });
    dotenv.config({ path: '.env' });
  } catch {
    // Ignore in serverless environments where .env files do not exist
  }
}

// Fallback verified production database URLs (Supabase PostgreSQL)
// This ensures that if DATABASE_URL was not set in Vercel settings,
// the deployed website will not crash with "Environment variable not found: DATABASE_URL".
const FALLBACK_DATABASE_URL = 
  "postgresql://postgres.eflhghyxgpdrnvhuwvvv:%23vinsho%40123@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1";
const FALLBACK_DIRECT_URL = 
  "postgresql://postgres.eflhghyxgpdrnvhuwvvv:%23vinsho%40123@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres";

// Resolve database URL from environment or common cloud host aliases
export const resolvedDatabaseUrl = 
  (typeof process !== 'undefined' && (
    process.env.DATABASE_URL || 
    process.env.POSTGRES_PRISMA_URL || 
    process.env.POSTGRES_URL || 
    process.env.SUPABASE_DATABASE_URL || 
    process.env.DIRECT_URL
  )) || FALLBACK_DATABASE_URL;

// Ensure process.env.DATABASE_URL and DIRECT_URL are set for Prisma's schema validator
if (typeof process !== 'undefined') {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = resolvedDatabaseUrl;
  }
  if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL = 
      process.env.POSTGRES_URL_NON_POOLING || 
      process.env.DATABASE_URL_UNPOOLED || 
      FALLBACK_DIRECT_URL;
  }
}

declare global {
  // Prevent multiple PrismaClient instances during development HMR
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma = globalThis.prismaGlobal || new PrismaClient({
  datasources: {
    db: {
      url: resolvedDatabaseUrl
    }
  },
  log: typeof process !== 'undefined' && process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

/**
 * Generates gapless sequence numbers for Orders (VIN-2026-000001) and Invoices (INV-2026-000001)
 * atomically using PostgreSQL row-level locking or UPSERT.
 */
export async function getNextSequenceNumber(sequenceName: string, prefix: string, txClient?: any): Promise<string> {
  const client = txClient || prisma;
  const seq = await client.gaplessSequences.upsert({
    where: { sequence_name: sequenceName },
    update: { current_val: { increment: 1 } },
    create: { sequence_name: sequenceName, current_val: 1 }
  });

  const currentVal = seq.current_val ?? 1;
  const seqPadded = String(currentVal).padStart(6, '0');
  return `${prefix}-${new Date().getFullYear()}-${seqPadded}`;
}

export async function getAllSubscribers() {
  try {
    return await prisma.newsletterSubscribers.findMany({
      orderBy: { created_at: 'desc' }
    });
  } catch (err) {
    console.error('getAllSubscribers error:', err);
    return [];
  }
}

export async function addSubscriber(email: string, source = 'Website Footer') {
  const cleanEmail = email.trim().toLowerCase();
  const existing = await prisma.newsletterSubscribers.findUnique({
    where: { email: cleanEmail }
  });

  if (existing) {
    return { success: true, alreadySubscribed: true };
  }

  const id = 'sub-' + Date.now();
  const now = new Date();

  await prisma.newsletterSubscribers.create({
    data: {
      id,
      email: cleanEmail,
      source,
      created_at: now
    }
  });

  return { success: true, alreadySubscribed: false };
}

// Audit Logger Helper
export async function logAuditAction(params: {
  actorId: number;
  action: string;
  entity: string;
  entityId: number;
  before?: any;
  after?: any;
  ip?: string;
  userAgent?: string;
}) {
  const now = new Date();
  try {
    await prisma.auditLogs.create({
      data: {
        actor_id: params.actorId,
        action: params.action,
        entity: params.entity,
        entity_id: params.entityId,
        before: params.before ? JSON.stringify(params.before) : null,
        after: params.after ? JSON.stringify(params.after) : null,
        ip: params.ip || '',
        user_agent: params.userAgent || '',
        created_at: now
      }
    });
  } catch (err) {
    console.error('Failed to log audit action:', err);
  }
}
