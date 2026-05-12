const asyncHandler = require('../utils/asyncHandler');
const ProductService = require('../services/ProductService');

exports.list = asyncHandler(async (req, res) => {
  res.json(await ProductService.list());
});

exports.getById = asyncHandler(async (req, res) => {
  res.json(await ProductService.getById(Number(req.params.id)));
});

exports.create = asyncHandler(async (req, res) => {
  const product = await ProductService.create(req.body, req.files);
  res.status(201).json(product);
});

exports.update = asyncHandler(async (req, res) => {
  res.json(await ProductService.update(Number(req.params.id), req.body, req.files));
});

exports.remove = asyncHandler(async (req, res) => {
  await ProductService.delete(Number(req.params.id));
  res.status(204).send();
});
