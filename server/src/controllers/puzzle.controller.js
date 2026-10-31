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

/**
 * Handles POST /api/puzzle/answer
 * Body: { puzzleId, answer }
 * Verifies submitted answer against the server-side solution, checks the time limit,
 * and purges the puzzle challenge to prevent repeat answers.
 */
function checkAnswerHandler(req, res) {
  const { puzzleId, answer } = req.body;

  if (!puzzleId || typeof puzzleId !== 'string') {
    return res.status(400).json({ error: 'puzzleId is required' });
  }

  if (answer === undefined || answer === null || isNaN(Number(answer))) {
    return res.status(400).json({ error: 'A numerical answer is required' });
  }

  const puzzle = puzzleStore.getPuzzle(puzzleId);

  if (!puzzle) {
    return res.status(400).json({ error: 'Puzzle not found, expired, or already answered' });
  }

  const elapsedSeconds = (Date.now() - puzzle.issuedAt) / 1000;
  const timeTaken = Math.round(elapsedSeconds);

  // Time limit check: reject if time elapsed exceeds limit plus 2-second grace period
  if (elapsedSeconds > puzzle.timeLimit + puzzleStore.GRACE_PERIOD_SECONDS) {
    puzzleStore.removePuzzle(puzzleId);
    return res.status(200).json({
      correct: false,
      timedOut: true,
      timeTaken,
      message: 'Time limit exceeded',
    });
  }

  // Compare submitted answer with stored solution
  const isCorrect = parseInt(answer, 10) === puzzle.solution;

  // Invalidate puzzle immediately to prevent replay submissions
  puzzleStore.removePuzzle(puzzleId);

  res.status(200).json({
    correct: isCorrect,
    timedOut: false,
    timeTaken,
  });
}

module.exports = {
  getPuzzleHandler,
  checkAnswerHandler,
};
