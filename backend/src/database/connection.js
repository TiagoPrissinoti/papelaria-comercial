const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { dbPath, dbClient } = require('../config/env');

let connection;

async function getDb() {
  if (dbClient !== 'sqlite') {
    throw new Error('DB_CLIENT diferente de sqlite ainda nao implementado. Estrutura pronta para migrar para PostgreSQL.');
  }

  if (!connection) {
    connection = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    await connection.exec('PRAGMA foreign_keys = ON;');
  }

  return connection;
}

module.exports = { getDb };
