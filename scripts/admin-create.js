// scripts/admin-create.js
// Provisiona o PRIMEIRO usuário ADMIN do ClothStock.
//
// Segurança:
// - Exige DATABASE_URL via variável de ambiente (nunca embutida no código);
// - Senha digitada em modo oculto, validada e armazenada apenas como hash bcrypt (12 rounds);
// - Aborta sem alterar o banco se já existir qualquer usuário com role = 'ADMIN';
// - A criação ocorre dentro de uma transação (COMMIT/ROLLBACK);
// - Nenhuma credencial (DATABASE_URL, senha, password_hash, JWT_SECRET) é exibida em logs.
//
// Uso: npm run admin:create

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const { askText, askHidden, requireInteractiveTerminal } = require('./lib/prompt');
const {
  assertValidName,
  assertValidEmail,
  assertStrongPassword,
  assertPasswordsMatch,
  isUserFacingError,
  userError,
} = require('./lib/validators');

const BCRYPT_ROUNDS = 12;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

function getConnectionString() {
  const connectionString = String(process.env.DATABASE_URL || '').trim();

  if (!connectionString) {
    throw userError(
      'DATABASE_URL não definida. Informe a connection string do PostgreSQL na variável de ambiente DATABASE_URL e execute novamente.'
    );
  }

  if (!/^postgres(ql)?:\/\//i.test(connectionString)) {
    throw userError('DATABASE_URL inválida: use uma connection string no formato postgresql://...');
  }

  return connectionString;
}

function buildPool(connectionString) {
  let hostname = '';
  try {
    hostname = new URL(connectionString).hostname.toLowerCase();
  } catch {
    hostname = '';
  }

  return new Pool({
    connectionString,
    ssl: hostname && !LOCAL_HOSTS.has(hostname) ? { rejectUnauthorized: false } : false,
    max: 1,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 5000,
  });
}

async function preflight(client) {
  // to_regclass respeita o search_path, igual às consultas do restante da aplicação.
  const { rows } = await client.query('SELECT to_regclass($1) IS NOT NULL AS ready', ['users']);
  if (!rows[0].ready) {
    throw userError(
      'Tabela users não encontrada no banco. Execute database/schema.sql antes deste script.'
    );
  }
}

async function collectAdminData() {
  const name = await askText('Nome do administrador: ');
  assertValidName(name);

  const email = (await askText('E-mail do administrador: ')).toLowerCase();
  assertValidEmail(email);

  const password = await askHidden('Senha do administrador: ');
  const confirmation = await askHidden('Confirme a senha do administrador: ');
  assertPasswordsMatch(password, confirmation);
  assertStrongPassword(password);

  return { name, email, password };
}

async function createAdmin(client, { name, email, password }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await client.query('BEGIN');

  try {
    // Serializa execuções concorrentes deste script (evita corrida na criação do primeiro ADMIN).
    await client.query("SELECT pg_advisory_xact_lock(hashtext('clothstock:admin-bootstrap'))");

    const { rows: existingAdmins } = await client.query(
      "SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1"
    );
    if (existingAdmins.length > 0) {
      throw userError('Já existe um usuário ADMIN no banco. Nenhuma alteração foi realizada.');
    }

    const { rows: existingEmail } = await client.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    if (existingEmail.length > 0) {
      throw userError('Este e-mail já está cadastrado. Nenhuma alteração foi realizada.');
    }

    await client.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'ADMIN', TRUE)`,
      [name, email, passwordHash]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  }
}

async function run() {
  const connectionString = getConnectionString();
  requireInteractiveTerminal();

  const pool = buildPool(connectionString);
  const client = await pool.connect();

  try {
    await preflight(client);

    const admin = await collectAdminData();
    await createAdmin(client, admin);
    admin.password = '';

    process.stdout.write(
      `Administrador ADMIN criado com sucesso (${admin.email}). Guarde a senha em local seguro.\n`
    );
  } finally {
    client.release();
    await pool.end().catch(() => {});
  }
}

run()
  .then(() => process.exit(0))
  .catch(error => {
    if (isUserFacingError(error)) {
      process.stderr.write(`${error.message}\n`);
    } else {
      // Nunca imprime stack/payload: podem conter dados sensíveis vindos do driver.
      process.stderr.write(
        'Não foi possível criar o administrador (falha de conexão ou erro inesperado). Nenhuma alteração foi realizada.\n'
      );
    }

    process.exit(1);
  });
