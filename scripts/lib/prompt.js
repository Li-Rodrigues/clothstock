// scripts/lib/prompt.js
// Helpers de entrada interativa para scripts administrativos.
// A senha nunca é exibida durante a digitação (modo raw, sem eco).

const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const { userError } = require('./validators');

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

function requireInteractiveTerminal() {
  if (!stdin.isTTY || !stdin.setRawMode) {
    throw userError(
      'Terminal interativo não disponível. Execute este script em um terminal real (nunca via pipe, em CI ou com a senha em argumento da linha de comando).'
    );
  }
}

async function askText(label) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(label);
    return answer.trim();
  } finally {
    rl.close();
  }
}

function askHidden(label) {
  requireInteractiveTerminal();

  return new Promise((resolve, reject) => {
    let value = '';
    let finished = false;

    stdout.write(label);
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
        if (character === '\u0003' || character === '\u0004') {
          finish(userError('Operação cancelada pelo usuário.'));
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

        if (!CONTROL_CHARACTERS.test(character)) {
          value += character;
        }
      }
    }

    stdin.on('data', onData);
  });
}

module.exports = { askText, askHidden, requireInteractiveTerminal };
