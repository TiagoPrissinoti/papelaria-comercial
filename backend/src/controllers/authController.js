const asyncHandler = require('../utils/asyncHandler');
const AuthService = require('../services/AuthService');

exports.register = asyncHandler(async (req, res) => {
  const user = await AuthService.register(req.body);
  res.status(201).json(user);
});

exports.login = asyncHandler(async (req, res) => {
  const data = await AuthService.login(req.body);
  res.json(data);
});
