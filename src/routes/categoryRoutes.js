// src/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const { getAllCategories, createCategory } = require('../controllers/categoryController');

// GET /api/categories
router.get('/', getAllCategories);

// POST /api/categories
router.post('/', createCategory);

router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;