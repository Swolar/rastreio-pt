require('dotenv').config();
const emailService = require('../services/emailService');

const stage = process.argv[2]; // 1, 2, or 3
const targetEmail = process.argv[3] || 'delivered@resend.dev';
const orderCode = 'TEST-SEQ-' + Math.floor(Math.random() * 1000);

const order = {
  code: orderCode,
  name: 'Cliente Teste Sequencia',
  email: targetEmail,
  status: 5, // Default
  resendAttempts: 1
};

async function run() {
  console.log(`Sending email for stage ${stage} to ${targetEmail} (Code: ${orderCode})`);
  
  try {
    if (stage === '1') {
      // 1. Falha na Entrega (Status 5)
      console.log('[1/3] Enviando e-mail de "Falha na Entrega"...');
      order.status = 5; 
      await emailService.sendStatusUpdateEmail(order);
      console.log('✅ E-mail de Falha enviado.');
    } else if (stage === '2') {
      // 2. Reagendamento Confirmado
      console.log('[2/3] Enviando e-mail de "Reagendamento Confirmado"...');
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      await emailService.sendRescheduleConfirmation(order, nextWeek);
      console.log('✅ E-mail de Reagendamento enviado.');
    } else if (stage === '3') {
      // 3. Devolvido à Loja (Status 8)
      console.log('[3/3] Enviando e-mail de "Devolvido à Loja"...');
      order.status = 8;
      await emailService.sendReturnedToStoreNotification(order);
      console.log('✅ E-mail de Devolução enviado.');
    } else {
      console.error('Invalid stage. Use 1, 2, or 3.');
    }
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

run();
