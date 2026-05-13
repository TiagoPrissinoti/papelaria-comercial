const { Router } = require('express');
const controller = require('../controllers/reviewController');
const { authMiddleware, optionalAuthMiddleware } = require('../middlewares/auth');
const { reviewUpload } = require('../middlewares/upload');

const router = Router();

router.get('/products/:productId', optionalAuthMiddleware, controller.listByProduct);
router.post('/products/:productId', authMiddleware, reviewUpload, controller.create);
router.put('/:id', authMiddleware, reviewUpload, controller.update);
router.delete('/:id', authMiddleware, controller.remove);
router.post('/:id/like', authMiddleware, controller.toggleLike);
router.post('/:id/report', authMiddleware, controller.report);
router.post('/:id/reply', authMiddleware, controller.reply);

module.exports = router;
