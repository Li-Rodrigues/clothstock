// scripts/lib/validators.js
// Regras de validação compartilhadas pelos scripts administrativos.
//
// A política de senha NÃO é definida aqui: ela vive em
// src/utils/passwordPolicy.js, que é a fonte única usada também pelo
// cadastro público (src/controllers/authController.js). Este arquivo apenas
// adapta as falhas para o formato de erro dos scripts (userError).

const {
  PASSWORD_MIN_LENGTH,
  getPasswordLengthError,
  getPasswordFailures
} = require('../../src/utils/passwordPolicy');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 150;

// Erros de validação são marcados para que o script possa exibir a mensagem ao
// operador, enquanto qualquer outro erro é reportado de forma genérica
// (evita vazar detalhes do driver/banco nos logs).
function userError(message) {
  const error = new Error(message);
  error.userFacing = true;
  return error;
}

function isUserFacingError(error) {
  return Boolean(error && error.userFacing);
}

function isValidEmail(value) {
  const email = String(value || '');
  return EMAIL_PATTERN.test(email) && email.length <= EMAIL_MAX_LENGTH;
}

function assertValidName(name) {
  if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
    throw userError(`Nome inválido: informe entre ${NAME_MIN_LENGTH} e ${NAME_MAX_LENGTH} caracteres.`);
  }
}

function assertValidEmail(email) {
  if (!isValidEmail(email)) {
    throw userError('E-mail inválido: informe um endereço no formato nome@dominio.com.');
  }
}

function assertStrongPassword(password) {
  const lengthError = getPasswordLengthError(password);
  if (lengthError) {
    throw userError(`Senha inválida: ${lengthError}.`);
  }

  const failures = getPasswordFailures(password);
  if (failures.length > 0) {
    throw userError(`Senha fraca: a senha deve ${failures.join(', ')}.`);
  }
}

function assertPasswordsMatch(password, confirmation) {
  if (password !== confirmation) {
    throw userError('As senhas informadas não conferem.');
  }
}

module.exports = {
  EMAIL_PATTERN,
  PASSWORD_MIN_LENGTH,
  isValidEmail,
  isUserFacingError,
  userError,
  assertValidName,
  assertValidEmail,
  assertStrongPassword,
  assertPasswordsMatch,
};
