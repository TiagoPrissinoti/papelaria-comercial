const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { jwtSecret } = require('../config/env');

class AuthService {
  static async register({ name, email, password }) {
    const normalizedName = String(name || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (normalizedName.length < 2) throw new AppError('Nome invalido', 400);
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new AppError('Email invalido', 400);
    if (String(password || '').length < 8) throw new AppError('A senha deve ter pelo menos 8 caracteres', 400);

    const exists = await User.findByEmail(normalizedEmail);
    if (exists) throw new AppError('Email ja cadastrado', 409);

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name: normalizedName, email: normalizedEmail, password: hashedPassword, role: 'client' });
    return user;
  }

  static async login({ email, password }) {
    const user = await User.findByEmail(String(email || '').trim().toLowerCase());
    if (!user) throw new AppError('Credenciais invalidas', 401);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new AppError('Credenciais invalidas', 401);

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, jwtSecret, { expiresIn: '1d' });

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    };
  }
}

module.exports = AuthService;
