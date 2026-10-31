/**
 * Purpose: Service for JWT token generation and verification
 * AI-assisted (Antigravity) — reviewed by student
 */

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

module.exports = {
  generateAccessToken,
  verifyAccessToken,
};
