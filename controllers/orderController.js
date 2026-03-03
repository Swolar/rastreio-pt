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
    const { name, email, address, country, phone, cpf } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const orderCountry = (country === 'BR') ? 'BR' : 'PT';

    if (orderCountry === 'BR' && !cpf) {
      return res.status(400).json({ error: 'CPF is required for Brazilian orders' });
    }

    let code;
    let isUnique = false;

    // Ensure unique tracking code
    while (!isUnique) {
      code = generateTrackingCode();
      const existing = await prisma.order.findUnique({ where: { code } });
      if (!existing) isUnique = true;
    }

    const eventDesc = orderCountry === 'PT' ? 'Encomenda Confirmada' : 'Pedido Confirmado';

    const order = await prisma.order.create({
      data: {
        code,
        name,
        email,
        address,
        country: orderCountry,
        phone: phone || null,
        cpf: orderCountry === 'BR' ? cpf : null,
        status: 0,
        events: {
          create: [
            {
              status: 0,
              description: eventDesc
            }
          ]
        }
      }
    });

    await emailService.sendConfirmationEmail(order);

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order', details: error.message });
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

    // Send confirmation email
    await emailService.sendRescheduleConfirmation(updatedOrder, redeliveryDate);

    res.redirect(`/rastreio/${code}`);
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).render('error', { message: 'Erro ao processar pagamento' });
  }
};

// Resend email for an order (Admin action)
exports.resendEmail = async (req, res) => {
  try {
    const { code } = req.params;

    const order = await prisma.order.findUnique({ where: { code } });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const sent = await emailService.sendStatusUpdateEmail(order);

    if (sent) {
      res.json({ message: 'Email reenviado com sucesso' });
    } else {
      res.status(500).json({ error: 'Falha ao enviar email. Verifique a configuração do Resend.' });
    }
  } catch (error) {
    console.error('Error resending email:', error);
    res.status(500).json({ error: 'Erro ao reenviar email', details: error.message });
  }
};

// Admin list orders with optional date range filter
exports.listOrders = async (req, res) => {
  try {
    const { dateRange } = req.query;
    let dateFilter = {};
    const now = new Date();

    if (dateRange === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateFilter = { createdAt: { gte: startOfDay } };
    } else if (dateRange === '7d') {
      const d = new Date(now);
      d.setDate(now.getDate() - 7);
      dateFilter = { createdAt: { gte: d } };
    } else if (dateRange === '1m') {
      const d = new Date(now);
      d.setMonth(now.getMonth() - 1);
      dateFilter = { createdAt: { gte: d } };
    } else if (dateRange === '6m') {
      const d = new Date(now);
      d.setMonth(now.getMonth() - 6);
      dateFilter = { createdAt: { gte: d } };
    }

    const orders = await prisma.order.findMany({
      where: dateFilter,
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list orders' });
  }
};

// Dashboard stats endpoint
exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const allOrders = await prisma.order.findMany();

    const thisMonthOrders = allOrders.filter(o => new Date(o.createdAt) >= startOfMonth);
    const lastMonthOrders = allOrders.filter(o => {
      const d = new Date(o.createdAt);
      return d >= startOfLastMonth && d <= endOfLastMonth;
    });

    const totalEmailsSent = allOrders.reduce((sum, o) => sum + (o.emailsSent || 0), 0);

    let feesGeneratedPT = 0, feesGeneratedBR = 0;
    let feesPaidPT = 0, feesPaidBR = 0;
    let generatedCount = 0, paidCount = 0;

    allOrders.forEach(o => {
      if (o.redeliveryFee > 0) {
        generatedCount++;
        if (o.country === 'BR') {
          feesGeneratedBR += o.redeliveryFee;
          if (o.isRedeliveryPaid) { feesPaidBR += o.redeliveryFee; paidCount++; }
        } else {
          feesGeneratedPT += o.redeliveryFee;
          if (o.isRedeliveryPaid) { feesPaidPT += o.redeliveryFee; paidCount++; }
        }
      }
    });

    const thisMonthRevenue = thisMonthOrders
      .filter(o => o.isRedeliveryPaid && o.redeliveryFee > 0)
      .reduce((sum, o) => sum + o.redeliveryFee, 0);
    const lastMonthRevenue = lastMonthOrders
      .filter(o => o.isRedeliveryPaid && o.redeliveryFee > 0)
      .reduce((sum, o) => sum + o.redeliveryFee, 0);

    res.json({
      totalOrders: allOrders.length,
      totalEmailsSent,
      feesGenerated: { PT: feesGeneratedPT, BR: feesGeneratedBR, total: feesGeneratedPT + feesGeneratedBR },
      feesPaid: { PT: feesPaidPT, BR: feesPaidBR, total: feesPaidPT + feesPaidBR },
      generatedCount,
      paidCount,
      collectionRate: generatedCount > 0 ? ((paidCount / generatedCount) * 100).toFixed(1) : 0,
      thisMonthRevenue,
      lastMonthRevenue,
      revenueChange: lastMonthRevenue > 0
        ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
        : (thisMonthRevenue > 0 ? 100 : 0),
      ordersByCountry: {
        PT: allOrders.filter(o => o.country !== 'BR').length,
        BR: allOrders.filter(o => o.country === 'BR').length
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// Webhook placeholder for external order creation
exports.webhookCreateOrder = async (req, res) => {
  // TODO: Validate webhook signature
  // TODO: Map external payload to { name, email, address, country, phone, cpf }
  res.status(501).json({ message: 'Webhook endpoint ready. Implementation pending.' });
};
