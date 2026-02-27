const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const code = 'TEST-RE-DELIVERY';
  
  // Create or update order
  const order = await prisma.order.upsert({
    where: { code },
    update: {
      status: 5, // Delivery Failed
      events: {
        create: {
          status: 5,
          description: 'Tentativa de Entrega Falhou - Destinatário Ausente'
        }
      }
    },
    create: {
      code,
      name: 'Teste Redelivery',
      email: 'teste@example.com',
      address: 'Rua Teste, 123',
      status: 5,
      events: {
        create: [
          { status: 0, description: 'Pedido Confirmado' },
          { status: 1, description: 'Em Processamento' },
          { status: 2, description: 'Enviado' },
          { status: 3, description: 'Em Trânsito' },
          { status: 4, description: 'Saiu para Entrega' },
          { status: 5, description: 'Tentativa de Entrega Falhou - Destinatário Ausente' }
        ]
      }
    }
  });

  console.log(`Order ${order.code} set to status 5.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
