// src/utils/passwordPolicy.js
// Política de senha do ClothStock em fonte única.
//
// Consumidores:
// - src/controllers/authController.js (cadastro público de OPERATOR);
// - scripts/lib/validators.js (scripts administrativos), que delega para cá.
//
// As regras não podem ser duplicadas: o cadastro público e os scripts
// administrativos precisam aplicar exatamente a mesma política.
// O módulo é Node (usa Buffer para medir bytes UTF-8) e o backend permanece
// sempre a autoridade final, independentemente da validação do frontend.

const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_BYTES = 72; // bcrypt considera no máximo 72 bytes

// A ordem das regras define a ordem das mensagens exibidas ao operador.
const PASSWORD_RULES = [
  { test: value => value.length >= PASSWORD_MIN_LENGTH, message: `ter ao menos ${PASSWORD_MIN_LENGTH} caracteres` },
  { test: value => /[a-z]/.test(value), message: 'conter ao menos uma letra minúscula' },
  { test: value => /[A-Z]/.test(value), message: 'conter ao menos uma letra maiúscula' },
  { test: value => /[0-9]/.test(value), message: 'conter ao menos um dígito' },
  { test: value => /[^A-Za-z0-9]/.test(value), message: 'conter ao menos um caractere especial' }
];

// Motivo de rejeição por tamanho (erro distincto das regras de composição,
// para que a mensagem continue igual à dos scripts administrativos).
function getPasswordLengthError(password) {
  return Buffer.byteLength(String(password || ''), 'utf8') > PASSWORD_MAX_BYTES
    ? `usar no máximo ${PASSWORD_MAX_BYTES} bytes para não ser truncada pelo bcrypt`
    : null;
}

// Lista os requisitos de composição não atendidos, em ordem estável.
function getPasswordFailures(password) {
  const value = String(password || '');
  return PASSWORD_RULES.filter(rule => !rule.test(value)).map(rule => rule.message);
}

function isStrongPassword(password) {
  return !getPasswordLengthError(password) && getPasswordFailures(password).length === 0;
}

// Mensagem única para a API, no formato: "A senha deve <requisitos>."
function describePasswordRequirements(password) {
  return getPasswordLengthError(password) || getPasswordFailures(password).join(', ');
}

module.exports = {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_BYTES,
  PASSWORD_RULES,
  getPasswordLengthError,
  getPasswordFailures,
  isStrongPassword,
  describePasswordRequirements
};
