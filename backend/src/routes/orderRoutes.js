const { Router } = require('express');
const controller = require('../controllers/orderController');
const { authMiddleware, isAdmin } = require('../middlewares/auth');

const router = Router();

router.use(authMiddleware);
router.post('/checkout', controller.createFromCart);
router.get('/my', controller.myOrders);
router.post('/:id/pay', controller.payOrder);
router.get('/', isAdmin, controller.adminList);
router.patch('/:id/status', isAdmin, controller.updateStatus);

module.exports = router;
