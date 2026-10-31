/**
 * Purpose: Puzzle controller handlers for game logic
 * AI-assisted (Antigravity) — reviewed by student
 */

const bananaService = require('../services/bananaService');
const puzzleStore = require('../services/puzzleStore');

const ALLOWED_DIFFICULTIES = ['easy', 'medium', 'hard'];

/**
 * Handles GET /api/puzzle?difficulty=
 * Fetches a puzzle challenge from the external Banana API, stores the solution
 * securely in the in-memory store, and returns only the puzzle image URL and puzzleId.
 */
async function getPuzzleHandler(req, res) {
  try {
    let difficulty = (req.query.difficulty || 'easy').toLowerCase();

    if (!ALLOWED_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({
        error: `Invalid difficulty '${difficulty}'. Allowed values: ${ALLOWED_DIFFICULTIES.join(', ')}`,
      });
    }

    // Interoperability: Server calls external Banana API to fetch image & solution
    const puzzle = await bananaService.fetchPuzzle();

    // Security: Save solution server-side so it cannot be inspected in client network/browser
    const { puzzleId, timeLimit } = puzzleStore.savePuzzle(puzzle.solution, difficulty);

    res.status(200).json({
      puzzleId,
      question: puzzle.question,
      difficulty,
      timeLimit,
    });
  } catch (error) {
    console.error('Error generating puzzle:', error.message);
    res.status(502).json({
      error: 'Failed to retrieve puzzle from external service. Please try again.',
    });
  }
}

module.exports = {
  getPuzzleHandler,
};
