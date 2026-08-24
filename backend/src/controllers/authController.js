const asyncHandler = require('../utils/asyncHandler');
const AuthService = require('../services/AuthService');
const { setAuthCookie, clearAuthCookie } = require('../utils/authCookie');

exports.register = asyncHandler(async (req, res) => {
  const user = await AuthService.register(req.body);
  res.status(201).json(user);
});

exports.login = asyncHandler(async (req, res) => {
  const data = await AuthService.login(req.body);
  setAuthCookie(res, data.token);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ user: data.user });
});

exports.me = asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ user: req.user });
});

exports.logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  res.status(204).send();
});
