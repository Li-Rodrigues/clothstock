const pool = require('../config/database');
const { getPagination, paginationResponse } = require('../utils/pagination');

// ============================================================
// LISTAR TODOS OS FORNECEDORES
// ============================================================

const getAllSuppliers = async (req, res, next) => {
    try {
        const { page, limit, offset, hasPaging } = getPagination(req);
        const search = String(req.query.search || '').trim();
        const values = search ? [`%${search}%`] : [];
        const where = search
            ? `WHERE name ILIKE $1
                OR COALESCE(trade_name, '') ILIKE $1
                OR cnpj_cpf ILIKE $1
                OR COALESCE(city, '') ILIKE $1
                OR COALESCE(state, '') ILIKE $1`
            : '';
        const countResult = await pool.query(
            `SELECT COUNT(*)::int AS total FROM suppliers ${where}`,
            values
        );
        const pagingSql = hasPaging
            ? ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`
            : '';
        const queryValues = hasPaging ? [...values, limit, offset] : values;
        const { rows } = await pool.query(
            `SELECT * FROM suppliers ${where} ORDER BY id DESC${pagingSql}`,
            queryValues
        );

        res.status(200).json(paginationResponse(page, limit, countResult.rows[0].total, rows));

    } catch (error) {
        next(error);
    }
};

// ============================================================
// OBTER FORNECEDOR POR ID
// ============================================================

const getSupplierById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT *
            FROM suppliers
            WHERE id = $1;
        `;

        const { rows } = await pool.query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Fornecedor não encontrado.'
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
// CRIAR FORNECEDOR
// ============================================================

const createSupplier = async (req, res, next) => {
    try {
        const {
            name,
            trade_name,
            cnpj_cpf,
            email,
            phone,
            address,
            city,
            state,
            notes
        } = req.body;

        const cleanName = name ? name.trim() : '';
        const cleanTradeName = trade_name
            ? trade_name.trim()
            : null;
        const cleanCnpjCpf = cnpj_cpf
            ? cnpj_cpf.trim()
            : '';
        const cleanEmail = email
            ? email.trim()
            : null;
        const cleanPhone = phone
            ? phone.trim()
            : null;
        const cleanAddress = address
            ? address.trim()
            : null;
        const cleanCity = city
            ? city.trim()
            : null;
        const cleanState = state
            ? state.trim().toUpperCase()
            : null;
        const cleanNotes = notes
            ? notes.trim()
            : null;

        if (!cleanName) {
            return res.status(400).json({
                success: false,
                error: 'A razão social do fornecedor é obrigatória.'
            });
        }

        if (!cleanCnpjCpf) {
            return res.status(400).json({
                success: false,
                error: 'O CNPJ/CPF do fornecedor é obrigatório.'
            });
        }

        if (cleanState && cleanState.length !== 2) {
            return res.status(400).json({
                success: false,
                error: 'O estado deve possuir 2 caracteres.'
            });
        }

        // Verifica CNPJ/CPF duplicado
        const checkQuery = `
            SELECT id
            FROM suppliers
            WHERE LOWER(cnpj_cpf) = LOWER($1);
        `;

        const checkResult = await pool.query(
            checkQuery,
            [cleanCnpjCpf]
        );

        if (checkResult.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Já existe um fornecedor cadastrado com este CNPJ/CPF.'
            });
        }

        const query = `
            INSERT INTO suppliers (
                name,
                trade_name,
                cnpj_cpf,
                email,
                phone,
                address,
                city,
                state,
                notes
            )
            VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9
            )
            RETURNING *;
        `;

        const { rows } = await pool.query(query, [
            cleanName,
            cleanTradeName,
            cleanCnpjCpf,
            cleanEmail,
            cleanPhone,
            cleanAddress,
            cleanCity,
            cleanState,
            cleanNotes
        ]);

        res.status(201).json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        next(error);
    }
};

// ============================================================
// ATUALIZAR FORNECEDOR
// ============================================================

const updateSupplier = async (req, res, next) => {
    try {
        const { id } = req.params;

        const {
            name,
            trade_name,
            cnpj_cpf,
            email,
            phone,
            address,
            city,
            state,
            notes
        } = req.body;

        const cleanName = name ? name.trim() : '';
        const cleanTradeName = trade_name
            ? trade_name.trim()
            : null;
        const cleanCnpjCpf = cnpj_cpf
            ? cnpj_cpf.trim()
            : '';
        const cleanEmail = email
            ? email.trim()
            : null;
        const cleanPhone = phone
            ? phone.trim()
            : null;
        const cleanAddress = address
            ? address.trim()
            : null;
        const cleanCity = city
            ? city.trim()
            : null;
        const cleanState = state
            ? state.trim().toUpperCase()
            : null;
        const cleanNotes = notes
            ? notes.trim()
            : null;

        if (!cleanName) {
            return res.status(400).json({
                success: false,
                error: 'A razão social do fornecedor é obrigatória.'
            });
        }

        if (!cleanCnpjCpf) {
            return res.status(400).json({
                success: false,
                error: 'O CNPJ/CPF do fornecedor é obrigatório.'
            });
        }

        if (cleanState && cleanState.length !== 2) {
            return res.status(400).json({
                success: false,
                error: 'O estado deve possuir 2 caracteres.'
            });
        }

        // Verifica CNPJ/CPF utilizado por outro fornecedor
        const checkQuery = `
            SELECT id
            FROM suppliers
            WHERE LOWER(cnpj_cpf) = LOWER($1)
              AND id <> $2;
        `;

        const checkResult = await pool.query(
            checkQuery,
            [cleanCnpjCpf, id]
        );

        if (checkResult.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Outro fornecedor já utiliza este CNPJ/CPF.'
            });
        }

        const query = `
            UPDATE suppliers
            SET
                name = $1,
                trade_name = $2,
                cnpj_cpf = $3,
                email = $4,
                phone = $5,
                address = $6,
                city = $7,
                state = $8,
                notes = $9,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
            RETURNING *;
        `;

        const { rows } = await pool.query(query, [
            cleanName,
            cleanTradeName,
            cleanCnpjCpf,
            cleanEmail,
            cleanPhone,
            cleanAddress,
            cleanCity,
            cleanState,
            cleanNotes,
            id
        ]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Fornecedor não encontrado.'
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
// EXCLUIR FORNECEDOR
// ============================================================

const deleteSupplier = async (req, res, next) => {
    try {
        const { id } = req.params;

        const query = `
            DELETE FROM suppliers
            WHERE id = $1;
        `;

        const { rowCount } = await pool.query(
            query,
            [id]
        );

        if (rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Fornecedor não encontrado.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Fornecedor removido com sucesso.'
        });

    } catch (error) {

        // Fornecedor possui entradas de estoque vinculadas
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                error:
                    'Não é possível excluir este fornecedor pois existem entradas de estoque vinculadas a ele.'
            });
        }

        next(error);
    }
};

// ============================================================
// EXPORTAÇÃO
// ============================================================

module.exports = {
    getAllSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier
};