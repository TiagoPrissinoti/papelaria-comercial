const multer = require('multer');
const path = require('path');
const AppError = require('../utils/AppError');

const { uploadDir } = require('../config/env');

const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.bmp'];
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/bmp'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext) || !allowedMimeTypes.includes(file.mimetype)) {
    cb(new AppError('Formato invalido. Envie JPG, JPEG, PNG, WEBP, GIF, AVIF ou BMP.', 400));
    return;
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 6
  }
});

const productUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 5 }
]);

const reviewUpload = upload.fields([
  { name: 'images', maxCount: 4 }
]);

module.exports = { upload, productUpload, reviewUpload };
