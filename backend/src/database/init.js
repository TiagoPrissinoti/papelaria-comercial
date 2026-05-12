const fs = require('fs');
const path = require('path');
const { getDb } = require('./connection');

async function init() {
  const db = await getDb();
  const schema = fs.readFileSync(path.resolve(__dirname, 'schema.sql'), 'utf8');
  await db.exec(schema);
  console.log('Banco inicializado com sucesso.');
}

init().catch((error) => {
  console.error('Erro ao inicializar banco:', error);
  process.exit(1);
});
