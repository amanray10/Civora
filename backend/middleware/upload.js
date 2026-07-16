// Multer config — complaint photo/document attachments
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const dir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dir),
  filename: (_req, file, cb) => {
    let safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + '-' + safe);
  }
});

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

module.exports = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 4 }, // 5 MB, max 4 files
  fileFilter: (_req, file, cb) =>
    ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only JPG, PNG, WEBP or PDF files are allowed."))
});
