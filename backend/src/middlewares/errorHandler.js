module.exports = (err, req, res, next) => {
  if (err?.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Arquivo muito grande. Limite de 5MB por imagem.'
      : 'Erro no upload de arquivo.';
    return res.status(400).json({ message });
  }

  const status = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';

  if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }

  res.status(status).json({ message });
};
