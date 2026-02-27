const { PrismaClient } = require('@prisma/client');

// Explicitly pass the datasource URL
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  const orders = [
    {
      code: 'AAAA-BBBB-1234',
      name: 'João Silva',
      email: 'joao.silva@example.com',
      address: 'Rua das Flores, 123, Lisboa',
      status: 2, // Enviado
      events: {
        create: [
          { status: 0, description: 'Pedido Confirmado', timestamp: new Date(Date.now() - 86400000 * 2) },
          { status: 1, description: 'Em Processamento', timestamp: new Date(Date.now() - 86400000 * 1) },
          { status: 2, description: 'Enviado', timestamp: new Date() }
        ]
      }
    },
    {
      code: 'CCCC-DDDD-5678',
      name: 'Maria Santos',
      email: 'maria.santos@example.com',
      address: 'Av. da Liberdade, 456, Porto',
      status: 0, // Confirmado
      events: {
        create: [
          { status: 0, description: 'Pedido Confirmado', timestamp: new Date() }
        ]
      }
    },
    {
      code: 'EEEE-FFFF-9012',
      name: 'Carlos Oliveira',
      email: 'carlos.oliveira@example.com',
      address: 'Rua Augusta, 789, Coimbra',
      status: 4, // Saiu para Entrega
      events: {
        create: [
          { status: 0, description: 'Pedido Confirmado', timestamp: new Date(Date.now() - 86400000 * 4) },
          { status: 1, description: 'Em Processamento', timestamp: new Date(Date.now() - 86400000 * 3) },
          { status: 2, description: 'Enviado', timestamp: new Date(Date.now() - 86400000 * 2) },
          { status: 3, description: 'Em Trânsito', timestamp: new Date(Date.now() - 86400000 * 1) },
          { status: 4, description: 'Saiu para Entrega', timestamp: new Date() }
        ]
      }
    },
    {
      code: 'RESEND-TEST-238',
      name: 'Teste Resend',
      email: 'onboarding@resend.dev',
      address: 'Rua de Teste, 123, Lisboa',
      status: 6, // Falha na Entrega
      events: {
        create: [
          { status: 0, description: 'Pedido Confirmado', timestamp: new Date(Date.now() - 86400000 * 5) },
          { status: 1, description: 'Em Processamento', timestamp: new Date(Date.now() - 86400000 * 4) },
          { status: 2, description: 'Enviado', timestamp: new Date(Date.now() - 86400000 * 3) },
          { status: 3, description: 'Em Trânsito', timestamp: new Date(Date.now() - 86400000 * 2) },
          { status: 4, description: 'Saiu para Entrega', timestamp: new Date(Date.now() - 86400000 * 1) },
          { status: 5, description: 'Tentativa de Entrega', timestamp: new Date(Date.now() - 43200000) },
          { status: 6, description: 'Falha na Entrega', timestamp: new Date() }
        ]
      }
    }
  ];

  for (const o of orders) {
    try {
      const order = await prisma.order.upsert({
        where: { code: o.code },
        update: {},
        create: o,
      });
      console.log(`Created/Updated order with code: ${order.code}`);
    } catch (error) {
      console.error(`Error creating order ${o.code}:`, error);
      throw error; // Re-throw to stop seeding and fail
    }
  }
  
  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
