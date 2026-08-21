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

// ============================================================
// MIDDLEWARE DE ERRO
// ============================================================

const errorMiddleware = require('./middlewares/errorMiddleware');

const app = express();

// ============================================================
// MIDDLEWARES GLOBAIS
// ============================================================

app.use(cors());

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

app.use('/api/brands', brandRoutes);

app.use('/api/categories', categoryRoutes);

app.use('/api/products', productRoutes);

// ============================================================
// ROTA PRINCIPAL
// ============================================================

app.get('/', (req, res) => {
    res.sendFile(
        path.join(__dirname, '../public/index.html')
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
            error: 'Rota de API não encontrada.'
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