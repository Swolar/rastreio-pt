
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

exports.sendConfirmationEmail = async (order) => {
  if (!resend) {
    console.warn('Skipping email: Resend client not initialized.');
    return false;
  }
  
  try {
    const statusDesc = 'Pedido Confirmado';
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const trackingUrl = `${baseUrl}/rastreio/${order.code}`;
    
    const { data, error } = await resend.emails.send({
      from: process.env.SMTP_FROM || 'onboarding@resend.dev',
      to: order.email,
      subject: `Pedido Confirmado #${order.code}`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Pedido Confirmado</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9; padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 8px 25px rgba(0,0,0,0.06);">
          <tr>
            <td align="center" style="background:#f8f7fb; padding:18px 20px; border-bottom:1px solid #eee;">
               <div style="font-size: 24px; font-weight: bold; color: #6A0DAD;">📦 Rastreio</div>
            </td>
          </tr>
          <tr>
            <td style="background: linear-gradient(135deg, #6A0DAD, #4B0082); padding:26px 28px;">
              <div style="color:#fff; font-size:26px; font-weight:700; line-height:1.2; text-align:center;">
                Pedido Confirmado!
              </div>
              <div style="color:rgba(255,255,255,0.85); font-size:13px; text-align:center; margin-top:8px;">
                Código: <strong style="color:#fff;">${order.code}</strong>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 18px; color:#222;">
              <div style="font-size:18px; font-weight:700; margin:0 0 8px;">
                Olá, ${order.name.split(' ')[0]} 👋
              </div>
              <div style="font-size:14px; color:#555; line-height:1.6;">
                Recebemos seu pedido com sucesso! Você pode acompanhar o status da entrega clicando no botão abaixo.
              </div>
            </td>
          </tr>
          <tr>
             <td style="padding:0 28px;">
               <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 10px; background:#f3f0fa; border-left:6px solid #6A0DAD; border-radius:10px;">
                 <tr>
                   <td style="padding:16px 16px;">
                     <div style="font-size:12px; color:#6b6b6b; margin-bottom:4px;">Status atual</div>
                     <div style="font-size:22px; font-weight:800; color:#4B0082; margin:0;">
                       ${statusDesc} ✅
                     </div>
                   </td>
                 </tr>
               </table>
             </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 28px 30px;">
               <a href="${trackingUrl}" 
                  style="background: linear-gradient(135deg,#6A0DAD,#4B0082);
                         color:#ffffff; text-decoration:none; padding:14px 26px;
                         border-radius:10px; font-size:15px; font-weight:800; display:inline-block; margin-top: 20px;">
                  Acompanhar Pedido
               </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="background:#fafafa; padding:16px 20px; font-size:12px; color:#999; border-top:1px solid #eee;">
              Este é um e-mail automático.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
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
    const statusDesc = 'Reenvio Agendado';
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const trackingUrl = `${baseUrl}/rastreio/${order.code}`;
    
    const { data, error } = await resend.emails.send({
      from: process.env.SMTP_FROM || 'onboarding@resend.dev',
      to: order.email,
      subject: `Reagendamento Confirmado #${order.code}`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reagendamento Confirmado</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9; padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 8px 25px rgba(0,0,0,0.06);">
          <tr>
            <td align="center" style="background:#f8f7fb; padding:18px 20px; border-bottom:1px solid #eee;">
               <img src="https://img.icons8.com/ios-filled/50/6A0DAD/search.png" width="44" height="44" style="display:block;" alt="Logo">
            </td>
          </tr>
          <tr>
            <td style="background: linear-gradient(135deg, #6A0DAD, #4B0082); padding:26px 28px;">
              <div style="color:#fff; font-size:26px; font-weight:700; line-height:1.2; text-align:center;">
                Reagendamento Confirmado
              </div>
              <div style="color:rgba(255,255,255,0.85); font-size:13px; text-align:center; margin-top:8px;">
                Código: <strong style="color:#fff;">${order.code}</strong>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 18px; color:#222;">
              <div style="font-size:18px; font-weight:700; margin:0 0 8px;">
                Olá, ${order.name.split(' ')[0]} 👋
              </div>
              <div style="font-size:14px; color:#555; line-height:1.6;">
                O pagamento da taxa de reenvio (€ 5,00) foi confirmado. Seu pedido foi reagendado para o dia <strong>${new Date(date).toLocaleDateString('pt-BR')}</strong>.
              </div>
            </td>
          </tr>
          <tr>
             <td style="padding:0 28px;">
               <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 10px; background:#f3f0fa; border-left:6px solid #6A0DAD; border-radius:10px;">
                 <tr>
                   <td style="padding:16px 16px;">
                     <div style="font-size:12px; color:#6b6b6b; margin-bottom:4px;">Status atual</div>
                     <div style="font-size:22px; font-weight:800; color:#4B0082; margin:0;">
                       ${statusDesc} 🔄
                     </div>
                   </td>
                 </tr>
               </table>
             </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 28px 30px;">
               <a href="${trackingUrl}" 
                  style="background: linear-gradient(135deg,#6A0DAD,#4B0082);
                         color:#ffffff; text-decoration:none; padding:14px 26px;
                         border-radius:10px; font-size:15px; font-weight:800; display:inline-block; margin-top: 20px;">
                  Acompanhar Pedido
               </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="background:#fafafa; padding:16px 20px; font-size:12px; color:#999; border-top:1px solid #eee;">
              Este é um e-mail automático.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    });

    if (error) {
      console.error(`Error sending reschedule email to ${order.email}:`, error);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Error sending reschedule email:`, error);
    return false;
  }
};

exports.sendReturnedToStoreNotification = async (order) => {
  try {
    const statusDesc = 'Devolvido à Loja';
    
    const { data, error } = await resend.emails.send({
      from: process.env.SMTP_FROM || 'onboarding@resend.dev',
      to: order.email,
      subject: `Aviso Importante: Pedido #${order.code} Devolvido`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Pedido Devolvido</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9; padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 8px 25px rgba(0,0,0,0.06);">
          <tr>
            <td align="center" style="background:#f8f7fb; padding:18px 20px; border-bottom:1px solid #eee;">
               <img src="https://img.icons8.com/ios-filled/50/6A0DAD/search.png" width="44" height="44" style="display:block;" alt="Logo">
            </td>
          </tr>
          <tr>
            <td style="background: linear-gradient(135deg, #d63031, #b71540); padding:26px 28px;">
              <div style="color:#fff; font-size:26px; font-weight:700; line-height:1.2; text-align:center;">
                Pedido Devolvido
              </div>
              <div style="color:rgba(255,255,255,0.85); font-size:13px; text-align:center; margin-top:8px;">
                Código: <strong style="color:#fff;">${order.code}</strong>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 18px; color:#222;">
              <div style="font-size:18px; font-weight:700; margin:0 0 8px;">
                Olá, ${order.name.split(' ')[0]}
              </div>
              <div style="font-size:14px; color:#555; line-height:1.6;">
                Informamos que, após 5 tentativas de reenvio sem sucesso, seu pedido retornou ao nosso centro de distribuição.
                <br><br>
                Nossa equipe irá processar o retorno e entrará em contato em breve para definir os próximos passos.
              </div>
            </td>
          </tr>
          <tr>
             <td style="padding:0 28px;">
               <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 10px; background:#fff5f5; border-left:6px solid #d63031; border-radius:10px;">
                 <tr>
                   <td style="padding:16px 16px;">
                     <div style="font-size:12px; color:#6b6b6b; margin-bottom:4px;">Status atual</div>
                     <div style="font-size:22px; font-weight:800; color:#d63031; margin:0;">
                       ${statusDesc} 🔙
                     </div>
                   </td>
                 </tr>
               </table>
             </td>
          </tr>
          <tr>
            <td align="center" style="background:#fafafa; padding:16px 20px; font-size:12px; color:#999; border-top:1px solid #eee;">
              Este é um e-mail automático.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    });

    if (error) {
      console.error(`Error sending return email to ${order.email}:`, error);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Error sending return email:`, error);
    return false;
  }
};

exports.sendStatusUpdateEmail = async (order) => {
  try {
    const statusDescriptions = [
      'Pedido Confirmado',
      'Em Processamento',
      'Enviado',
      'Em Trânsito',
      'Saiu para Entrega',
      'Tentativa de Entrega Falhou - Destinatário Ausente',
      'Reenvio Agendado',
      'Entregue',
      'Devolvido à Loja'
    ];
    
    const statusDesc = statusDescriptions[order.status] || 'Atualização de Status';
    const trackingUrl = `${process.env.BASE_URL}/rastreio/${order.code}`;
    
    // Status 5 is specifically "Falha na Entrega" which requires payment
    let actionButton = '';
    if (order.status === 5) {
      actionButton = `
        <a href="${trackingUrl}" 
           style="background: linear-gradient(135deg,#d63031,#b71540);
                  color:#ffffff; text-decoration:none; padding:14px 26px;
                  border-radius:10px; font-size:15px; font-weight:800; display:inline-block; margin-top: 20px;">
           Resolver Pendência
        </a>
      `;
    } else {
      actionButton = `
        <a href="${trackingUrl}" 
           style="background: linear-gradient(135deg,#6A0DAD,#4B0082);
                  color:#ffffff; text-decoration:none; padding:14px 26px;
                  border-radius:10px; font-size:15px; font-weight:800; display:inline-block; margin-top: 20px;">
           Acompanhar Pedido
        </a>
      `;
    }

    const { data, error } = await resend.emails.send({
      from: process.env.SMTP_FROM || 'onboarding@resend.dev',
      to: order.email,
      subject: `Atualização de Status #${order.code}: ${statusDesc}`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Atualização de Status</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9; padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 8px 25px rgba(0,0,0,0.06);">
          <tr>
            <td align="center" style="background:#f8f7fb; padding:18px 20px; border-bottom:1px solid #eee;">
               <img src="https://img.icons8.com/ios-filled/50/6A0DAD/search.png" width="44" height="44" style="display:block;" alt="Logo">
            </td>
          </tr>
          <tr>
            <td style="background: linear-gradient(135deg, ${order.status === 5 ? '#d63031, #b71540' : '#6A0DAD, #4B0082'}); padding:26px 28px;">
              <div style="color:#fff; font-size:26px; font-weight:700; line-height:1.2; text-align:center;">
                ${statusDesc}
              </div>
              <div style="color:rgba(255,255,255,0.85); font-size:13px; text-align:center; margin-top:8px;">
                Código: <strong style="color:#fff;">${order.code}</strong>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 18px; color:#222;">
              <div style="font-size:18px; font-weight:700; margin:0 0 8px;">
                Olá, ${order.name.split(' ')[0]}
              </div>
              <div style="font-size:14px; color:#555; line-height:1.6;">
                O status do seu pedido foi atualizado.
                ${order.status === 5 ? '<br><br><strong>Houve uma falha na tentativa de entrega. Por favor, acesse o link abaixo para regularizar a situação e agendar uma nova entrega.</strong>' : ''}
              </div>
            </td>
          </tr>
          <tr>
             <td style="padding:0 28px;">
               <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 10px; background:${order.status === 5 ? '#fff5f5' : '#f3f0fa'}; border-left:6px solid ${order.status === 5 ? '#d63031' : '#6A0DAD'}; border-radius:10px;">
                 <tr>
                   <td style="padding:16px 16px;">
                     <div style="font-size:12px; color:#6b6b6b; margin-bottom:4px;">Status atual</div>
                     <div style="font-size:22px; font-weight:800; color:${order.status === 5 ? '#d63031' : '#4B0082'}; margin:0;">
                       ${statusDesc}
                     </div>
                   </td>
                 </tr>
               </table>
             </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 28px 30px;">
               ${actionButton}
            </td>
          </tr>
          <tr>
            <td align="center" style="background:#fafafa; padding:16px 20px; font-size:12px; color:#999; border-top:1px solid #eee;">
              Este é um e-mail automático.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    });

    if (error) {
      console.error(`Error sending status email to ${order.email}:`, error);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Error sending status email:`, error);
    return false;
  }
};
