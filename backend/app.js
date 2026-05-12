const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const routes = require('./src/routes');
const errorHandler = require('./src/middlewares/errorHandler');
const { getDb } = require('./src/database/connection');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));
app.use('/api', routes);
app.use(errorHandler);

(async () => {
  const db = await getDb();
  const schema = fs.readFileSync(path.resolve(__dirname, 'src/database/schema.sql'), 'utf8');
  await db.exec(schema);

  const columns = await db.all("PRAGMA table_info(products)");
  const hasImages = columns.some((column) => column.name === 'images');
  const hasIsActive = columns.some((column) => column.name === 'is_active');
  if (!hasImages) {
    await db.exec("ALTER TABLE products ADD COLUMN images TEXT NOT NULL DEFAULT '[]'");
  }
  if (!hasIsActive) {
    await db.exec("ALTER TABLE products ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1");
  }
})();

module.exports = app;
