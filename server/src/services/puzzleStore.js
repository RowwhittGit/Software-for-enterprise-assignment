/**
 * Purpose: In-memory store for active puzzle answers with automatic expiry
 * AI-assisted (Antigravity) — reviewed by student
 */

const crypto = require('crypto');

// Map holding active puzzles keyed by puzzleId
const store = new Map();

// Time limit in seconds for each difficulty level (from ARCHITECTURE.md)
const DIFFICULTY_TIMES = {
  easy: 30,
  medium: 20,
  hard: 10,
};

// Grace period in seconds to account for network latency
const GRACE_PERIOD_SECONDS = 2;

// Maximum lifetime of an entry in milliseconds before cleanup (5 minutes)
const MAX_ENTRY_LIFETIME_MS = 5 * 60 * 1000;

/**
 * Periodically purges stale entries to prevent in-memory accumulation
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [id, entry] of store.entries()) {
    if (now - entry.issuedAt > MAX_ENTRY_LIFETIME_MS) {
      store.delete(id);
    }
  }
}

// Run cleanup every 60 seconds (unref allows process to exit gracefully in tests/shutdown)
const cleanupInterval = setInterval(cleanupExpiredEntries, 60 * 1000);
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

/**
 * Saves a new puzzle challenge in memory and generates a unique identifier.
 * Storing the solution server-side guarantees the client cannot inspect the solution.
 *
 * @param {number} solution - Correct answer from Banana API
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @returns {{ puzzleId: string, timeLimit: number }}
 */
function savePuzzle(solution, difficulty = 'easy') {
  const puzzleId = crypto.randomUUID();
  const timeLimit = DIFFICULTY_TIMES[difficulty.toLowerCase()] || DIFFICULTY_TIMES.easy;

  store.set(puzzleId, {
    solution,
    difficulty: difficulty.toLowerCase(),
    timeLimit,
    issuedAt: Date.now(),
  });

  return { puzzleId, timeLimit };
}

/**
 * Retrieves a puzzle entry by its ID.
 *
 * @param {string} puzzleId
 * @returns {object|null}
 */
function getPuzzle(puzzleId) {
  return store.get(puzzleId) || null;
}

/**
 * Removes a puzzle entry after an answer attempt to prevent replay attacks.
 *
 * @param {string} puzzleId
 */
function removePuzzle(puzzleId) {
  store.delete(puzzleId);
}

module.exports = {
  DIFFICULTY_TIMES,
  GRACE_PERIOD_SECONDS,
  savePuzzle,
  getPuzzle,
  removePuzzle,
  store,
};
