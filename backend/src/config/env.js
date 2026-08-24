import dotenv from 'dotenv';

dotenv.config();

const required = ['MONGODB_URI', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    // eslint-disable-next-line no-console
    console.warn(`[config] Missing environment variable: ${key}. Falling back to a development default.`);
  }
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/kids_clothing_inventory',
  jwtSecret: process.env.JWT_SECRET || 'dev_only_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtCookieName: process.env.JWT_COOKIE_NAME || 'kci_token',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
  cookieSecure: (process.env.CLIENT_URL || 'http://localhost:5173').startsWith('https'),
  brandName: process.env.BRAND_NAME || 'doodledry',
  seedSuperAdmin: {
    name: process.env.SEED_SUPER_ADMIN_NAME || 'Super Admin',
    email: process.env.SEED_SUPER_ADMIN_EMAIL || 'superadmin@example.com',
    phone: process.env.SEED_SUPER_ADMIN_PHONE || '9999999999',
    password: process.env.SEED_SUPER_ADMIN_PASSWORD || 'ChangeMe123!',
  },
};

export default env;
