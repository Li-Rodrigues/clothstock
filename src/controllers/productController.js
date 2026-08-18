// src/controllers/productController.js
const pool = require('../config/database');

// Listar todos os produtos (trazendo nomes da marca e categoria com JOIN)
const getAllProducts = async (req, res, next) => {
    try {
        const query = `
            SELECT 
                p.id,
                p.title AS name,
                p.description,
                p.price,
                p.quantity AS stock_quantity,
                p.quantity_produced,
                p.created_at,
                b.name AS brand_name,
                c.name AS category_name
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY p.id ASC;
        `;
        const { rows } = await pool.query(query);

        res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (error) {
        next(error);
    }
};

// Criar um novo produto
const createProduct = async (req, res, next) => {
    try {
        const { name, description, price, quantity, brand_id, category_id } = req.body;

        if (!name || price === undefined) {
            return res.status(400).json({ 
                success: false, 
                error: 'O nome e o preço do produto são obrigatórios.' 
            });
        }

        const query = `
            INSERT INTO products (name, description, price, quantity, brand_id, category_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const values = [
            name, 
            description || null, 
            parseFloat(price), 
            parseInt(quantity) || 0, 
            brand_id ? parseInt(brand_id) : null, 
            category_id ? parseInt(category_id) : null
        ];

        const { rows } = await pool.query(query, values);

        res.status(201).json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        next(error);
    }
};


// Atualizar Produto
const updateProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, price, brand_id, category_id } = req.body;

        if (!name || price === undefined) {
            return res.status(400).json({ success: false, error: 'Nome e Preço são obrigatórios.' });
        }

        const query = `
            UPDATE products 
            SET name = $1, description = $2, price = $3, brand_id = $4, category_id = $5 
            WHERE id = $6 
            RETURNING *;
        `;
        const values = [
            name,
            description || null,
            parseFloat(price),
            brand_id ? parseInt(brand_id) : null,
            category_id ? parseInt(category_id) : null,
            id
        ];

        const { rows } = await pool.query(query, values);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Produto não encontrado.' });
        }

        res.status(200).json({ success: true, data: rows[0] });
    } catch (error) {
        next(error);
    }
};

// Deletar Produto
const deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [id]);

        if (rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Produto não encontrado.' });
        }

        res.status(200).json({ success: true, message: 'Produto removido com sucesso.' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllProducts,
    createProduct,
    updateProduct,
    deleteProduct
};