const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const emailService = require('./emailService');

const prisma = new PrismaClient();

const start = () => {
  // Run daily at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily order status updates...');
    
    try {
      // Find orders that are not delivered (status < 5)
      const activeOrders = await prisma.order.findMany({
        where: {
          status: {
            lt: 5
          }
        }
      });
      
      console.log(`Found ${activeOrders.length} active orders to update.`);
      
      for (const order of activeOrders) {
        // Increment status
        const newStatus = order.status + 1;
        
        // Update order status
        const updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: { status: newStatus }
        });
        
        // Create event log
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
        
        await prisma.event.create({
          data: {
            orderId: order.id,
            status: newStatus,
            description: statusDescriptions[newStatus] || 'Atualização de Status'
          }
        });
        
        // Send email notification
        await emailService.sendStatusUpdateEmail(updatedOrder);
        
        console.log(`Updated order ${order.code} to status ${newStatus}`);
      }
      
      console.log('Daily updates completed.');
    } catch (error) {
      console.error('Error in daily update cron job:', error);
    }
  });
};

module.exports = { start };
