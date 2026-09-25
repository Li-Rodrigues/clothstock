// src/routes/categoryRoutes.js

const express = require('express');
const { requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

const {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
} = require('../controllers/categoryController');

// ============================================================
// GET /api/categories
// Listar todas as categorias
// ============================================================

router.get('/', getAllCategories);

// ============================================================
// GET /api/categories/:id
// Obter uma categoria específica
// ============================================================

router.get('/:id', getCategoryById);

// ============================================================
// POST /api/categories
// Criar categoria
// ============================================================

router.post('/', requireRole('ADMIN'), createCategory);

// ============================================================
// PUT /api/categories/:id
// Atualizar categoria
// ============================================================

router.put('/:id', requireRole('ADMIN'), updateCategory);
router.patch('/:id', requireRole('ADMIN'), updateCategory);

// ============================================================
// DELETE /api/categories/:id
// Excluir categoria
// ============================================================

router.delete('/:id', requireRole('ADMIN'), deleteCategory);

module.exports = router;