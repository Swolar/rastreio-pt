const axios = require('axios');

class MasterPagService {
  constructor() {
    this.baseUrl = process.env.MASTERPAG_API_URL || 'https://api.masterpag.com/v1';
    this.apiKey = process.env.MASTERPAG_API_KEY;
    this.apiSecret = process.env.MASTERPAG_API_SECRET;
    this.merchantId = process.env.MASTERPAG_MERCHANT_ID;
  }

  isConfigured() {
    return !!(this.apiKey && this.apiKey !== 'CHANGE_ME');
  }

  /**
   * Create a PIX payment
   * @param {Object} params
   * @param {number} params.amount - Amount in BRL
   * @param {string} params.reference - Internal reference (e.g. "RESEND-CODE-1")
   * @param {Object} params.payer - { name, email, cpf, phone }
   * @param {string} params.callbackUrl - Webhook URL
   * @returns {Object} { transactionId, pixCode, qrCodeBase64, qrCodeUrl, expiresAt }
   */
  async createPixPayment({ amount, reference, payer, callbackUrl }) {
    if (!this.isConfigured()) {
      console.log('[MasterPag] Modo simulacao — API key nao configurada');
      return {
        transactionId: 'SIM-' + Date.now(),
        pixCode: '00020126580014br.gov.bcb.pix0136simulation-' + Date.now(),
        qrCodeBase64: null,
        qrCodeUrl: null,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        simulated: true
      };
    }

    try {
      const payload = {
        merchant_id: this.merchantId,
        amount: amount,
        currency: 'BRL',
        payment_method: 'pix',
        reference: reference,
        payer: {
          name: payer.name,
          email: payer.email,
          document: payer.cpf,
          phone: payer.phone
        },
        callback_url: callbackUrl,
        expiration: 1800
      };

      const response = await axios.post(`${this.baseUrl}/transactions/pix`, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-Api-Secret': this.apiSecret
        }
      });

      const data = response.data;
      return {
        transactionId: data.transaction_id || data.id,
        pixCode: data.pix_code || data.qr_code_text,
        qrCodeBase64: data.qr_code_base64 || null,
        qrCodeUrl: data.qr_code_url || null,
        expiresAt: data.expires_at,
        simulated: false
      };
    } catch (error) {
      console.error('MasterPag PIX Error:', error.response?.data || error.message);
      throw new Error('Falha no gateway PIX: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * Check payment status
   */
  async checkStatus(transactionId) {
    if (!this.isConfigured() || transactionId.startsWith('SIM-')) {
      return { status: 'PENDING', paidAt: null };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/transactions/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Api-Secret': this.apiSecret
        }
      });

      return {
        status: response.data.status,
        paidAt: response.data.paid_at || null
      };
    } catch (error) {
      console.error('MasterPag Status Error:', error.response?.data || error.message);
      return { status: 'ERROR', paidAt: null };
    }
  }

  /**
   * Validate webhook signature
   */
  validateWebhook(body, signature) {
    // TODO: Implement based on MasterPag docs
    return true;
  }
}

module.exports = new MasterPagService();
