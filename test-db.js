import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  console.log('Products:', await prisma.products.count());
  console.log('Orders:', await prisma.orders.count());
  console.log('Customers:', await prisma.customers.count());
}
main().catch(console.error).finally(() => prisma.$disconnect());
