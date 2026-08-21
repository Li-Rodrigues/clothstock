// src/controllers/categoryController.js

const pool = require('../config/database');

// ============================================================
// LISTAR TODAS AS CATEGORIAS
// ============================================================

const getAllCategories = async (req, res, next) => {
    try {
        const query = `
            SELECT *
            FROM categories
            ORDER BY id DESC;
        `;

        const { rows } = await pool.query(query);

        res.status(200).json({
            success: true,
            data: rows
        });

    } catch (error) {
        next(error);
    }
};

// ============================================================
// OBTER CATEGORIA POR ID
// ============================================================

const getCategoryById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT *
            FROM categories
            WHERE id = $1;
        `;

        const { rows } = await pool.query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Categoria não encontrada.'
            });
        }

        res.status(200).json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        next(error);
    }
};

// ============================================================
// CRIAR NOVA CATEGORIA
// ============================================================

const createCategory = async (req, res, next) => {
    try {
        const { name, description } = req.body;

        // Limpeza dos dados
        const cleanName = name ? name.trim() : '';
        const cleanDescription = description
            ? description.trim()
            : null;

        // Validação
        if (!cleanName) {
            return res.status(400).json({
                success: false,
                error: 'O nome da categoria é obrigatório.'
            });
        }

        // Verificar duplicidade
        const checkQuery = `
            SELECT id
            FROM categories
            WHERE LOWER(name) = LOWER($1);
        `;

        const checkResult = await pool.query(
            checkQuery,
            [cleanName]
        );

        if (checkResult.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Já existe uma categoria cadastrada com este nome.'
            });
        }

        // Inserir categoria
        const query = `
            INSERT INTO categories (name, description)
            VALUES ($1, $2)
            RETURNING *;
        `;

        const { rows } = await pool.query(
            query,
            [cleanName, cleanDescription]
        );

        res.status(201).json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        next(error);
    }
};

// ============================================================
// ATUALIZAR CATEGORIA
// ============================================================

const updateCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        // Limpeza dos dados
        const cleanName = name ? name.trim() : '';
        const cleanDescription = description
            ? description.trim()
            : null;

        // Validação
        if (!cleanName) {
            return res.status(400).json({
                success: false,
                error: 'O nome da categoria é obrigatório.'
            });
        }

        // Verificar se outra categoria já usa o nome
        const checkQuery = `
            SELECT id
            FROM categories
            WHERE LOWER(name) = LOWER($1)
            AND id <> $2;
        `;

        const checkResult = await pool.query(
            checkQuery,
            [cleanName, id]
        );

        if (checkResult.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Outra categoria já utiliza este nome.'
            });
        }

        // Atualizar
        const query = `
            UPDATE categories
            SET
                name = $1,
                description = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *;
        `;

        const { rows } = await pool.query(
            query,
            [cleanName, cleanDescription, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Categoria não encontrada.'
            });
        }

        res.status(200).json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        next(error);
    }
};

// ============================================================
// DELETAR CATEGORIA
// ============================================================

const deleteCategory = async (req, res, next) => {
    try {
        const { id } = req.params;

        const query = `
            DELETE FROM categories
            WHERE id = $1;
        `;

        const { rowCount } = await pool.query(
            query,
            [id]
        );

        if (rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Categoria não encontrada.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Categoria removida com sucesso.'
        });

    } catch (error) {

        // PostgreSQL: violação de chave estrangeira
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                error: 'Não é possível excluir esta categoria pois existem produtos vinculados a ela.'
            });
        }

        next(error);
    }
};

// ============================================================
// EXPORTAÇÃO
// ============================================================

module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
};