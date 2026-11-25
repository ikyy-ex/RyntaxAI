const multer = require('multer');
const path = require('path');

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

const ALLOWED_MIME_MAP = {
  'image/png': 'image/png',
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/webp': 'image/webp',
  'application/pdf': 'application/pdf',
  'text/plain': 'text/plain',
  'text/markdown': 'text/markdown',
  'text/csv': 'text/csv',
  'text/html': 'text/html',
  'text/css': 'text/css',
  'application/json': 'application/json',
  'application/javascript': 'text/plain',
  'text/javascript': 'text/plain'
};

const CODE_EXTENSIONS = new Set([
  '.txt', '.md', '.csv', '.json', '.js', '.ts', '.jsx', '.tsx',
  '.py', '.html', '.css', '.sql', '.java', '.cpp', '.c', '.go', '.rs', '.php', '.xml', '.yaml', '.yml'
]);

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 3
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ALLOWED_MIME_MAP[file.mimetype] || CODE_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Format file "${ext || file.mimetype}" tidak didukung. Gunakan PNG, JPG, WEBP, PDF, TXT, CSV, JSON, atau file kode.`));
    }
  }
});

function normalizeGeminiMimeType(file) {
  if (ALLOWED_MIME_MAP[file.mimetype]) {
    return ALLOWED_MIME_MAP[file.mimetype];
  }
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (CODE_EXTENSIONS.has(ext)) {
    return 'text/plain';
  }
  return 'application/octet-stream';
}

module.exports = {
  upload,
  normalizeGeminiMimeType,
  MAX_FILE_SIZE
};
