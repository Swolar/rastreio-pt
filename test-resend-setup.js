
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const code = 'RESEND-TEST-' + Math.floor(Math.random() * 1000);
  
  const order = await prisma.order.create({
    data: {
      code: code,
      name: 'Cliente Teste Reenvio',
      email: 'onboarding@resend.dev',
      address: 'Rua Teste, 123',
      status: 5, // Delivery Failed
      resendAttempts: 0,
      resendStatus: 'ACTIVE'
    }
  });

  console.log('Order created:', order);
  const baseUrl = process.env.BASE_URL || 'https://rastreio-pt.onrender.com';
  console.log(`Access ${baseUrl}/reenvio/${code} to test.`);
  
  // Also create one that is at limit
  const limitCode = 'LIMIT-TEST-' + Math.floor(Math.random() * 1000);
  await prisma.order.create({
    data: {
      code: limitCode,
      name: 'Cliente Limite',
      email: 'onboarding@resend.dev',
      address: 'Rua Limite, 999',
      status: 5,
      resendAttempts: 5,
      resendStatus: 'ACTIVE' // Controller should catch attempts >= 5
    }
  });
  console.log(`Access ${baseUrl}/reenvio/${limitCode} to test limit (should show returned or blocked).`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
