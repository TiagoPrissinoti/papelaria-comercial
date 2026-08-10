const app = require('./app');
const { port } = require('./src/config/env');

app.initializeApp()
  .then(() => {
    app.listen(port, '0.0.0.0', () => {
      console.log(`Servidor backend rodando na porta ${port}`);
    });
  })
  .catch((error) => {
    console.error('Falha ao inicializar a aplicacao:', error);
    process.exit(1);
  });
