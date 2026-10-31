/**
 * Purpose: User model schema definition for player identity and account management
 * AI-assisted (Antigravity) — reviewed by student
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Unique username for the player to display on the leaderboard
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
  },
  // Unique email for account identification and authentication
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
  },
  // Bcrypt hashed password; plaintext passwords must never be stored
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required'],
  },
  // Highest score attained by the user across all completed games
  highScore: {
    type: Number,
    default: 0,
    min: 0,
  },
  // Timestamp when the user account was created
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
