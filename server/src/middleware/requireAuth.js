/**
 * Purpose: Authentication middleware to verify JWT access token on protected routes
 * AI-assisted (Antigravity) — reviewed by student
 */

const tokenService = require('../services/tokenService');

/**
 * Middleware that guards protected endpoints.
 * Expects an Authorization header in the standard format:
 *   Authorization: Bearer <access-token>
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Access denied. Bearer token missing or malformed.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = tokenService.verifyAccessToken(token);

    // Attach authenticated user identity to request object for downstream handlers
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Access token expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({
      error: 'Invalid or malformed access token',
    });
  }
}

module.exports = requireAuth;
