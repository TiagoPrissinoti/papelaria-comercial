const asyncHandler = require('../utils/asyncHandler');
const CategoryService = require('../services/CategoryService');

exports.list = asyncHandler(async (req, res) => {
  res.json(await CategoryService.list());
});

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json(await CategoryService.create(req.body));
});

exports.update = asyncHandler(async (req, res) => {
  res.json(await CategoryService.update(Number(req.params.id), req.body));
});

exports.remove = asyncHandler(async (req, res) => {
  await CategoryService.delete(Number(req.params.id));
  res.status(204).send();
});
