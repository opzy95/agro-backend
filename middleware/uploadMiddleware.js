const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      return callback(new Error('Only image files are allowed'));
    }

    callback(null, true);
  }
});

const uploadProductImages = upload.fields([
  { name: 'images', maxCount: 6 },
  { name: 'image', maxCount: 6 }
]);

module.exports = upload;
module.exports.productImages = uploadProductImages;