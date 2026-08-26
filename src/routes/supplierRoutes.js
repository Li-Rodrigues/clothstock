const express = require('express');

const {
    getAllSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier
} = require('../controllers/supplierController');

const router = express.Router();

// GET /api/suppliers
router.get('/', getAllSuppliers);

// GET /api/suppliers/:id
router.get('/:id', getSupplierById);

// POST /api/suppliers
router.post('/', createSupplier);

// PUT /api/suppliers/:id
router.put('/:id', updateSupplier);

// DELETE /api/suppliers/:id
router.delete('/:id', deleteSupplier);

module.exports = router;