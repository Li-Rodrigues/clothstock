// src/config/permissions.js
// Fonte única de verdade da autorização do ClothStock.
//
// Princípio (PRD, seção 11): a política é NEGAR POR PADRÃO.
// Nenhuma rota da API concede acesso implícito. Toda rota precisa:
//   1. existir em ROUTE_RULES (senão a API responde 404 e a rota nunca
//      é alcançada, mesmo por um ADMIN); e
//   2. ter a ação associada permitida para a role do usuário em
//      ROLE_ACTIONS (senão a API responde 403).
//
// Consequência prática: uma rota nova não é liberada por engano. O
// desenvolvedor precisa adicioná-la aqui, e ao fazê-la escolhe
// conscientemente a ação e as roles que a podem usar.
//
// A UI (public/js/rbac.js + public/css/rbac.css) apenas espelha esta
// matriz para esconder controles. Esconder um botão NÃO é autorização:
// a decisão definitiva acontece aqui, no servidor, em todas as
// requisições. Um chamador que desabilite o JavaScript, edite o DOM ou
// chame a API direto recebe 403 nas mesmas rotas.

'use strict';

const ROLES = {
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  VIEWER: 'VIEWER'
};

// ============================================================
// AÇÕES
// ============================================================
//
// Nomes no formato <recurso>.<ação>. São estáveis: o frontend e os
// scripts de verificação referenciam exatamente estas strings.

const ACTIONS = {
  DASHBOARD_READ: 'dashboard.read',

  PRODUCTS_READ: 'products.read',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_UPDATE: 'products.update',
  PRODUCTS_DELETE: 'products.delete',

  CATEGORIES_READ: 'categories.read',
  CATEGORIES_CREATE: 'categories.create',
  CATEGORIES_UPDATE: 'categories.update',
  CATEGORIES_DELETE: 'categories.delete',

  BRANDS_READ: 'brands.read',
  BRANDS_CREATE: 'brands.create',
  BRANDS_UPDATE: 'brands.update',
  BRANDS_DELETE: 'brands.delete',

  SUPPLIERS_READ: 'suppliers.read',
  SUPPLIERS_CREATE: 'suppliers.create',
  SUPPLIERS_UPDATE: 'suppliers.update',
  SUPPLIERS_DELETE: 'suppliers.delete',

  MOVEMENTS_READ: 'movements.read',
  MOVEMENTS_CREATE: 'movements.create'
};

const ALL_ACTIONS = Object.values(ACTIONS);

// ============================================================
// CONCESSÕES POR ROLE
// ============================================================
//
// ADMIN: acesso completo. Mantém todas as ações.
//
// OPERATOR: role operacional. Lê o catálogo, registra e consulta
// movimentações de estoque e vê o dashboard. Não cria, não edita e
// não exclui cadastro nenhum.
//
// VIEWER: leitura pura, para avaliadores do desafio. Navega e consulta
// tudo, mas não possui NENHUMA ação de escrita — nem *.create, nem
// *.update, nem *.delete, nem movements.create. Como não tem
// movements.create, também não consegue registrar entrada, registrar
// saída nem alterar estoque. A lista abaixo não contém nenhuma
// ação que não termine em ".read", e o comentário de advertência
// existe para impedir que alguém adicione uma por engano.

const ROLE_ACTIONS = {
  [ROLES.ADMIN]: ALL_ACTIONS,

  [ROLES.OPERATOR]: [
    ACTIONS.DASHBOARD_READ,
    ACTIONS.PRODUCTS_READ,
    ACTIONS.CATEGORIES_READ,
    ACTIONS.BRANDS_READ,
    ACTIONS.SUPPLIERS_READ,
    ACTIONS.MOVEMENTS_READ,
    ACTIONS.MOVEMENTS_CREATE
  ],

  // Somente leitura. Não acrescentar ações de escrita aqui.
  [ROLES.VIEWER]: [
    ACTIONS.DASHBOARD_READ,
    ACTIONS.PRODUCTS_READ,
    ACTIONS.CATEGORIES_READ,
    ACTIONS.BRANDS_READ,
    ACTIONS.SUPPLIERS_READ,
    ACTIONS.MOVEMENTS_READ
  ]
};

// ============================================================
// TABELA DE ROTAS
// ============================================================
//
// Cada entrada amarra um método HTTP + um formato de caminho a uma
// ação. O caminho é sempre o caminho COMPLETO (/api/...) e a regex é
// ancorada, para que /api/brands não case com /api/brands-extra.
//
// /api/auth fica de fora de propósito: login, cadastro, logout, /me e
// /permissions têm regras próprias (públicas ou apenas autenticadas).

const ROUTE_RULES = [
  { methods: ['GET'], path: /^\/api\/dashboard\/?$/, action: ACTIONS.DASHBOARD_READ },

  { methods: ['GET'], path: /^\/api\/brands\/?$/, action: ACTIONS.BRANDS_READ },
  { methods: ['GET'], path: /^\/api\/brands\/[^/]+\/?$/, action: ACTIONS.BRANDS_READ },
  { methods: ['POST'], path: /^\/api\/brands\/?$/, action: ACTIONS.BRANDS_CREATE },
  { methods: ['PUT', 'PATCH'], path: /^\/api\/brands\/[^/]+\/?$/, action: ACTIONS.BRANDS_UPDATE },
  { methods: ['DELETE'], path: /^\/api\/brands\/[^/]+\/?$/, action: ACTIONS.BRANDS_DELETE },

  { methods: ['GET'], path: /^\/api\/categories\/?$/, action: ACTIONS.CATEGORIES_READ },
  { methods: ['GET'], path: /^\/api\/categories\/[^/]+\/?$/, action: ACTIONS.CATEGORIES_READ },
  { methods: ['POST'], path: /^\/api\/categories\/?$/, action: ACTIONS.CATEGORIES_CREATE },
  { methods: ['PUT', 'PATCH'], path: /^\/api\/categories\/[^/]+\/?$/, action: ACTIONS.CATEGORIES_UPDATE },
  { methods: ['DELETE'], path: /^\/api\/categories\/[^/]+\/?$/, action: ACTIONS.CATEGORIES_DELETE },

  { methods: ['GET'], path: /^\/api\/products\/?$/, action: ACTIONS.PRODUCTS_READ },
  { methods: ['GET'], path: /^\/api\/products\/[^/]+\/?$/, action: ACTIONS.PRODUCTS_READ },
  { methods: ['POST'], path: /^\/api\/products\/?$/, action: ACTIONS.PRODUCTS_CREATE },
  { methods: ['PUT', 'PATCH'], path: /^\/api\/products\/[^/]+\/?$/, action: ACTIONS.PRODUCTS_UPDATE },
  { methods: ['DELETE'], path: /^\/api\/products\/[^/]+\/?$/, action: ACTIONS.PRODUCTS_DELETE },

  { methods: ['GET'], path: /^\/api\/suppliers\/?$/, action: ACTIONS.SUPPLIERS_READ },
  { methods: ['GET'], path: /^\/api\/suppliers\/[^/]+\/?$/, action: ACTIONS.SUPPLIERS_READ },
  { methods: ['POST'], path: /^\/api\/suppliers\/?$/, action: ACTIONS.SUPPLIERS_CREATE },
  { methods: ['PUT', 'PATCH'], path: /^\/api\/suppliers\/[^/]+\/?$/, action: ACTIONS.SUPPLIERS_UPDATE },
  { methods: ['DELETE'], path: /^\/api\/suppliers\/[^/]+\/?$/, action: ACTIONS.SUPPLIERS_DELETE },

  { methods: ['GET'], path: /^\/api\/movements\/?$/, action: ACTIONS.MOVEMENTS_READ },
  { methods: ['POST'], path: /^\/api\/movements\/?$/, action: ACTIONS.MOVEMENTS_CREATE },
  { methods: ['POST'], path: /^\/api\/movements\/inflows\/?$/, action: ACTIONS.MOVEMENTS_CREATE },
  { methods: ['POST'], path: /^\/api\/movements\/outflows\/?$/, action: ACTIONS.MOVEMENTS_CREATE }
];

// /api/auth é montada antes deste gate; o prefixo é ignorado para que
// rotas públicas continuem públicas.
const UNGUARDED_PREFIXES = ['/api/auth'];

// ============================================================
// CONSULTAS
// ============================================================

function normalizeRole(role) {
  return String(role || '').toUpperCase();
}

function can(role, action) {
  const granted = ROLE_ACTIONS[normalizeRole(role)];
  if (!granted) return false; // role desconhecida não recebe nada
  return granted.includes(action);
}

function listActions(role) {
  const granted = ROLE_ACTIONS[normalizeRole(role)];
  return granted ? granted.slice() : [];
}

function isKnownRole(role) {
  return Object.prototype.hasOwnProperty.call(ROLE_ACTIONS, normalizeRole(role));
}

// ============================================================
// RESOLUÇÃO DE ROTA
// ============================================================

/*
 * Resolve método + caminho para uma regra da matriz.
 * unknown       -> o caminho não existe na API
 * method-denied -> o caminho existe, mas o método não está liberado
 * ok            -> regra encontrada (a ação ainda precisa ser conferida)
 */
function resolveRule(method, path) {
  // HEAD é servido pelo Express como GET; normaliza para não cair em
  // method-denied por causa de um método que o próprio Express trata
  // como GET.
  const verb = String(method || '').toUpperCase() === 'HEAD' ? 'GET' : String(method || '').toUpperCase();

  const candidates = ROUTE_RULES.filter(rule => rule.path.test(path));

  if (candidates.length === 0) return { kind: 'unknown' };

  const rule = candidates.find(candidate => candidate.methods.includes(verb));
  if (!rule) return { kind: 'method-denied' };

  return { kind: 'ok', rule };
}

function isUnguardedPath(path) {
  return UNGUARDED_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

// ============================================================
// MIDDLEWARE
// ============================================================

function forbidden(res, message) {
  return res.status(403).json({
    success: false,
    error: { code: 'FORBIDDEN', message }
  });
}

/*
 * Gate de autorização da API. Deve ser montado depois de `authenticate`
 * e antes de qualquer router de /api que não seja /api/auth.
 *
 * Regra: só passa quem casou com uma regra da matriz E tem a ação da
 * regra em sua role. Qualquer outra coisa é negada.
 */
function authorizeByMatrix(req, res, next) {
  // Preflight do CORS é tratado pelo middleware cors(); não interfere.
  if (req.method === 'OPTIONS') return next();

  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'É necessário entrar no sistema.' }
    });
  }

  const resolved = resolveRule(req.method, req.path);

  if (resolved.kind === 'unknown') {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Rota de API não encontrada.' }
    });
  }

  if (resolved.kind === 'method-denied') {
    return forbidden(res, 'Você não tem permissão para esta operação.');
  }

  if (!can(req.user.role, resolved.rule.action)) {
    return forbidden(res, 'Você não tem permissão para esta operação.');
  }

  return next();
}

/*
 * Defesa em profundidade para os controllers.
 *
 * As rotas já são protegidas por requireRole() e pelo gate da matriz.
 * Esta função repete a decisão dentro do próprio controller que executa
 * a escrita: se alguém montar um controller sem o middleware de rota,
 * a operação destrutiva continua sendo rejeitada com 403.
 *
 * Uso: if (forbidUnless(res, req, ACTIONS.PRODUCTS_DELETE)) return;
 */
function forbidUnless(res, req, action) {
  if (req.user && can(req.user.role, action)) return false;
  forbidden(res, 'Você não tem permissão para esta operação.');
  return true;
}

module.exports = {
  ROLES,
  ACTIONS,
  ALL_ACTIONS,
  ROUTE_RULES,
  ROLE_ACTIONS,
  can,
  isKnownRole,
  listActions,
  resolveRule,
  isUnguardedPath,
  authorizeByMatrix,
  forbidUnless
};
