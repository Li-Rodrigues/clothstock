// src/routes/brandRoutes.js
const express = require('express');
const router = express.Router();
const { getAllBrands, createBrand, updateBrand, deleteBrand } = require('../controllers/brandController');

// GET /api/brands
router.get('/', getAllBrands);

// POST /api/brands
router.post('/', createBrand);

router.put('/:id', updateBrand);
router.delete('/:id', deleteBrand);

module.exports = router;