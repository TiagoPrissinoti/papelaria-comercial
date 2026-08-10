const { Router } = require('express');
const controller = require('../controllers/pagamentoController');
const { authMiddleware } = require('../src/middlewares/auth');

const router = Router();

router.post('/criar', authMiddleware, controller.criar);

module.exports = router;
