
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const orders = await prisma.order.findMany({
      select: {
        code: true,
        status: true,
        name: true
      }
    });
    
    console.log('Códigos de rastreio encontrados:');
    orders.forEach(order => {
      console.log(`- Código: ${order.code} | Nome: ${order.name} | Status: ${order.status}`);
    });
  } catch (error) {
    console.error('Erro ao listar códigos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
