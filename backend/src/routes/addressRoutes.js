const { Router } = require('express');
const controller = require('../controllers/addressController');
const { authMiddleware } = require('../middlewares/auth');
const allowBodyFields = require('../middlewares/allowBodyFields');

const router = Router();
const fields = ['label', 'recipient_name', 'phone', 'postal_code', 'street', 'number', 'complement', 'neighborhood', 'city', 'state', 'is_default'];

router.use(authMiddleware);
router.get('/', controller.list);
router.post('/', allowBodyFields(...fields), controller.create);
router.put('/:id', allowBodyFields(...fields), controller.update);

module.exports = router;
