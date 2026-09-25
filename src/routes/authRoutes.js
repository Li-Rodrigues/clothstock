const express = require('express');
const { register, login, logout, me } = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);
router.get('/health', (req, res) => res.json({ success: true, data: { message: 'Rota de autenticação funcionando!' } }));

module.exports = router;
