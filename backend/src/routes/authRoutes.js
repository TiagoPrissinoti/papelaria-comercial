const { Router } = require('express');
const controller = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/auth');

const router = Router();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.get('/me', authMiddleware, controller.me);
router.post('/logout', controller.logout);

module.exports = router;
