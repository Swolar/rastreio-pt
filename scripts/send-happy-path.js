require('dotenv').config();
const emailService = require('../services/emailService');

const targetEmail = process.argv[2] || 'delivered@resend.dev';
const orderCode = 'HAPPY-PATH-' + Math.floor(Math.random() * 1000);

const order = {
  code: orderCode,
  name: 'Cliente Teste Feliz',
  email: targetEmail,
  status: 0, 
  resendAttempts: 0
};

// Helper for delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runSequence() {
  console.log(`Iniciando sequência de ENTREGA NORMAL para: ${targetEmail}`);
  console.log(`Código do Pedido: ${orderCode}`);

  const stages = [
    { status: 0, name: 'Pedido Confirmado' },
    { status: 1, name: 'Em Processamento' },
    { status: 2, name: 'Enviado' },
    { status: 3, name: 'Em Trânsito' },
    { status: 4, name: 'Saiu para Entrega' },
    { status: 7, name: 'Entregue' }
  ];

  for (const stage of stages) {
    console.log(`\n[Status ${stage.status}] Enviando e-mail de "${stage.name}"...`);
    order.status = stage.status;
    
    try {
      await emailService.sendStatusUpdateEmail(order);
      console.log(`✅ E-mail de "${stage.name}" enviado.`);
    } catch (error) {
      console.error(`❌ Erro ao enviar e-mail de "${stage.name}":`, error);
    }

    if (stage.status !== 7) {
      console.log('Aguardando 30 segundos para a próxima etapa...');
      await delay(30000); 
    }
  }

  console.log('\nSequência de entrega normal finalizada com sucesso!');
}

runSequence();
