const { Router } = require('express');
const controller = require('../controllers/categoryController');
const { authMiddleware, isAdmin } = require('../middlewares/auth');
const allowBodyFields = require('../middlewares/allowBodyFields');

const router = Router();

router.get('/', controller.list);
router.post('/', authMiddleware, isAdmin, allowBodyFields('name'), controller.create);
router.put('/:id', authMiddleware, isAdmin, allowBodyFields('name'), controller.update);
router.delete('/:id', authMiddleware, isAdmin, controller.remove);

module.exports = router;
