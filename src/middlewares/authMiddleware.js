const jwt = require('jsonwebtoken');
const pool = require('../config/database');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'clothstock-development-secret-change-me';
const COOKIE_NAME = 'clothstock_token';

function getToken(req) {
  const authorization = req.headers.authorization || '';
  if (authorization.startsWith('Bearer ')) {
    return authorization.slice(7).trim();
  }

  const cookies = (req.headers.cookie || '').split(';');
  const tokenCookie = cookies.find(cookie => cookie.trim().startsWith(`${COOKIE_NAME}=`));
  return tokenCookie ? decodeURIComponent(tokenCookie.trim().slice(COOKIE_NAME.length + 1)) : null;
}

async function authenticate(req, res, next) {
  const token = getToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'É necessário entrar no sistema.' }
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const result = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1 LIMIT 1',
      [payload.sub]
    );
    const user = result.rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Sessão inválida ou expirada.' }
      });
    }
    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Sessão inválida ou expirada.' }
      });
    }
    return next(error);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Você não tem permissão para esta operação.' }
      });
    }
    return next();
  };
}

function setAuthCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL;
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 8}${secure ? '; Secure' : ''}`
  );
}

function clearAuthCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
  );
}

module.exports = {
  COOKIE_NAME,
  JWT_SECRET,
  getToken,
  authenticate,
  requireRole,
  setAuthCookie,
  clearAuthCookie
};
