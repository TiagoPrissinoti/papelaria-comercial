const { Router } = require('express');
const controller = require('../controllers/productController');
const { authMiddleware, isAdmin } = require('../middlewares/auth');
const { productUpload } = require('../middlewares/upload');

const router = Router();

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', authMiddleware, isAdmin, productUpload, controller.create);
router.put('/:id', authMiddleware, isAdmin, productUpload, controller.update);
router.delete('/:id', authMiddleware, isAdmin, controller.remove);

module.exports = router;
