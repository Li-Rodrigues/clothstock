// src/controllers/movementController.js
const pool = require('../config/database');

// Registrar nova movimentação (INFLOW ou OUTFLOW)
const createMovement = async (req, res, next) => {
    const client = await pool.connect();
    
    try {
        const { product_id, type, quantity, notes } = req.body;

        if (!product_id || !type || !quantity || quantity <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Informe o produto, o tipo (INFLOW/OUTFLOW) e uma quantidade maior que zero.'
            });
        }

        const movementType = type.toUpperCase();
        if (!['INFLOW', 'OUTFLOW'].includes(movementType)) {
            return res.status(400).json({
                success: false,
                error: 'Tipo de movimentação inválido. Use INFLOW ou OUTFLOW.'
            });
        }

        // Inicia a transação SQL
        await client.query('BEGIN');

        // 1. Busca o produto atual e bloqueia a linha para concorrência
        const productRes = await client.query('SELECT id, quantity FROM products WHERE id = $1 FOR UPDATE', [product_id]);
        
        if (productRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Produto não encontrado.' });
        }

        const currentQty = productRes.rows[0].quantity;
        let newQty = currentQty;

        // 2. Calcula novo estoque e valida saldo insuficiente
        if (movementType === 'INFLOW') {
            newQty += parseInt(quantity);
        } else if (movementType === 'OUTFLOW') {
            if (currentQty < parseInt(quantity)) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    error: `Estoque insuficiente! Estoque atual: ${currentQty} un.`
                });
            }
            newQty -= parseInt(quantity);
        }

        // 3. Atualiza a quantidade do produto
        await client.query('UPDATE products SET quantity = $1 WHERE id = $2', [newQty, product_id]);

        // 4. Insere o histórico na tabela de movimentações
        const insertQuery = `
            INSERT INTO stock_movements (product_id, type, quantity, notes)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const { rows } = await client.query(insertQuery, [product_id, movementType, quantity, notes || null]);

        // Confirma a transação
        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            data: rows[0],
            newStockQuantity: newQty
        });

    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};

// Listar movimentações por tipo (opcionalmente filtrado por query string ?type=INFLOW)
const getMovements = async (req, res, next) => {
    try {
        const { type } = req.query;
        let query = `
            SELECT 
                sm.id,
                sm.type,
                sm.quantity,
                sm.notes,
                sm.created_at,
                p.name AS product_name,
                p.price AS product_price
            FROM stock_movements sm
            JOIN products p ON sm.product_id = p.id
        `;
        
        const values = [];
        if (type) {
            query += ` WHERE sm.type = $1`;
            values.push(type.toUpperCase());
        }

        query += ` ORDER BY sm.created_at DESC;`;

        const { rows } = await pool.query(query, values);

        res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createMovement,
    getMovements
};