// src/controllers/productController.js

const pool = require('../config/database');

// ============================================================
// FUNÇÃO AUXILIAR
// Converte valores para inteiro ou null
// ============================================================

function parseNullableInt(value) {

    if (
        value === undefined ||
        value === null ||
        value === ''
    ) {
        return null;
    }

    const parsed = parseInt(value, 10);

    return Number.isNaN(parsed)
        ? null
        : parsed;
}

// ============================================================
// FUNÇÃO AUXILIAR
// Converte valor para número decimal
// ============================================================

function parseDecimal(value) {

    if (
        value === undefined ||
        value === null ||
        value === ''
    ) {
        return 0;
    }

    const parsed = parseFloat(value);

    return Number.isNaN(parsed)
        ? 0
        : parsed;
}

// ============================================================
// GET ALL PRODUCTS
// GET /api/products
// ============================================================

const getAllProducts = async (req, res, next) => {

    try {

        const query = `
            SELECT
                p.id,
                p.title,
                p.sku,
                p.description,
                p.size,
                p.color,
                p.cost_price,
                p.selling_price,
                p.quantity_in_stock,
                p.brand_id,
                p.category_id,
                p.is_active,
                p.created_at,
                p.updated_at,

                b.name AS brand_name,
                c.name AS category_name

            FROM products p

            LEFT JOIN brands b
                ON p.brand_id = b.id

            LEFT JOIN categories c
                ON p.category_id = c.id

            ORDER BY p.id ASC;
        `;

        const { rows } = await pool.query(query);

        return res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });

    } catch (error) {

        console.error(
            'Erro ao listar produtos:',
            error
        );

        next(error);
    }
};

// ============================================================
// GET PRODUCT BY ID
// GET /api/products/:id
// ============================================================

const getProductById = async (req, res, next) => {

    try {

        const { id } = req.params;

        const productId = parseInt(id, 10);

        if (Number.isNaN(productId)) {

            return res.status(400).json({
                success: false,
                error: 'ID do produto inválido.'
            });
        }

        const query = `
            SELECT
                p.id,
                p.title,
                p.sku,
                p.description,
                p.size,
                p.color,
                p.cost_price,
                p.selling_price,
                p.quantity_in_stock,
                p.brand_id,
                p.category_id,
                p.is_active,
                p.created_at,
                p.updated_at,

                b.name AS brand_name,
                c.name AS category_name

            FROM products p

            LEFT JOIN brands b
                ON p.brand_id = b.id

            LEFT JOIN categories c
                ON p.category_id = c.id

            WHERE p.id = $1;
        `;

        const { rows } = await pool.query(
            query,
            [productId]
        );

        if (rows.length === 0) {

            return res.status(404).json({
                success: false,
                error: 'Produto não encontrado.'
            });
        }

        return res.status(200).json({
            success: true,
            data: rows[0]
        });

    } catch (error) {

        console.error(
            'Erro ao buscar produto:',
            error
        );

        next(error);
    }
};

// ============================================================
// CREATE PRODUCT
// POST /api/products
// ============================================================

const createProduct = async (req, res, next) => {

    try {

        const {
            title,
            sku,
            description,
            size,
            color,
            cost_price,
            selling_price,
            quantity_in_stock,
            brand_id,
            category_id,
            is_active
        } = req.body;

        // --------------------------------------------------------
        // VALIDAÇÕES
        // --------------------------------------------------------

        if (!title || !title.trim()) {

            return res.status(400).json({
                success: false,
                error: 'O título do produto é obrigatório.'
            });
        }

        if (!sku || !sku.trim()) {

            return res.status(400).json({
                success: false,
                error: 'O SKU do produto é obrigatório.'
            });
        }

        if (
            selling_price === undefined ||
            selling_price === null ||
            selling_price === ''
        ) {

            return res.status(400).json({
                success: false,
                error: 'O preço de venda é obrigatório.'
            });
        }

        const costPrice =
            parseDecimal(cost_price);

        const sellingPrice =
            parseDecimal(selling_price);

        const stock =
            parseInt(
                quantity_in_stock ?? 0,
                10
            );

        if (costPrice < 0) {

            return res.status(400).json({
                success: false,
                error: 'O preço de custo não pode ser negativo.'
            });
        }

        if (sellingPrice < 0) {

            return res.status(400).json({
                success: false,
                error: 'O preço de venda não pode ser negativo.'
            });
        }

        if (Number.isNaN(stock) || stock < 0) {

            return res.status(400).json({
                success: false,
                error: 'O estoque deve ser um número inteiro maior ou igual a zero.'
            });
        }

        // --------------------------------------------------------
        // INSERT
        // --------------------------------------------------------

        const query = `
            INSERT INTO products (
                title,
                sku,
                description,
                size,
                color,
                cost_price,
                selling_price,
                quantity_in_stock,
                brand_id,
                category_id,
                is_active
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11
            )
            RETURNING
                id,
                title,
                sku,
                description,
                size,
                color,
                cost_price,
                selling_price,
                quantity_in_stock,
                brand_id,
                category_id,
                is_active,
                created_at,
                updated_at;
        `;

        const values = [

            title.trim(),

            sku.trim(),

            description
                ? description.trim()
                : null,

            size
                ? size.trim()
                : null,

            color
                ? color.trim()
                : null,

            costPrice,

            sellingPrice,

            stock,

            parseNullableInt(brand_id),

            parseNullableInt(category_id),

            is_active !== false
        ];

        const { rows } =
            await pool.query(
                query,
                values
            );

        return res.status(201).json({
            success: true,
            message: 'Produto cadastrado com sucesso.',
            data: rows[0]
        });

    } catch (error) {

        console.error(
            'Erro ao criar produto:',
            error
        );

        // SKU duplicado
        if (error.code === '23505') {

            return res.status(409).json({
                success: false,
                error: 'Já existe um produto cadastrado com este SKU.'
            });
        }

        next(error);
    }
};

// ============================================================
// UPDATE PRODUCT
// PUT /api/products/:id
// ============================================================

const updateProduct = async (req, res, next) => {

    try {

        const { id } = req.params;

        const productId =
            parseInt(id, 10);

        if (Number.isNaN(productId)) {

            return res.status(400).json({
                success: false,
                error: 'ID do produto inválido.'
            });
        }

        const {
            title,
            sku,
            description,
            size,
            color,
            cost_price,
            selling_price,
            quantity_in_stock,
            brand_id,
            category_id,
            is_active
        } = req.body;

        // --------------------------------------------------------
        // VALIDAÇÕES
        // --------------------------------------------------------

        if (!title || !title.trim()) {

            return res.status(400).json({
                success: false,
                error: 'O título do produto é obrigatório.'
            });
        }

        if (!sku || !sku.trim()) {

            return res.status(400).json({
                success: false,
                error: 'O SKU do produto é obrigatório.'
            });
        }

        if (
            selling_price === undefined ||
            selling_price === null ||
            selling_price === ''
        ) {

            return res.status(400).json({
                success: false,
                error: 'O preço de venda é obrigatório.'
            });
        }

        const costPrice =
            parseDecimal(cost_price);

        const sellingPrice =
            parseDecimal(selling_price);

        const stock =
            parseInt(
                quantity_in_stock ?? 0,
                10
            );

        if (costPrice < 0) {

            return res.status(400).json({
                success: false,
                error: 'O preço de custo não pode ser negativo.'
            });
        }

        if (sellingPrice < 0) {

            return res.status(400).json({
                success: false,
                error: 'O preço de venda não pode ser negativo.'
            });
        }

        if (Number.isNaN(stock) || stock < 0) {

            return res.status(400).json({
                success: false,
                error: 'O estoque deve ser um número inteiro maior ou igual a zero.'
            });
        }

        // --------------------------------------------------------
        // UPDATE
        // --------------------------------------------------------

        const query = `
            UPDATE products
            SET
                title = $1,
                sku = $2,
                description = $3,
                size = $4,
                color = $5,
                cost_price = $6,
                selling_price = $7,
                quantity_in_stock = $8,
                brand_id = $9,
                category_id = $10,
                is_active = $11
            WHERE id = $12
            RETURNING
                id,
                title,
                sku,
                description,
                size,
                color,
                cost_price,
                selling_price,
                quantity_in_stock,
                brand_id,
                category_id,
                is_active,
                created_at,
                updated_at;
        `;

        const values = [

            title.trim(),

            sku.trim(),

            description
                ? description.trim()
                : null,

            size
                ? size.trim()
                : null,

            color
                ? color.trim()
                : null,

            costPrice,

            sellingPrice,

            stock,

            parseNullableInt(brand_id),

            parseNullableInt(category_id),

            is_active !== false,

            productId
        ];

        const { rows } =
            await pool.query(
                query,
                values
            );

        if (rows.length === 0) {

            return res.status(404).json({
                success: false,
                error: 'Produto não encontrado.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Produto atualizado com sucesso.',
            data: rows[0]
        });

    } catch (error) {

        console.error(
            'Erro ao atualizar produto:',
            error
        );

        // SKU duplicado
        if (error.code === '23505') {

            return res.status(409).json({
                success: false,
                error: 'Já existe outro produto cadastrado com este SKU.'
            });
        }

        next(error);
    }
};

// ============================================================
// DELETE PRODUCT
// DELETE /api/products/:id
// ============================================================

const deleteProduct = async (req, res, next) => {

    try {

        const { id } = req.params;

        const productId =
            parseInt(id, 10);

        if (Number.isNaN(productId)) {

            return res.status(400).json({
                success: false,
                error: 'ID do produto inválido.'
            });
        }

        const query = `
            DELETE FROM products
            WHERE id = $1;
        `;

        const { rowCount } =
            await pool.query(
                query,
                [productId]
            );

        if (rowCount === 0) {

            return res.status(404).json({
                success: false,
                error: 'Produto não encontrado.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Produto removido com sucesso.'
        });

    } catch (error) {

        console.error(
            'Erro ao excluir produto:',
            error
        );

        // Produto utilizado em movimentação de estoque
        if (error.code === '23503') {

            return res.status(409).json({
                success: false,
                error: 'Este produto não pode ser excluído porque possui movimentações de estoque vinculadas.'
            });
        }

        next(error);
    }
};

// ============================================================
// EXPORTAÇÃO
// ============================================================

module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
};