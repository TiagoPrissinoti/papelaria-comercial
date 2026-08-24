const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const { getCookieToken } = require('../utils/authCookie');

function getRequestToken(req) {
  const cookieToken = getCookieToken(req);
  if (cookieToken) return cookieToken;

  // Compatibilidade temporaria para clientes da API que ainda usam Bearer.
  const [, bearerToken] = String(req.headers.authorization || '').split(' ');
  return bearerToken || '';
}

async function resolveUser(token) {
  const decoded = jwt.verify(token, jwtSecret);
  const userId = Number(decoded.sub || decoded.id);
  if (!Number.isInteger(userId) || userId < 1) throw new Error('Token sem usuario');

  const user = await User.findById(userId);
  if (!user) throw new Error('Usuario removido');
  return user;
}

async function authMiddleware(req, _res, next) {
  const token = getRequestToken(req);
  if (!token) return next(new AppError('Sessao nao informada', 401));

  try {
    req.user = await resolveUser(token);
    return next();
  } catch {
    return next(new AppError('Sessao invalida ou expirada', 401));
  }
}

function isAdmin(req, _res, next) {
  if (req.user.role !== 'admin') return next(new AppError('Acesso restrito a admin', 403));
  return next();
}

async function optionalAuthMiddleware(req, _res, next) {
  const token = getRequestToken(req);
  if (!token) return next();

  try {
    req.user = await resolveUser(token);
  } catch {
    req.user = null;
  }
  return next();
}

module.exports = { authMiddleware, isAdmin, optionalAuthMiddleware };
