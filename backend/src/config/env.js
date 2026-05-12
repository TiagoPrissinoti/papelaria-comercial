const path = require('path');

module.exports = {
  port: process.env.PORT || 3333,
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
  dbClient: process.env.DB_CLIENT || 'sqlite',
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '..', 'database', 'database.sqlite')
};
