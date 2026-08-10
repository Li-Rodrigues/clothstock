// src/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const { getAllCategories, createCategory } = require('../controllers/categoryController');

// GET /api/categories
router.get('/', getAllCategories);

// POST /api/categories
router.post('/', createCategory);

module.exports = router;