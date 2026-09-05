import dotenv from 'dotenv';
import path from 'path';

// Load .env file from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_PREFIX: process.env.API_PREFIX || '/api/v1',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:8081',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hostelhub?schema=public',

  JWT: {
    ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'hostelhub_dev_jwt_access_secret_key_change_in_production',
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'hostelhub_dev_jwt_refresh_secret_key_change_in_production',
    ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
    REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  CAMPUS: {
    LATITUDE: parseFloat(process.env.CAMPUS_LATITUDE || '12.9715987'),
    LONGITUDE: parseFloat(process.env.CAMPUS_LONGITUDE || '77.5945627'),
    ALLOWED_RADIUS_METERS: parseFloat(process.env.CAMPUS_ALLOWED_RADIUS_METERS || '500'),
  },

  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',
};
