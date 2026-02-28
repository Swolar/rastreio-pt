const { Resend } = require('resend');

let resend;
if (process.env.RESEND_API_KEY) {
  try {
    resend = new Resend(process.env.RESEND_API_KEY);
  } catch (error) {
    console.error('Failed to initialize Resend client:', error);
  }
} else {
  console.warn('WARNING: RESEND_API_KEY is missing. Email service will be disabled.');
}

const getBaseUrl = () => {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL;
  return 'https://rastreio-pt.onrender.com'; // Default production fallback
};

const getEmailTemplate = (order, title, message, activeStepIndex = 0) => {
  const baseUrl = getBaseUrl();
  const trackingUrl = `${baseUrl}/rastreio/${order.code}`;
  const steps = [
    { label: 'Pedido confirmado', date: new Date().toLocaleDateString('pt-BR') },
    { label: 'Em separação', date: 'Aguardando' },
    { label: 'Em trânsito', date: 'Aguardando' },
    { label: 'Saiu para entrega', date: 'Aguardando' },
    { label: 'Entregue', date: 'Aguardando' }
  ];

  // Update dates based on active step (mock logic for visual consistency)
  if (activeStepIndex > 0) steps[0].date = 'Concluído';
  if (activeStepIndex > 1) steps[1].date = 'Concluído';
  
  const timelineHtml = steps.map((step, index) => {
    const isActive = index === activeStepIndex;
    const isCompleted = index < activeStepIndex;
    const color = isActive ? '#6A0DAD' : (isCompleted ? '#6A0DAD' : '#d1d5db');
    const opacity = isActive || isCompleted ? '1' : '0.5';
    
    return `
      <tr>
        <td style="vertical-align: top; padding-bottom: 20px; width: 30px;">
          <div style="width: 16px; height: 16px; border-radius: 50%; background-color: ${color}; border: 2px solid ${color};"></div>
          ${index !== steps.length - 1 ? `<div style="width: 2px; height: 40px; background-color: #e5e7eb; margin-left: 9px; margin-top: 5px;"></div>` : ''}
        </td>
        <td style="vertical-align: top; padding-bottom: 20px;">
          <div style="font-weight: ${isActive ? 'bold' : 'normal'}; color: ${isActive ? '#4B0082' : '#374151'}; font-size: 14px;">
            ${step.label} ${isActive ? '(Atual)' : ''}
          </div>
          <div style="color: #6b7280; font-size: 12px;">${step.date}</div>
        </td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9; padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          <!-- Header -->
          <tr>
            <td style="background-color: #7c3aed; background: linear-gradient(135deg, #7c3aed, #4c1d95); padding: 40px 30px; text-align: center;">
              <div style="background-color: rgba(255,255,255,0.2); width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 20px; display: inline-flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px; line-height: 64px;">📦</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">${title}</h1>
              <p style="color: #e5e7eb; margin: 10px 0 0; font-size: 16px;">Código de rastreio: <strong style="color: #ffffff; background-color: rgba(0,0,0,0.1); padding: 2px 6px; border-radius: 4px;">${order.code}</strong></p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 20px;">Olá, ${order.name.split(' ')[0]} 👋</h2>
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 30px; font-size: 16px;">
                ${message}
              </p>

              <!-- Status Card -->
              <div style="background-color: #f3f0ff; border-radius: 12px; padding: 20px; margin-bottom: 30px; border-left: 4px solid #7c3aed;">
                <p style="margin: 0; color: #6b21a8; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Status Atual</p>
                <p style="margin: 8px 0 0; color: #4c1d95; font-size: 18px; font-weight: 700;">
                  ${steps[activeStepIndex].label} 🚛
                </p>
                <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">Atualizado em: ${new Date().toLocaleDateString('pt-BR')}</p>
              </div>

              <!-- Timeline -->
              <div style="margin-bottom: 30px;">
                <p style="color: #1f2937; font-weight: 600; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Linha do tempo do rastreio</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${timelineHtml}
                </table>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin-top: 40px;">
                <a href="${trackingUrl}" style="background-color: #7c3aed; color: #ffffff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.3);">
                  Acompanhar Pedido
                </a>
              </div>

              <!-- Fallback Link -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">Se o botão não funcionar, copie e cole este link no navegador:</p>
                <a href="${trackingUrl}" style="color: #7c3aed; font-size: 14px; word-break: break-all;">${trackingUrl}</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Este é um e-mail automático. Por favor, não responda.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

exports.sendConfirmationEmail = async (order) => {
  if (!resend) {
    console.warn('Skipping email: Resend client not initialized.');
    return false;
  }
  
  try {
    const title = 'Pedido Confirmado';
    const message = 'Recebemos seu pedido com sucesso! Estamos preparando tudo com carinho. Você pode acompanhar cada etapa da entrega através da nossa linha do tempo abaixo.';
    const html = getEmailTemplate(order, title, message, 0); // 0 = Pedido confirmado
    const text = `Olá ${order.name.split(' ')[0]}, seu pedido foi confirmado! Código: ${order.code}. Acompanhe em: ${getBaseUrl()}/rastreio/${order.code}`;
    
    const { data, error } = await resend.emails.send({
      from: 'Rastreio de Pedido <nao-responda@site-seguro-verificado.fun>',
      to: order.email,
      subject: `Pedido Confirmado #${order.code}`,
      text,
      html
    });

    if (error) {
      console.error(`Error sending confirmation email to ${order.email}:`, error);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Error sending confirmation email:`, error);
    return false;
  }
};

exports.sendRescheduleConfirmation = async (order, date) => {
  if (!resend) {
    console.warn('Skipping email: Resend client not initialized.');
    return false;
  }
  try {
    const formattedDate = new Date(date).toLocaleDateString('pt-BR');
    const title = 'Nova Atualização do Pedido';
    const message = `Seu pedido teve uma nova atualização de agendamento para o dia <strong>${formattedDate}</strong>. Estamos trabalhando para que chegue o mais rápido possível!`;
    const html = getEmailTemplate(order, title, message, 2); // 2 = Em trânsito (simulated progress)
    const text = `Olá ${order.name.split(' ')[0]}, seu pedido foi reagendado para ${formattedDate}. Código: ${order.code}. Acompanhe em: ${getBaseUrl()}/rastreio/${order.code}`;
    
    const { data, error } = await resend.emails.send({
      from: 'Rastreio de Pedido <nao-responda@site-seguro-verificado.fun>',
      to: order.email,
      subject: `Atualização de Rastreio #${order.code}`,
      text,
      html
    });
    
    if (error) {
       console.error(`Error sending reschedule email:`, error);
       return false;
    }
    return true;
  } catch (error) {
    console.error(`Error sending reschedule email:`, error);
    return false;
  }
};
