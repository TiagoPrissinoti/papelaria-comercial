const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Address = require('../models/Address');

function clean(value) {
  return String(value ?? '').trim();
}

function validate(body) {
  const data = {
    label: clean(body.label) || 'Casa',
    recipient_name: clean(body.recipient_name),
    phone: clean(body.phone).replace(/\D/g, ''),
    postal_code: clean(body.postal_code).replace(/\D/g, ''),
    street: clean(body.street),
    number: clean(body.number),
    complement: clean(body.complement),
    neighborhood: clean(body.neighborhood),
    city: clean(body.city),
    state: clean(body.state).toUpperCase(),
    is_default: body.is_default === true
  };
  const required = ['recipient_name', 'phone', 'postal_code', 'street', 'number', 'neighborhood', 'city', 'state'];
  if (required.some((field) => !data[field])) throw new AppError('Preencha todos os campos obrigatorios do endereco', 400);
  if (data.postal_code.length !== 8) throw new AppError('CEP deve conter 8 digitos', 400);
  if (data.phone.length < 10 || data.phone.length > 11) throw new AppError('Telefone deve conter DDD e numero', 400);
  if (!/^[A-Z]{2}$/.test(data.state)) throw new AppError('Estado deve ser uma UF valida', 400);
  if (data.recipient_name.length > 100 || data.street.length > 120 || data.complement.length > 100) {
    throw new AppError('Um ou mais campos do endereco excedem o tamanho permitido', 400);
  }
  return data;
}

exports.list = asyncHandler(async (req, res) => res.json(await Address.findByUser(req.user.id)));

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json(await Address.create(req.user.id, validate(req.body)));
});

exports.update = asyncHandler(async (req, res) => {
  const address = await Address.update(Number(req.params.id), req.user.id, validate(req.body));
  if (!address) throw new AppError('Endereco nao encontrado', 404);
  res.json(address);
});
