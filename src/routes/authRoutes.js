const express = require('express');
const router = express.Router();

// Rota de teste
router.get('/health', (req, res) => {
    res.json({ message: 'Rota de Autenticação funcionando!' });
});

module.exports = router;