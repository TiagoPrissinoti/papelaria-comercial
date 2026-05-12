const Product = require('../models/Product');
const AppError = require('../utils/AppError');

function extractImagePaths(files) {
  const main = files?.image?.[0] ? `/uploads/${files.image[0].filename}` : null;
  const gallery = (files?.images || []).map((file) => `/uploads/${file.filename}`);
  return { main, gallery };
}

class ProductService {
  static async list() {
    return Product.findAll();
  }

  static async getById(id) {
    const product = await Product.findById(id);
    if (!product) throw new AppError('Produto nao encontrado', 404);
    return product;
  }

  static async create(payload, files) {
    const { main, gallery } = extractImagePaths(files);
    return Product.create({
      ...payload,
      categoryId: payload.categoryId ? Number(payload.categoryId) : null,
      price: Number(payload.price),
      stock: Number(payload.stock),
      image: main,
      images: gallery
    });
  }

  static async update(id, payload, files) {
    const current = await Product.findById(id, { includeInactive: true });
    if (!current) throw new AppError('Produto nao encontrado', 404);

    const { main, gallery } = extractImagePaths(files);

    const product = await Product.update(id, {
      ...payload,
      categoryId: payload.categoryId ? Number(payload.categoryId) : undefined,
      price: payload.price !== undefined ? Number(payload.price) : undefined,
      stock: payload.stock !== undefined ? Number(payload.stock) : undefined,
      image: main || current.image,
      images: gallery.length ? gallery : current.images
    });

    return product;
  }

  static async delete(id) {
    const existing = await Product.findById(id, { includeInactive: true });
    if (!existing) throw new AppError('Produto nao encontrado', 404);
    await Product.delete(id);
  }
}

module.exports = ProductService;
