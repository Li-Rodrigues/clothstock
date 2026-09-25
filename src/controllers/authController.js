const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
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

async function register(req, res, next) {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Informe um nome válido.' } });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Informe um e-mail válido.' } });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A senha deve ter pelo menos 6 caracteres.' } });
    }
    if (String(req.body.role || '').toUpperCase() === 'ADMIN') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'O perfil ADMIN não pode ser escolhido no cadastro público.' } });
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

module.exports = { register, login, logout, me };
