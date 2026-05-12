const { Router } = require('express');
const controller = require('../controllers/categoryController');
const { authMiddleware, isAdmin } = require('../middlewares/auth');

const router = Router();

router.get('/', controller.list);
router.post('/', authMiddleware, isAdmin, controller.create);
router.put('/:id', authMiddleware, isAdmin, controller.update);
router.delete('/:id', authMiddleware, isAdmin, controller.remove);

module.exports = router;
