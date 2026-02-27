require('dotenv').config();
const emailService = require('../services/emailService');

const targetEmail = process.argv[2] || 'delivered@resend.dev';
const orderCode = 'TEST-SEQ-' + Math.floor(Math.random() * 1000);

const order = {
  code: orderCode,
  name: 'Cliente Teste Sequencia',
  email: targetEmail,
  status: 5, // Starts with Failure
  resendAttempts: 1
};

console.log(`Iniciando sequência de testes de e-mail para: ${targetEmail}`);
console.log(`Código do Pedido: ${orderCode}`);

process.on('exit', (code) => console.log('Process exiting with code:', code));
process.on('beforeExit', (code) => console.log('Process beforeExit with code:', code));

// Helper for delay
const delay = ms => new Promise(resolve => {
  console.log(`Debug: Starting delay of ${ms}ms`);
  setTimeout(() => {
    console.log(`Debug: Finished delay of ${ms}ms`);
    resolve();
  }, ms);
});

async function runSequence() {
  try {
    // 1. Falha na Entrega (Status 5)
    console.log('[1/3] Enviando e-mail de "Falha na Entrega"...');
    // Ensure status is 5 for the correct template logic in sendStatusUpdateEmail
    order.status = 5; 
    await emailService.sendStatusUpdateEmail(order);
    console.log('✅ E-mail de Falha enviado.');

    console.log('Aguardando 1 minuto para o próximo e-mail...');
    await delay(60000);

    // 2. Reagendamento Confirmado
    console.log('[2/3] Enviando e-mail de "Reagendamento Confirmado"...');
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    await emailService.sendRescheduleConfirmation(order, nextWeek);
    console.log('✅ E-mail de Reagendamento enviado.');

    console.log('Aguardando 1 minuto para o próximo e-mail...');
    await delay(60000);

    // 3. Devolvido à Loja (Status 8)
    console.log('[3/3] Enviando e-mail de "Devolvido à Loja"...');
    // Update status just in case, though the function might not use it
    order.status = 8;
    await emailService.sendReturnedToStoreNotification(order);
    console.log('✅ E-mail de Devolução enviado.');

    console.log('Sequência finalizada com sucesso!');
  } catch (error) {
    console.error('Erro durante a sequência:', error);
  }
}

runSequence();