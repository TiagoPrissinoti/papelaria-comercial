const AppError = require('../utils/AppError');

function allowBodyFields(...allowedFields) {
  const allowed = new Set(allowedFields);

  return (req, _res, next) => {
    const body = req.body ?? {};
    if (typeof body !== 'object' || Array.isArray(body)) {
      return next(new AppError('Corpo da requisicao invalido', 400));
    }

    const unknownFields = Object.keys(body).filter((field) => !allowed.has(field));
    if (unknownFields.length) {
      const fields = unknownFields.slice(0, 5).join(', ');
      return next(new AppError(`Campos nao permitidos: ${fields}`, 400));
    }

    return next();
  };
}

module.exports = allowBodyFields;
