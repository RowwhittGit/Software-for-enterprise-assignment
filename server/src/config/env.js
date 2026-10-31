/**
 * Purpose: Centralized environment variable configuration loader
 * AI-assisted (Antigravity) — reviewed by student
 */

const dotenv = require('dotenv');

// Load environment variables from .env file into process.env
dotenv.config();

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS, 10) || 7,
};

module.exports = config;
