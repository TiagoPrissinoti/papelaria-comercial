const { Router } = require('express');
const controller = require('../controllers/cartController');
const { authMiddleware } = require('../middlewares/auth');
const allowBodyFields = require('../middlewares/allowBodyFields');

const router = Router();

router.use(authMiddleware);
router.get('/', controller.getCart);
router.post('/items', allowBodyFields('productId', 'quantity', 'selectedColor'), controller.upsertItem);
router.delete('/items/:itemId', controller.removeItem);

module.exports = router;
