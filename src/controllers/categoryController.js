// src/controllers/categoryController.js
const pool = require('../config/database'); // Certifique-se de que o nome do arquivo de conexao esta correto

// Listar todas as categorias
const getAllCategories = async (req, res, next) => {
    try {
        const query = 'SELECT id, name, description, created_at FROM categories ORDER BY id ASC';
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

// Criar uma nova categoria
const createCategory = async (req, res, next) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ 
                success: false, 
                error: 'O nome da categoria é obrigatório.' 
            });
        }

        const query = `
            INSERT INTO categories (name, description)
            VALUES ($1, $2)
            RETURNING *;
        `;
        const { rows } = await pool.query(query, [name, description]);

        res.status(201).json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllCategories,
    createCategory
};