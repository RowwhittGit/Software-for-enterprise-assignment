/**
 * Purpose: RefreshToken model schema with TTL index for session management
 * AI-assisted (Antigravity) — reviewed by student
 */

const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  // Reference to the user who owns this refresh token session
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
  },
  // SHA-256 hash of the 64-byte random hex token; raw token is only kept in httpOnly cookie
  tokenHash: {
    type: String,
    required: [true, 'Token hash is required'],
  },
  // Expiration timestamp. The TTL index (expires: 0) instructs MongoDB Atlas background thread
  // to automatically delete the document once the current time exceeds expiresAt.
  expiresAt: {
    type: Date,
    required: [true, 'Expiration date is required'],
    expires: 0,
  },
  // Timestamp when the refresh token was issued
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;
