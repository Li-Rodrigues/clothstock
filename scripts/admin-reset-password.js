const bcrypt = require('bcryptjs');
const readline = require('node:readline/promises');
const { stdin, stdout } = process;
const pool = require('../src/config/database');

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function askEmail() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  return rl
    .question('E-mail do administrador: ')
    .then(value => value.trim().toLowerCase())
    .finally(() => rl.close());
}

function askHidden(question) {
  if (!stdin.isTTY || !stdin.setRawMode) {
    throw new Error('Terminal seguro não disponível.');
  }

  return new Promise((resolve, reject) => {
    let value = '';
    let finished = false;

    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function finish(error, result) {
      if (finished) return;
      finished = true;
      stdin.removeListener('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
      if (error) reject(error);
      else resolve(result);
    }

    function onData(chunk) {
      for (const character of String(chunk)) {
        if (character === '\u0003') {
          finish(new Error('Operação cancelada.'));
          return;
        }

        if (character === '\r' || character === '\n') {
          finish(null, value);
          return;
        }

        if (character === '\u007F' || character === '\b') {
          value = value.slice(0, -1);
          continue;
        }

        if (!/[\u0000-\u001F\u007F]/.test(character)) {
          value += character;
        }
      }
    }

    stdin.on('data', onData);
  });
}

function validatePassword(password, confirmation) {
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH ||
    password !== confirmation
  ) {
    throw new Error('Senha inválida.');
  }
}

async function resetAdminPassword() {
  const email = await askEmail();

  if (!isValidEmail(email)) {
    throw new Error('E-mail inválido.');
  }

  const password = await askHidden('Nova senha: ');
  const confirmation = await askHidden('Confirme a nova senha: ');
  validatePassword(password, confirmation);

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
    process.stderr.write('Não foi possível concluir a redefinição com segurança.\n');
    process.exit(1);
  });
