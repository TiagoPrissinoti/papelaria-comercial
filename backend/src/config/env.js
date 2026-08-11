const path = require('path');

const dataDir = process.env.DATA_DIR || path.resolve(__dirname, '..', 'database');

const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';

function validateRuntimeConfig() {
  if (process.env.NODE_ENV !== 'production') return;

  if (!process.env.JWT_SECRET || jwtSecret === 'fallback-secret' || jwtSecret.length < 32) {
    throw new Error('Defina JWT_SECRET com pelo menos 32 caracteres aleatorios em producao.');
  }
}

module.exports = {
  port: process.env.PORT || 3333,
  jwtSecret,
  dbClient: process.env.DB_CLIENT || 'sqlite',
  dataDir,
  dbPath: process.env.DB_PATH || path.join(dataDir, 'database.sqlite'),
  uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '..', '..', 'uploads'),
  validateRuntimeConfig
};
