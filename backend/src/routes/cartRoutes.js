const { Router } = require('express');
const controller = require('../controllers/cartController');
const { authMiddleware } = require('../middlewares/auth');

const router = Router();

router.use(authMiddleware);
router.get('/', controller.getCart);
router.post('/items', controller.upsertItem);
router.delete('/items/:productId', controller.removeItem);

module.exports = router;
