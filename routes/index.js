const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const resendController = require('../controllers/resendController');

// Home page
router.get('/', (req, res) => {
  res.render('index');
});

// Admin page (simple)
router.get('/admin', (req, res) => {
  res.render('admin');
});

// Alias for Admin page (to avoid conflict with /rastreio/:code if user tries /rastreio/admin)
router.get('/rastreio/admin', (req, res) => {
  res.render('admin');
});

// Tracking page
router.get('/rastreio/:code', orderController.getOrderStatus);

// Old Redelivery Payment (Keeping for backward compatibility if needed, but new module is preferred)
router.get('/pagar-reenvio/:code', orderController.showRedeliveryPage);
router.post('/api/pay-redelivery/:code', orderController.processRedeliveryPayment);

// New Resend Module
router.get('/reenvio/:token', resendController.getResendPage);
router.post('/api/reenvio/:token/create-payment', resendController.createPayment);
router.post('/api/reenvio/:token/confirm', resendController.confirmPayment);
router.get('/api/reenvio/:paymentId/check-status', resendController.checkPaymentStatus);
router.post('/api/reenvio/webhook', resendController.webhook);

// API Endpoints
router.post('/api/orders', orderController.createOrder);
router.get('/api/orders', orderController.listOrders);

module.exports = router;
