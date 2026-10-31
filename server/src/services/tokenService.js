/**
 * Purpose: Service for JWT access token and opaque refresh token management
 * AI-assisted (Antigravity) — reviewed by student
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Generates a signed, short-lived JWT access token for an authenticated user.
 *
 * @param {object} user - User document containing _id and username
 * @returns {string} - Signed JWT string
 */
function generateAccessToken(user) {
  if (!config.jwtAccessSecret) {
    throw new Error('JWT_ACCESS_SECRET is not configured');
  }

  const payload = {
    userId: user._id.toString(),
    username: user.username,
  };

  return jwt.sign(payload, config.jwtAccessSecret, {
    expiresIn: config.accessTokenTtl || '15m',
  });
}

/**
 * Verifies a JWT access token against the secret key.
 *
 * @param {string} token - Bearer JWT token from client Authorization header
 * @returns {object} - Decoded token payload
 */
function verifyAccessToken(token) {
  if (!config.jwtAccessSecret) {
    throw new Error('JWT_ACCESS_SECRET is not configured');
  }

  return jwt.verify(token, config.jwtAccessSecret);
}

/**
 * Generates a high-entropy, 64-byte random hex string for the refresh token.
 *
 * @returns {string}
 */
function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Computes a SHA-256 hash of a raw token.
 * Only the hash is saved in MongoDB Atlas to protect against token leakage if the DB is read.
 *
 * @param {string} rawToken
 * @returns {string}
 */
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Returns security-hardened cookie options for the refresh token.
 * - httpOnly: blocks browser JavaScript access (mitigates XSS)
 * - secure: requires HTTPS in production
 * - sameSite: 'strict' mitigates CSRF attacks
 *
 * @returns {object}
 */
function getRefreshTokenCookieOptions() {
  const days = config.refreshTokenTtlDays || 7;
  return {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: days * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenCookieOptions,
};
