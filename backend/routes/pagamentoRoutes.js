const { Router } = require('express');
const controller = require('../controllers/pagamentoController');
const { authMiddleware } = require('../src/middlewares/auth');

const router = Router();

router.post('/criar', authMiddleware, controller.criar);
router.get('/pedidos/:id', authMiddleware, controller.consultar);
router.post('/pedidos/:id/reconciliar', authMiddleware, controller.reconciliar);

module.exports = router;
