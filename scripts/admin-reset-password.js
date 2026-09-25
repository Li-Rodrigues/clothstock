// scripts/admin-reset-password.js
// Redefine a senha de um usuário ADMIN já existente.
//
// Uso: npm run admin:reset-password

const bcrypt = require('bcryptjs');
const pool = require('../src/config/database');

const { askText, askHidden, requireInteractiveTerminal } = require('./lib/prompt');
const { assertValidEmail, assertStrongPassword, assertPasswordsMatch } = require('./lib/validators');

const BCRYPT_ROUNDS = 12;

async function resetAdminPassword() {
  requireInteractiveTerminal();

  const email = (await askText('E-mail do administrador: ')).toLowerCase();
  assertValidEmail(email);

  const password = await askHidden('Nova senha: ');
  const confirmation = await askHidden('Confirme a nova senha: ');
  assertPasswordsMatch(password, confirmation);
  assertStrongPassword(password);

  const userResult = await pool.query(
    `SELECT id
     FROM users
     WHERE email = $1
       AND role = 'ADMIN'
       AND is_active = TRUE
     LIMIT 1`,
    [email]
  );

  if (userResult.rowCount !== 1) {
    throw new Error('Usuário ADMIN não encontrado ou indisponível.');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const updateResult = await pool.query(
    `UPDATE users
     SET password_hash = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
       AND role = 'ADMIN'
     RETURNING id`,
    [passwordHash, userResult.rows[0].id]
  );

  if (updateResult.rowCount !== 1) {
    throw new Error('Não foi possível redefinir a senha.');
  }
}

resetAdminPassword()
  .then(() => {
    process.stdout.write('Senha do administrador redefinida com sucesso.\n');
    process.exit(0);
  })
  .catch(() => {
    // Nunca imprime stack/payload: podem conter dados sensíveis vindos do driver.
    process.stderr.write('Não foi possível concluir a redefinição com segurança.\n');
    process.exit(1);
  });
