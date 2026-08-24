const { Router } = require('express');
const controller = require('../controllers/pagamentoController');
const { authMiddleware } = require('../src/middlewares/auth');
const allowBodyFields = require('../src/middlewares/allowBodyFields');

const router = Router();

router.post('/criar', authMiddleware, allowBodyFields(), controller.criar);
router.get('/pedidos/:id', authMiddleware, controller.consultar);
router.post('/pedidos/:id/reconciliar', authMiddleware, allowBodyFields('payment_id'), controller.reconciliar);

module.exports = router;
