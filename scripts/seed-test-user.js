// scripts/seed-test-user.js
// Cria (ou redefine) o USUÁRIO DE TESTE com acesso restrito.
//
// O usuário é um OPERATOR: enxerga o catálogo e o dashboard, registra e
// consulta movimentações de estoque, mas NÃO cria, edita nem exclui
// produtos, categorias, marcas ou fornecedores. Todas as negativas são
// aplicadas pelo servidor (src/config/permissions.js), não pela UI.
//
// O script é idempotente: pode rodar quantas vezes quiser e sempre
// deixa a conta no estado documentado, com a senha conhecida, para que
// um avaliador consiga entrar e conferir o comportamento.
//
// Segurança:
// - A senha é validada pela MESMA política do cadastro público
//   (src/utils/passwordPolicy.js);
// - Armazenada apenas como hash bcrypt (12 rounds);
// - Em produção o script recusa rodar sem --force, porque uma senha
//   conhecida em produção é uma porta de entrada, não um recurso;
// - Nada sensível é impresso: apenas o e-mail e a role.
//
// Uso:
//   npm run test-user:create     cria/redefine o usuário de teste
//   npm run test-user:remove     remove o usuário de teste

const bcrypt = require('bcryptjs');
const { isStrongPassword, describePasswordRequirements } = require('../src/utils/passwordPolicy');
const db = require('../src/config/database');

const BCRYPT_ROUNDS = 12;

const TEST_USER = {
  name: 'Operador de Teste (acesso restrito)',
  email: 'operador@clothstock.com',
  role: 'OPERATOR',
  // Senha de teste, conhecida e publicada de propósito: o objetivo é
  // permitir a verificação manual do comportamento do OPERATOR.
  // Atende à política: >= 12 chars, maiúscula, minúscula, dígito e especial.
  password: process.env.TEST_USER_PASSWORD || 'Avaliador#2026'
};

function isProduction() {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
}

async function removeTestUser(client) {
  const { rowCount } = await client.query('DELETE FROM users WHERE email = $1', [TEST_USER.email]);

  process.stdout.write(
    rowCount > 0
      ? `Usuário de teste removido (${TEST_USER.email}).\n`
      : `Nenhum usuário de teste encontrado (${TEST_USER.email}).\n`
  );
}

async function upsertTestUser(client) {
  const passwordHash = await bcrypt.hash(TEST_USER.password, BCRYPT_ROUNDS);

  await client.query('BEGIN');

  try {
    // Serializa execuções concorrentes deste script.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('clothstock:test-user'))");

    const { rows: existing } = await client.query(
      'SELECT id, role FROM users WHERE email = $1 FOR UPDATE',
      [TEST_USER.email]
    );

    if (existing.length === 0) {
      await client.query(
        `INSERT INTO users (name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, TRUE)`,
        [TEST_USER.name, TEST_USER.email, passwordHash, TEST_USER.role]
      );
      await client.query('COMMIT');
      return 'criado';
    }

    // A role é fixada em OPERATOR de propósito: mesmo que alguém tenha
    // promoteido essa conta no banco, o script a devolve ao estado
    // restrito e reativa, para que o cenário de teste seja reproduzível.
    await client.query(
      `UPDATE users
       SET name = $1, password_hash = $2, role = $3, is_active = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE email = $4`,
      [TEST_USER.name, passwordHash, TEST_USER.role, TEST_USER.email]
    );
    await client.query('COMMIT');
    return 'redefinido';
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  }
}

async function preflight(client) {
  const { rows } = await client.query("SELECT to_regclass('users') IS NOT NULL AS ready");
  if (!rows[0].ready) {
    throw new Error('Tabela users não encontrada. Execute database/schema.sql antes deste script.');
  }
}

async function run() {
  const args = process.argv.slice(2);
  const remove = args.includes('--remove');

  if (isProduction() && !remove && !args.includes('--force')) {
    process.stderr.write(
      'Refusando criar um usuário com senha conhecida em produção.\n' +
      'Se isso for realmente necessário, rode com --force e remova a conta depois:\n' +
      '  node scripts/seed-test-user.js --force\n' +
      '  node scripts/seed-test-user.js --remove\n'
    );
    process.exit(1);
  }

  const client = await db.connect();

  try {
    await preflight(client);

    if (remove) {
      await removeTestUser(client);
      return;
    }

    if (!isStrongPassword(TEST_USER.password)) {
      throw new Error(
        `A senha de TEST_USER_PASSWORD não atende à política: ${describePasswordRequirements(TEST_USER.password)}.`
      );
    }

    const outcome = await upsertTestUser(client);

    process.stdout.write(
      `Usuário de teste ${outcome}: ${TEST_USER.email} (role ${TEST_USER.role}).\n` +
      'A senha é a definida em TEST_USER_PASSWORD (padrão na documentação do projeto).\n' +
      'Use-o para conferir as negativas; ele não deve conseguir criar, editar ou excluir cadastros.\n'
    );
  } finally {
    client.release();
  }
}

run()
  .then(() => process.exit(0))
  .catch(error => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
