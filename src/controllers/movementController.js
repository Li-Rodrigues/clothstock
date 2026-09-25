const pool = require('../config/database');
const { getPagination, paginationResponse } = require('../utils/pagination');

const VALID_TYPES = ['INFLOW', 'OUTFLOW'];
const VALID_REASONS = ['SALE', 'DAMAGE', 'ADJUSTMENT', 'RETURN', 'OTHER'];

const movementTypeIsValid = type => VALID_TYPES.includes(String(type).toUpperCase());

function parseItems(body) {
  if (Array.isArray(body.items) && body.items.length) {
    return body.items;
  }

  if (body.product_id) {
    return [{
      product_id: body.product_id,
      quantity: body.quantity,
      unit_price: body.unit_price
    }];
  }

  return [];
}

function validateItems(items) {
  if (!items.length) {
    return 'Adicione pelo menos um produto à movimentação.';
  }

  const used = new Set();

  for (const item of items) {
    const productId = Number(item.product_id);
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unit_price);

    if (!Number.isInteger(productId) || productId <= 0) {
      return 'Selecione um produto em todos os itens.';
    }

    if (used.has(productId)) {
      return 'O mesmo produto não pode ser adicionado duas vezes. Ajuste a quantidade do item existente.';
    }

    used.add(productId);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return 'Todas as quantidades devem ser maiores que zero.';
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return 'Todos os valores unitários devem ser válidos.';
    }
  }

  return null;
}

function inflowListQuery(search) {
  const where = search
    ? `WHERE (
        COALESCE(i.description, '') ILIKE $1
        OR COALESCE(i.invoice_number, '') ILIKE $1
        OR COALESCE(s.name, '') ILIKE $1
        OR EXISTS (
          SELECT 1
          FROM inflow_items ii
          JOIN products p ON p.id = ii.product_id
          WHERE ii.inflow_id = i.id
            AND p.title ILIKE $1
        )
      )`
    : '';

  return `
    SELECT
      i.id,
      'INFLOW'::text AS type,
      i.supplier_id,
      s.name AS supplier_name,
      i.invoice_number,
      NULL::text AS reason,
      i.description AS notes,
      i.total_amount,
      i.created_at,
      COALESCE((
        SELECT json_agg(
          json_build_object(
            'id', ii.id,
            'product_id', ii.product_id,
            'product_name', p.title,
            'quantity', ii.quantity,
            'unit_price', ii.unit_cost,
            'total', (ii.quantity * ii.unit_cost)
          )
          ORDER BY ii.id
        )
        FROM inflow_items ii
        JOIN products p ON p.id = ii.product_id
        WHERE ii.inflow_id = i.id
      ), '[]'::json) AS items,
      COALESCE((SELECT COUNT(*)::int FROM inflow_items ii WHERE ii.inflow_id = i.id), 0) AS total_items,
      COALESCE((SELECT SUM(ii.quantity)::int FROM inflow_items ii WHERE ii.inflow_id = i.id), 0) AS total_quantity
    FROM inflows i
    LEFT JOIN suppliers s ON s.id = i.supplier_id
    ${where}
  `;
}

function outflowListQuery(search) {
  const where = search
    ? `WHERE (
        COALESCE(o.description, '') ILIKE $1
        OR COALESCE(o.reason, '') ILIKE $1
        OR EXISTS (
          SELECT 1
          FROM outflow_items oi
          JOIN products p ON p.id = oi.product_id
          WHERE oi.outflow_id = o.id
            AND p.title ILIKE $1
        )
      )`
    : '';

  return `
    SELECT
      o.id,
      'OUTFLOW'::text AS type,
      NULL::int AS supplier_id,
      NULL::text AS supplier_name,
      NULL::text AS invoice_number,
      o.reason,
      o.description AS notes,
      o.total_amount,
      o.created_at,
      COALESCE((
        SELECT json_agg(
          json_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'product_name', p.title,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total', (oi.quantity * oi.unit_price)
          )
          ORDER BY oi.id
        )
        FROM outflow_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.outflow_id = o.id
      ), '[]'::json) AS items,
      COALESCE((SELECT COUNT(*)::int FROM outflow_items oi WHERE oi.outflow_id = o.id), 0) AS total_items,
      COALESCE((SELECT SUM(oi.quantity)::int FROM outflow_items oi WHERE oi.outflow_id = o.id), 0) AS total_quantity
    FROM outflows o
    ${where}
  `;
}

const getMovements = async (req, res, next) => {
  try {
    const type = req.query.type ? String(req.query.type).toUpperCase() : null;
    const search = String(req.query.search || '').trim();

    if (type && !movementTypeIsValid(type)) {
      return res.status(400).json({ success: false, error: 'Tipo de movimentação inválido.' });
    }

    const params = search ? [`%${search}%`] : [];
    const hasSearch = Boolean(search);

    let query;
    if (type === 'INFLOW') {
      query = `${inflowListQuery(hasSearch)} ORDER BY created_at DESC`;
    } else if (type === 'OUTFLOW') {
      query = `${outflowListQuery(hasSearch)} ORDER BY created_at DESC`;
    } else {
      query = `
        SELECT * FROM (
          ${inflowListQuery(hasSearch)}
          UNION ALL
          ${outflowListQuery(hasSearch)}
        ) movements
        ORDER BY created_at DESC
      `;
    }

    const { page, limit, offset, hasPaging } = getPagination(req);
    let countResult = { rows: [{ total: 0 }] };
    if (hasPaging) {
      countResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM (${query}) AS paginated_movements`,
        params
      );
    }

    const pagingSql = hasPaging
      ? ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
      : '';
    const queryParams = hasPaging ? [...params, limit, offset] : params;
    const { rows } = await pool.query(
      hasPaging ? `SELECT * FROM (${query}) AS paginated_movements${pagingSql}` : query,
      queryParams
    );

    const totalItems = hasPaging
      ? countResult.rows[0].total
      : rows.length;

    return res.json(paginationResponse(page, limit, totalItems, rows));
  } catch (error) {
    return next(error);
  }
};

const createMovement = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const movementType = String(req.body.type || '').toUpperCase();
    const notes = String(req.body.notes || '').trim() || null;
    const items = parseItems(req.body);

    if (!movementTypeIsValid(movementType)) {
      return res.status(400).json({ success: false, error: 'Informe um tipo de movimentação válido.' });
    }

    items.sort((first, second) => Number(first.product_id) - Number(second.product_id));
    const itemError = validateItems(items);
    if (itemError) {
      return res.status(400).json({ success: false, error: itemError });
    }

    await client.query('BEGIN');

    const processed = [];
    let totalAmount = 0;

    for (const item of items) {
      const productId = Number.parseInt(item.product_id, 10);
      const quantity = Number.parseInt(item.quantity, 10);
      const sentPrice = item.unit_price;

      const productResult = await client.query(
        'SELECT id, title, quantity_in_stock, cost_price, selling_price FROM products WHERE id = $1 FOR UPDATE',
        [productId]
      );

      if (!productResult.rows.length) {
        throw Object.assign(new Error('Produto não encontrado.'), { status: 404 });
      }

      const product = productResult.rows[0];

      if (movementType === 'OUTFLOW' && product.quantity_in_stock < quantity) {
        throw Object.assign(
          new Error(`Estoque insuficiente para "${product.title}". Disponível: ${product.quantity_in_stock} un.`),
          { status: 400 }
        );
      }

      const fallbackPrice = Number(
        movementType === 'INFLOW' ? product.cost_price : product.selling_price
      );
      const unitPrice = sentPrice === undefined || sentPrice === null || sentPrice === ''
        ? fallbackPrice
        : Number(sentPrice);

      const newQuantity = product.quantity_in_stock + (movementType === 'INFLOW' ? quantity : -quantity);

      await client.query(
        'UPDATE products SET quantity_in_stock = $1 WHERE id = $2',
        [newQuantity, productId]
      );

      processed.push({
        product_id: productId,
        product_name: product.title,
        quantity,
        unit_price: unitPrice,
        total: quantity * unitPrice,
        new_stock: newQuantity
      });

      totalAmount += quantity * unitPrice;
    }

    let header;

    if (movementType === 'INFLOW') {
      const supplierId = Number.parseInt(req.body.supplier_id, 10);
      const invoiceNumber = String(req.body.invoice_number || '').trim() || null;

      header = await client.query(
        `INSERT INTO inflows (supplier_id, user_id, invoice_number, description, total_amount)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, created_at`,
        [Number.isInteger(supplierId) && supplierId > 0 ? supplierId : null, req.user.id, invoiceNumber, notes, totalAmount]
      );

      for (const item of processed) {
        await client.query(
          `INSERT INTO inflow_items (inflow_id, product_id, quantity, unit_cost)
           VALUES ($1, $2, $3, $4)`,
          [header.rows[0].id, item.product_id, item.quantity, item.unit_price]
        );
      }
    } else {
      const reason = String(req.body.reason || '').toUpperCase();
      if (!VALID_REASONS.includes(reason)) {
        throw Object.assign(new Error('Informe um motivo válido para a saída.'), { status: 400 });
      }

      header = await client.query(
        `INSERT INTO outflows (user_id, reason, description, total_amount)
         VALUES ($1, $2, $3, $4)
         RETURNING id, created_at`,
        [req.user.id, reason, notes, totalAmount]
      );

      for (const item of processed) {
        await client.query(
          `INSERT INTO outflow_items (outflow_id, product_id, quantity, unit_price)
           VALUES ($1, $2, $3, $4)`,
          [header.rows[0].id, item.product_id, item.quantity, item.unit_price]
        );
      }
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: movementType === 'INFLOW'
        ? 'Entrada registrada com sucesso.'
        : 'Saída registrada com sucesso.',
      data: {
        id: header.rows[0].id,
        type: movementType,
        created_at: header.rows[0].created_at,
        notes,
        total_amount: totalAmount,
        total_items: processed.length,
        total_quantity: processed.reduce((sum, item) => sum + item.quantity, 0),
        items: processed
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.status) {
      return res.status(error.status).json({ success: false, error: error.message });
    }

    if (error.code === '23503') {
      return res.status(400).json({ success: false, error: 'Fornecedor ou produto inválido.' });
    }

    return next(error);
  } finally {
    client.release();
  }
};

module.exports = { createMovement, getMovements };
