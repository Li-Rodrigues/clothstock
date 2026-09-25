// src/routes/movementRoutes.js
const express = require('express');
const { requireRole } = require('../middlewares/authMiddleware');
const router = express.Router();
const { createMovement, getMovements } = require('../controllers/movementController');

// GET /api/movements (aceita query parameter ?type=INFLOW ou ?type=OUTFLOW)
router.get('/', getMovements);

// Rotas explícitas do PRD; o controller continua sendo a única fonte da regra.
router.post('/inflows', requireRole('ADMIN', 'OPERATOR'), (req, res, next) => {
  req.body.type = 'INFLOW';
  return createMovement(req, res, next);
});

router.post('/outflows', requireRole('ADMIN', 'OPERATOR'), (req, res, next) => {
  req.body.type = 'OUTFLOW';
  return createMovement(req, res, next);
});

// Compatibilidade com o frontend existente.
router.post('/', requireRole('ADMIN', 'OPERATOR'), createMovement);

module.exports = router;