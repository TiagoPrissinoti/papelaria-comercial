const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { dbPath, dbClient } = require('../config/env');

let connection;
let transactionTail = Promise.resolve();

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

async function withTransaction(work) {
  const previous = transactionTail;
  let release;
  transactionTail = new Promise((resolve) => { release = resolve; });
  await previous;

  let db;
  let began = false;
  try {
    db = await getDb();
    await db.exec('BEGIN IMMEDIATE');
    began = true;
    const result = await work(db);
    await db.exec('COMMIT');
    began = false;
    return result;
  } catch (error) {
    if (began) await db.exec('ROLLBACK');
    throw error;
  } finally {
    release();
  }
}

module.exports = { getDb, withTransaction };
