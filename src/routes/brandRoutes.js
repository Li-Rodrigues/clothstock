// src/routes/brandRoutes.js

const express = require('express');

const router = express.Router();

const {
    getAllBrands,
    getBrandById,
    createBrand,
    updateBrand,
    deleteBrand
} = require('../controllers/brandController');


// ============================================================
// LISTAR TODAS AS MARCAS
// GET /api/brands
// ============================================================

router.get('/', getAllBrands);


// ============================================================
// OBTER MARCA POR ID
// GET /api/brands/:id
// ============================================================

router.get('/:id', getBrandById);


// ============================================================
// CRIAR MARCA
// POST /api/brands
// ============================================================

router.post('/', createBrand);


// ============================================================
// ATUALIZAR MARCA
// PUT /api/brands/:id
// ============================================================

router.put('/:id', updateBrand);


// ============================================================
// EXCLUIR MARCA
// DELETE /api/brands/:id
// ============================================================

router.delete('/:id', deleteBrand);


module.exports = router;