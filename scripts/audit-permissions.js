// scripts/audit-permissions.js
// Confere que a matriz de src/config/permissions.js e a aplicação real
// continuam em sincronia.
//
// É o teste que sustenta o "negar por padrão": se alguém acrescentar uma
// rota nova na API sem declarar a ação e as roles na matriz, esta
// auditoria reprova. Sem ela, o gate continuaria negando a rota nova
// (correto por segurança, porém silenciosamente) e o erro só apareceria
// em produção, como um 403 inexplicável.
//
// Verifica os dois sentidos:
//   1. toda rota /api registrada tem uma regra na matriz;
//   2. toda regra da matriz aponta para uma rota realmente montada.
//
// Não precisa de banco nem de servidor no ar: só inspeciona o app.
//
// Uso: npm run verify:matrix

const app = require('../src/app');
const { ROUTE_RULES, ROLE_ACTIONS, ROLES, listActions, resolveRule, isKnownRole } = require('../src/config/permissions');

/*
 * Recupera o caminho de montagem de um app.use(). O Express 4 compila
 * '/api/brands' em /^\/api\/brands\/?(?=\/|$)/i, então o prefixo é
 * reconstruído a partir do regexp da layer.
 */
function mountPath(layer) {
  if (!layer.regexp) return '';

  let source = layer.regexp.source;
  source = source.replace(/^\^/, '');
  source = source.replace(/\\\/\?\(\?=\\\/\|\$\)$/, '');
  source = source.replace(/\\\//g, '/');

  return source && source !== '/' ? source : '';
}

function collectRoutes(stack, prefix, out) {
  for (const layer of stack) {
    if (layer.route) {
      const fullPath = (prefix + layer.route.path).replace(/\/{2,}/g, '/');

      for (const method of Object.keys(layer.route.methods)) {
        if (method === '_all') continue;
        out.push({ method: method.toUpperCase(), path: fullPath });
      }
      continue;
    }

    if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      collectRoutes(layer.handle.stack, prefix + mountPath(layer), out);
    }
  }
}

function isAuthPath(path) {
  return path === '/api/auth' || path.startsWith('/api/auth/');
}

function run() {
  const routes = [];
  collectRoutes(app._router.stack, '', routes);

  const seen = new Set();
  const apiRoutes = routes.filter(route => {
    if (!route.path.startsWith('/api')) return false;
    const key = `${route.method} ${route.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const problems = [];

  process.stdout.write(`Rotas /api registradas: ${apiRoutes.length}\n\n`);

  // 1. Cobertura: toda rota fora de /api/auth precisa de regra.
  for (const route of apiRoutes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))) {
    if (isAuthPath(route.path)) {
      process.stdout.write(`  ${route.method.padEnd(6)} ${route.path.padEnd(36)} isenta (/api/auth)\n`);
      continue;
    }

    const resolved = resolveRule(route.method, route.path);

    if (resolved.kind === 'ok') {
      process.stdout.write(`  ${route.method.padEnd(6)} ${route.path.padEnd(36)} ${resolved.rule.action}\n`);
      continue;
    }

    problems.push(
      resolved.kind === 'unknown'
        ? `Rota ${route.method} ${route.path} não existe na matriz: o gate vai responder 404. Declare a ação em ROUTE_RULES.`
        : `Rota ${route.method} ${route.path} tem o método fora da matriz: o gate vai responder 403 para todo mundo.`
    );
  }

  // 2. Sinergia inversa: nenhuma regra órfã.
  const orphans = ROUTE_RULES.filter(rule =>
    !apiRoutes.some(route =>
      !isAuthPath(route.path) && rule.path.test(route.path) && rule.methods.includes(route.method)
    )
  );

  for (const orphan of orphans) {
    problems.push(
      `Regra ${orphan.methods.join('/')} ${orphan.path.source} -> ${orphan.action} não corresponde a nenhuma rota montada.`
    );
  }

  // 3. Sanidade das roles: toda role declarada precisa ser conhecida, e
  //    toda ação precisa estar concedida e referenciada.
  for (const role of Object.keys(ROLE_ACTIONS)) {
    if (!isKnownRole(role)) problems.push(`Role ${role} declarada fora do conjunto conhecido.`);
  }

  const granted = new Set(Object.values(ROLE_ACTIONS).flat());
  const known = new Set(ROUTE_RULES.map(rule => rule.action));
  for (const action of granted) {
    if (!known.has(action)) problems.push(`Ação ${action} é concedida a alguma role mas não existe em ROUTE_RULES.`);
  }
  for (const action of known) {
    if (!granted.has(action)) problems.push(`Ação ${action} existe em ROUTE_RULES mas não é concedida a nenhuma role.`);
  }

  // 4. Invariante do perfil VIEWER: somente leitura. Se alguém acrescentar
  //    uma ação de escrita à lista do VIEWER, esta auditoria reprova. É a
  //    rede de segurança para a propriedade que o desafio exige.
  const viewerActions = listActions(ROLES.VIEWER);
  const viewerWrites = viewerActions.filter(action => !action.endsWith('.read'));
  for (const action of viewerWrites) {
    problems.push(
      `A role VIEWER não pode possuir a ação de escrita ${action}. O perfil VIEWER é somente leitura.`
    );
  }
  if (viewerActions.length === 0) {
    problems.push('A role VIEWER está sem nenhuma permissão: o perfil não conseguiria navegar.');
  }
  process.stdout.write(`\nVIEWER: ${viewerActions.length} acoes concedidas, ${viewerWrites.length} de escrita.\n`);

  process.stdout.write(`\nRegras na matriz: ${ROUTE_RULES.length}\n`);

  if (problems.length > 0) {
    process.stdout.write('\nProblemas encontrados:\n');
    for (const problem of problems) process.stdout.write(`  - ${problem}\n`);
    process.stdout.write('\nA matriz e a aplicação estão fora de sincronia.\n');
    process.exit(1);
  }

  process.stdout.write(
    '\nMatriz e aplicação em sincronia: nenhuma rota sem regra e nenhuma regra sem rota.\n' +
    'O gate continua nega por padrao para qualquer rota acrescentada no futuro.\n'
  );
  process.exit(0);
}

run();
