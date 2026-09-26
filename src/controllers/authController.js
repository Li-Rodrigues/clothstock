const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { describePasswordRequirements, isStrongPassword } = require('../utils/passwordPolicy');
const { listActions } = require('../config/permissions');
const { JWT_SECRET, setAuthCookie, clearAuthCookie } = require('../middlewares/authMiddleware');

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function createToken(user) {
  return jwt.sign(
    { email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { subject: user.id, expiresIn: '8h' }
  );
}

/*
 * Cadastro público: desligado em produção.
 *
 * A aplicação é publicada e acessível a avaliadores e participantes
 * externos. Sem esta trava, qualquer visitante criaria uma conta
 * OPERATOR pela própria rota POST /api/auth/register, e a criação de
 * contas passaria a depender de qualquer visitante da internet. Em
 * produção o cadastro é recusado e as contas passam a ser provisionadas
 * por ADMIN ou por script.
 *
 * Desenvolvimento: o cadastro continua aberto (e sempre cria OPERATOR),
 * para que o fluxo de registro continue testável.
 *
 * O override ALLOW_PUBLIC_REGISTRATION=true reabre o cadastro mesmo em
 * produção, caso um ambiente específico realmente precise dele.
 */
function isProduction() {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
}

function isPublicRegistrationEnabled() {
  if (String(process.env.ALLOW_PUBLIC_REGISTRATION || '').toLowerCase() === 'true') return true;
  return !isProduction();
}

async function register(req, res, next) {
  try {
    if (!isPublicRegistrationEnabled()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'REGISTRATION_DISABLED',
          message: 'O cadastro público está desativado neste ambiente. Fale com o administrador para obter uma conta.'
        }
      });
    }

    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Informe um nome válido.' } });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Informe um e-mail válido.' } });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `A senha deve ${describePasswordRequirements(password)}.` } });
    }
    // O INSERT abaixo fixa 'OPERATOR'. Negar aqui é uma falha rápida
    // e explícita para quem tentar escolher um perfil pela API.
    const perfilSolicitado = String(req.body.role || '').toUpperCase();
    if (perfilSolicitado === 'ADMIN' || perfilSolicitado === 'VIEWER') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'O perfil ' + perfilSolicitado + ' não pode ser escolhido no cadastro público.' } });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'OPERATOR')
       RETURNING id, name, email, role`,
      [name, email, passwordHash]
    );

    const user = rows[0];
    setAuthCookie(res, createToken(user));
    return res.status(201).json({ success: true, data: { user: publicUser(user) } });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, error: { code: 'EMAIL_IN_USE', message: 'Este e-mail já está cadastrado.' } });
    }
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const { rows } = await pool.query(
      'SELECT id, name, email, role, password_hash, is_active FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    const user = rows[0];
    const valid = user && user.is_active && await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos.' } });
    }

    const safeUser = publicUser(user);
    setAuthCookie(res, createToken(safeUser));
    return res.status(200).json({ success: true, data: { user: safeUser } });
  } catch (error) {
    return next(error);
  }
}

function logout(req, res) {
  clearAuthCookie(res);
  return res.status(200).json({ success: true, data: { loggedOut: true } });
}

async function me(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1 LIMIT 1',
      [req.user.id]
    );
    if (!rows[0] || !rows[0].is_active) {
      clearAuthCookie(res);
      return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sessão inválida.' } });
    }
    return res.status(200).json({ success: true, data: { user: publicUser(rows[0]) } });
  } catch (error) {
    return next(error);
  }
}

/*
 * Intenção das ações que o servidor autoriza para o usuário atual.
 *
 * A lista é derivada da MESMA matriz que o gate da API aplica
 * (src/config/permissions.js), então ela descreve a decisão real do
 * servidor e não uma cópia mantida à mão no frontend. O navegador pode
 * usá-la para esconder controles; de qualquer forma, cada requisição é
 * conferida de novo pelo servidor.
 */
function permissions(req, res) {
  const actions = listActions(req.user.role);

  return res.status(200).json({
    success: true,
    data: { role: req.user.role, actions }
  });
}

/*
 * Sinaliza se o cadastro público está disponível. Usado pela tela de
 * login para esconder o link "Cadastre-se" quando o cadastro está
 * desligado, evitando levar o usuário a uma página que só pode falhar.
 * É UX: a decisão real já está em register(), acima.
 */
function health(req, res) {
  return res.status(200).json({
    success: true,
    data: {
      message: 'Rota de autenticação funcionando!',
      registrationEnabled: isPublicRegistrationEnabled()
    }
  });
}

module.exports = { register, login, logout, me, permissions, health, isPublicRegistrationEnabled };
