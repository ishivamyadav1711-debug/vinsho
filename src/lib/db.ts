import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
if (typeof process !== 'undefined') {
  dotenv.config({ path: '.env.local' });
  dotenv.config({ path: '.env' });
}

declare global {
  // Prevent multiple PrismaClient instances during development HMR
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma = globalThis.prismaGlobal || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

/**
 * Generates gapless sequence numbers for Orders (VIN-2026-000001) and Invoices (INV-2026-000001)
 * atomically using PostgreSQL row-level locking or UPSERT.
 */
export async function getNextSequenceNumber(sequenceName: string, prefix: string): Promise<string> {
  const result = await prisma.$transaction(async (tx) => {
    // Atomically upsert sequence row in PostgreSQL
    const seq = await tx.gaplessSequences.upsert({
      where: { sequence_name: sequenceName },
      update: { current_val: { increment: 1 } },
      create: { sequence_name: sequenceName, current_val: 1 }
    });

    const currentVal = seq.current_val ?? 1;
    const seqPadded = String(currentVal).padStart(6, '0');
    return `${prefix}-${new Date().getFullYear()}-${seqPadded}`;
  });

  return result;
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
