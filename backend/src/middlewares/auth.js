const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const AppError = require('../utils/AppError');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new AppError('Token nao informado', 401);

  const [, token] = authHeader.split(' ');
  if (!token) throw new AppError('Token invalido', 401);

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch {
    throw new AppError('Token invalido ou expirado', 401);
  }
}

function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') throw new AppError('Acesso restrito a admin', 403);
  next();
}

function optionalAuthMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();
  const [, token] = authHeader.split(' ');
  if (!token) return next();
  try {
    req.user = jwt.verify(token, jwtSecret);
  } catch {
    req.user = null;
  }
  return next();
}

module.exports = { authMiddleware, isAdmin, optionalAuthMiddleware };
