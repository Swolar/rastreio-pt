const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findUnique({
    where: { code: 'RESEND-TEST-238' }
  });
  
  if (order) {
    console.log(`Found Order: ${order.code}`);
    console.log(`Email: ${order.email}`);
    console.log(`Name: ${order.name}`);
  } else {
    console.log('Order RESEND-TEST-238 not found.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });