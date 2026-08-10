const path = require('path');

const dataDir = process.env.DATA_DIR || path.resolve(__dirname, '..', 'database');

module.exports = {
  port: process.env.PORT || 3333,
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
  dbClient: process.env.DB_CLIENT || 'sqlite',
  dataDir,
  dbPath: process.env.DB_PATH || path.join(dataDir, 'database.sqlite'),
  uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '..', '..', 'uploads')
};
