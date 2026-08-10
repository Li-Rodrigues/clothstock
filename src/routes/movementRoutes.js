// src/routes/movementRoutes.js
const express = require('express');
const router = express.Router();
const { createMovement, getMovements } = require('../controllers/movementController');

// GET /api/movements (aceita query parameter ?type=INFLOW ou ?type=OUTFLOW)
router.get('/', getMovements);

// POST /api/movements
router.post('/', createMovement);

module.exports = router;