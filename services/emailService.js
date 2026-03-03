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

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getBaseUrl = () => {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL;
  return 'https://rastreio-pt.onrender.com';
};

// ─── Language Config (PT-PT vs PT-BR) ───────────────────────────────
const langConfig = {
  PT: {
    term: 'Encomenda',
    address: 'Morada',
    locale: 'pt-PT',
    currency: 'EUR',
    currencySymbol: '€',
    paymentMethods: 'MBWay / Multibanco',
    statusDescriptions: [
      'Encomenda Confirmada',
      'Em Processamento',
      'Expedida',
      'Em Trânsito',
      'Saiu para Entrega',
      'Tentativa de Entrega Falhou - Destinatário Ausente',
      'Reenvio Agendado',
      'Entregue'
    ],
    statusMessages: [
      'Rececionámos a sua encomenda com sucesso! Estamos a preparar tudo para envio.',
      'A sua encomenda está em processamento e será enviada em breve.',
      'A sua encomenda foi expedida! Agora é só aguardar a entrega.',
      'A sua encomenda está a caminho. Acompanhe o progresso abaixo.',
      'A sua encomenda saiu para entrega! Esteja atento na morada indicada.',
      'Não foi possível entregar a sua encomenda. O destinatário estava ausente. Aceda ao rastreio para reagendar a entrega.',
      'O reenvio da sua encomenda foi agendado com sucesso.',
      'A sua encomenda foi entregue com sucesso! Esperamos que goste.'
    ],
    steps: [
      { label: 'Confirmada', icon: '✓' },
      { label: 'Em processamento', icon: '⚙' },
      { label: 'Expedida', icon: '📦' },
      { label: 'Em trânsito', icon: '🚚' },
      { label: 'Saiu p/ entrega', icon: '📍' },
      { label: 'Entregue', icon: '✅' }
    ],
    headerLabel: 'Atualização de encomenda',
    trackBtn: 'Acompanhar Encomenda',
    greeting: 'Olá',
    copyLink: 'Ou copie e cole',
    footer: 'Dados protegidos',
    autoEmail: 'Este é um e-mail automático. Por favor, não responda.',
    copyright: 'Rastreio Encomendas. Todos os direitos reservados.',
    completed: 'Concluído',
    current: 'Atual',
    waiting: 'A aguardar',
    progressLabel: 'Progresso do envio',
    statusLabel: 'Estado atual',
    rescheduleTitle: 'Reenvio Agendado',
    rescheduleMsg: (date) => `O reenvio da sua encomenda foi agendado para <strong>${date}</strong>. Estamos a trabalhar para que chegue o mais rápido possível.`
  },
  BR: {
    term: 'Pedido',
    address: 'Endereço',
    locale: 'pt-BR',
    currency: 'BRL',
    currencySymbol: 'R$',
    paymentMethods: 'PIX',
    statusDescriptions: [
      'Pedido Confirmado',
      'Em Processamento',
      'Enviado',
      'Em Trânsito',
      'Saiu para Entrega',
      'Tentativa de Entrega Falhou - Destinatário Ausente',
      'Reenvio Agendado',
      'Entregue'
    ],
    statusMessages: [
      'Recebemos seu pedido com sucesso! Estamos preparando tudo para envio.',
      'Seu pedido está em processamento e será enviado em breve.',
      'Seu pedido foi enviado! Agora é só aguardar a entrega.',
      'Seu pedido está a caminho. Acompanhe o progresso abaixo.',
      'Seu pedido saiu para entrega! Fique atento ao endereço.',
      'Não foi possível entregar seu pedido. O destinatário estava ausente. Acesse o rastreio para reagendar a entrega.',
      'O reenvio do seu pedido foi agendado com sucesso.',
      'Seu pedido foi entregue com sucesso! Esperamos que goste.'
    ],
    steps: [
      { label: 'Confirmado', icon: '✓' },
      { label: 'Em processamento', icon: '⚙' },
      { label: 'Enviado', icon: '📦' },
      { label: 'Em trânsito', icon: '🚚' },
      { label: 'Saiu p/ entrega', icon: '📍' },
      { label: 'Entregue', icon: '✅' }
    ],
    headerLabel: 'Atualização de pedido',
    trackBtn: 'Acompanhar Pedido',
    greeting: 'Olá',
    copyLink: 'Ou copie e cole',
    footer: 'Dados protegidos',
    autoEmail: 'Este é um e-mail automático. Por favor, não responda.',
    copyright: 'Rastreio Encomendas. Todos os direitos reservados.',
    completed: 'Concluído',
    current: 'Atual',
    waiting: 'Aguardando',
    progressLabel: 'Progresso do envio',
    statusLabel: 'Status atual',
    rescheduleTitle: 'Reenvio Agendado',
    rescheduleMsg: (date) => `O reenvio do seu pedido foi agendado para <strong>${date}</strong>. Estamos trabalhando para que chegue o mais rápido possível.`
  }
};

const getLang = (country) => langConfig[country === 'BR' ? 'BR' : 'PT'];

// Increment emailsSent counter
const incrementEmailsSent = async (orderId) => {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { emailsSent: { increment: 1 } }
    });
  } catch (err) {
    console.error('Failed to increment emailsSent:', err);
  }
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
  const lang = getLang(order.country);
  const steps = lang.steps;

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
      statusText = `<span style="font-size:11px; color:${brand.primary}; font-weight:600;">${lang.completed}</span>`;
    } else if (isCurrent) {
      dotColor = brand.bgCard;
      dotBorder = brand.primary;
      labelColor = brand.primary;
      labelWeight = 'bold';
      statusText = `<span style="font-size:11px; color:${brand.primary}; background:${brand.primarySubtle}; padding:2px 8px; border-radius:10px; font-weight:700;">${lang.current}</span>`;
    } else {
      statusText = `<span style="font-size:11px; color:${brand.textMuted};">${lang.waiting}</span>`;
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
<html lang="${lang.locale}">
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
                    <p style="margin:0 0 8px 0; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:${brand.textMuted};">${lang.headerLabel}</p>
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
              <p style="margin:0 0 6px 0; font-size:17px; font-weight:700; color:${brand.textPrimary};">${lang.greeting}, ${order.name.split(' ')[0]}</p>
              <p style="margin:0; font-size:14px; color:${brand.textSecondary}; line-height:1.65;">${message}</p>
            </td>
          </tr>

          <!-- Status Card -->
          <tr>
            <td style="padding:24px 36px 0 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${accentBg}; border-radius:10px; border-left:3px solid ${accentColor};">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 2px 0; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:${accentColor};">${lang.statusLabel}</p>
                    <p style="margin:0; font-size:17px; font-weight:800; color:${brand.textPrimary};">${steps[Math.min(activeStepIndex, steps.length - 1)].label}</p>
                    <p style="margin:4px 0 0 0; font-size:12px; color:${brand.textMuted};">${new Date().toLocaleDateString(lang.locale)} às ${new Date().toLocaleTimeString(lang.locale, { hour: '2-digit', minute: '2-digit' })}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Timeline -->
          <tr>
            <td style="padding:28px 36px 0 36px;">
              <p style="margin:0 0 16px 0; font-size:13px; font-weight:700; color:${brand.textPrimary}; text-transform:uppercase; letter-spacing:0.04em;">${lang.progressLabel}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${timelineHtml}
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:28px 36px 0 36px; text-align:center;">
              <a href="${trackingUrl}" style="display:inline-block; background:${brand.primary}; color:#ffffff; padding:14px 36px; border-radius:8px; text-decoration:none; font-weight:700; font-size:14px; letter-spacing:0.02em;">${lang.trackBtn}</a>
            </td>
          </tr>

          <!-- Fallback Link -->
          <tr>
            <td style="padding:20px 36px 0 36px; text-align:center;">
              <p style="margin:0; font-size:12px; color:${brand.textMuted};">${lang.copyLink}: <a href="${trackingUrl}" style="color:${brand.primary}; word-break:break-all; font-size:12px;">${trackingUrl}</a></p>
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
                      <span style="display:inline-block; margin:0 6px;">🔒 ${lang.footer}</span>
                      <span style="display:inline-block; margin:0 6px;">✓ SSL seguro</span>
                      <span style="display:inline-block; margin:0 6px;">📦 Certificado</span>
                    </p>
                    <p style="margin:0; font-size:11px; color:#9CA3AF;">${lang.autoEmail}</p>
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
              <p style="margin:0; font-size:11px; color:#9CA3AF;">&copy; ${new Date().getFullYear()} ${lang.copyright}</p>
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
    const lang = getLang(order.country);
    const title = lang.statusDescriptions[0];
    const message = lang.statusMessages[0] + ' Acompanhe cada etapa da entrega na linha do tempo abaixo.';
    const html = getEmailTemplate(order, title, message, 0, { isSuccess: true });
    const text = `${lang.greeting} ${order.name.split(' ')[0]}, ${lang.term.toLowerCase()} confirmado! Codigo: ${order.code}. Acompanhe em: ${getBaseUrl()}/rastreio/${order.code}`;

    const { data, error } = await resend.emails.send({
      from: 'Rastreio de Pedido <nao-responda@site-seguro-verificado.fun>',
      to: order.email,
      subject: `${title} #${order.code}`,
      text,
      html
    });

    if (error) {
      console.error(`Error sending confirmation email to ${order.email}:`, error);
      return false;
    }
    await incrementEmailsSent(order.id);
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
    const lang = getLang(order.country);
    const formattedDate = new Date(date).toLocaleDateString(lang.locale);
    const title = lang.rescheduleTitle;
    const message = lang.rescheduleMsg(formattedDate);
    const html = getEmailTemplate(order, title, message, 2, {});
    const text = `${lang.greeting} ${order.name.split(' ')[0]}, ${lang.term.toLowerCase()} reagendado para ${formattedDate}. Codigo: ${order.code}. Acompanhe em: ${getBaseUrl()}/rastreio/${order.code}`;

    const { data, error } = await resend.emails.send({
      from: 'Rastreio de Pedido <nao-responda@site-seguro-verificado.fun>',
      to: order.email,
      subject: `${title} #${order.code}`,
      text,
      html
    });

    if (error) {
      console.error(`Error sending reschedule email:`, error);
      return false;
    }
    await incrementEmailsSent(order.id);
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
    const lang = getLang(order.country);
    const currentStatus = order.status;
    const title = lang.statusDescriptions[currentStatus] || `${lang.headerLabel}`;
    const message = lang.statusMessages[currentStatus] || `${lang.term} teve uma nova atualização.`;

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
    const text = `${lang.greeting} ${order.name.split(' ')[0]}, ${lang.headerLabel.toLowerCase()}: ${title}. Acompanhe em: ${getBaseUrl()}/rastreio/${order.code}`;

    const { data, error } = await resend.emails.send({
      from: 'Rastreio de Pedido <nao-responda@site-seguro-verificado.fun>',
      to: order.email,
      subject: `${title} #${order.code}`,
      text,
      html
    });

    if (error) {
      console.error(`Error sending update email to ${order.email}:`, error);
      return false;
    }

    await incrementEmailsSent(order.id);
    console.log(`Update email sent to ${order.email} for status ${currentStatus}`);
    return true;
  } catch (error) {
    console.error(`Error sending update email:`, error);
    return false;
  }
};

// Export getLang for use by other modules
exports.getLang = getLang;
