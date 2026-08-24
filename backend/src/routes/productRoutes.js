const { Router } = require('express');
const controller = require('../controllers/productController');
const { authMiddleware, isAdmin } = require('../middlewares/auth');
const { productUpload } = require('../middlewares/upload');
const allowBodyFields = require('../middlewares/allowBodyFields');

const router = Router();

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post(
  '/',
  authMiddleware,
  isAdmin,
  productUpload,
  allowBodyFields('name', 'description', 'price', 'costPrice', 'stock', 'categoryId'),
  controller.create
);
router.put(
  '/:id',
  authMiddleware,
  isAdmin,
  productUpload,
  allowBodyFields('name', 'description', 'price', 'costPrice', 'stock', 'categoryId'),
  controller.update
);
router.delete('/:id', authMiddleware, isAdmin, controller.remove);

module.exports = router;
