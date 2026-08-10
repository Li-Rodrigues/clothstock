// src/routes/brandRoutes.js
const express = require('express');
const router = express.Router();
const { getAllBrands, createBrand } = require('../controllers/brandController');

// GET /api/brands
router.get('/', getAllBrands);

// POST /api/brands
router.post('/', createBrand);

module.exports = router;