const app = require('./app');
const { port } = require('./src/config/env');

app.listen(port, () => {
  console.log(`Servidor backend rodando na porta ${port}`);
});
