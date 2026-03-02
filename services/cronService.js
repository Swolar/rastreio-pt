const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const emailService = require('./emailService');

const prisma = new PrismaClient();

const statusDescriptions = [
  'Pedido Confirmado',
  'Em Processamento',
  'Enviado',
  'Em Trânsito',
  'Saiu para Entrega',
  'Tentativa de Entrega Falhou - Destinatário Ausente',
  'Reenvio Agendado',
  'Entregue'
];

// Advance orders within a status range and send emails
async function advanceOrders(minStatus, maxStatus, label) {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: {
          gte: minStatus,
          lte: maxStatus
        }
      }
    });

    console.log(`[${label}] Found ${orders.length} orders to update (status ${minStatus}-${maxStatus}).`);

    for (const order of orders) {
      const newStatus = order.status + 1;

      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: { status: newStatus }
      });

      await prisma.event.create({
        data: {
          orderId: order.id,
          status: newStatus,
          description: statusDescriptions[newStatus] || 'Atualização de Status'
        }
      });

      await emailService.sendStatusUpdateEmail(updatedOrder);

      console.log(`[${label}] Updated order ${order.code} to status ${newStatus}`);
    }
  } catch (error) {
    console.error(`[${label}] Error:`, error);
  }
}

const start = () => {
  // Midnight (00:00): Advance statuses 0→1, 1→2, 2→3, 3→4 and 6→7
  cron.schedule('0 0 * * *', async () => {
    console.log('Running midnight status updates...');
    await advanceOrders(0, 3, 'Midnight');  // 0→1, 1→2, 2→3, 3→4
    await advanceOrders(6, 6, 'Midnight');  // 6→7 (Reenvio → Entregue)
    console.log('Midnight updates completed.');
  });

  // Noon (12:00): Advance status 4→5 only (12h after "Saiu para Entrega")
  cron.schedule('0 12 * * *', async () => {
    console.log('Running noon status update (4→5)...');
    await advanceOrders(4, 4, 'Noon');  // 4→5 (Entrega Falhada)
    console.log('Noon update completed.');
  });
};

module.exports = { start };
