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
  return 'https://rastreio-pt.onrender.com';
};

// ─── Design Tokens (matching site branding) ─────────────────────────
const brand = {
  primary:      '#4834D4',
  primaryDark:  '#3625A8',
  primaryLight: '#6C5CE7',
  primarySubtle:'#EDE9FF',
  primaryWash:  '#F7F5FF',
  textPrimary:  '#1A1D26',
  textSecondary:'#4A5060',
  textMuted:    '#6B7280',
  borderColor:  '#E5E7EB',
  bgPage:       '#F8F9FC',
  bgCard:       '#FFFFFF',
  success:      '#059669',
  successBg:    '#ECFDF5',
  warning:      '#D97706',
  warningBg:    '#FFFBEB',
  danger:       '#DC2626',
  dangerBg:     '#FEF2F2',
  font:         "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
};

// ─── Email Template ─────────────────────────────────────────────────
const getEmailTemplate = (order, title, message, activeStepIndex = 0, options = {}) => {
  const baseUrl = getBaseUrl();
  const trackingUrl = `${baseUrl}/rastreio/${order.code}`;

  const steps = [
    { label: 'Confirmado',      icon: '✓' },
    { label: 'Em processamento', icon: '⚙' },
    { label: 'Enviado',          icon: '📦' },
    { label: 'Em transito',      icon: '🚚' },
    { label: 'Saiu p/ entrega',  icon: '📍' },
    { label: 'Entregue',         icon: '✅' }
  ];

  // Determine status color for the header accent
  let accentColor = brand.primary;
  let accentBg = brand.primarySubtle;
  if (options.isWarning) {
    accentColor = brand.warning;
    accentBg = brand.warningBg;
  } else if (options.isDanger) {
    accentColor = brand.danger;
    accentBg = brand.dangerBg;
  } else if (options.isSuccess) {
    accentColor = brand.success;
    accentBg = brand.successBg;
  }

  // Build timeline rows
  const timelineHtml = steps.map((step, index) => {
    const isCompleted = index < activeStepIndex;
    const isCurrent = index === activeStepIndex;
    let dotColor = brand.borderColor;
    let dotBorder = brand.borderColor;
    let labelColor = brand.textMuted;
    let labelWeight = 'normal';
    let statusText = '';

    if (isCompleted) {
      dotColor = brand.primary;
      dotBorder = brand.primary;
      labelColor = brand.textSecondary;
      statusText = `<span style="font-size:11px; color:${brand.primary}; font-weight:600;">Concluido</span>`;
    } else if (isCurrent) {
      dotColor = brand.bgCard;
      dotBorder = brand.primary;
      labelColor = brand.primary;
      labelWeight = 'bold';
      statusText = `<span style="font-size:11px; color:${brand.primary}; background:${brand.primarySubtle}; padding:2px 8px; border-radius:10px; font-weight:700;">Atual</span>`;
    } else {
      statusText = `<span style="font-size:11px; color:${brand.textMuted};">Aguardando</span>`;
    }

    // Connector line (not on last item)
    const connector = index < steps.length - 1
      ? `<div style="width:2px; height:24px; background:${isCompleted ? brand.primary : brand.borderColor}; margin-left:8px; margin-top:4px;"></div>`
      : '';

    return `
      <tr>
        <td style="vertical-align:top; padding-bottom:8px; width:24px;">
          <div style="width:18px; height:18px; border-radius:50%; background:${dotColor}; border:2.5px solid ${dotBorder}; ${isCurrent ? 'box-shadow:0 0 0 4px rgba(72,52,212,0.12);' : ''}"></div>
          ${connector}
        </td>
        <td style="vertical-align:top; padding-bottom:8px; padding-left:14px;">
          <div style="font-weight:${labelWeight}; color:${labelColor}; font-size:14px; font-family:${brand.font}; line-height:1.3;">
            ${step.label}
          </div>
          <div style="margin-top:2px;">${statusText}</div>
        </td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0; padding:0; background-color:${brand.bgPage}; font-family:${brand.font}; -webkit-font-smoothing:antialiased;">

  <!-- Wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${brand.bgPage}; padding:32px 16px;">
    <tr>
      <td align="center">

        <!-- Logo Bar -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
          <tr>
            <td style="padding:16px 0; text-align:center;">
              <div style="display:inline-block; background:${brand.primary}; color:#fff; width:32px; height:32px; line-height:32px; text-align:center; border-radius:6px; font-size:14px; font-weight:bold; vertical-align:middle;">R</div>
              <span style="font-size:15px; font-weight:700; color:${brand.textPrimary}; vertical-align:middle; margin-left:8px; letter-spacing:-0.3px;">Rastreio Encomendas</span>
            </td>
          </tr>
        </table>

        <!-- Main Card -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:${brand.bgCard}; border-radius:12px; overflow:hidden; border:1px solid ${brand.borderColor};">

          <!-- Header Bar (thin accent) -->
          <tr>
            <td style="height:4px; background:${brand.primary};"></td>
          </tr>

          <!-- Title Section -->
          <tr>
            <td style="padding:32px 36px 0 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0 0 8px 0; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:${brand.textMuted};">Atualizacao de pedido</p>
                    <h1 style="margin:0; font-size:22px; font-weight:800; color:${brand.textPrimary}; letter-spacing:-0.3px; line-height:1.3;">${title}</h1>
                  </td>
                  <td style="text-align:right; vertical-align:top;">
                    <div style="display:inline-block; background:${brand.textPrimary}; color:#fff; padding:6px 14px; border-radius:20px; font-size:12px; font-weight:700; letter-spacing:1px; font-family:'Courier New',monospace;">${order.code}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:20px 36px 0 36px;">
              <div style="height:1px; background:${brand.borderColor};"></div>
            </td>
          </tr>

          <!-- Greeting & Message -->
          <tr>
            <td style="padding:24px 36px 0 36px;">
              <p style="margin:0 0 6px 0; font-size:17px; font-weight:700; color:${brand.textPrimary};">Ola, ${order.name.split(' ')[0]}</p>
              <p style="margin:0; font-size:14px; color:${brand.textSecondary}; line-height:1.65;">${message}</p>
            </td>
          </tr>

          <!-- Status Card -->
          <tr>
            <td style="padding:24px 36px 0 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${accentBg}; border-radius:10px; border-left:3px solid ${accentColor};">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 2px 0; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:${accentColor};">Status atual</p>
                    <p style="margin:0; font-size:17px; font-weight:800; color:${brand.textPrimary};">${steps[Math.min(activeStepIndex, steps.length - 1)].label}</p>
                    <p style="margin:4px 0 0 0; font-size:12px; color:${brand.textMuted};">${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Timeline -->
          <tr>
            <td style="padding:28px 36px 0 36px;">
              <p style="margin:0 0 16px 0; font-size:13px; font-weight:700; color:${brand.textPrimary}; text-transform:uppercase; letter-spacing:0.04em;">Progresso do envio</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${timelineHtml}
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:28px 36px 0 36px; text-align:center;">
              <a href="${trackingUrl}" style="display:inline-block; background:${brand.primary}; color:#ffffff; padding:14px 36px; border-radius:8px; text-decoration:none; font-weight:700; font-size:14px; letter-spacing:0.02em;">Acompanhar Pedido</a>
            </td>
          </tr>

          <!-- Fallback Link -->
          <tr>
            <td style="padding:20px 36px 0 36px; text-align:center;">
              <p style="margin:0; font-size:12px; color:${brand.textMuted};">Ou copie e cole: <a href="${trackingUrl}" style="color:${brand.primary}; word-break:break-all; font-size:12px;">${trackingUrl}</a></p>
            </td>
          </tr>

          <!-- Footer inside card -->
          <tr>
            <td style="padding:28px 36px 24px 36px;">
              <div style="height:1px; background:${brand.borderColor}; margin-bottom:20px;"></div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align:center;">
                    <p style="margin:0 0 8px 0; font-size:11px; color:${brand.textMuted};">
                      <span style="display:inline-block; margin:0 6px;">🔒 Dados protegidos</span>
                      <span style="display:inline-block; margin:0 6px;">✓ SSL seguro</span>
                      <span style="display:inline-block; margin:0 6px;">📦 Certificado</span>
                    </p>
                    <p style="margin:0; font-size:11px; color:#9CA3AF;">Este e um e-mail automatico. Por favor, nao responda.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Copyright -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:16px 0; text-align:center;">
              <p style="margin:0; font-size:11px; color:#9CA3AF;">&copy; ${new Date().getFullYear()} Rastreio Encomendas. Todos os direitos reservados.</p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
};

// ─── Send Functions ─────────────────────────────────────────────────

exports.sendConfirmationEmail = async (order) => {
  if (!resend) {
    console.warn('Skipping email: Resend client not initialized.');
    return false;
  }

  try {
    const title = 'Pedido Confirmado';
    const message = 'Recebemos seu pedido com sucesso! Estamos preparando tudo para envio. Acompanhe cada etapa da entrega na linha do tempo abaixo.';
    const html = getEmailTemplate(order, title, message, 0, { isSuccess: true });
    const text = `Ola ${order.name.split(' ')[0]}, seu pedido foi confirmado! Codigo: ${order.code}. Acompanhe em: ${getBaseUrl()}/rastreio/${order.code}`;

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
    const title = 'Reenvio Agendado';
    const message = `O reenvio do seu pedido foi agendado para <strong>${formattedDate}</strong>. Estamos a trabalhar para que chegue o mais rapido possivel.`;
    const html = getEmailTemplate(order, title, message, 2, {});
    const text = `Ola ${order.name.split(' ')[0]}, seu pedido foi reagendado para ${formattedDate}. Codigo: ${order.code}. Acompanhe em: ${getBaseUrl()}/rastreio/${order.code}`;

    const { data, error } = await resend.emails.send({
      from: 'Rastreio de Pedido <nao-responda@site-seguro-verificado.fun>',
      to: order.email,
      subject: `Reenvio Agendado #${order.code}`,
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

exports.sendStatusUpdateEmail = async (order) => {
  if (!resend) {
    console.warn('Skipping email: Resend client not initialized.');
    return false;
  }

  try {
    const statusDescriptions = [
      'Pedido Confirmado',
      'Em Processamento',
      'Enviado',
      'Em Transito',
      'Saiu para Entrega',
      'Tentativa de Entrega Falhou',
      'Reenvio Agendado',
      'Entregue'
    ];

    const statusMessages = [
      'Seu pedido foi confirmado e estamos a preparar tudo.',
      'Seu pedido esta em processamento e sera enviado em breve.',
      'Seu pedido foi enviado! Agora e so aguardar a entrega.',
      'Seu pedido esta a caminho. Acompanhe o progresso abaixo.',
      'Seu pedido saiu para entrega! Fique atento ao endereco.',
      'Nao foi possivel entregar o seu pedido. O destinatario estava ausente. Aceda ao rastreio para reagendar a entrega.',
      'O reenvio do seu pedido foi agendado com sucesso.',
      'Seu pedido foi entregue com sucesso! Esperamos que goste.'
    ];

    const currentStatus = order.status;
    const title = statusDescriptions[currentStatus] || 'Atualizacao do Pedido';
    const message = statusMessages[currentStatus] || 'Seu pedido teve uma nova atualizacao.';

    // Map order status to timeline step index
    // Timeline: 0=Confirmado, 1=Processamento, 2=Enviado, 3=Transito, 4=Saiu Entrega, 5=Entregue
    let activeStepIndex = 0;
    if (currentStatus === 0) activeStepIndex = 0;
    else if (currentStatus === 1) activeStepIndex = 1;
    else if (currentStatus === 2) activeStepIndex = 2;
    else if (currentStatus === 3) activeStepIndex = 3;
    else if (currentStatus === 4) activeStepIndex = 4;
    else if (currentStatus === 7) activeStepIndex = 5;
    else activeStepIndex = 3; // Fallback for status 5, 6

    // Style options based on status severity
    const options = {};
    if (currentStatus === 5) options.isWarning = true;
    else if (currentStatus === 7) options.isSuccess = true;

    const html = getEmailTemplate(order, title, message, activeStepIndex, options);
    const text = `Ola ${order.name.split(' ')[0]}, atualizacao do pedido: ${statusDescriptions[currentStatus]}. Acompanhe em: ${getBaseUrl()}/rastreio/${order.code}`;

    const { data, error } = await resend.emails.send({
      from: 'Rastreio de Pedido <nao-responda@site-seguro-verificado.fun>',
      to: order.email,
      subject: `${statusDescriptions[currentStatus]} #${order.code}`,
      text,
      html
    });

    if (error) {
      console.error(`Error sending update email to ${order.email}:`, error);
      return false;
    }

    console.log(`Update email sent to ${order.email} for status ${currentStatus}`);
    return true;
  } catch (error) {
    console.error(`Error sending update email:`, error);
    return false;
  }
};
