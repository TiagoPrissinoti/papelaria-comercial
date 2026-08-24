const { Router } = require('express');
const controller = require('../controllers/reviewController');
const { authMiddleware, optionalAuthMiddleware } = require('../middlewares/auth');
const { reviewUpload } = require('../middlewares/upload');
const allowBodyFields = require('../middlewares/allowBodyFields');

const router = Router();

router.get('/products/:productId', optionalAuthMiddleware, controller.listByProduct);
router.post('/products/:productId', authMiddleware, reviewUpload, allowBodyFields('rating', 'comment'), controller.create);
router.put('/:id', authMiddleware, reviewUpload, allowBodyFields('rating', 'comment'), controller.update);
router.delete('/:id', authMiddleware, controller.remove);
router.post('/:id/like', authMiddleware, allowBodyFields(), controller.toggleLike);
router.post('/:id/report', authMiddleware, allowBodyFields('reason'), controller.report);
router.post('/:id/reply', authMiddleware, allowBodyFields('reply'), controller.reply);

module.exports = router;
