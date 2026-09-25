// src/routes/productRoutes.js

const express = require('express');
const { requireRole } = require('../middlewares/authMiddleware');

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

router.post('/', requireRole('ADMIN'), createProduct);

// ============================================================
// PUT /api/products/:id
// Atualiza um produto
// ============================================================

router.put('/:id', requireRole('ADMIN'), updateProduct);
router.patch('/:id', requireRole('ADMIN'), updateProduct);

// ============================================================
// DELETE /api/products/:id
// Exclui um produto
// ============================================================

router.delete('/:id', requireRole('ADMIN'), deleteProduct);

// ============================================================
// EXPORTAÇÃO
// ============================================================

module.exports = router;