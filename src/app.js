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

// Imports do gate de autorização. Declarados no topo para que o gate
// possa ser registrado antes de qualquer rota (ver a nota do gate).
const { authenticate, requireRole } = require('./middlewares/authMiddleware');
const { authorizeByMatrix, isUnguardedPath } = require('./config/permissions');

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
// GATE DE AUTORIZAÇÃO DA API (negar por padrão)
// ============================================================
//
// Registrado AQUI, antes de qualquer rota, e não junto da seção de
// rotas da API. A ordem importa: o Express resolve middlewares na
// sequência em que foram registrados, então um gate montado mais
// abaixo só protegeria as rotas declaradas depois dele. Uma rota nova
// acrescentada acima do gate passaria sem nenhuma verificação de
// permissão. Montando o gate antes de tudo, não existe posição no
// arquivo onde uma rota de /api possa ser registrada sem ser
// barrada pela matriz.
//
// Uma requisição só chega ao controller se:
//   - estiver autenticada (authenticate);
//   - o método + caminho casar com uma regra da matriz; e
//   - a role do usuário tiver a ação daquela regra.
//
// A role vem do BANCO, recarregada por authenticate a cada requisição
// (e não de uma claim do JWT), então rebaixar um usuário no banco corta
// o acesso imediatamente, sem esperar o token expirar. Um token forjado
// com role=ADMIN continua barrado, porque a claim é ignorada.
//
// Os requireRole() nos routers, mais abaixo, permanecem como segunda
// barreira: a decisão final exige passar pelo gate E pelo middleware
// da rota.

function apiAuthorizationGate(req, res, next) {
  const path = req.path;

  // Fora de /api: é a aplicação web, não a API.
  if (!path.startsWith('/api/') && path !== '/api') return next();

  // /api/auth tem regras próprias: login e cadastro são públicos, e
  // logout/me/permissions exigem apenas autenticação (tratada dentro do
  // próprio router).
  if (isUnguardedPath(path)) return next();

  return authenticate(req, res, error => {
    if (error) return next(error);
    return authorizeByMatrix(req, res, next);
  });
}

app.use(apiAuthorizationGate);

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

// /api/auth é montada primeiro e não passa pelo gate de autorização:
// login e cadastro são públicos por definição, e logout/me/permissions
// exigem apenas autenticação (tratada dentro do próprio router).
app.use('/api/auth', authRoutes);

// ESTES requireRole() SÃO A MONTAGEM DO RECURSO, NÃO A MATRIZ.
//
// Eles decidem apenas "quem pode ENTRAR neste recurso" — incluindo as
// leituras. A decisão sobre "o que pode FAZER dentro dele" é do gate
// apiAuthorizationGate, que consulta src/config/permissions.js.
//
// Por isso o VIEWER precisa aparecer aqui: ele não tem nenhuma ação de
// escrita, mas precisa conseguir ler produtos, categorias, marcas,
// fornecedores, dashboard e movimentações. Sem esta linha, um VIEWER
// receberia 403 até em um GET, porque o requireRole de montagem não o
// conheceria. As escritas continuam barradas na matriz e nos controllers.
const READER_ROLES = ['ADMIN', 'OPERATOR', 'VIEWER'];

app.use('/api/brands', authenticate, requireRole(...READER_ROLES), brandRoutes);

app.use('/api/categories', authenticate, requireRole(...READER_ROLES), categoryRoutes);

app.use('/api/products', authenticate, requireRole(...READER_ROLES), productRoutes);

app.use('/api/suppliers', authenticate, requireRole(...READER_ROLES), supplierRoutes);

app.use('/api/movements', authenticate, requireRole(...READER_ROLES), movementRoutes);

app.use('/api/dashboard', authenticate, requireRole(...READER_ROLES), dashboardRoutes);

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