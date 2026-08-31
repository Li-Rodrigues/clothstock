const pool = require('../config/database.js');

const getDashboardMetrics = async (req, res) => {
  try {
    // 1. Métricas de Produtos / Estoque
    const productMetricsQuery = `
      SELECT 
        COALESCE(SUM(cost_price * quantity_in_stock), 0) AS total_cost_price,
        COALESCE(SUM(selling_price * quantity_in_stock), 0) AS total_selling_price,
        COALESCE(SUM(quantity_in_stock), 0) AS total_quantity,
        COALESCE(SUM((selling_price - cost_price) * quantity_in_stock), 0) AS total_profit
      FROM products
      WHERE is_active = TRUE;
    `;

    // 2. Métricas de Vendas / Saídas (Cruza outflow_items com products)
    const salesMetricsQuery = `
      SELECT 
        COUNT(DISTINCT o.id) AS total_sales,
        COALESCE(SUM(oi.quantity), 0) AS total_products_sold,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total_sales_value,
        COALESCE(SUM(oi.quantity * (oi.unit_price - p.cost_price)), 0) AS total_sales_profit
      FROM outflows o
      JOIN outflow_items oi ON o.id = oi.outflow_id
      JOIN products p ON oi.product_id = p.id;
    `;

    // 3. Vendas por dia (Últimos 7 dias)
    const dailySalesQuery = `
      SELECT 
        TO_CHAR(d.day, 'YYYY-MM-DD') AS date,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total_value,
        COALESCE(SUM(oi.quantity), 0) AS total_quantity
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) d(day)
      LEFT JOIN outflows o ON DATE(o.created_at) = d.day
      LEFT JOIN outflow_items oi ON o.id = oi.outflow_id
      GROUP BY d.day
      ORDER BY d.day ASC;
    `;

    // Executa em paralelo
    const [productRes, salesRes, dailySalesRes] = await Promise.all([
      pool.query(productMetricsQuery),
      pool.query(salesMetricsQuery),
      pool.query(dailySalesQuery),
    ]);

    const products = productRes.rows[0];
    const sales = salesRes.rows[0];
    const dailySales = dailySalesRes.rows;

    res.status(200).json({
      stockProfit: parseFloat(products.total_profit),
      outflows: parseFloat(sales.total_sales_value),
      productMetrics: {
        totalQuantity: parseInt(products.total_quantity, 10),
        totalCostPrice: parseFloat(products.total_cost_price),
        totalSellingPrice: parseFloat(products.total_selling_price),
      },
      salesMetrics: {
        totalSalesCount: parseInt(sales.total_sales, 10),
        totalProductsSold: parseInt(sales.total_products_sold, 10),
        totalSalesProfit: parseFloat(sales.total_sales_profit),
      },
      chartData: {
        dates: dailySales.map(row => row.date),
        values: dailySales.map(row => parseFloat(row.total_value)),
        quantities: dailySales.map(row => parseInt(row.total_quantity, 10))
      }
    });

  } catch (error) {
    console.error('Erro ao buscar métricas do dashboard:', error);
    res.status(500).json({ error: 'Erro interno ao carregar dados do dashboard.' });
  }
};

module.exports = { getDashboardMetrics };