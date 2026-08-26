const pool = require('../config/database');

const movementTypeIsValid = type => ['INFLOW', 'OUTFLOW'].includes(String(type).toUpperCase());

const createMovement = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { product_id, type, quantity, notes, unit_price } = req.body;
    const movementType = String(type || '').toUpperCase();
    const qty = Number.parseInt(quantity, 10);
    const price = Number(unit_price || 0);
    if (!Number.isInteger(Number(product_id)) || !movementTypeIsValid(movementType) || !Number.isInteger(qty) || qty <= 0 || price < 0) {
      return res.status(400).json({ success: false, error: 'Informe produto, tipo, quantidade positiva e valor válido.' });
    }
    await client.query('BEGIN');
    const productResult = await client.query('SELECT id, title, quantity_in_stock, cost_price, selling_price FROM products WHERE id = $1 FOR UPDATE', [product_id]);
    if (!productResult.rows.length) throw Object.assign(new Error('Produto não encontrado.'), { status: 404 });
    const product = productResult.rows[0];
    if (movementType === 'OUTFLOW' && product.quantity_in_stock < qty) {
      throw Object.assign(new Error(`Estoque insuficiente. Disponível: ${product.quantity_in_stock} un.`), { status: 400 });
    }
    const newQuantity = product.quantity_in_stock + (movementType === 'INFLOW' ? qty : -qty);
    await client.query('UPDATE products SET quantity_in_stock = $1 WHERE id = $2', [newQuantity, product_id]);
    const finalPrice = unit_price === undefined || unit_price === null || unit_price === ''
      ? Number(movementType === 'INFLOW' ? product.cost_price : product.selling_price)
      : price;
    let result;
    if (movementType === 'INFLOW') {
      const inflow = await client.query('INSERT INTO inflows (description, total_amount) VALUES ($1, $2) RETURNING id, created_at', [notes || null, finalPrice * qty]);
      result = await client.query('INSERT INTO inflow_items (inflow_id, product_id, quantity, unit_cost) VALUES ($1, $2, $3, $4) RETURNING id', [inflow.rows[0].id, product_id, qty, finalPrice]);
    } else {
      const outflow = await client.query('INSERT INTO outflows (description, total_amount) VALUES ($1, $2) RETURNING id, created_at', [notes || null, finalPrice * qty]);
      result = await client.query('INSERT INTO outflow_items (outflow_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4) RETURNING id', [outflow.rows[0].id, product_id, qty, finalPrice]);
    }
    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: { id: result.rows[0].id, product_name: product.title, type: movementType, quantity: qty, unit_price: finalPrice, notes: notes || null }, newStockQuantity: newQuantity });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.status) return res.status(error.status).json({ success: false, error: error.message });
    return next(error);
  } finally { client.release(); }
};

const getMovements = async (req, res, next) => {
  try {
    const type = req.query.type ? String(req.query.type).toUpperCase() : null;
    if (type && !movementTypeIsValid(type)) return res.status(400).json({ success: false, error: 'Tipo de movimentação inválido.' });
    const query = `SELECT * FROM (
      SELECT i.id, 'INFLOW' AS type, ii.quantity, ii.unit_cost AS unit_price, i.description AS notes, i.created_at, p.title AS product_name FROM inflows i JOIN inflow_items ii ON ii.inflow_id=i.id JOIN products p ON p.id=ii.product_id
      UNION ALL
      SELECT o.id, 'OUTFLOW' AS type, oi.quantity, oi.unit_price, o.description AS notes, o.created_at, p.title AS product_name FROM outflows o JOIN outflow_items oi ON oi.outflow_id=o.id JOIN products p ON p.id=oi.product_id
    ) movements ${type ? 'WHERE type = $1' : ''} ORDER BY created_at DESC;`;
    const { rows } = await pool.query(query, type ? [type] : []);
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (error) { return next(error); }
};
module.exports = { createMovement, getMovements };
