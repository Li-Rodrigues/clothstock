const express = require('express');
const { register, login, logout, me, permissions, health } = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);
router.get('/permissions', authenticate, permissions);
router.get('/health', health);

module.exports = router;
