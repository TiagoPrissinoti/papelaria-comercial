const Category = require('../models/Category');
const AppError = require('../utils/AppError');

class CategoryService {
  static async list() {
    return Category.findAll();
  }

  static async create(data) {
    return Category.create(data);
  }

  static async update(id, data) {
    const existing = await Category.findById(id);
    if (!existing) throw new AppError('Categoria nao encontrada', 404);
    return Category.update(id, data);
  }

  static async delete(id) {
    const existing = await Category.findById(id);
    if (!existing) throw new AppError('Categoria nao encontrada', 404);
    await Category.delete(id);
  }
}

module.exports = CategoryService;
