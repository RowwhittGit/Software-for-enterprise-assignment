/**
 * Purpose: GameSession model schema for server-managed game state (lives, score, puzzles)
 * AI-assisted (Antigravity) — reviewed by student
 */

const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
  // Reference to the authenticated user playing this session
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true,
  },
  // Game difficulty selected at session start
  difficulty: {
    type: String,
    required: [true, 'Difficulty is required'],
    enum: {
      values: ['easy', 'medium', 'hard'],
      message: 'Difficulty must be easy, medium, or hard',
    },
  },
  // Player lives remaining (starts at 3; game ends when 0)
  lives: {
    type: Number,
    default: 3,
    min: [0, 'Lives cannot be negative'],
  },
  // Accumulated game score tracked securely on the server
  score: {
    type: Number,
    default: 0,
    min: [0, 'Score cannot be negative'],
  },
  // Total count of correctly solved puzzles
  correctAnswers: {
    type: Number,
    default: 0,
    min: [0, 'Correct answers cannot be negative'],
  },
  // Total count of puzzle attempts (correct, wrong, or timed out)
  puzzlesAttempted: {
    type: Number,
    default: 0,
    min: [0, 'Puzzles attempted cannot be negative'],
  },
  // ID of the currently active puzzle challenge, or null if awaiting new puzzle
  currentPuzzleId: {
    type: String,
    default: null,
  },
  // Lifecycle status of the game session
  status: {
    type: String,
    enum: ['active', 'finished'],
    default: 'active',
  },
  // Session creation timestamp
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // TTL expiration timestamp: auto-deletes abandoned sessions from MongoDB Atlas
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from creation
  },
});

// MongoDB TTL index: documents expire automatically once expiresAt timestamp is reached
gameSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Helper method to refresh session TTL on player activity (keeps session alive while playing)
gameSessionSchema.methods.touch = function () {
  this.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
};

const GameSession = mongoose.model('GameSession', gameSessionSchema);

module.exports = GameSession;
