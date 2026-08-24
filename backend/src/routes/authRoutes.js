const { Router } = require('express');
const controller = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/auth');
const allowBodyFields = require('../middlewares/allowBodyFields');

const router = Router();

router.post('/register', allowBodyFields('name', 'email', 'password'), controller.register);
router.post('/login', allowBodyFields('email', 'password'), controller.login);
router.get('/me', authMiddleware, controller.me);
router.post('/logout', controller.logout);

module.exports = router;
