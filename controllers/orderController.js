const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const emailService = require('../services/emailService');

// Helper to generate tracking code: AAAA-BBBB-1234
const generateTrackingCode = () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  const getRandomString = (length, chars) => {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const part1 = getRandomString(4, letters);
  const part2 = getRandomString(4, letters);
  const part3 = getRandomString(4, numbers);
  
  return `${part1}-${part2}-${part3}`;
};

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    const { name, email, address } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    let code;
    let isUnique = false;
    
    // Ensure unique tracking code
    while (!isUnique) {
      code = generateTrackingCode();
      const existing = await prisma.order.findUnique({ where: { code } });
      if (!existing) isUnique = true;
    }

    const order = await prisma.order.create({
      data: {
        code,
        name,
        email,
        address,
        status: 0, // Confirmed
        events: {
          create: {
            status: 0,
            description: 'Pedido Confirmado'
          }
        }
      }
    });

    // Send confirmation email (optional, but good practice)
    // await emailService.sendConfirmationEmail(order); 

    res.status(201).json({ 
      message: 'Order created successfully', 
      order 
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

// Get order status (Public)
exports.getOrderStatus = async (req, res) => {
  try {
    const { code } = req.params;
    
    const order = await prisma.order.findUnique({
      where: { code },
      include: {
        events: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!order) {
      return res.status(404).render('error', { message: 'Pedido não encontrado' });
    }

    // Data masking for privacy
    const maskedName = order.name.split(' ').map((n, i) => i === 0 ? n : n[0] + '.').join(' ');
    const maskedEmail = order.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');

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

    res.render('tracking', {
      order: {
        ...order,
        maskedName,
        maskedEmail,
        statusText: statusDescriptions[order.status]
      }
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).render('error', { message: 'Erro ao buscar informações do pedido' });
  }
};

// Show redelivery payment page
exports.showRedeliveryPage = async (req, res) => {
  try {
    const { code } = req.params;
    
    const order = await prisma.order.findUnique({
      where: { code }
    });

    if (!order) {
      return res.status(404).render('error', { message: 'Pedido não encontrado' });
    }

    if (order.status !== 5) {
      return res.redirect(`/rastreio/${code}`);
    }

    res.render('pay-redelivery', { order });
  } catch (error) {
    console.error('Error showing redelivery page:', error);
    res.status(500).render('error', { message: 'Erro ao carregar página de pagamento' });
  }
};

// Process redelivery payment
exports.processRedeliveryPayment = async (req, res) => {
  try {
    const { code } = req.params;
    const { redeliveryDate, paymentMethod } = req.body;
    
    const order = await prisma.order.findUnique({
      where: { code }
    });

    if (!order) {
      return res.status(404).render('error', { message: 'Pedido não encontrado' });
    }

    // Here you would integrate with payment gateway (MB WAY, etc.)
    // For now, we simulate success
    
    // Update order status to 6 (Redelivery Scheduled)
    const updatedOrder = await prisma.order.update({
      where: { code },
      data: {
        status: 6,
        redeliveryDate: new Date(redeliveryDate),
        redeliveryFee: 5.00,
        isRedeliveryPaid: true
      }
    });

    // Log event
    await prisma.event.create({
      data: {
        orderId: order.id,
        status: 6,
        description: `Reenvio Agendado para ${new Date(redeliveryDate).toLocaleDateString('pt-BR')} (Pago via ${paymentMethod})`
      }
    });

    res.redirect(`/rastreio/${code}`);
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).render('error', { message: 'Erro ao processar pagamento' });
  }
};

// Admin list orders (Simple JSON API for now)
exports.listOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list orders' });
  }
};
