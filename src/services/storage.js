const fs = require('fs');
const path = require('path');
const settings = require('../../config/settings');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function saveFile(caregiverId, documentType, file) {
  const dir = path.join(settings.storage.localDir, caregiverId);
  ensureDir(dir);

  const ext = path.extname(file.originalname) || '.bin';
  const fileName = `${documentType}${ext}`;
  const filePath = path.join(dir, fileName);

  fs.writeFileSync(filePath, file.buffer);

  return {
    filePath: `${caregiverId}/${fileName}`,
    fileName: file.originalname,
    fileType: file.mimetype,
    fileSize: file.size,
  };
}

function getFilePath(relativePath) {
  return path.join(settings.storage.localDir, relativePath);
}

function fileExists(relativePath) {
  return fs.existsSync(getFilePath(relativePath));
}

function deleteFile(relativePath) {
  const fullPath = getFilePath(relativePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

// Initialize uploads directory
ensureDir(settings.storage.localDir);

module.exports = { saveFile, getFilePath, fileExists, deleteFile };
