// src/app.js

const express = require('express');
const cors = require('cors');
const path = require('path');

// ============================================================
// ROTAS
// ============================================================

const authRoutes = require('./routes/authRoutes');
const brandRoutes = require('./routes/brandRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const movementRoutes = require('./routes/movementRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// ============================================================
// MIDDLEWARE DE ERRO
// ============================================================

const errorMiddleware = require('./middlewares/errorMiddleware');

const app = express();

// ============================================================
// MIDDLEWARES GLOBAIS
// ============================================================

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || (process.env.NODE_ENV === 'production' ? false : true),
  credentials: true
}));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// ============================================================
// ARQUIVOS ESTÁTICOS
// ============================================================

app.use(
    express.static(
        path.join(__dirname, '../public')
    )
);

// ============================================================
// ROTAS DA API
// ============================================================

app.use('/api/auth', authRoutes);

const { authenticate, requireRole } = require('./middlewares/authMiddleware');

app.use('/api/brands', authenticate, requireRole('ADMIN', 'OPERATOR'), brandRoutes);

app.use('/api/categories', authenticate, requireRole('ADMIN', 'OPERATOR'), categoryRoutes);

app.use('/api/products', authenticate, requireRole('ADMIN', 'OPERATOR'), productRoutes);

app.use('/api/suppliers', authenticate, requireRole('ADMIN', 'OPERATOR'), supplierRoutes);

app.use('/api/movements', authenticate, requireRole('ADMIN', 'OPERATOR'), movementRoutes);

app.use('/api/dashboard', authenticate, requireRole('ADMIN', 'OPERATOR'), dashboardRoutes);

// ============================================================
// ROTA PRINCIPAL
// ============================================================

app.get('/', (req, res) => {
    res.sendFile(
        path.join(__dirname, '../public/dashboard.html')
    );
});

// ============================================================
// FALLBACK PARA FRONTEND
// ============================================================

app.get('*', (req, res, next) => {

    // Se for uma rota de API inexistente,
    // retorna JSON 404.

    if (req.path.startsWith('/api')) {

        return res.status(404).json({
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'Rota de API não encontrada.'
            }
        });
    }

    // Para páginas do frontend,
    // retorna o index.html.

    res.sendFile(
        path.join(__dirname, '../public/index.html')
    );
});

// ============================================================
// MIDDLEWARE GLOBAL DE ERRO
// ============================================================

app.use(errorMiddleware);

// ============================================================
// EXPORTAÇÃO
// ============================================================

module.exports = app;