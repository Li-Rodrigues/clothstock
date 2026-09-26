const pool = require('../config/database');
const { getPagination, paginationResponse } = require('../utils/pagination');
const { forbidUnless, ACTIONS } = require('../config/permissions');

// Listar todas as marcas
const getAllBrands = async (req, res, next) => {
    try {
        const { page, limit, offset, hasPaging } = getPagination(req);
        const search = String(req.query.search || '').trim();
        const values = search ? [`%${search}%`] : [];
        const where = search ? 'WHERE name ILIKE $1 OR COALESCE(description, \'\') ILIKE $1' : '';
        const countResult = await pool.query(
            `SELECT COUNT(*)::int AS total FROM brands ${where}`,
            values
        );
        const pagingSql = hasPaging
            ? ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`
            : '';
        const queryValues = hasPaging ? [...values, limit, offset] : values;
        const { rows } = await pool.query(
            `SELECT * FROM brands ${where} ORDER BY id DESC${pagingSql}`,
            queryValues
        );

        res.status(200).json(paginationResponse(page, limit, countResult.rows[0].total, rows));
    } catch (error) {
        next(error);
    }
};

// Obter uma marca por ID
const getBrandById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const query = 'SELECT * FROM brands WHERE id = $1;';
        const { rows } = await pool.query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Marca não encontrada.' });
        }

        res.status(200).json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        next(error);
    }
};

// Criar uma nova marca
const createBrand = async (req, res, next) => {

    /*
     * Autorização conferida dentro do próprio controller, além do
     * middleware da rota: uma escrita destrutiva não deve depender
     * apenas da montagem da rota para ser bloqueada.
     */
    if (forbidUnless(res, req, ACTIONS.BRANDS_CREATE)) return;
    try {
        const { name, description } = req.body;

        const cleanName = name ? name.trim() : '';
        const cleanDescription = description ? description.trim() : null;

        if (!cleanName) {
            return res.status(400).json({ success: false, error: 'O nome da marca é obrigatório.' });
        }

        // Verifica se já existe marca com o mesmo nome (ignorando maiúsculas/minúsculas)
        const checkQuery = 'SELECT id FROM brands WHERE LOWER(name) = LOWER($1);';
        const checkResult = await pool.query(checkQuery, [cleanName]);
        if (checkResult.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Já existe uma marca cadastrada com este nome.' });
        }

        const query = `
            INSERT INTO brands (name, description)
            VALUES ($1, $2)
            RETURNING *;
        `;
        const { rows } = await pool.query(query, [cleanName, cleanDescription]);

        res.status(201).json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        next(error);
    }
};

// Atualizar marca existente
const updateBrand = async (req, res, next) => {

    /*
     * Autorização conferida dentro do próprio controller, além do
     * middleware da rota: uma escrita destrutiva não deve depender
     * apenas da montagem da rota para ser bloqueada.
     */
    if (forbidUnless(res, req, ACTIONS.BRANDS_UPDATE)) return;
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const cleanName = name ? name.trim() : '';
        const cleanDescription = description ? description.trim() : null;

        if (!cleanName) {
            return res.status(400).json({ success: false, error: 'O nome da marca é obrigatório.' });
        }

        // Verifica se o nome já está em uso por outra marca
        const checkQuery = 'SELECT id FROM brands WHERE LOWER(name) = LOWER($1) AND id <> $2;';
        const checkResult = await pool.query(checkQuery, [cleanName, id]);
        if (checkResult.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Outra marca já utiliza este nome.' });
        }

        const query = `
            UPDATE brands
            SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *;
        `;
        const { rows } = await pool.query(query, [cleanName, cleanDescription, id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Marca não encontrada.' });
        }

        res.status(200).json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        next(error);
    }
};

// Deletar marca
const deleteBrand = async (req, res, next) => {

    /*
     * Autorização conferida dentro do próprio controller, além do
     * middleware da rota: uma escrita destrutiva não deve depender
     * apenas da montagem da rota para ser bloqueada.
     */
    if (forbidUnless(res, req, ACTIONS.BRANDS_DELETE)) return;
    try {
        const { id } = req.params;
        const query = 'DELETE FROM brands WHERE id = $1;';
        const { rowCount } = await pool.query(query, [id]);

        if (rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Marca não encontrada.' });
        }

        res.status(200).json({
            success: true,
            message: 'Marca removida com sucesso.'
        });
    } catch (error) {
        // Trata a restrição de chave estrangeira (FK) quando existem produtos vinculados
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                error: 'Não é possível excluir esta marca pois existem produtos vinculados a ela.'
            });
        }
        next(error);
    }
};

module.exports = {
    getAllBrands,
    getBrandById,
    createBrand,
    updateBrand,
    deleteBrand
};