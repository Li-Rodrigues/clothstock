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

const jwt = require('jsonwebtoken');
const { JWT_SECRET, getToken } = require('./middlewares/authMiddleware');

const PUBLIC_DIR = path.join(__dirname, '../public');

// Páginas que podem ser acessadas sem sessão.
const PUBLIC_PAGES = new Set(['login.html', 'register.html']);

/* ============================================================
   PORTÃO DE SESSÃO NO SERVIDOR
   ============================================================ */

 /*
  * Verifica a assinatura/expiração do JWT do cookie em memória, sem
  * consultar o banco. É o mesmo token que o /api/auth/me valida depois,
  * então a decisão tomada aqui coincide com a do cliente.
  */
function hasValidSession(req) {
    const token = getToken(req);

    if (!token) return false;

    try {
        jwt.verify(token, JWT_SECRET);
        return true;
    } catch (error) {
        return false;
    }
}

function sendPage(res, page) {
    return res.sendFile(
        path.join(PUBLIC_DIR, page)
    );
}

/*
 * A entrada da aplicação é resolvida no servidor: o usuário autenticado
 * recebe o dashboard e quem não tem sessão recebe o login na mesma
 * resposta. Isso elimina o flash do dashboard e o atraso do round-trip
 * de /api/auth/me que existia antes do redirect feito por JavaScript.
 */
function entryPoint(req, res) {
    return sendPage(
        res,
        hasValidSession(req)
            ? 'dashboard.html'
            : 'login.html'
    );
}

/*
 * Páginas internas só são entregues com sessão válida. O redirecionamento
 * acontece antes de qualquer byte do HTML, então o conteúdo protegido
 * nunca chega ao navegador de quem não está autenticado.
 */
function gateProtectedPages(req, res, next) {
    const page = req.path.split('/').pop() || '';

    if (!page.endsWith('.html')) return next();

    if (PUBLIC_PAGES.has(page)) return next();

    if (!hasValidSession(req)) {
        return res.redirect(302, '/login.html');
    }

    return next();
}

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
// ENTRADA DA APLICAÇÃO E PORTÃO DE SESSÃO
// ============================================================
//
// Registrados antes do express.static para que a página correta seja
// escolhida no servidor. Sem isso, / entregava o dashboard e só o
// JavaScript (/js/rbac.js -> /api/auth/me) redirecionava para o login,
// o que causava o atraso e o flash do dashboard na abertura do app.

app.get(['/', '/index.html'], entryPoint);

app.use(gateProtectedPages);

// ============================================================
// ARQUIVOS ESTÁTICOS
// ============================================================

app.use(
    express.static(
        PUBLIC_DIR,
        { index: false }
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

    // Para qualquer outra rota do frontend,
    // volta para a entrada da aplicação,
    // que já decidiu entre login e dashboard.

    res.redirect(302, '/');
});

// ============================================================
// MIDDLEWARE GLOBAL DE ERRO
// ============================================================

app.use(errorMiddleware);

// ============================================================
// EXPORTAÇÃO
// ============================================================

module.exports = app;