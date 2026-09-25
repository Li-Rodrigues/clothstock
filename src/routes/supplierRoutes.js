const express = require('express');
const { requireRole } = require('../middlewares/authMiddleware');

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
router.post('/', requireRole('ADMIN'), createSupplier);

// PUT /api/suppliers/:id
router.put('/:id', requireRole('ADMIN'), updateSupplier);
router.patch('/:id', requireRole('ADMIN'), updateSupplier);

// DELETE /api/suppliers/:id
router.delete('/:id', requireRole('ADMIN'), deleteSupplier);

module.exports = router;