// scripts/seed-viewer-account.js
// Cria (ou redefine) a conta de DEMONSTRAÇÃO com role VIEWER, destined
// aos avaliadores do desafio.
//
// O VIEWER é somente leitura: navega e consulta todo o sistema, mas não
// cria, edita, exclui, não registra entrada/saída e não altera estoque.
// Todas as negativas são aplicadas pelo servidor
// (src/config/permissions.js), não pela interface.
//
// SEGURANÇA DA SENHA
// NÃO existe senha padrão neste arquivo. A senha só pode vir de:
//   1. flag --generate  -> senha aleatória forte, exibida UMA vez no
//                          terminal e nunca gravada em arquivo;
//   2. variável de ambiente VIEWER_ACCOUNT_PASSWORD;
//   3. digitação interativa em modo oculto.
// Sem nenhuma dessas fontes o script aborta. Isso impede que uma conta
// de demonstração seja publicada com uma senha que está no Git.
//
// A senha nunca é impressa por este script, exceto no caminho --generate.
// Nada de DATABASE_URL, JWT_SECRET ou password_hash é exibido.
//
// Este script NÃO altera as contas ADMIN nem OPERATOR existentes: ele só
// toca a conta de e-mail de demonstração.
//
// Uso:
//   npm run viewer:create:generate   (senha aleatória, exibida uma vez)
//   npm run viewer:create           (VIEWER_ACCOUNT_PASSWORD ou digitação)
//   npm run viewer:remove
//
// Nota: as flags ficam dentro dos scripts do package.json de propósito.
// Encaminhar argumentos extras com "npm run x -- --flag" não é confiável
// entre versões de npm no Windows.

const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
require('dotenv').config();

const db = require('../src/config/database');
const { describePasswordRequirements, isStrongPassword } = require('../src/utils/passwordPolicy');
const { isUserFacingError, userError } = require('./lib/validators');
const { askHidden } = require('./lib/prompt');

const BCRYPT_ROUNDS = 12;

const VIEWER = {
  name: 'Avaliador (somente leitura)',
  email: String(process.env.VIEWER_ACCOUNT_EMAIL || 'avaliador@clothstock.com').toLowerCase(),
  role: 'VIEWER'
};

const PASSWORD_UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const PASSWORD_LOWERCASE = 'abcdefghijkmnpqrstuvwxyz';
const PASSWORD_DIGITS = '23456789';
const PASSWORD_SYMBOLS = '!@#$%&*?';
const PASSWORD_FILLER = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const GENERATED_LENGTH = 20;

function randomFrom(charset) {
  return charset[crypto.randomInt(0, charset.length)];
}

function randomIntInclusive(min, max) {
  return min + crypto.randomInt(0, max - min + 1);
}

/*
 * Senha aleatória que já satisfaz a política: no mínimo uma maiúscula,
 * uma minúscula, um dígito e um símbolo, com 20 caracteres. Evita o
 * clássico erro de gerar uma senha que o próprio script rejeitaria.
 */
function generatePassword() {
  const all = [
    randomFrom(PASSWORD_UPPERCASE),
    randomFrom(PASSWORD_LOWERCASE),
    randomFrom(PASSWORD_DIGITS),
    randomFrom(PASSWORD_SYMBOLS)
  ];

  while (all.length < GENERATED_LENGTH) {
    all.push(randomFrom(PASSWORD_FILLER));
  }

  // Fisher-Yates com RNG criptográfico, para não deixar a senha previsível
  // pela posição dos caracteres obrigatórios.
  for (let index = all.length - 1; index > 0; index -= 1) {
    const swap = randomIntInclusive(0, index);
    [all[index], all[swap]] = [all[swap], all[index]];
  }

  return all.join('');
}

/*
 * Resolve a senha na ordem: --generate, variável de ambiente, digitação
 * interativa. Devolve { password, source, reveal }.
 */
async function resolvePassword(generate) {
  if (generate) {
    return { password: generatePassword(), source: 'gerada', reveal: true };
  }

  const fromEnv = process.env.VIEWER_ACCOUNT_PASSWORD;
  if (fromEnv) {
    return { password: String(fromEnv), source: 'VIEWER_ACCOUNT_PASSWORD', reveal: false };
  }

  if (process.stdin.isTTY) {
    const typed = await askHidden('Senha da conta VIEWER: ');
    const confirmation = await askHidden('Confirme a senha: ');

    if (typed !== confirmation) {
      throw userError('As senhas informadas não conferem.');
    }

    return { password: typed, source: 'digitada', reveal: false };
  }

  throw userError(
    'Nenhuma senha disponível. Use --generate, defina VIEWER_ACCOUNT_PASSWORD ou execute em um terminal interativo.'
  );
}

async function preflight(client) {
  const { rows } = await client.query("SELECT to_regclass('users') IS NOT NULL AS ready");
  if (!rows[0].ready) {
    throw userError('Tabela users não encontrada. Execute database/schema.sql antes deste script.');
  }

  /*
   * A coluna role tem um CHECK no banco. Se a migração do perfil VIEWER
   * não tiver sido aplicada, o INSERT falharia com SQLSTATE 23514
   * (check_violation) e a mensagem não diria nada sobre a causa real.
   * Detectamos isso aqui e apontamos a migração.
   */
  const { rows: constraints } = await client.query(`
    SELECT pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'users'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  `);

  const roleIsConstrained = constraints.length > 0;
  const acceptsViewer = constraints.some(row => row.def.includes('VIEWER'));

  if (roleIsConstrained && !acceptsViewer) {
    throw userError(
      'A tabela users ainda restringe role a ADMIN/OPERATOR e rejeitaria VIEWER. ' +
      'Execute a migração database/migrations/001-viewer-role.sql antes deste script.'
    );
  }
}

async function upsertViewer(client, password) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await client.query('BEGIN');

  try {
    // Serializa execuções concorrentes deste script.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('clothstock:viewer-account'))");

    const { rows: existing } = await client.query(
      'SELECT id FROM users WHERE email = $1 FOR UPDATE',
      [VIEWER.email]
    );

    if (existing.length === 0) {
      await client.query(
        `INSERT INTO users (name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, TRUE)`,
        [VIEWER.name, VIEWER.email, passwordHash, VIEWER.role]
      );
      await client.query('COMMIT');
      return 'criada';
    }

    // A role é fixada em VIEWER para que a conta de demonstração nunca
    // acabe promovida por engano e virando um risco de escrita.
    await client.query(
      `UPDATE users
       SET name = $1, password_hash = $2, role = $3, is_active = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE email = $4`,
      [VIEWER.name, passwordHash, VIEWER.role, VIEWER.email]
    );
    await client.query('COMMIT');
    return 'redefinida';
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  }
}

async function removeViewer(client) {
  const { rowCount } = await client.query('DELETE FROM users WHERE email = $1 AND role = $2', [
    VIEWER.email,
    VIEWER.role
  ]);

  process.stdout.write(
    rowCount > 0
      ? `Conta de demonstração removida (${VIEWER.email}).\n`
      : `Nenhuma conta de demonstração encontrada com role VIEWER em ${VIEWER.email}.\n`
  );
}

async function run() {
  const args = process.argv.slice(2);
  const remove = args.includes('--remove');
  const generate = args.includes('--generate');

  const client = await db.connect();

  try {
    await preflight(client);

    if (remove) {
      await removeViewer(client);
      return;
    }

    const resolved = await resolvePassword(generate);

    if (!isStrongPassword(resolved.password)) {
      throw userError(`Senha fraca: a senha deve ${describePasswordRequirements(resolved.password)}.`);
    }

    const outcome = await upsertViewer(client, resolved.password);

    process.stdout.write(
      `Conta de demonstração ${outcome}: ${VIEWER.email} (role ${VIEWER.role}).\n` +
      `Senha: ${resolved.source}.\n` +
      'Esta conta só lê. Não cria, não edita, não exclui, não registra movimentação e não altera estoque.\n'
    );

    if (resolved.reveal) {
      process.stdout.write(
        '\n' +
        '=====================================================\n' +
        '  SENHA GERADA (exibida uma única vez)\n' +
        '=====================================================\n' +
        `  ${resolved.password}\n` +
        '=====================================================\n' +
        'Guarde em local seguro. Ela não foi gravada em nenhum arquivo.\n'
      );
    }
  } finally {
    client.release();
  }
}

run()
  .then(() => process.exit(0))
  .catch(error => {
    if (isUserFacingError(error)) {
      process.stderr.write(`${error.message}\n`);
    } else {
      process.stderr.write('Não foi possível provisionar a conta VIEWER. Nenhuma alteração foi realizada.\n');
    }
    process.exit(1);
  });
