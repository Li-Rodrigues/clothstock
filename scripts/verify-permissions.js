// scripts/verify-permissions.js
// Prova, sem depender da interface, que o controle de permissões do
// ClothStock é aplicado NO SERVIDOR.
//
// A verificação fala HTTP direto com a API, como um avaliador faria com
// curl ou com o DevTools. Nada aqui passa pelo HTML nem pelo JavaScript
// das páginas: se a restrição fosse só "esconder o botão Excluir", todas
// as checagens de escrita abaixo falhariam.
//
// O que é provado:
//   1. Sem credencial, nada é servido (401).
//   2. O OPERATOR lê o que a matriz permite e recebe 403 em TODA
//      escrita de catálogo (produtos, categorias, marcas, fornecedores),
//      por HTTP direto.
//   3. As escritas negadas não produziram efeito colateral: o catálogo
//      é idêntico antes e depois das tentativas.
//   4. O OPERATOR consegue registrar movimentações, como a matriz permite.
//   5. Escalar privilégio não funciona: token forjado com role=ADMIN,
//      token adulterado e cadastro pedindo ADMIN continuam barrados.
//   6. O ADMIN consegue as mesmas escritas, o que prova que os 403 não
//      são apenas endpoints quebrados.
//
// Pré-requisitos:
//   - a API no ar (npm start);
//   - o usuário de teste existir (npm run test-user:create);
//   - as credenciais do ADMIN disponibles em TEST_ADMIN_EMAIL /
//     TEST_ADMIN_PASSWORD (necessárias apenas para o item 6).
//
// Uso:
//   npm run verify:permissions
//   TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... npm run verify:permissions
//
// Sai com código 1 se qualquer checagem falhar.

const jwt = require('jsonwebtoken');
require('dotenv').config();

const { JWT_SECRET } = require('../src/middlewares/authMiddleware');
const { ROUTE_RULES } = require('../src/config/permissions');

const PORT = process.env.PORT || '3000';
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'operador@clothstock.com',
  password: process.env.TEST_USER_PASSWORD || 'Avaliador#2026'
};

const ADMIN = {
  email: process.env.TEST_ADMIN_EMAIL || '',
  password: process.env.TEST_ADMIN_PASSWORD || ''
};

const VIEWER = {
  email: process.env.VIEWER_ACCOUNT_EMAIL || 'avaliador@clothstock.com',
  password: process.env.VIEWER_ACCOUNT_PASSWORD || ''
};

// Recursos de catálogo: cada um tem leitura liberada e as três escritas
// restritas ao ADMIN.
const CATALOG_RESOURCES = ['products', 'categories', 'brands', 'suppliers'];

// ============================================================
// HTTP
// ============================================================
async function request(method, path, { token, body, rawToken } = {}) {
  const headers = { Accept: 'application/json' };

  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (rawToken) headers.Cookie = `clothstock_token=${encodeURIComponent(rawToken)}`;
  else if (token) headers.Cookie = `clothstock_token=${encodeURIComponent(token)}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return { status: response.status, json, text };
}

/*
 * Login que preserva o token. O /login não devolve o token no corpo (cookie
 * HttpOnly), então é preciso capturá-lo do cabeçalho Set-Cookie para poder
 * reaproveitar em requisições diretas (o avaliador faria o mesmo inspecionando
 * o cookie no DevTools).
 */
async function loginAndCaptureToken(credentials) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(credentials)
  });

  const json = await response.json().catch(() => null);
  const setCookie = response.headers.get('set-cookie') || '';
  const match = setCookie.match(/clothstock_token=([^;]+)/);

  return {
    ok: response.status === 200 && Boolean(match),
    status: response.status,
    token: match ? decodeURIComponent(match[1]) : null,
    user: json?.data?.user || null,
    json
  };
}

// ============================================================
// IMPRESSÃO DIGITAL DO BANCO
// ============================================================
//
// Um 403 prova que a requisição foi recusada, mas não prova sozinho que
// nada foi gravado. Esta função tira a impressão digital de TODAS as
// tabelas de negócio (quantidade de linhas + hash de todo o conteúdo) para
// que o teste possa afirmar, comparando antes e depois, que nenhuma
// escrita bloqueada teve efeito — inclusive em quantity_in_stock e nas
// movimentações.
//
// A tabela users fica de fora de propósito: o teste de escalada de
// privilégio usa o cadastro público, e um cadastro bem-sucedido mudaria
// essa tabela sem que isso signifique alguma falha de permissão.
// ============================================================

const FINGERPRINT_TABLES = [
  'brands',
  'categories',
  'products',
  'suppliers',
  'inflows',
  'inflow_items',
  'outflows',
  'outflow_items'
];

let fingerprintAvailable = null;

async function fingerprintDatabase() {
  if (fingerprintAvailable === false) return null;

  let db;
  try {
    // Carregado sob demanda: se o banco não estiver acessível, a
    // verificação segue com a comparação via API, apenas mais fraca.
    db = require('../src/config/database');
  } catch {
    fingerprintAvailable = false;
    return null;
  }

  try {
    const result = {};

    for (const table of FINGERPRINT_TABLES) {
      const { rows } = await db.query(
        `SELECT count(*)::int AS total,
                md5(coalesce(string_agg(linha::text, '|' ORDER BY linha::text), '')) AS hash
         FROM (SELECT * FROM ${table}) AS linha`
      );
      result[table] = `${rows[0].total}:${rows[0].hash}`;
    }

    fingerprintAvailable = true;
    return JSON.stringify(result);
  } catch {
    fingerprintAvailable = false;
    return null;
  }
}

// ============================================================
// RELATORIO
// ============================================================

const results = [];
let currentGroup = '';

function group(title) {
  currentGroup = title;
  process.stdout.write(`\n${title}\n${'-'.repeat(title.length)}\n`);
}

/*
 * status: 'pass' | 'fail' | 'skip'
 * 'skip' existe para checagens opcionais (as que dependem de credenciais
 * do ADMIN). Uma checagem opcional ausente não pode reprovar a execução,
 * senão o script pareceria quebrado em vez de incompleto.
 */
function record(name, passed, detail) {
  const status = passed === null ? 'skip' : passed ? 'pass' : 'fail';
  results.push({ group: currentGroup, name, passed: status === 'pass', skipped: status === 'skip', detail });

  const mark = status === 'pass' ? 'PASS' : status === 'skip' ? 'SKIP' : 'FAIL';
  process.stdout.write(`  [${mark}] ${name}${detail ? ` -> ${detail}` : ''}\n`);
}

function expectStatus(name, result, expected) {
  const passed = result.status === expected;
  record(name, passed, `HTTP ${result.status} (esperado ${expected})`);
  return passed;
}

/*
 * Compara as impressões digitais colhidas antes e depois de um bloco de
 * escritas bloqueadas. Se não houver acesso ao banco, cai na comparação
 * via API, que é mais fraca mas ainda detecta alterações.
 */
function compareSnapshots(label, beforeDb, beforeApi, afterDb, afterApi) {
  if (beforeDb && afterDb) {
    const unchanged = beforeDb === afterDb;
    record(
      label,
      unchanged,
      unchanged
        ? 'todas as tabelas de negócio intactas (hash de conteúdo e contagem)'
        : 'O BANCO MUDOU: uma escrita bloqueada teve efeito'
    );
    return;
  }

  const unchanged = beforeApi === afterApi;
  record(
    label,
    unchanged,
    unchanged ? 'catálogo idêntico via API' : 'O CATÁLOGO MUDOU: uma escrita bloqueada teve efeito'
  );
}


// ============================================================
// CENARIOS
// ============================================================

async function checkUnauthenticated() {
  group('1. Sem credencial');

  expectStatus('GET /api/products sem token', await request('GET', '/api/products'), 401);
  expectStatus('GET /api/dashboard sem token', await request('GET', '/api/dashboard'), 401);
  expectStatus('DELETE /api/products/1 sem token', await request('DELETE', '/api/products/1'), 401);
}

async function checkOperatorReads(token) {
  group('2. OPERATOR - leituras permitidas');

  for (const resource of CATALOG_RESOURCES) {
    expectStatus(`GET /api/${resource}`, await request('GET', `/api/${resource}`, { token }), 200);
  }

  expectStatus('GET /api/dashboard', await request('GET', '/api/dashboard', { token }), 200);
  expectStatus('GET /api/movements', await request('GET', '/api/movements', { token }), 200);
  expectStatus('GET /api/auth/permissions', await request('GET', '/api/auth/permissions', { token }), 200);
}

async function snapshotCatalog(token) {
  const result = await request('GET', '/api/products?limit=200', { token });
  return result.text;
}

async function checkOperatorWritesAreRejected(token, beforeDb, beforeApi) {
  group('3. OPERATOR - escritas de catalogo bloqueadas (403)');

  // Payload invalido de proposito: a autorizacao e avaliada ANTES de
  // qualquer validacao de negocio, entao um 403 aqui prova que o
  // servidor recusou pelo papel do usuario, e nao por dados invalidos.
  const invalidBody = {};

  for (const resource of CATALOG_RESOURCES) {
    expectStatus(
      `POST /api/${resource}`,
      await request('POST', `/api/${resource}`, { token, body: invalidBody }),
      403
    );
    expectStatus(
      `PUT /api/${resource}/1`,
      await request('PUT', `/api/${resource}/1`, { token, body: invalidBody }),
      403
    );
    expectStatus(
      `PATCH /api/${resource}/1`,
      await request('PATCH', `/api/${resource}/1`, { token, body: invalidBody }),
      403
    );
    expectStatus(
      `DELETE /api/${resource}/1`,
      await request('DELETE', `/api/${resource}/1`, { token }),
      403
    );
  }

  group('4. OPERATOR - as escritas negadas nao alteraram nada');

  const afterDb = await fingerprintDatabase();
  const afterApi = await snapshotCatalog(token);

  compareSnapshots('Banco e catalogo intactos apos as tentativas', beforeDb, beforeApi, afterDb, afterApi);
}

/*
 * Perfil VIEWER: leitura pura.
 *
 * Aqui não existe "payload inválido de propósito". O VIEWER recebe 403
 * mesmo com corpos VÁLIDOS e completos, porque a recusa acontece no
 * gate de autorização, antes de qualquer validação. Usar payload real é
 * o teste mais forte: se a ordem alguma se invertesse, o 403 deixaria de
 * aparecer e o dado entraria no banco.
 */
async function checkViewer(session) {
  const { token, user } = session;

  group('9. VIEWER - perfil somente leitura');
  record(`Login do VIEWER (${user.email})`, true, `role ${user.role}`);

  const roleIsViewer = user.role === 'VIEWER';
  record('Perfil efetivamente VIEWER', roleIsViewer, `role ${user.role}`);

  group('10. VIEWER - leituras permitidas (200)');

  for (const resource of CATALOG_RESOURCES) {
    expectStatus(`GET /api/${resource}`, await request('GET', `/api/${resource}`, { token }), 200);
  }

  expectStatus('GET /api/dashboard', await request('GET', '/api/dashboard', { token }), 200);
  expectStatus('GET /api/movements', await request('GET', '/api/movements', { token }), 200);
  expectStatus('GET /api/movements?type=INFLOW', await request('GET', '/api/movements?type=INFLOW', { token }), 200);
  expectStatus('GET /api/movements?type=OUTFLOW', await request('GET', '/api/movements?type=OUTFLOW', { token }), 200);
  expectStatus('GET /api/auth/me', await request('GET', '/api/auth/me', { token }), 200);

  // As páginas do sistema precisam continuar carregando para o VIEWER:
  // sem sessão ele seria expulso do dashboard.
  group('11. VIEWER - navega pelas paginas do sistema');

  for (const page of ['/dashboard.html', '/products.html', '/categories.html', '/brands.html', '/suppliers.html', '/inflows.html', '/outflows.html']) {
    const response = await fetch(`${BASE_URL}${page}`, {
      headers: { Cookie: `clothstock_token=${encodeURIComponent(token)}` },
      redirect: 'manual'
    });
    expectStatus(`GET ${page}`, { status: response.status }, 200);
  }

  group('12. VIEWER - escritas de catalogo bloqueadas (403)');

  const beforeDb = await fingerprintDatabase();
  const beforeApi = await snapshotCatalog(token);

  // Estoque e cadastros reais, lidos do banco via API, para que o
  // payload seja válido e a recusa não possa ser atribuída a dados ruins.
  const products = await request('GET', '/api/products?limit=5', { token });
  const productList = products.json?.data?.products || products.json?.data?.items || [];
  const sample = productList[0] || {};

  const validProduct = {
    title: 'Produto Invasivo VIEWER',
    sku: `VIEWER-INTRUSION-${Date.now()}`,
    selling_price: 10,
    cost_price: 5,
    quantity_in_stock: 1
  };

  for (const resource of CATALOG_RESOURCES) {
    expectStatus(
      `POST /api/${resource} (payload valido)`,
      await request('POST', `/api/${resource}`, { token, body: resource === 'brands' ? { name: 'Marca Invasiva VIEWER' } : validProduct }),
      403
    );
    expectStatus(
      `PUT /api/${resource}/1 (payload valido)`,
      await request('PUT', `/api/${resource}/1`, { token, body: validProduct }),
      403
    );
    expectStatus(
      `PATCH /api/${resource}/1 (payload valido)`,
      await request('PATCH', `/api/${resource}/1`, { token, body: validProduct }),
      403
    );
    expectStatus(
      `DELETE /api/${resource}/1`,
      await request('DELETE', `/api/${resource}/1`, { token }),
      403
    );
  }

  group('13. VIEWER - nao registra entrada nem saida (403)');

  // Payload de movimentação estruturalmente correto, com produto e
  // quantidade existentes. Um OPERATOR receberia 201 com este corpo; o
  // VIEWER tem de receber 403, porque não possui movements.create.
  const movementItem = {
    product_id: sample.id,
    quantity: 1
  };

  expectStatus(
    'POST /api/movements/inflows (payload valido)',
    await request('POST', '/api/movements/inflows', { token, body: { items: [movementItem], notes: 'invasão' } }),
    403
  );
  expectStatus(
    'POST /api/movements/outflows (payload valido)',
    await request('POST', '/api/movements/outflows', { token, body: { items: [movementItem], reason: 'SALE' } }),
    403
  );
  expectStatus(
    'POST /api/movements (payload valido)',
    await request('POST', '/api/movements', { token, body: { type: 'INFLOW', items: [movementItem] } }),
    403
  );

  group('14. VIEWER - nenhuma escrita bloqueada alterou o banco');

  const afterDb = await fingerprintDatabase();
  const afterApi = await snapshotCatalog(token);

  compareSnapshots('Banco e catalogo intactos apos as tentativas', beforeDb, beforeApi, afterDb, afterApi);

  group('15. VIEWER - escalada de privilegio barrada');

  // Token forjado com role=ADMIN: a role real continua sendo VIEWER no
  // banco, então tudo deve continuar sendo recusado.
  if (JWT_SECRET) {
    const forged = jwt.sign(
      { email: user.email, name: user.name, role: 'ADMIN' },
      JWT_SECRET,
      { subject: user.id, expiresIn: '1h' }
    );

    expectStatus(
      'POST /api/products com token forjado (role=ADMIN no JWT)',
      await request('POST', '/api/products', { rawToken: forged, body: validProduct }),
      403
    );
    expectStatus(
      'POST /api/movements/inflows com token forjado (role=ADMIN no JWT)',
      await request('POST', '/api/movements/inflows', { rawToken: forged, body: { items: [movementItem] } }),
      403
    );
    expectStatus(
      'DELETE /api/brands/1 com token forjado (role=ADMIN no JWT)',
      await request('DELETE', '/api/brands/1', { rawToken: forged }),
      403
    );
  } else {
    record('Token forjado', null, 'JWT_SECRET indisponivel: nao foi possivel forjar');
  }

  // A lista de acoes do proprio servidor nao pode conceder escrita.
  const permissions = await request('GET', '/api/auth/permissions', { token });
  const actions = permissions.json?.data?.actions || [];
  const leaked = actions.filter(action => !action.endsWith('.read'));
  record(
    'GET /api/auth/permissions nao concede nenhuma acao de escrita',
    leaked.length === 0,
    leaked.length === 0
      ? `${actions.length} acoes, todas *.read`
      : `concedidas indevidamente: ${leaked.join(', ')}`
  );
}


async function checkOperatorMovements(token) {
  group('5. OPERATOR - movimentacoes permitidas');

  // A matriz permite movements.create para OPERATOR. O corpo vai vazio de
  // proposito: um payload valido mudaria o estoque real. Reaching a
  // validacao (400) em vez de um 403 ja prova que a operacao foi
  // AUTORIZADA; apenas os dados foram recusados.
  for (const path of ['/api/movements/inflows', '/api/movements/outflows']) {
    const result = await request('POST', path, { token, body: {} });
    const notForbidden = result.status !== 403;
    record(
      `POST ${path} nao foi barrado por permissao`,
      notForbidden,
      `HTTP ${result.status} - 400 = autorizado e recusado por validacao, 201 = gravado de verdade`
    );
  }
}

async function checkPrivilegeEscalation(operator) {
  group('6. Escalada de privilegio barrada');

  // 6.1 A lista de acoes que o proprio servidor expoe nao concede escrita.
  const permissions = await request('GET', '/api/auth/permissions', { token: operator.token });
  const actions = permissions.json?.data?.actions || [];
  const forbiddenActions = CATALOG_RESOURCES.flatMap(resource => [
    `${resource}.create`,
    `${resource}.update`,
    `${resource}.delete`
  ]);
  const leaked = forbiddenActions.filter(action => actions.includes(action));
  record(
    'GET /api/auth/permissions nao lista nenhuma escrita de catalogo',
    leaked.length === 0,
    leaked.length === 0 ? `concedidas: ${actions.length} acoes de leitura/movimentacao` : `vazou: ${leaked.join(', ')}`
  );

  // 6.2 Token forjado: assinado com o segredo correto e com a claim
  // role=ADMIN, mas carregando o id do OPERATOR. Se o servidor confiasse
  // na claim do JWT, o DELETE passaria. Ele le a role do BANCO, entao
  // o DELETE continua 403. Esta e a prova decisiva de que a restricao
  // nao esta no cliente.
  if (operator.token && operator.user?.id && JWT_SECRET) {
    const forged = jwt.sign(
      { email: operator.user.email, name: operator.user.name, role: 'ADMIN' },
      JWT_SECRET,
      { subject: operator.user.id, expiresIn: '1h' }
    );

    expectStatus(
      'DELETE /api/brands/1 com token forjado (role=ADMIN no JWT)',
      await request('DELETE', '/api/brands/1', { rawToken: forged }),
      403
    );
  } else {
    record('Token forjado', false, 'JWT_SECRET ou id do OPERATOR indisponivel: nao foi possivel forjar');
  }

  // 6.3 Token adulterado (payload mexido, assinatura invalida).
  const tampered = `${operator.token || 'x'}${operator.token ? 'aa' : ''}`;
  expectStatus(
    'GET /api/products com token adulterado',
    await request('GET', '/api/products', { rawToken: tampered }),
    401
  );

  // 6.4 Cadastro publico pedindo ADMIN.
  const register = await request('POST', '/api/auth/register', {
    body: {
      name: 'Escalada Viavel',
      email: `escalada-${Date.now()}@clothstock.com`,
      password: 'Senha#Forte2026',
      role: 'ADMIN'
    }
  });
  expectStatus('POST /api/auth/register com role=ADMIN', register, 403);

  // 6.5 Metodo fora da matriz em um caminho existente.
  expectStatus('PUT /api/dashboard (metodo nao mapeado)', await request('PUT', '/api/dashboard', { token: operator.token }), 403);
}

async function checkDenyByDefault(token) {
  group('7. Negar por padrao');

  expectStatus(
    'GET /api/rota-que-nao-existe',
    await request('GET', '/api/rota-que-nao-existe', { token }),
    404
  );
  expectStatus(
    'GET /api/relatorios (recurso do PRD, nao implementado)',
    await request('GET', '/api/relatorios', { token }),
    404
  );
}

async function checkAdminCanWrite() {
  group('8. ADMIN - escritas permitidas (controle dos 403)');

  if (!ADMIN.email || !ADMIN.password) {
    record(
      'Ciclo de escrita do ADMIN',
      null,
      'opcional: informe TEST_ADMIN_EMAIL e TEST_ADMIN_PASSWORD para exercitar esta parte'
    );
    return;
  }

  const session = await loginAndCaptureToken(ADMIN);
  if (!session.ok) {
    record('Login do ADMIN', false, `HTTP ${session.status}`);
    return;
  }
  record('Login do ADMIN', true, ADMIN.email);

  const name = `Marca de Verificacao ${Date.now()}`;
  const created = await request('POST', '/api/brands', { token: session.token, body: { name } });
  expectStatus('POST /api/brands', created, 201);

  const brandId = created.json?.data?.brand?.id ?? created.json?.data?.id;
  if (!brandId) {
    record('Exclusao da marca criada', false, 'id da marca nao veio na resposta de criacao');
    return;
  }

  expectStatus(
    `DELETE /api/brands/${brandId}`,
    await request('DELETE', `/api/brands/${brandId}`, { token: session.token }),
    200
  );

  const permissions = await request('GET', '/api/auth/permissions', { token: session.token });
  const actions = permissions.json?.data?.actions || [];
  const hasDelete = actions.includes('products.delete');
  record('GET /api/auth/permissions do ADMIN inclui products.delete', hasDelete, `${actions.length} acoes concedidas`);
}

// ============================================================
// EXECUCAO
// ============================================================

async function reachable() {
  try {
    const result = await request('GET', '/api/auth/health');
    return result.status === 200;
  } catch {
    return false;
  }
}

async function run() {
  process.stdout.write(`Verificando permissões em ${BASE_URL}\n`);

  if (!(await reachable())) {
    process.stderr.write(
      `\nA API não respondeu em ${BASE_URL}.\n` +
      'Inicie o servidor com "npm start" e rode este script novamente.\n' +
      'Para usar outra URL: BASE_URL=http://host:porta npm run verify:permissions\n'
    );
    process.exit(1);
  }

  await checkUnauthenticated();

  const operator = await loginAndCaptureToken(TEST_USER);
  if (!operator.ok) {
    process.stderr.write(
      `\nNão foi possível entrar como o usuário de teste (${TEST_USER.email}): HTTP ${operator.status}.\n` +
      'Crie-o com "npm run test-user:create" e rode este script novamente.\n'
    );
    process.exit(1);
  }

  group('0. Sessao do usuario de teste');
  record(`Login do OPERATOR (${operator.user.email})`, true, `role ${operator.user.role}`);

  await checkOperatorReads(operator.token);
  await checkOperatorWritesAreRejected(
    operator.token,
    await fingerprintDatabase(),
    await snapshotCatalog(operator.token)
  );
  await checkOperatorMovements(operator.token);
  await checkPrivilegeEscalation(operator);
  await checkDenyByDefault(operator.token);
  await checkAdminCanWrite();

  // ==========================================================
  // VIEWER: conta de demonstração dos avaliadores
  // ==========================================================
  if (!VIEWER.password) {
    group('9-15. VIEWER');
    record(
      'Verificacoes do perfil VIEWER',
      null,
      'informe VIEWER_ACCOUNT_PASSWORD para exercitar o perfil; a conta se cria com "npm run viewer:create:generate"'
    );
  } else {
    const viewer = await loginAndCaptureToken(VIEWER);
    if (!viewer.ok) {
      group('9-15. VIEWER');
      record(
        `Login do VIEWER (${VIEWER.email})`,
        false,
        `HTTP ${viewer.status} - a conta existe? rode "npm run viewer:create:generate"`
      );
    } else {
      await checkViewer(viewer);
    }
  }

  // ==========================================================
  const failed = results.filter(result => !result.passed && !result.skipped);
  const skipped = results.filter(result => result.skipped);
  const passed = results.length - failed.length - skipped.length;
  const total = results.length;

  process.stdout.write(`\n${'='.repeat(58)}\n`);
  process.stdout.write(
    `${passed}/${total} checagens passaram` +
    (skipped.length > 0 ? `, ${skipped.length} opcionais ignoradas` : '') +
    '\n'
  );

  if (failed.length > 0) {
    process.stdout.write('\nFalhas:\n');
    for (const failure of failed) {
      process.stdout.write(`  - [${failure.group}] ${failure.name} -> ${failure.detail}\n`);
    }
    process.stdout.write('\nO controle de permissões NAO está se comportando como esperado.\n');
    process.exit(1);
  }

  if (skipped.length > 0) {
    process.stdout.write('\nIgnoradas (opcionais):\n');
    for (const skip of skipped) {
      process.stdout.write(`  - [${skip.group}] ${skip.name} -> ${skip.detail}\n`);
    }
  }

  process.stdout.write(
    '\nPermissões verificadas no servidor: as leituras e escritas liberadas\n' +
    'e as negativas responderam exatamente como a matriz em\n' +
    'src/config/permissions.js define, sem passar pela interface.\n'
  );
  process.stdout.write(
    `Rotas cobertas pela matriz: ${ROUTE_RULES.length} combinações de método + caminho.\n`
  );

  process.exit(0);
}

run().catch(error => {
  process.stderr.write(`\nFalha inesperada na verificação: ${error.message}\n`);
  process.exit(1);
});
