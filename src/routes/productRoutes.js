// src/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const { getAllProducts, createProduct } = require('../controllers/productController');

// GET /api/products
router.get('/', getAllProducts);

// POST /api/products
router.post('/', createProduct);

router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;