// src/routes/productRoutes.js

const express = require('express');

const router = express.Router();

const {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');

// ============================================================
// GET /api/products
// Lista todos os produtos
// ============================================================

router.get('/', getAllProducts);

// ============================================================
// GET /api/products/:id
// Busca um produto específico
// ============================================================

router.get('/:id', getProductById);

// ============================================================
// POST /api/products
// Cria um produto
// ============================================================

router.post('/', createProduct);

// ============================================================
// PUT /api/products/:id
// Atualiza um produto
// ============================================================

router.put('/:id', updateProduct);

// ============================================================
// DELETE /api/products/:id
// Exclui um produto
// ============================================================

router.delete('/:id', deleteProduct);

// ============================================================
// EXPORTAÇÃO
// ============================================================

module.exports = router;