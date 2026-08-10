// src/controllers/brandController.js
const pool = require('../config/database.js'); // Ajuste o caminho para a sua conexão do pg/pool

// Buscar todas as marcas
const getAllBrands = async (req, res, next) => {
    try {
        const query = 'SELECT id, name, description, created_at FROM brands ORDER BY id ASC';
        const { rows } = await pool.query(query);

        res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (error) {
        next(error); // Encaminha o erro para o errorMiddleware
    }
};

// Criar uma nova marca (opcional)
const createBrand = async (req, res, next) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'O nome da marca é obrigatório.' });
        }

        const query = `
            INSERT INTO brands (name, description)
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
    getAllBrands,
    createBrand
};