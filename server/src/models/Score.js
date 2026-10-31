/**
 * Purpose: Game Score model schema definition for tracking player game results and leaderboard
 * AI-assisted (Antigravity) — reviewed by student
 */

const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  // Reference to the user who played the game session
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
  },
  // Final score achieved in the game session
  score: {
    type: Number,
    required: [true, 'Score is required'],
    min: [0, 'Score cannot be negative'],
  },
  // Total number of correctly solved math puzzles
  correctAnswers: {
    type: Number,
    required: [true, 'Correct answers count is required'],
    min: [0, 'Correct answers count cannot be negative'],
  },
  // Game difficulty selected by the user
  difficulty: {
    type: String,
    required: [true, 'Difficulty is required'],
    enum: {
      values: ['easy', 'medium', 'hard'],
      message: 'Difficulty must be easy, medium, or hard',
    },
  },
  // Timestamp when the game session was completed
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Descending index on score for efficient retrieval of the global leaderboard (top scores)
scoreSchema.index({ score: -1 });

const Score = mongoose.model('Score', scoreSchema);

module.exports = Score;
