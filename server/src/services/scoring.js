/**
 * Purpose: Centralized scoring calculations for game puzzle completion
 */

// Difficulty settings: time limit in seconds and score multiplier
const DIFFICULTY_CONFIG = {
  easy: { timeLimit: 30, multiplier: 1 },
  medium: { timeLimit: 20, multiplier: 1.5 },
  hard: { timeLimit: 10, multiplier: 2 },
};

// Base points awarded for any correct answer
const BASE_POINTS = 10;

/**
 * Calculates points awarded for solving a puzzle:
 * Formula: Math.round((10 + remainingSeconds) * multiplier)
 * Matches the original client-side scoring logic identically.
 *
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @param {number} issuedAt - Timestamp in ms when the puzzle was generated
 * @param {number} [customTimeLimit] - Optional override for time limit in seconds
 * @returns {number} Points earned for this puzzle (non-negative integer)
 */
function calculatePoints(difficulty, issuedAt, customTimeLimit) {
  const diffKey = (difficulty || 'easy').toLowerCase();
  const config = DIFFICULTY_CONFIG[diffKey] || DIFFICULTY_CONFIG.easy;
  const timeLimit = customTimeLimit || config.timeLimit;

  // Compute elapsed time in seconds from puzzle issue timestamp
  const now = Date.now();
  const elapsedSeconds = (now - (issuedAt || now)) / 1000;

  // Remaining time is clamped to 0 if the player answered within the grace period
  const remainingSeconds = Math.max(0, Math.round(timeLimit - elapsedSeconds));

  return Math.round((BASE_POINTS + remainingSeconds) * config.multiplier);
}

module.exports = {
  DIFFICULTY_CONFIG,
  BASE_POINTS,
  calculatePoints,
};

