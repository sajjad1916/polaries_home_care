require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  appSecret: process.env.APP_SECRET || 'dev-secret-change-me',

  db: {
    path: process.env.DB_PATH || './db/polaris.db',
  },

  storage: {
    mode: process.env.STORAGE_MODE || 'local',
    localDir: './uploads',
    r2: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      bucket: process.env.R2_BUCKET,
      endpoint: process.env.R2_ENDPOINT,
    },
  },

  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY,
    enabled: !!process.env.GEMINI_API_KEY,
  },

  session: {
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  },

  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },

  documentTypes: [
    { key: 'drivers_license', label: "Driver's License", hasExpiration: true, dateLabel: 'Expiration Date' },
    { key: 'tb_test', label: 'TB Test (Skin Test or Chest X-Ray)', hasExpiration: true, dateLabel: 'Test/Read Date' },
    { key: 'background_check', label: 'Background Check Registration', hasExpiration: true, dateLabel: 'Registration Date' },
    { key: 'car_insurance', label: 'Car Insurance', hasExpiration: true, dateLabel: 'Expiration Date' },
    { key: 'social_security', label: 'Social Security Card', hasExpiration: false, dateLabel: null },
  ],
};
